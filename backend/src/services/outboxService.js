const prisma = require("../config/prisma");

const EMAIL_BATCH_SIZE = Number(process.env.EMAIL_OUTBOX_BATCH_SIZE) || 50;

const DEFAULT_MAX_ATTEMPTS =
  Number(process.env.EMAIL_OUTBOX_MAX_ATTEMPTS) || 5;

const BACKOFF_DELAYS_MS = [60_000, 300_000, 900_000, 1_800_000, 3_600_000];

/**
 * Ajoute un e-mail à la file d'envoi persistante.
 *
 * @param {object} options
 * @param {string} options.to - Adresse e-mail du destinataire
 * @param {string} options.subject - Sujet de l'e-mail
 * @param {string} options.template - Nom du modèle d'e-mail
 * @param {object} options.payload - Données du modèle (sérialisable en JSON)
 * @param {number} [options.maxAttempts] - Nombre maximum de tentatives
 * @param {object|null} [tx] - Contexte transactionnel Prisma (optionnel)
 * @returns {Promise<object>} L'enregistrement EmailOutbox créé
 */
async function enqueueEmail({ to, subject, template, payload, maxAttempts }, tx = null) {
  if (typeof to !== "string" || !to.trim()) {
    throw new Error("Le destinataire de l'e-mail est obligatoire.");
  }

  if (typeof subject !== "string" || !subject.trim()) {
    throw new Error("Le sujet de l'e-mail est obligatoire.");
  }

  if (typeof template !== "string" || !template.trim()) {
    throw new Error("Le modèle d'e-mail est obligatoire.");
  }

  const client = tx || prisma;

  return client.emailOutbox.create({
    data: {
      to: to.trim(),
      subject: subject.trim(),
      template,
      payload: payload || {},
      maxAttempts:
        typeof maxAttempts === "number" && maxAttempts > 0
          ? maxAttempts
          : DEFAULT_MAX_ATTEMPTS,
    },
  });
}

/**
 * Récupère un lot d'e-mails en attente à envoyer.
 *
 * Marque les e-mails sélectionnés comme PROCESSING pour éviter les doubles
 * envois entre plusieurs instances du serveur.
 *
 * @param {number} [limit] - Nombre maximum d'e-mails à récupérer
 * @returns {Promise<Array>} Liste des e-mails à traiter
 */
async function claimPendingEmails(limit = EMAIL_BATCH_SIZE) {
  const now = new Date();

  // Réclamation atomique : la sous-requête verrouille les lignes
  // (FOR UPDATE SKIP LOCKED) et l'UPDATE ... RETURNING ne renvoie que les
  // e-mails effectivement réservés par cette instance. Deux workers
  // simultanés ne peuvent donc pas traiter le même e-mail.
  return prisma.$queryRaw`
    UPDATE "EmailOutbox"
    SET "status" = 'PROCESSING',
        "attempts" = "attempts" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" IN (
      SELECT "id"
      FROM "EmailOutbox"
      WHERE "status" = 'PENDING'
        AND "nextAttemptAt" <= ${now}
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
}

/**
 * Marque un e-mail comme envoyé avec succès.
 *
 * @param {string} emailId - Identifiant de l'e-mail dans la file
 * @returns {Promise<void>}
 */
async function markEmailSent(emailId) {
  await prisma.emailOutbox.update({
    where: { id: emailId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

/**
 * Marque un e-mail comme échoué et programme une nouvelle tentative
 * si le nombre maximum de tentatives n'est pas atteint.
 *
 * @param {string} emailId - Identifiant de l'e-mail dans la file
 * @param {Error} error - Erreur survenue lors de l'envoi
 * @returns {Promise<void>}
 */
async function markEmailFailed(emailId, error) {
  const email = await prisma.emailOutbox.findUnique({
    where: { id: emailId },
    select: { attempts: true, maxAttempts: true },
  });

  if (!email) {
    return;
  }

  const nextDelay = BACKOFF_DELAYS_MS[Math.min(email.attempts, BACKOFF_DELAYS_MS.length - 1)];

  if (email.attempts >= email.maxAttempts) {
    await prisma.emailOutbox.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        lastError: error.message,
      },
    });
    return;
  }

  const nextAttemptAt = new Date(Date.now() + nextDelay);

  await prisma.emailOutbox.update({
    where: { id: emailId },
    data: {
      status: "PENDING",
      nextAttemptAt,
      lastError: error.message,
    },
  });
}

/**
 * Récupère les e-mails bloqués en statut PROCESSING depuis trop longtemps
 * et les remet en attente pour traitement.
 *
 * @param {number} [maxAgeMs] - Âge maximal en millisecondes avant considération comme bloqué
 * @returns {Promise<number>} Nombre d'e-mails remis en attente
 */
async function recoverStuckProcessingEmails(maxAgeMs = 10 * 60 * 1000) {
  const threshold = new Date(Date.now() - maxAgeMs);

  const result = await prisma.emailOutbox.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: threshold },
    },
    data: {
      status: "PENDING",
    },
  });

  return result.count;
}

/**
 * Récupère les statistiques de la file d'envoi.
 *
 * @returns {Promise<object>} Nombre d'e-mails par statut
 */
async function getOutboxStats() {
  const counts = await prisma.emailOutbox.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const stats = {};
  for (const entry of counts) {
    stats[entry.status] = entry._count.status;
  }

  return {
    pending: stats.PENDING || 0,
    processing: stats.PROCESSING || 0,
    sent: stats.SENT || 0,
    failed: stats.FAILED || 0,
  };
}

module.exports = {
  enqueueEmail,
  claimPendingEmails,
  markEmailSent,
  markEmailFailed,
  recoverStuckProcessingEmails,
  getOutboxStats,
};