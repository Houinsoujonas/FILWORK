const crypto = require("node:crypto");

const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const {
  isConfigured,
  decimalAmount,
  commissionBps,
  calculateCommission,
  initializeSoftpayPayment,
  verifyPayment,
  initializePayout,
  verifyPayout,
} = require("../services/sasPayService");
const {
  enqueuePaymentReceivedEmail,
  enqueuePayoutSentEmail,
} = require("../services/emailService");

const NETWORKS = {
  celtiis_bj: "Celtiis Cash",
  moov_bj: "Moov Money Benin",
  mtn_bj: "MTN MoMo Benin",
};

/** Charge un paiement avec le contexte métier nécessaire aux vérifications. */
async function loadPaymentContext(paymentId) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      collaboration: {
        include: {
          application: {
            select: {
              campaign: {
                select: {
                  id: true,
                  title: true,
                  companyProfileId: true,
                  companyProfile: {
                    select: { userId: true, companyName: true, contactEmail: true, contactPhone: true },
                  },
                },
              },
              creatorProfile: {
                select: {
                  id: true,
                  userId: true,
                  displayName: true,
                  payoutMsisdn: true,
                  payoutNetwork: true,
                  payoutCountry: true,
                },
              },
            },
          },
          invitation: {
            select: {
              campaign: {
                select: {
                  id: true,
                  title: true,
                  companyProfileId: true,
                  companyProfile: {
                    select: { userId: true, companyName: true, contactEmail: true, contactPhone: true },
                  },
                },
              },
              creatorProfile: {
                select: {
                  id: true,
                  userId: true,
                  displayName: true,
                  payoutMsisdn: true,
                  payoutNetwork: true,
                  payoutCountry: true,
                },
              },
            },
          },
        },
      },
      sasPayTransactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

function contextParts(payment) {
  const collaboration = payment?.collaboration;
  const origin = collaboration?.application || collaboration?.invitation;

  if (!origin) {
    return null;
  }

  return {
    origin,
    collaboration,
    campaign: origin.campaign,
    creatorProfile: origin.creatorProfile,
    companyProfile: origin.campaign.companyProfile,
    campaignTitle: origin.campaign.title,
  };
}

/** Vérifie que l'utilisateur connecté est bien l'entreprise participante. */
function assertCompanyOwner(res, companyProfile, user) {
  if (!companyProfile || companyProfile.userId !== user.id) {
    res.status(403).json({
      success: false,
      message: "Vous ne participez pas à cette collaboration.",
    });
    return false;
  }

  return true;
}

/** SasPay status -> statut local du paiement. */
function mapSasPayPaymentStatus(status) {
  if (status === "SUCCESS") return { paymentStatus: "PAID", transactionStatus: "SUCCESS" };
  if (status === "FAILED") return { paymentStatus: "FAILED", transactionStatus: "FAILED" };
  if (status === "CANCELLED") return { paymentStatus: "CANCELLED", transactionStatus: "CANCELLED" };
  return { paymentStatus: "PENDING", transactionStatus: "PENDING" };
}

