const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const { enqueueAnnouncementEmail } = require("../services/emailService");

const EMAIL_LINK_BASE =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Les administrateurs publient les annonces ; ils ne sont pas une audience.
const ANNOUNCEMENT_AUDIENCES = ["ALL", "CREATORS", "COMPANIES"];

function audiencesForRole(role) {
  const audiences = ["ALL"];

  if (role === "CREATOR") {
    audiences.push("CREATORS");
  } else if (role === "COMPANY") {
    audiences.push("COMPANIES");
  } else if (role === "ADMIN") {
    // Un administrateur peut consulter toutes les annonces publiées.
    audiences.push("CREATORS", "COMPANIES");
  }

  return audiences;
}

function notificationPathForRole(role) {
  if (role === "CREATOR") {
    return "/espace/createur/annonces";
  }

  if (role === "COMPANY") {
    return "/espace/entreprise/annonces";
  }

  return "/administration/annonces";
}

/**
 * Valide une date d'expiration facultative.
 *
 * @param {unknown} value
 * @returns {{ provided: boolean, value?: Date|null, error?: string }}
 */
function parseExpiresAt(value) {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null || value === "") {
    return { provided: true, value: null };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      provided: true,
      error: "La date d'expiration est invalide.",
    };
  }

  if (date.getTime() <= Date.now()) {
    return {
      provided: true,
      error: "La date d'expiration doit être dans le futur.",
    };
  }

  return { provided: true, value: date };
}

function normalizePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  return { page, limit, skip: (page - 1) * limit };
}

function buildFullLink(link) {
  if (!link) {
    return undefined;
  }
  if (link.startsWith("http://") || link.startsWith("https://")) {
    return link;
  }
  const base = EMAIL_LINK_BASE.replace(/\/$/, "");
  const path = link.startsWith("/") ? link : `/${link}`;
  return `${base}${path}`;
}

/**
 * Liste des annonces accessibles à un utilisateur connecté.
 * Retourne les annonces publiées, non expirées, correspondant à son audience.
 */
async function getMyAnnouncements(req, res) {
  try {
    const userRole = req.user.role;
    const { page, limit, skip } = normalizePagination(req.query);

    const now = new Date();

    const audiences = audiencesForRole(userRole);

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where: {
          status: "PUBLISHED",
          audience: { in: audiences },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          audience: true,
          status: true,
          linkUrl: true,
          createdAt: true,
          publishedAt: true,
          expiresAt: true,
          createdBy: {
            select: { id: true },
          },
        },
      }),
      prisma.announcement.count({
        where: {
          status: "PUBLISHED",
          audience: { in: audiences },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Annonces récupérées avec succès.",
      announcements,
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

    console.error("Erreur lors de la récupération des annonces :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération des annonces.",
    });
  }
}

/**
 * Récupère une annonce spécifique (publiée, accessible à l'utilisateur).
 */
async function getAnnouncementById(req, res) {
  try {
    const userRole = req.user.role;
    const { id } = req.params;

    const now = new Date();

    const audiences = audiencesForRole(userRole);

    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        status: "PUBLISHED",
        audience: { in: audiences },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        status: true,
        linkUrl: true,
        createdAt: true,
        publishedAt: true,
        expiresAt: true,
        createdBy: {
          select: { id: true },
        },
      },
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Annonce introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Annonce récupérée avec succès.",
      announcement,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la récupération de l'annonce :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération de l'annonce.",
    });
  }
}

/**
 * Crée une nouvelle annonce (brouillon). Réservé aux administrateurs.
 */
async function createAnnouncement(req, res) {
  try {
    const body = req.body || {};

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const bodyContent = typeof body.body === "string" ? body.body.trim() : "";
    const audience = typeof body.audience === "string" ? body.audience : "ALL";
    const linkUrl =
      typeof body.linkUrl === "string" ? body.linkUrl.trim() : null;
    const expiresAtValidation = parseExpiresAt(body.expiresAt);
    const expiresAt = expiresAtValidation.value ?? null;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Le titre de l'annonce est obligatoire.",
      });
    }

    if (!bodyContent) {
      return res.status(400).json({
        success: false,
        message: "Le contenu de l'annonce est obligatoire.",
      });
    }

    if (!ANNOUNCEMENT_AUDIENCES.includes(audience)) {
      return res.status(400).json({
        success: false,
        message: "L'audience doit être ALL, CREATORS ou COMPANIES.",
      });
    }

    if (expiresAtValidation.error) {
      return res.status(400).json({
        success: false,
        message: expiresAtValidation.error,
      });
    }

    if (linkUrl && !/^https?:\/\/.+/.test(linkUrl)) {
      return res.status(400).json({
        success: false,
        message: "L'URL du lien est invalide.",
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body: bodyContent,
        audience,
        status: "DRAFT",
        linkUrl,
        expiresAt,
        createdById: req.user.id,
      },
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        status: true,
        linkUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Annonce créée en brouillon.",
      announcement,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la création de l'annonce :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la création de l'annonce.",
    });
  }
}

/**
 * Modifie une annonce non publiée (brouillon). Réservé aux administrateurs.
 */
