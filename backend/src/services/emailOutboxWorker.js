const {
  claimPendingEmails,
  markEmailSent,
  markEmailFailed,
  recoverStuckProcessingEmails,
} = require("./outboxService");
const { sendTemplatedEmail } = require("./emailService");

const DEFAULT_INTERVAL_MS = 30_000;

let timer = null;
let running = false;

/**
 * Traite un lot d'e-mails en attente.
 *
 * Les e-mails sont réclamés de façon atomique par claimPendingEmails :
 * plusieurs workers peuvent tourner en parallèle sans envoyer deux fois
 * le même message.
 *
 * @returns {Promise<number>} Nombre d'e-mails traités
 */
async function processEmailOutboxBatch() {
  const recovered = await recoverStuckProcessingEmails();

  if (recovered > 0) {
    console.log(
      `[EmailOutbox] ${recovered} tâche(s) bloquée(s) en PROCESSING remise(s) en attente.`,
    );
  }

  const emails = await claimPendingEmails();

  if (emails.length === 0) {
    return 0;
  }

  console.log(`[EmailOutbox] ${emails.length} e-mail(s) à traiter.`);

  for (const email of emails) {
    try {
      await sendTemplatedEmail({
        to: email.to,
        subject: email.subject,
        text: email.payload.text || "",
        html: email.payload.html || "",
      });

      await markEmailSent(email.id);
      console.log(`[EmailOutbox] E-mail envoyé : ${email.id} -> ${email.to}`);
    } catch (error) {
      await markEmailFailed(email.id, error);
      console.error(
        `[EmailOutbox] Échec de l'envoi ${email.id} -> ${email.to} : ${error.message}`,
      );
    }
  }

  return emails.length;
}

/**
 * Arrête la boucle de traitement.
 */
function stopEmailOutboxWorker() {
  running = false;

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Démarre la boucle de traitement de la file d'envoi.
 *
 * La boucle est idempotente : un second appel ne crée pas de seconde boucle.
 * Le minuteur n'empêche pas le processus de s'arrêter (unref).
 *
 * @param {{intervalMs?: number}} [options]
 * @returns {() => void} Fonction d'arrêt
 */
function startEmailOutboxWorker({ intervalMs } = {}) {
  if (running) {
    return stopEmailOutboxWorker;
  }

  const delay =
    Number.isFinite(intervalMs) && intervalMs > 0
      ? intervalMs
      : Number(process.env.EMAIL_OUTBOX_POLL_INTERVAL) || DEFAULT_INTERVAL_MS;

  running = true;

  const tick = async () => {
    if (!running) {
      return;
    }

    try {
      await processEmailOutboxBatch();
    } catch (error) {
      console.error(
        "[EmailOutbox] Erreur lors du traitement du lot :",
        error.message,
      );
    }

    if (running) {
      timer = setTimeout(tick, delay);
      timer.unref();
    }
  };

  tick();

  return stopEmailOutboxWorker;
}

module.exports = {
  processEmailOutboxBatch,
  startEmailOutboxWorker,
  stopEmailOutboxWorker,
};
