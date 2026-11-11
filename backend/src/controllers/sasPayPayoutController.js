const crypto = require("node:crypto");

const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const {
  isConfigured,
  commissionBps,
  calculateCommission,
  initializePayout,
  verifyPayout,
} = require("../services/sasPayService");
const { enqueuePayoutSentEmail } = require("../services/emailService");
const { loadPaymentContext, contextParts } = require("./sasPayController");

const NETWORKS = {
  celtiis_bj: "Celtiis Cash",
  moov_bj: "Moov Money Benin",
  mtn_bj: "MTN MoMo Benin",
};

const PAYOUT_COUNTRIES = new Set(["BJ"]);

/**
 * POST /api/payouts/:paymentId/saspay/initialize
 *
 * Déclenche manuellement le reversement au créateur, sous contrôle d'un
 * administrateur. Préconditions :
 *   - la collaboration associée est clôturée (prestation validée) ;
 *   - le créateur a renseigné ses coordonnées de reversement ;
 *   - SasPay est configuré et le marchand est autorisé aux payouts.
 *
 * Aucune rémunération n'est versée sans action explicite d'un administrateur.
 */
async function initializePayoutForPayment(req, res) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Le paiement SasPay n'est pas configuré sur ce serveur (SASPAY_API_KEY manquante).",
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

    if (!ctx) {
      return res.status(409).json({
        success: false,
        message: "Impossible d'identifier la collaboration de ce paiement.",
      });
    }

    if (ctx.collaboration.status !== "COMPLETED") {
      return res.status(409).json({
        success: false,
        message: "Le reversement n'est possible que pour une collaboration clôturée (prestation validée).",
        currentStatus: ctx.collaboration.status,
      });
    }

    if (payment.status !== "PAID") {
      return res.status(409).json({
        success: false,
        message: "Le reversement exige un paiement confirmé au préalable.",
        currentStatus: payment.status,
      });
    }

    const creator = ctx.creatorProfile;

    if (!creator.payoutMsisdn || !creator.payoutNetwork || !creator.payoutCountry) {
      return res.status(400).json({
        success: false,
        message: "Le créateur n'a pas renseigné ses coordonnées de reversement (payoutMsisdn, payoutNetwork, payoutCountry).",
      });
    }

    if (!NETWORKS[creator.payoutNetwork]) {
      return res.status(400).json({
        success: false,
        message: "Réseau de reversement invalide pour le créateur. Réseaux acceptés : celtiis_bj, moov_bj, mtn_bj.",
      });
    }

    if (!PAYOUT_COUNTRIES.has(creator.payoutCountry)) {
      return res.status(400).json({
        success: false,
        message: "Pays de reversement non pris en charge pour ce réseau (BJ uniquement).",
      });
    }

    const commission = commissionBps();
    const amounts = calculateCommission(payment.amount, commission);
    const payoutAmount = amounts.creatorAmount;

    const idempotencyKey = crypto.randomUUID();

    const transaction = await prisma.sasPayTransaction.create({
      data: {
        paymentId: payment.id,
        direction: "PAYOUT",
        amount: payoutAmount,
        currency: payment.currency,
        status: "PENDING",
        network: creator.payoutNetwork,
        msisdn: creator.payoutMsisdn,
        idempotencyKey,
      },
    });

    const creatorUser = await prisma.user.findUnique({
      where: { id: creator.userId },
      select: { email: true },
    });

    const customer = {
      email: creatorUser?.email ?? "no-reply@example.com",
      first_name: creator.displayName ?? "Créateur",
      last_name: "FILWORK",
      phone: creator.payoutMsisdn,
    };

    const upstream = await initializePayout({
      amount: payoutAmount,
      currency: payment.currency,
      country: creator.payoutCountry,
      method: creator.payoutNetwork,
      recipient: { msisdn: creator.payoutMsisdn },
      customer,
      description: `Reversement collaboration « ${ctx.campaignTitle} » — paiement ${payment.providerTransactionId ?? payment.id}`,
      metadata: { paymentId: payment.id, collaborationId: payment.collaborationId, commissionBps: commission },
      idempotencyKey,
    });

    if (!upstream.success) {
      await prisma.sasPayTransaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", payload: upstream.error ?? undefined },
      });

      const code = upstream.error?.code ?? null;

      if (code === "payout_not_enabled" || code === "ip_not_whitelisted") {
        return res.status(503).json({
          success: false,
          message: "Le reversement SasPay n'est pas activé pour ce marchand. Demandez l'activation et la whitelist d'IP au support SasPay.",
          upstreamCode: code,
        });
      }

      return res.status(502).json({
        success: false,
        message: "Le reversement n'a pas pu être initié auprès du prestataire.",
        upstreamCode: code,
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
        commissionBps: commission,
        commissionAmount: amounts.commissionAmount,
        creatorAmount: amounts.creatorAmount,
      },
    });

    await enqueuePayoutSentEmail({
      to: creatorUser?.email,
      displayName: creator.displayName,
      amount: amounts.creatorAmount,
      currency: payment.currency,
    });

    return res.status(201).json({
      success: true,
      message: "Reversement initié. Le créateur sera notifié à la confirmation.",
      payout: {
        transactionId: updated.id,
        reference: updated.reference ?? null,
        amount: payoutAmount,
        currency: payment.currency,
        commission: amounts.commissionAmount,
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors du reversement :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du reversement.",
    });
  }
}

/** GET /api/payouts/:paymentId/saspay/verify */
async function verifyPayoutForPayment(req, res) {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: "SasPay est désactivé (SASPAY_ENABLED != true).",
      });
    }

    const payment = await loadPaymentContext(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paiement introuvable.",
      });
    }

    const payout = payment.sasPayTransactions?.find((t) => t.direction === "PAYOUT") ?? null;

    if (!payout || !payout.providerId) {
      return res.status(200).json({
        success: true,
        payout: payout ? { status: payout.status } : null,
      });
    }

    const upstream = await verifyPayout(payout.providerId);
    const status = upstream.data?.status ?? "PENDING";
    const mapped = status === "SUCCESS" ? "SUCCESS" : status === "FAILED" ? "FAILED" : status === "CANCELLED" ? "CANCELLED" : "PENDING";

    const updated = await prisma.sasPayTransaction.update({
      where: { id: payout.id },
      data: { status: mapped, payload: upstream.data ?? undefined },
    });

    return res.status(200).json({
      success: true,
      payout: {
        id: updated.id,
        reference: updated.reference ?? null,
        status: updated.status,
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la vérification du reversement :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la vérification du reversement.",
    });
  }
}

module.exports = {
  initializePayoutForPayment,
  verifyPayoutForPayment,
};
