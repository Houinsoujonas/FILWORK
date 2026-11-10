const nodemailer = require("nodemailer");

let transporter = null;

/**
 * Vérifie la configuration SMTP et crée le transporteur
 * uniquement lorsque l'envoi d'un e-mail est nécessaire.
 */
function getTransporter() {
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
    throw new Error(
      "La configuration SMTP est incomplète.",
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

/**
 * Échappe les caractères spéciaux pour éviter
 * d'injecter du HTML dans le contenu du message.
 */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

/**
 * Envoie un e-mail contenant le lien de réinitialisation.
 *
 * @param {{to: string, resetUrl: string}} options
 */
async function sendPasswordResetEmail({ to, resetUrl }) {
  if (
    typeof to !== "string" ||
    !to.trim() ||
    typeof resetUrl !== "string" ||
    !resetUrl.trim()
  ) {
    throw new Error(
      "Le destinataire et le lien de réinitialisation sont obligatoires.",
    );
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const safeResetUrl = escapeHtml(resetUrl);

  const mailOptions = {
    from,
    to,
    subject: "Réinitialisation de votre mot de passe FILWORK",

    text: [
      "Bonjour,",
      "",
      "Vous avez demandé la réinitialisation de votre mot de passe FILWORK.",
      "",
      `Pour choisir un nouveau mot de passe, ouvrez ce lien : ${resetUrl}`,
      "",
      "Ce lien expire après 15 minutes et ne peut être utilisé qu'une seule fois.",
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
      "",
      "L'équipe FILWORK",
    ].join("\n"),

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>Réinitialisation de votre mot de passe</h2>

        <p>Bonjour,</p>

        <p>
          Vous avez demandé la réinitialisation de votre mot de passe FILWORK.
        </p>

        <p>
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>

        <p>
          <a
            href="${safeResetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background-color: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Réinitialiser mon mot de passe
          </a>
        </p>

        <p>
          Ce lien expire après 15 minutes et ne peut être utilisé qu'une seule fois.
        </p>

        <p>
          Si vous n'êtes pas à l'origine de cette demande,
          vous pouvez ignorer cet e-mail.
        </p>

        <p>L'équipe FILWORK</p>
      </div>
    `,
  };

  const mailer = getTransporter();

const info = await mailer.sendMail(mailOptions);

  if (process.env.NODE_ENV !== "production") {
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(
        "[FILWORK] Aperçu de l'e-mail de test :",
        previewUrl,
      );
    }
  }
}

/**
 * Envoie un e-mail directement via le transporteur SMTP.
 * Utilisé par le processeur de la file d'envoi (outbox).
 *
 * @param {{to: string, subject: string, text: string, html: string}} options
 * @returns {Promise<object>} Résultat de l'envoi Nodemailer
 */
async function sendTemplatedEmail({ to, subject, text, html }) {
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

const outboxService = require("./outboxService");

/**
 * Ajoute un e-mail de bienvenue à la file d'envoi.
 * L'échec de l'ajout à la file ne fait pas échouer l'appelant.
 *
 * @param {{to: string, displayName?: string, role: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueueWelcomeEmail({ to, displayName, role }) {
  try {
    const { welcomeEmail } = require("./emailTemplates");
    const email = welcomeEmail({ to, displayName, role });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "welcome",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        role,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de bienvenue :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail de proposition de collaboration à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, companyName?: string, campaignTitle?: string, link?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueueCollaborationEmail({ to, displayName, companyName, campaignTitle, link }) {
  try {
    const { collaborationProposalEmail } = require("./emailTemplates");
    const email = collaborationProposalEmail({ to, displayName, companyName, campaignTitle, link });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "collaboration_proposal",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        companyName,
        campaignTitle,
        link,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de collaboration :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail de code de réinitialisation à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, code: string, resetUrl?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueuePasswordResetCodeEmail({ to, displayName, code, resetUrl }) {
  try {
    const { passwordResetCodeEmail } = require("./emailTemplates");
    const email = passwordResetCodeEmail({ to, displayName, code, resetUrl });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "password_reset_code",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        code,
        resetUrl,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de code de réinitialisation :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail de nouvelle candidature à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, creatorName?: string, campaignTitle?: string, link?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueueNewApplicationEmail({ to, displayName, creatorName, campaignTitle, link }) {
  try {
    const { newApplicationEmail } = require("./emailTemplates");
    const email = newApplicationEmail({ to, displayName, creatorName, campaignTitle, link });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "new_application",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        creatorName,
        campaignTitle,
        link,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de candidature :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail d'annonce administrative à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, title: string, body: string, link?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueueAnnouncementEmail({ to, displayName, title, body, link }) {
  try {
    const { announcementEmail } = require("./emailTemplates");
    const email = announcementEmail({ to, displayName, title, body, link });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "announcement",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        title,
        body,
        link,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail d'annonce :", error.message);
    return null;
  }
}

module.exports = {
  escapeHtml,
  sendPasswordResetEmail,
  sendTemplatedEmail,
  enqueueWelcomeEmail,
  enqueueCollaborationEmail,
  enqueueNewApplicationEmail,
  enqueuePasswordResetCodeEmail,
  enqueueAnnouncementEmail,
};