/** POST /api/payments/:paymentId/saspay/initialize */
async function initializePayment(req, res) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Le paiement SasPay n'est pas configuré sur ce serveur (SASPAY_API_KEY manquante).",
      });
    }

    const companyProfile = await prisma.companyProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, companyName: true, contactEmail: true, contactPhone: true },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Complétez votre profil d'entreprise avant de payer.",
      });
    }

    const payment = await loadPaymentContext(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paiement introuvable.",
      });
    }

    const ctx = contextParts(payment);

    if (!ctx || ctx.companyProfile.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne participez pas à cette collaboration.",
      });
    }

    if (!["PLANNED", "PENDING"].includes(payment.status)) {
      return res.status(409).json({
        success: false,
        message: `Ce paiement ne peut pas être initié dans son état actuel (${payment.status}).`,
        currentStatus: payment.status,
      });
    }

    const body = req.body || {};
    const network = typeof body.network === "string" ? body.network.trim() : "";

    if (!Object.prototype.hasOwnProperty.call(NETWORKS, network)) {
      return res.status(400).json({
        success: false,
        message: "Réseau invalide. Réseaux acceptés : celtiis_bj, moov_bj, mtn_bj.",
        networks: NETWORKS,
      });
    }

    if (!companyProfile.contactPhone || !companyProfile.contactEmail) {
      return res.status(400).json({
        success: false,
        message: "Le profil d'entreprise doit renseigner contactEmail et contactPhone pour initier le paiement.",
      });
    }

    const idempotencyKey = crypto.randomUUID();

    // Créer d'abord l'enregistrement local : un appel SasPay encore en cours
    // pourra être retrouvé et vérifié même si le serveur redémarre pendant l'appel.
    const transaction = await prisma.sasPayTransaction.create({
      data: {
        paymentId: payment.id,
        direction: "PAYIN",
        amount: payment.amount,
        currency: payment.currency,
        status: "PENDING",
        network,
        idempotencyKey,
        customerEmail: companyProfile.contactEmail,
      },
    });

    const customer = {
      email: companyProfile.contactEmail,
      first_name: companyProfile.companyName,
      last_name: "Entreprise",
      phone: companyProfile.contactPhone,
    };

    const upstream = await initializeSoftpayPayment({
      amount: payment.amount,
      currency: payment.currency,
      country: "BJ",
      network,
      description: `Paiement campagne « ${ctx.campaignTitle} » — collaboration ${payment.collaborationId}`,
      customer,
      metadata: { paymentId: payment.id, collaborationId: payment.collaborationId },
      idempotencyKey,
    });

    if (!upstream.success) {
      await prisma.sasPayTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          payload: upstream.error ?? undefined,
        },
      });

      return res.status(502).json({
        success: false,
        message: "Le paiement n'a pas pu être initié auprès du prestataire.",
        upstreamCode: upstream.error?.code ?? null,
      });
    }

    const updated = await prisma.sasPayTransaction.update({
      where: { id: transaction.id },
      data: {
        providerId: upstream.data?.id ?? null,
        reference: upstream.data?.reference ?? null,
        payload: upstream.data ?? undefined,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "SASPAY",
        providerTransactionId: upstream.data?.id ?? null,
        providerReference: upstream.data?.reference ?? null,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      message: upstream.data?.checkout_url
        ? "Redirection vers la page de paiement requise."
        : "Demande de paiement poussée sur le téléphone du payeur.",
      payment: {
        id: payment.id,
        status: "PENDING",
        transactionStatus: "PENDING",
        checkoutUrl: upstream.data?.checkout_url || null,
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    if (error.code === "SASPAY_NOT_CONFIGURED") {
      return res.status(503).json({
        success: false,
        message: "Paiement SasPay non configuré.",
      });
    }

    console.error("Erreur lors de l'initialisation du paiement :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'initialisation du paiement.",
    });
  }
}

/** GET /api/payments/:paymentId/saspay/status */
async function getPaymentStatus(req, res) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "SasPay est désactivé (SASPAY_ENABLED != true).",
      });
    }

    const companyProfile = await prisma.companyProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, companyName: true, contactEmail: true },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Profil d'entreprise introuvable.",
      });
    }

    const payment = await loadPaymentContext(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paiement introuvable.",
      });
    }

    const ctx = contextParts(payment);

    if (!ctx || ctx.companyProfile.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne participez pas à cette collaboration.",
      });
    }

    const transaction = payment.sasPayTransactions?.[0] ?? null;

    if (!transaction || !transaction.providerId) {
      return res.status(200).json({
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          saspay: transaction ? { status: transaction.status } : null,
        },
      });
    }

    const upstream = await verifyPayment(transaction.providerId);
    const mapped = mapSasPayPaymentStatus(upstream.data?.status ?? "PENDING");

    // Ne jamais régresser un statut terminal local vers PENDING.
    if (["PENDING"].includes(mapped.paymentStatus) && ["PAID", "FAILED", "CANCELLED"].includes(payment.status)) {
      mapped.paymentStatus = payment.status;
    }

    const updated = await applySasPayResult({ payment, transaction, ctx, mapped, upstream });

    return res.status(200).json({
      success: true,
      payment: {
        id: updated.payment.id,
        status: updated.payment.status,
        transactionStatus: updated.transaction.status,
        providerReference: updated.payment.providerReference ?? null,
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la vérification du paiement :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la vérification du paiement.",
    });
  }
}

/** Applique un résultat vérifié auprès de SasPay et met à jour l'état local. */
async function applySasPayResult({ payment, transaction, ctx, mapped, upstream }) {
  const commissionBasis = commissionBps();
  const amounts = mapped.paymentStatus === "PAID"
    ? calculateCommission(payment.amount, commissionBasis)
    : null;

  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: mapped.paymentStatus,
        providerTransactionId: transaction.providerId ?? payment.providerTransactionId,
        providerReference: transaction.reference ?? payment.providerReference,
        paidAt: mapped.paymentStatus === "PAID" ? new Date() : null,
        commissionBps: amounts ? commissionBasis : payment.commissionBps,
        commissionAmount: amounts?.commissionAmount ?? payment.commissionAmount,
        creatorAmount: amounts?.creatorAmount ?? payment.creatorAmount,
      },
    });

    const updatedTransaction = await tx.sasPayTransaction.update({
      where: { id: transaction.id },
      data: {
        status: mapped.transactionStatus,
        reference: transaction.reference ?? upstream?.data?.reference ?? undefined,
        payload: upstream?.data ?? undefined,
      },
    });

    // Notifications et emails uniquement lors du passage à PAID.
    if (mapped.paymentStatus === "PAID" && payment.status !== "PAID") {
      const creatorUserId = ctx.creatorProfile.userId;
      const companyUserId = ctx.companyProfile.userId;

      await tx.notification.create({
        data: {
          userId: companyUserId,
          collaborationId: payment.collaborationId,
          type: "PAYMENT_STATUS_UPDATED",
          title: "Paiement reçu",
          message: `Le paiement de la collaboration liée à la campagne « ${ctx.campaignTitle} » a été confirmé.`,
        },
      });

      await tx.notification.create({
        data: {
          userId: creatorUserId,
          collaborationId: payment.collaborationId,
          type: "PAYMENT_STATUS_UPDATED",
          title: "Paiement reçu",
          message: `Le paiement de votre collaboration liée à la campagne « ${ctx.campaignTitle} » a été confirmé par l'entreprise.`,
        },
      });

      await enqueuePaymentReceivedEmail({
        to: ctx.companyProfile.contactEmail,
        displayName: ctx.companyProfile.companyName,
        amount: String(payment.amount),
        currency: payment.currency,
        campaignTitle: ctx.campaignTitle,
      }, tx);
    }

    return { payment: updatedPayment, transaction: updatedTransaction };
  });
}

module.exports = {
  initializePayment,
  getPaymentStatus,
  applySasPayResult,
  loadPaymentContext,
  contextParts,
};
