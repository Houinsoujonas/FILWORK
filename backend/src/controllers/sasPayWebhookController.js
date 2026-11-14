const prisma = require("../config/prisma");
const {
  verifyPayment,
  verifyPayout,
  calculateCommission,
  verifyWebhookSignature,
} = require("../services/sasPayService");
const {
  enqueuePayoutSentEmail,
} = require("../services/emailService");
const { applySasPayResult } = require("./sasPayController");
const { isConfigured } = require("../services/sasPayService");

const SECRET = () => process.env.SASPAY_WEBHOOK_SECRET || "";

/**
 * POST /api/webhooks/saspay
 *
 * Le corps est un Buffer brut (voir montage express.raw dans app.js).
 * La signature X-Webhook-Signature est vérifiée avant tout traitement.
 * Le statut réel est systématiquement revérifié auprès de l'API SasPay :
 * le webhook ne fait jamais foi à lui seul.
 * Le traitement est idempotent : un event rejoué est ignoré (200).
 */
async function handleSasPayWebhook(req, res) {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Les webhooks SasPay sont désactivés (SASPAY_ENABLED != true).",
    });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ""));

  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  if (!verifyWebhookSignature({ rawBody, signature, timestamp, secret: SECRET() })) {
    return res.status(400).json({
      success: false,
      message: "Signature ou horodatage invalide.",
    });
  }

  let payload;

  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({
      success: false,
      message: "Corps JSON invalide.",
    });
  }

  const event = payload?.event;
  const data = payload?.data ?? {};

  if (typeof event !== "string" || !data || typeof data !== "object") {
    return res.status(400).json({
      success: false,
      message: "Enveloppe SasPay invalide.",
    });
  }

  // Revérifier l'état réel auprès de SasPay avant de modifier l'état local.
  const upstreamId = data.id;

  if (!upstreamId) {
    return res.status(200).json({ success: true, ignored: true, reason: "no-id" });
  }

  const transaction = await prisma.sasPayTransaction.findFirst({
    where: {
      OR: [{ providerId: String(upstreamId) }, { reference: data.reference ? String(data.reference) : undefined }].filter(Boolean),
    },
    include: {
      payment: {
        include: {
          collaboration: {
            include: {
              application: {
                select: {
                  campaign: { select: { title: true, companyProfileId: true, companyProfile: { select: { userId: true, companyName: true, contactEmail: true } } } },
                  creatorProfile: { select: { userId: true, displayName: true } },
                },
              },
              invitation: {
                select: {
                  campaign: { select: { title: true, companyProfileId: true, companyProfile: { select: { userId: true, companyName: true, contactEmail: true } } } },
                  creatorProfile: { select: { userId: true, displayName: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    return res.status(200).json({ success: true, ignored: true, reason: "unknown-transaction" });
  }

  const isPayin = transaction.direction === "PAYIN";

  const upstream = isPayin
    ? await verifyPayment(transaction.providerId ?? upstreamId)
    : await verifyPayout(transaction.providerId ?? upstreamId);

  const status = upstream.data?.status ?? "PENDING";

  // Idempotence : ne rien réappliquer si l'état local est déjà terminal.
  if (transaction.status === "SUCCESS" && status === "SUCCESS") {
    return res.status(200).json({ success: true, idempotent: true });
  }

  const ctx = transaction.payment ? {
    campaignTitle: (transaction.payment.collaboration?.application?.campaign?.title
      ?? transaction.payment.collaboration?.invitation?.campaign?.title
      ?? "la campagne"),
    companyProfile: (transaction.payment.collaboration?.application?.campaign?.companyProfile
      ?? transaction.payment.collaboration?.invitation?.campaign?.companyProfile),
    creatorProfile: (transaction.payment.collaboration?.application?.creatorProfile
      ?? transaction.payment.collaboration?.invitation?.creatorProfile),
    collaborationId: transaction.payment.collaborationId,
  } : null;

  if (isPayin) {
    const mapped = status === "SUCCESS"
      ? { paymentStatus: "PAID", transactionStatus: "SUCCESS" }
      : status === "FAILED"
        ? { paymentStatus: "FAILED", transactionStatus: "FAILED" }
        : status === "CANCELLED"
          ? { paymentStatus: "CANCELLED", transactionStatus: "CANCELLED" }
          : { paymentStatus: "PENDING", transactionStatus: "PENDING" };

    const payment = transaction.payment;
    if (payment) {
      await applySasPayResult({ payment, transaction, ctx: {
        ...(ctx ?? {}),
        creatorProfile: { userId: ctx?.creatorProfile?.userId ?? "" },
      }, mapped, upstream });
    } else {
      await prisma.sasPayTransaction.update({
        where: { id: transaction.id },
        data: { status: mapped.transactionStatus, payload: upstream.data ?? undefined },
      });
    }

    return res.status(200).json({ success: true });
  }

  // PAYOUT
  const payoutStatus = status === "SUCCESS" ? "SUCCESS" : status === "FAILED" ? "FAILED" : status === "CANCELLED" ? "CANCELLED" : "PENDING";

  await prisma.$transaction(async (tx) => {
    await tx.sasPayTransaction.update({
      where: { id: transaction.id },
      data: { status: payoutStatus, payload: upstream.data ?? undefined },
    });

    if (payoutStatus === "SUCCESS" && transaction.payment) {
      const creatorUserId = ctx?.creatorProfile?.userId;

      if (creatorUserId) {
        await tx.notification.create({
          data: {
            userId: creatorUserId,
            collaborationId: transaction.payment.collaborationId,
            type: "PAYMENT_STATUS_UPDATED",
            title: "Reversement effectué",
            message: `La rémunération de votre collaboration liée à la campagne « ${ctx?.campaignTitle ?? "la campagne"} » a été versée.`,
          },
        });
      }

      if (ctx?.creatorProfile && transaction.payment) {
        const amounts = transaction.payment.commissionBps > 0
          ? calculateCommission(transaction.payment.amount, transaction.payment.commissionBps)
          : null;

        await enqueuePayoutSentEmail({
          to: ctx.creatorProfile.userId
            ? (await tx.user.findUnique({ where: { id: ctx.creatorProfile.userId }, select: { email: true } }))?.email
            : undefined,
          displayName: ctx.creatorProfile.displayName,
          amount: amounts?.creatorAmount ?? String(transaction.payment.amount),
          currency: transaction.payment.currency,
        }, tx);
      }
    }
  });

  return res.status(200).json({ success: true });
}

module.exports = {
  handleSasPayWebhook,
};
