const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");

/**
 * Récupérer les préférences de communication de l'utilisateur connecté.
 */
async function getMyPreferences(req, res) {
  try {
    const userId = req.user.id;

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Préférences de communication récupérées avec succès.",
      preferences: {
        collaborationEmails: preferences.collaborationEmails,
        announcementEmails: preferences.announcementEmails,
        notificationEmails: preferences.notificationEmails,
        updatedAt: preferences.updatedAt,
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la récupération des préférences :",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération des préférences.",
    });
  }
}

/**
 * Mettre à jour les préférences de communication de l'utilisateur connecté.
 * Les e-mails de sécurité (réinitialisation du mot de passe) ne peuvent pas
 * être désactivés (ils ne figurent pas dans les préférences modifiables).
 */
async function updateMyPreferences(req, res) {
  try {
    const userId = req.user.id;
    const body = req.body || {};

    const { collaborationEmails, announcementEmails, notificationEmails } = body;

    const updateData = {};

    if (typeof collaborationEmails === "boolean") {
      updateData.collaborationEmails = collaborationEmails;
    }

    if (typeof announcementEmails === "boolean") {
      updateData.announcementEmails = announcementEmails;
    }

    if (typeof notificationEmails === "boolean") {
      updateData.notificationEmails = notificationEmails;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune préférence à mettre à jour.",
      });
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId, ...updateData },
      });
    } else {
      preferences = await prisma.notificationPreference.update({
        where: { userId },
        data: updateData,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Préférences de communication mises à jour avec succès.",
      preferences: {
        collaborationEmails: preferences.collaborationEmails,
        announcementEmails: preferences.announcementEmails,
        notificationEmails: preferences.notificationEmails,
        updatedAt: preferences.updatedAt,
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la mise à jour des préférences :",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la mise à jour des préférences.",
    });
  }
}

module.exports = {
  getMyPreferences,
  updateMyPreferences,
};