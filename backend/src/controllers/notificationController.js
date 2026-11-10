const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalizePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Récupérer les notifications de l'utilisateur connecté.
 * Supporte la pagination, le filtrage par type et par état de lecture.
 */
async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { page, limit, skip } = normalizePagination(req.query);

    const { type, isRead } = req.query;

    const where = { userId };

    if (type) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead === "true";
    }

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          link: true,
          isRead: true,
          readAt: true,
          createdAt: true,
          announcementId: true,
          applicationId: true,
          invitationId: true,
          collaborationId: true,
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
          invitation: {
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
          collaboration: {
            select: {
              id: true,
              status: true,
            },
          },
          announcement: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
      prisma.notification.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications récupérées avec succès.",
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la récupération des notifications :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération des notifications.",
    });
  }
}

/**
 * Marquer une notification comme lue.
 */
async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true, isRead: true },
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
        message: "La notification est déjà marquée comme lue.",
        notification: { id: notification.id, isRead: true },
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marquée comme lue.",
      notification: updated,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors du marquage de la notification :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du marquage de la notification.",
    });
  }
}

/**
 * Marquer toutes les notifications de l'utilisateur comme lues.
 */
async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
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
      message: "Toutes les notifications ont été marquées comme lues.",
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors du marquage global des notifications :",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du marquage des notifications.",
    });
  }
}

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};