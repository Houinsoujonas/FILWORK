const { escapeHtml } = require("./emailService");

const FRONTEND_URL =
  process.env.FRONTEND_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");

function buildUrl(path) {
  if (!FRONTEND_URL) {
    return path;
  }
  return `${FRONTEND_URL.replace(/\/$/, "")}${path}`;
}

// Salutation sans virgule orpheline lorsqu'aucun nom n'est disponible.
function greeting(name) {
  return name ? `Bonjour ${name},` : "Bonjour,";
}

/**
 * Modèle d'e-mail de bienvenue après inscription.
 *
 * @param {{to: string, displayName?: string, role: string}} options
 */
function welcomeEmail({ to, displayName, role }) {
  const name = escapeHtml(displayName || "");
  const isCreator = role === "CREATOR";
  const subject = isCreator
    ? "Bienvenue sur FILWORK - Votre espace créateur"
    : "Bienvenue sur FILWORK - Votre espace entreprise";

  const dashboardPath = isCreator ? "/espace/createur" : "/espace/entreprise";
  const dashboardUrl = buildUrl(dashboardPath);

  const roleIntro = isCreator
    ? "Vous êtes maintenant inscrit en tant que créateur de contenu. Vous pouvez découvrir des campagnes, soumettre vos candidatures et gérer vos collaborations."
    : "Vous êtes maintenant inscrit en tant qu'entreprise. Vous pouvez créer des campagnes, inviter des créateurs et gérer vos collaborations."

  const roleCTA = isCreator
    ? "Découvrir les campagnes"
    : "Créer ma première campagne";

  const text = [
    greeting(name),
    "",
    "Bienvenue sur FILWORK !",
    "",
    "Votre compte a été créé avec succès. " + roleIntro,
    "",
    "Connectez-vous à votre espace pour commencer : " + dashboardUrl,
    "",
    "L'équipe FILWORK",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Bienvenue sur FILWORK</h2>
      <p>${greeting(name)}</p>
      <p>Votre compte a été créé avec succès sur FILWORK.</p>
      <p>${roleIntro}</p>
      <p>
        <a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
          ${roleCTA}
        </a>
      </p>
      <p>L'équipe FILWORK</p>
    </div>
  `;

  return { to, subject, text, html };
}

/**
 * Modèle d'e-mail de notification de collaboration (invitation / proposition).
 *
 * @param {{to: string, displayName?: string, companyName?: string, campaignTitle?: string, link?: string}} options
 */
function collaborationProposalEmail({ to, displayName, companyName, campaignTitle, link }) {
  const name = escapeHtml(displayName || "");
  const company = escapeHtml(companyName || "");
  const campaign = escapeHtml(campaignTitle || "");
  const url = escapeHtml(link || buildUrl("/espace/createur/invitations"));

  const subject = `Nouvelle proposition de collaboration sur FILWORK${campaign ? ` - ${campaign}` : ""}`;

  const text = [
    greeting(name),
    "",
    company ? `L'entreprise ${company} vous a adressé une proposition de collaboration sur FILWORK.` : "Vous avez reçu une nouvelle proposition de collaboration sur FILWORK.",
    "",
    campaign ? `Campagne : ${campaign}` : "",
    "",
    "Connectez-vous à votre espace pour découvrir les détails et donner suite à cette opportunité :",
    url,
    "",
    "L'équipe FILWORK",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Nouvelle proposition de collaboration</h2>
      <p>${greeting(name)}</p>
      <p>
        ${company ? `L'entreprise <strong>${company}</strong> vous a adressé une proposition de collaboration sur FILWORK.` : "Vous avez reçu une nouvelle proposition de collaboration sur FILWORK."}
      </p>
      ${campaign ? `<p><strong>Campagne :</strong> ${campaign}</p>` : ""}
      <p>
        Connectez-vous à votre espace pour découvrir les détails et donner suite à cette opportunité :
      </p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Voir la proposition
        </a>
      </p>
      <p>L'équipe FILWORK</p>
    </div>
  `;

  return { to, subject, text, html };
}

/**
 * Modèle d'e-mail de code de réinitialisation du mot de passe.
 *
 * @param {{to: string, displayName?: string, code: string, resetUrl?: string}} options
 */
function passwordResetCodeEmail({ to, displayName, code, resetUrl }) {
  const name = escapeHtml(displayName || "");
  const safeCode = escapeHtml(code);
  const safeResetUrl = resetUrl ? escapeHtml(resetUrl) : "";

  const subject = "Votre code de réinitialisation FILWORK";

  const text = [
    greeting(name),
    "",
    "Vous avez demandé la réinitialisation de votre mot de passe FILWORK.",
    "",
    "Votre code de vérification est : " + safeCode,
    "",
    "Ce code est valable pendant 15 minutes.",
    "",
    safeResetUrl ? "Saisir le code : " + safeResetUrl : "",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    "",
    "L'équipe FILWORK",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Réinitialisation de votre mot de passe</h2>
      <p>${greeting(name)}</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe FILWORK.</p>
      <p>
        Votre code de vérification est :
      </p>
      <p style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        ${safeCode}
      </p>
      <p>Ce code est valable pendant 15 minutes.</p>
      ${
        safeResetUrl
          ? `<p>
        <a href="${safeResetUrl}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Saisir le code
        </a>
      </p>`
          : ""
      }
      <p>
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
      </p>
      <p>L'équipe FILWORK</p>
    </div>
  `;

  return { to, subject, text, html };
}

/**
 * Modèle d'e-mail notifiant une entreprise d'une nouvelle candidature.
 *
 * @param {{to: string, displayName?: string, creatorName?: string, campaignTitle?: string, link?: string}} options
 */
function newApplicationEmail({ to, displayName, creatorName, campaignTitle, link }) {
  const name = escapeHtml(displayName || "");
  const creator = escapeHtml(creatorName || "Un créateur");
  const campaign = escapeHtml(campaignTitle || "");
  const url = escapeHtml(link || buildUrl("/espace/entreprise/campagnes"));

  const subject = `Nouvelle candidature sur FILWORK${campaign ? ` - ${campaign}` : ""}`;

  const text = [
    greeting(name),
    "",
    `${creator} a candidaté à votre campagne${campaign ? ` « ${campaign} »` : ""} sur FILWORK.`,
    "",
    "Consultez les candidatures depuis votre espace entreprise :",
    url,
    "",
    "L'équipe FILWORK",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Nouvelle candidature</h2>
      <p>${greeting(name)}</p>
      <p>
        <strong>${creator}</strong> a candidaté à votre campagne${campaign ? ` <strong>${campaign}</strong>` : ""} sur FILWORK.
      </p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Voir les candidatures
        </a>
      </p>
      <p>L'équipe FILWORK</p>
    </div>
  `;

  return { to, subject, text, html };
}

/**
 * Modèle d'e-mail d'annonce administrative.
 *
 * @param {{to: string, displayName?: string, title: string, body: string, link?: string}} options
 */
function announcementEmail({ to, displayName, title, body, link }) {
  const name = escapeHtml(displayName || "");
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const url = escapeHtml(link || buildUrl("/"));

  const subject = `FILWORK - ${safeTitle}`;

  const text = [
    greeting(name),
    "",
    "Une nouvelle annonce a été publiée sur FILWORK :",
    "",
    safeTitle,
    "",
    safeBody,
    "",
    "Consulter l'annonce : " + url,
    "",
    "L'équipe FILWORK",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">${safeTitle}</h2>
      <p>${greeting(name)}</p>
      <p>Une nouvelle annonce a été publiée sur FILWORK.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        ${safeBody.replace(/\n/g, "<br>")}
      </div>
      <p>
        <a href="${url}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Consulter l'annonce
        </a>
      </p>
      <p>L'équipe FILWORK</p>
    </div>
  `;

  return { to, subject, text, html };
}

module.exports = {
  welcomeEmail,
  collaborationProposalEmail,
  newApplicationEmail,
  passwordResetCodeEmail,
  announcementEmail,
};