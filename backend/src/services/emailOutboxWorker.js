const nodemailer = require("nodemailer");

const {
  claimPendingEmails,
  markEmailSent,
  markEmailFailed,
  recoverStuckProcessingEmails,
} = require("./outboxService");

const DEFAULT_INTERVAL_MS = 30_000;

let transporter = null;

// Domaines réservés aux tests et à la documentation (jamais de vrais destinataires).
const REFUSED_RECIPIENT_DOMAINS = new Set([
  "filwork.local",
  "example.com",
  "example.org",
  "example.net",
  "localhost",
]);

/**
 * Refuse explicitement tout envoi vers un destinataire de test.
 * Appelé avant toute connexion SMTP : aucune adresse de test ne peut
 * atteindre un serveur SMTP réel depuis le worker.
 */
function isRefusedRecipient(to) {
  const domain = String(to || "").split("@")[1];

  if (!domain) {
    return true;
  }

  return REFUSED_RECIPIENT_DOMAINS.has(domain.trim().toLowerCase());
}

/**
 * Crée le transporteur SMTP uniquement lorsque l'envoi est nécessaire.
 * Aucune information secrète n'est journalisée.
 */
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !user ||
    !pass
  ) {
    throw new Error("La configuration SMTP est incomplète.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
    // Borner les délais pour ne pas dépasser le budget d'exécution de Vercel.
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 8_000,
  });

  return transporter;
}

/**
 * Envoie un e-mail via le transporteur SMTP.
 * Cette fonction est réservée au worker de la file d'envoi (outbox).
 * Aucun contrôleur ne doit l'appeler directement : tous les e-mails
 * doivent passer par la file persistante EmailOutbox.
 *
 * @param {{to: string, subject: string, text: string, html: string}} options
 * @returns {Promise<object>} Résultat de l'envoi Nodemailer
 */
async function sendSmtpEmail({ to, subject, text, html }) {
  if (process.env.NODE_ENV === "test") {
    throw new Error(
      "Envoi SMTP désactivé en environnement de test : les e-mails de test ne doivent jamais être distribués.",
    );
  }

  if (isRefusedRecipient(to)) {
    throw new Error(
      "Envoi refusé : destinataire sur un domaine de test ou de documentation.",
    );
  }

  if (
    typeof to !== "string" ||
    !to.trim() ||
    typeof subject !== "string" ||
    !subject.trim()
  ) {
    throw new Error("Le destinataire et le sujet de l'e-mail sont obligatoires.");
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const mailer = getTransporter();

  const info = await mailer.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(
        "[FILWORK] Aperçu de l'e-mail de test :",
        previewUrl,
      );
    }
  }

  return info;
}

let timer = null;
let running = false;

/**
 * Traite un lot d'e-mails en attente.
 *
 * Les e-mails sont réclamés de façon atomique par claimPendingEmails :
 * plusieurs workers peuvent tourner en parallèle sans envoyer deux fois
 * le même message.
 *
 * @param {{ sendSmtpEmailForTests?: (mail: {to: string, subject: string, text: string, html: string}) => Promise<object>, batchSize?: number }} [options]
 * @returns {Promise<number>} Nombre d'e-mails traités
 */
async function processEmailOutboxBatch(options = {}) {
  const injectedSend =
    typeof options.sendSmtpEmailForTests === "function"
      ? options.sendSmtpEmailForTests
      : undefined;

  // Le garde-fou « pas d'envoi SMTP en test » reste actif pour le chemin
  // d'appel réel : seul un injecteur explicite (tests automatisés) peut
  // exécuter le pipeline complet.
  if (process.env.NODE_ENV === "test" && !injectedSend) {
    console.log(
      "[EmailOutbox] Envoi SMTP désactivé en environnement de test : 0 e-mail(s) traité(s).",
    );
    return 0;
  }

  const send = injectedSend || sendSmtpEmail;
  const batchSize =
    Number.isInteger(options.batchSize) && options.batchSize > 0
      ? Math.floor(options.batchSize)
      : undefined;

  const recovered = await recoverStuckProcessingEmails();

  if (recovered > 0) {
    console.log(
      `[EmailOutbox] ${recovered} tâche(s) bloquée(s) en PROCESSING remise(s) en attente.`,
    );
  }

  const emails = await claimPendingEmails(batchSize);

  if (emails.length === 0) {
    return 0;
  }

  console.log(`[EmailOutbox] ${emails.length} e-mail(s) à traiter.`);

  for (const email of emails) {
    try {
      let payload = email.payload || {};

      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }

      await send({
        to: email.to,
        subject: email.subject,
        text: payload.text || "",
        html: payload.html || "",
      });

      await markEmailSent(email.id);
      console.log(`[EmailOutbox] E-mail envoyé : ${email.id}`);
    } catch (error) {
      await markEmailFailed(email.id, error);
      console.error(
        `[EmailOutbox] Échec de l'envoi ${email.id} : ${error.message}`,
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
  isRefusedRecipient,
};
