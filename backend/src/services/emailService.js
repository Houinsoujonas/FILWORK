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

module.exports = {
  sendPasswordResetEmail,
};