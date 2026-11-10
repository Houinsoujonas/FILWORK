const prisma = require("../config/prisma");
const {
  enqueueWelcomeEmail,
  enqueueCollaborationEmail,
  enqueueNewApplicationEmail,
  enqueuePasswordResetCodeEmail,
  enqueueAnnouncementEmail,
} = require("./emailService");

const EMAIL_LINK_BASE =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");

function buildLink(path) {
  if (!EMAIL_LINK_BASE) {
    return path;
  }
  return `${EMAIL_LINK_BASE.replace(/\/$/, "")}${path}`;
}

/**
 * Récupère les préférences de communication d'un utilisateur.
 * Crée des préférences par défaut si elles n'existent pas encore.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getOrCreatePreferences(userId) {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return preferences;
}

/**
 * Vérifie si un type de notification par email est autorisé pour l'utilisateur.
 *
 * @param {string} userId
 * @param {string} category - "collaborationEmails", "announcementEmails", "notificationEmails"
 * @returns {Promise<boolean>}
 */
async function isEmailEnabled(userId, category) {
  const preferences = await getOrCreatePreferences(userId);
  return preferences[category] !== false;
}

/**
 * Crée une notification interne et met en file l'e-mail associé si les
 * préférences de l'utilisateur le permettent.
 *
 * L'échec de la mise en file de l'e-mail ne fait pas échouer la création
 * de la notification.
 *
 * @param {object} options
 * @param {string} options.userId - Destinataire de la notification
 * @param {string} options.type - Type NotificationType
 * @param {string} options.title - Titre de la notification
 * @param {string} options.message - Contenu de la notification
 * @param {string} [options.link] - Lien vers la ressource concernée
 * @param {string} [options.applicationId]
 * @param {string} [options.invitationId]
 * @param {string} [options.collaborationId]
 * @param {string} [options.announcementId]
 * @param {object} [options.email] - Options d'e-mail (to, template, payload)
 * @param {boolean} [options.sendEmail=true] - Si l'e-mail doit être mis en file
 * @returns {Promise<object>} La notification créée
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  applicationId,
  invitationId,
  collaborationId,
  announcementId,
  email,
  sendEmail = true,
}) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      applicationId,
      invitationId,
      collaborationId,
      announcementId,
    },
  });

  if (sendEmail && email) {
    const emailEnabled = await isEmailEnabled(
      userId,
      email.preferenceCategory || "notificationEmails",
    );

    if (emailEnabled) {
      try {
        switch (email.template) {
          case "welcome":
            await enqueueWelcomeEmail({
              to: email.to,
              displayName: email.displayName,
              role: email.role,
            });
            break;
          case "collaboration_proposal":
            await enqueueCollaborationEmail({
              to: email.to,
              displayName: email.displayName,
              companyName: email.companyName,
              campaignTitle: email.campaignTitle,
              link: email.link,
            });
            break;
          case "new_application":
            await enqueueNewApplicationEmail({
              to: email.to,
              displayName: email.displayName,
              creatorName: email.creatorName,
              campaignTitle: email.campaignTitle,
              link: email.link,
            });
            break;
          case "password_reset_code":
            await enqueuePasswordResetCodeEmail({
              to: email.to,
              displayName: email.displayName,
              code: email.code,
              resetUrl: email.resetUrl,
            });
            break;
          case "announcement":
            await enqueueAnnouncementEmail({
              to: email.to,
              displayName: email.displayName,
              title: email.title,
              body: email.body,
              link: email.link,
            });
            break;
          default: {
            // Modèle générique : mise en file directe
            const { enqueueEmail } = require("./outboxService");
            await enqueueEmail({
              to: email.to,
              subject: email.subject || title,
              template: "generic",
              payload: {
                text: email.text || message,
                html: email.html || message,
              },
            });
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la mise en file de l'e-mail de notification :",
          error.message,
        );
      }
    }
  }

  return notification;
}

/**
 * Crée des notifications pour plusieurs utilisateurs dans une seule transaction.
 * Utilisé notamment pour les annonces administratives ciblées.
 *
 * @param {object} prismaClient - Instance Prisma (transaction ou client principal)
 * @param {Array} notifications - Liste des notifications à créer
 * @returns {Promise<Array>} Notifications créées
 */
async function createManyNotifications(prismaClient, notifications) {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  return prismaClient.notification.createMany({
    data: notifications.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      applicationId: n.applicationId,
      invitationId: n.invitationId,
      collaborationId: n.collaborationId,
      announcementId: n.announcementId,
    })),
  });
}

module.exports = {
  createNotification,
  createManyNotifications,
  getOrCreatePreferences,
  isEmailEnabled,
  buildLink,
};