async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Annonce introuvable.",
      });
    }

    if (existing.status !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Une annonce publiée ou archivée ne peut pas être modifiée.",
      });
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const bodyContent =
      typeof body.body === "string" ? body.body.trim() : undefined;
    const audience =
      typeof body.audience === "string" ? body.audience : undefined;

    let linkUrl;
    if (body.linkUrl === null) {
      linkUrl = null;
    } else if (typeof body.linkUrl === "string") {
      linkUrl = body.linkUrl.trim() || null;
    } else {
      linkUrl = undefined;
    }

    const expiresAtValidation = parseExpiresAt(body.expiresAt);
    const expiresAt = expiresAtValidation.provided
      ? expiresAtValidation.value
      : undefined;

    if (
      audience !== undefined &&
      !ANNOUNCEMENT_AUDIENCES.includes(audience)
    ) {
      return res.status(400).json({
        success: false,
        message: "L'audience doit être ALL, CREATORS ou COMPANIES.",
      });
    }

    if (expiresAtValidation.error) {
      return res.status(400).json({
        success: false,
        message: expiresAtValidation.error,
      });
    }

    if (linkUrl !== undefined && linkUrl !== null && !/^https?:\/\/.+/.test(linkUrl)) {
      return res.status(400).json({
        success: false,
        message: "L'URL du lien est invalide.",
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (bodyContent !== undefined) updateData.body = bodyContent;
    if (audience !== undefined) updateData.audience = audience;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        status: true,
        linkUrl: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Annonce modifiée avec succès.",
      announcement,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la modification de l'annonce :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la modification de l'annonce.",
    });
  }
}

/**
 * Publie une annonce. Crée des notifications pour l'audience ciblée
 * et met en file les e-mails correspondants. Réservé aux administrateurs.
 */
async function publishAnnouncement(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        title: true,
        body: true,
        audience: true,
        linkUrl: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Annonce introuvable.",
      });
    }

    if (existing.status !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Seule une annonce en brouillon peut être publiée.",
      });
    }

    // Déterminer les utilisateurs ciblés par l'audience.
    // Les administrateurs ne sont jamais destinataires : ils publient.
    let userWhere;
    if (existing.audience === "CREATORS") {
      userWhere = { role: "CREATOR" };
    } else if (existing.audience === "COMPANIES") {
      userWhere = { role: "COMPANY" };
    } else {
      userWhere = { role: { in: ["CREATOR", "COMPANY"] } };
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, email: true, role: true },
    });

    const publishedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt,
        },
      });

      if (users.length > 0) {
        await tx.notification.createMany({
          data: users.map((user) => ({
            userId: user.id,
            type: "ANNOUNCEMENT",
            title: existing.title,
            message: existing.body,
            link: notificationPathForRole(user.role),
            announcementId: announcement.id,
          })),
        });
      }

      return announcement;
    });

    // Mettre en file les e-mails (hors transaction).
    // Charger les préférences en lot pour éviter une requête par destinataire.
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { userId: true, announcementEmails: true },
    });

    const preferencesByUserId = new Map(
      preferences.map((p) => [p.userId, p.announcementEmails]),
    );

    for (const user of users) {
      const emailEnabled = preferencesByUserId.get(user.id) ?? true;

      if (emailEnabled) {
        try {
          const link = existing.linkUrl
            ? buildFullLink(existing.linkUrl)
            : buildFullLink(notificationPathForRole(user.role));

          await enqueueAnnouncementEmail({
            to: user.email,
            displayName: undefined,
            title: existing.title,
            body: existing.body,
            link,
          });
        } catch (emailError) {
          console.error(
            `Erreur lors de la mise en file de l'e-mail d'annonce pour ${user.email}:`,
            emailError.message,
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Annonce publiée avec succès.",
      announcement: result,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la publication de l'annonce :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la publication de l'annonce.",
    });
  }
}

/**
 * Liste toutes les annonces avec leur état (réservé aux administrateurs).
 */
async function getAdminAnnouncements(req, res) {
  try {
    const { page, limit, skip } = normalizePagination(req.query);
    const { status, audience } = req.query;

    const where = {};

    if (status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    if (audience && ANNOUNCEMENT_AUDIENCES.includes(audience)) {
      where.audience = audience;
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          audience: true,
          status: true,
          linkUrl: true,
          createdAt: true,
          publishedAt: true,
          expiresAt: true,
          updatedAt: true,
          createdBy: {
            select: { id: true, email: true },
          },
          _count: {
            select: { notifications: true },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Annonces administratives récupérées avec succès.",
      announcements,
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

    console.error("Erreur lors de la récupération des annonces admin :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération des annonces.",
    });
  }
}

/**
 * Récupère une annonce par son identifiant (réservé aux administrateurs),
 * quel que soit son statut, afin de permettre son édition.
 */
async function getAdminAnnouncementById(req, res) {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        status: true,
        linkUrl: true,
        createdAt: true,
        publishedAt: true,
        expiresAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Annonce introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Annonce récupérée avec succès.",
      announcement,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la récupération de l'annonce administrative :",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération de l'annonce.",
    });
  }
}

/**
 * Archive une annonce (réservé aux administrateurs).
 */
async function archiveAnnouncement(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Annonce introuvable.",
      });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        status: "ARCHIVED",
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Annonce archivée avec succès.",
      announcement,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de l'archivage de l'annonce :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'archivage de l'annonce.",
    });
  }
}

module.exports = {
  getMyAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  getAdminAnnouncements,
  getAdminAnnouncementById,
  archiveAnnouncement,
};