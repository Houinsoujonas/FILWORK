const prisma = require("../config/prisma");

/**
 * Récupérer les notifications de l'utilisateur connecté.
 */
/**
 * Récupérer les notifications de l'utilisateur connecté.
 */
async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          readAt: true,
          createdAt: true,

          // Informations liées à une candidature.
          application: {
            select: {
              id: true,
              status: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },

          // Informations liées à une invitation.
          invitation: {
            select: {
              id: true,
              status: true,
              message: true,
              proposedAmount: true,
              currency: true,
              respondedAt: true,
              createdAt: true,

              campaign: {
                select: {
                  id: true,
                  title: true,
                  companyProfile: {
                    select: {
                      id: true,
                      companyName: true,
                      logoUrl: true,
                    },
                  },
                },
              },

              creatorProfile: {
                select: {
                  id: true,
                  displayName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
        },
      }),

      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des notifications :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les notifications.",
    });
  }
}
/**
 * Marquer une notification comme lue.
 */
async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // La notification doit appartenir à l'utilisateur connecté.
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification introuvable.",
      });
    }

    if (notification.isRead) {
      return res.status(200).json({
        success: true,
        message: "Cette notification est déjà lue.",
      });
    }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marquée comme lue.",
    });
  } catch (error) {
    console.error(
      "Erreur lors du marquage de la notification :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier la notification.",
    });
  }
}

/**
 * Marquer toutes les notifications de l'utilisateur comme lues.
 */
async function markAllNotificationsAsRead(req, res) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vos notifications ont été marquées comme lues.",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error(
      "Erreur lors du marquage des notifications :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de marquer les notifications comme lues.",
    });
  }
}

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};