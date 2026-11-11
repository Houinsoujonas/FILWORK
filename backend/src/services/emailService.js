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

const outboxService = require("./outboxService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Ajoute un e-mail de bienvenue à la file d'envoi.
 * L'échec de l'ajout à la file ne fait pas échouer l'appelant.
 *
 * @param {{to: string, displayName?: string, role: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueueWelcomeEmail({ to, displayName, role }, tx = null) {
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
    }, tx);
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
async function enqueueCollaborationEmail({ to, displayName, companyName, campaignTitle, link }, tx = null) {
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
    }, tx);
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
async function enqueuePasswordResetCodeEmail({ to, displayName, code, resetUrl }, tx = null) {
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
    }, tx);
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
async function enqueueNewApplicationEmail({ to, displayName, creatorName, campaignTitle, link }, tx = null) {
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
    }, tx);
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
async function enqueueAnnouncementEmail({ to, displayName, title, body, link }, tx = null) {
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
    }, tx);
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail d'annonce :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail de notification de clôture de campagne à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, campaignTitle?: string, link?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueueCampaignClosedEmail({ to, displayName, campaignTitle, link }, tx = null) {
  try {
    const { campaignClosedEmail } = require("./emailTemplates");
    const email = campaignClosedEmail({ to, displayName, campaignTitle, link });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "campaign_closed",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        campaignTitle,
        link,
      },
    }, tx);
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de clôture de campagne :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail de confirmation de paiement reçu (entreprise) à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, amount?: string, currency?: string, campaignTitle?: string, link?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueuePaymentReceivedEmail({ to, displayName, amount, currency, campaignTitle, link }, tx = null) {
  try {
    if (!EMAIL_REGEX.test(String(to || "").trim())) {
      console.error("Email de paiement reçu non mis en file : adresse invalide.");
      return null;
    }

    const { paymentReceivedEmail } = require("./emailTemplates");
    const email = paymentReceivedEmail({ to, displayName, amount, currency, campaignTitle, link });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "payment_received",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        amount,
        currency,
        campaignTitle,
        link,
      },
    }, tx);
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de paiement reçu :", error.message);
    return null;
  }
}

/**
 * Ajoute un e-mail de notification de reversement initié (créateur) à la file d'envoi.
 *
 * @param {{to: string, displayName?: string, amount?: string, currency?: string, link?: string}} options
 * @returns {Promise<object|null>}
 */
async function enqueuePayoutSentEmail({ to, displayName, amount, currency, link }, tx = null) {
  try {
    if (!EMAIL_REGEX.test(String(to || "").trim())) {
      console.error("Email de reversement non mis en file : adresse invalide.");
      return null;
    }

    const { payoutSentEmail } = require("./emailTemplates");
    const email = payoutSentEmail({ to, displayName, amount, currency, link });

    return outboxService.enqueueEmail({
      to: email.to,
      subject: email.subject,
      template: "payout_sent",
      payload: {
        text: email.text,
        html: email.html,
        displayName,
        amount,
        currency,
        link,
      },
    }, tx);
  } catch (error) {
    console.error("Erreur lors de la mise en file de l'e-mail de reversement :", error.message);
    return null;
  }
}

module.exports = {
  escapeHtml,
  enqueueWelcomeEmail,
  enqueueCollaborationEmail,
  enqueueNewApplicationEmail,
  enqueuePasswordResetCodeEmail,
  enqueueAnnouncementEmail,
  enqueueCampaignClosedEmail,
  enqueuePaymentReceivedEmail,
  enqueuePayoutSentEmail,
};