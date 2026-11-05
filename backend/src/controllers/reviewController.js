const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const {
  CREATOR_DISCOVERY_CONDITIONS,
  COMPANY_PUBLIC_CONDITIONS,
} = require("../services/profileVisibility");

const MAX_COMMENT_LENGTH = 5000;
const MAX_RESPONSE_LENGTH = 5000;

/**
 * Relations exposées publiquement pour un avis.
 * Aucune donnée sensible (e-mail, identifiant de connexion) n'est exposée.
 */
const REVIEW_INCLUDE = {
  companyProfile: {
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
      location: true,
      country: true,
      city: true,
    },
  },
  creatorProfile: {
    select: {
      id: true,
      displayName: true,
      profileImageUrl: true,
      niche: true,
      location: true,
      country: true,
      city: true,
    },
  },
  response: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  },
  collaboration: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  },
};

/**
 * Relations minimales permettant d'identifier l'entreprise et le créateur
 * d'une collaboration, quelle que soit son origine (candidature ou invitation).
 */
const COLLABORATION_PARTIES_INCLUDE = {
  application: {
    select: {
      creatorProfileId: true,
      creatorProfile: {
        select: {
          userId: true,
          displayName: true,
        },
      },
      campaign: {
        select: {
          id: true,
          title: true,
          companyProfileId: true,
        },
      },
    },
  },
  invitation: {
    select: {
      creatorProfileId: true,
      creatorProfile: {
        select: {
          userId: true,
          displayName: true,
        },
      },
      campaign: {
        select: {
          id: true,
          title: true,
          companyProfileId: true,
        },
      },
    },
  },
};

function getCollaborationParties(collaboration) {
  const origin = collaboration.application || collaboration.invitation;

  if (!origin) {
    return null;
  }

  return {
    companyProfileId: origin.campaign.companyProfileId,
    creatorProfileId: origin.creatorProfileId,
    creatorUserId: origin.creatorProfile.userId,
    creatorName: origin.creatorProfile.displayName,
    campaignTitle: origin.campaign.title,
  };
}

function validateRating(value) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    return {
      valid: false,
      message: "La note doit être un entier compris entre 1 et 5.",
    };
  }

  return {
    valid: true,
    value,
  };
}

function validateContent(value, field, maxLength) {
  if (typeof value !== "string") {
    return {
      valid: false,
      message: `Le champ "${field}" doit être un texte.`,
    };
  }

  const normalized = value.trim();

  if (!normalized) {
    return {
      valid: false,
      message: `Le champ "${field}" est obligatoire.`,
    };
  }

  if (normalized.length > maxLength) {
    return {
      valid: false,
      message: `Le champ "${field}" ne doit pas dépasser ${maxLength} caractères.`,
    };
  }

  return {
    valid: true,
    value: normalized,
  };
}

function readTextParam(value, field, maxLength) {
  if (value === undefined) {
    return { value: null };
  }

  if (typeof value !== "string") {
    return {
      error: `Le paramètre "${field}" doit être un texte.`,
    };
  }

  const normalized = value.trim();

  if (!normalized) {
    return { value: null };
  }

  if (normalized.length > maxLength) {
    return {
      error: `Le paramètre "${field}" ne doit pas dépasser ${maxLength} caractères.`,
    };
  }

  return { value: normalized };
}

function readIntegerParam(value, field, defaultValue, maxValue) {
  if (value === undefined) {
    return { value: defaultValue };
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return {
      error: `Le paramètre "${field}" doit être un entier positif.`,
    };
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 1) {
    return {
      error: `Le paramètre "${field}" doit être un entier supérieur ou égal à 1.`,
    };
  }

  if (maxValue !== null && number > maxValue) {
    return {
      error: `Le paramètre "${field}" ne peut pas dépasser ${maxValue}.`,
    };
  }

  return { value: number };
}

/**
 * Publier un avis sur une collaboration terminée.
 *
 * POST /api/reviews
 *
 * Seule l'entreprise participante peut publier l'avis. La collaboration
 * doit être COMPLETED : une collaboration ACTIVE ou CANCELLED est refusée.
 * Un seul avis est autorisé par collaboration.
 */
async function createReview(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent publier un avis.",
      });
    }

    const body = req.body || {};

    const unknownFields = Object.keys(body).filter(
      (field) => !["collaborationId", "rating", "comment"].includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    if (
      typeof body.collaborationId !== "string" ||
      !body.collaborationId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant de la collaboration est obligatoire.",
      });
    }

    const ratingValidation = validateRating(body.rating);

    if (!ratingValidation.valid) {
      return res.status(400).json({
        success: false,
        message: ratingValidation.message,
      });
    }

    const commentValidation = validateContent(
      body.comment,
      "comment",
      MAX_COMMENT_LENGTH,
    );

    if (!commentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: commentValidation.message,
      });
    }

    const companyProfile = await prisma.companyProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        companyName: true,
      },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil d'entreprise n'est associé à ce compte.",
      });
    }

    const collaboration = await prisma.collaboration.findUnique({
      where: {
        id: body.collaborationId.trim(),
      },
      include: COLLABORATION_PARTIES_INCLUDE,
    });

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration introuvable.",
      });
    }

    const parties = getCollaborationParties(collaboration);

    if (!parties) {
      return res.status(409).json({
        success: false,
        message:
          "Impossible d'identifier les participants de cette collaboration.",
      });
    }

    if (parties.companyProfileId !== companyProfile.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne participez pas à cette collaboration.",
      });
    }

    if (collaboration.status !== "COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "Un avis ne peut être publié que pour une collaboration terminée.",
        currentStatus: collaboration.status,
      });
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        collaborationId: collaboration.id,
      },
      select: {
        id: true,
      },
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "Un avis a déjà été publié pour cette collaboration.",
      });
    }

    const review = await prisma.review.create({
      data: {
        collaborationId: collaboration.id,
        companyProfileId: companyProfile.id,
        creatorProfileId: parties.creatorProfileId,
        rating: ratingValidation.value,
        comment: commentValidation.value,
      },
      include: REVIEW_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: "Avis publié avec succès.",
      review,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Un avis a déjà été publié pour cette collaboration.",
      });
    }

    console.error("Erreur lors de la publication de l'avis :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de publier l'avis.",
    });
  }
}

/**
 * Lister publiquement les avis.
 *
 * GET /api/reviews?creatorProfileId=...&companyProfileId=...&collaborationId=...
 */
async function getReviews(req, res) {
  try {
    const query = req.query || {};

    const creatorProfileIdResult = readTextParam(
      query.creatorProfileId,
      "creatorProfileId",
      100,
    );

    const companyProfileIdResult = readTextParam(
      query.companyProfileId,
      "companyProfileId",
      100,
    );

    const collaborationIdResult = readTextParam(
      query.collaborationId,
      "collaborationId",
      100,
    );

    const pageResult = readIntegerParam(query.page, "page", 1, null);
    const limitResult = readIntegerParam(query.limit, "limit", 20, 100);

    const invalidParameter = [
      creatorProfileIdResult,
      companyProfileIdResult,
      collaborationIdResult,
      pageResult,
      limitResult,
    ].find((result) => result.error);

    if (invalidParameter) {
      return res.status(400).json({
        success: false,
        message: invalidParameter.error,
      });
    }

    const page = pageResult.value;
    const limit = limitResult.value;

    const where = {
      // Les avis publics ne concernent que des profils découvrables :
      // un profil incomplet ou de démonstration ne doit pas exposer
      // indirectement son nom via ses avis.
      AND: [
        {
          creatorProfile: {
            is: {
              AND: CREATOR_DISCOVERY_CONDITIONS,
            },
          },
        },
        {
          companyProfile: {
            is: {
              AND: COMPANY_PUBLIC_CONDITIONS,
            },
          },
        },
      ],
    };

    if (creatorProfileIdResult.value) {
      where.creatorProfileId = creatorProfileIdResult.value;
    }

    if (companyProfileIdResult.value) {
      where.companyProfileId = companyProfileIdResult.value;
    }

    if (collaborationIdResult.value) {
      where.collaborationId = collaborationIdResult.value;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        include: REVIEW_INCLUDE,
      }),

      prisma.review.count({
        where,
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      reviews,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la récupération des avis :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les avis.",
    });
  }
}

/**
 * Consulter publiquement un avis.
 *
 * GET /api/reviews/:id
 */
async function getReviewById(req, res) {
  try {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        AND: [
          {
            creatorProfile: {
              is: {
                AND: CREATOR_DISCOVERY_CONDITIONS,
              },
            },
          },
          {
            companyProfile: {
              is: {
                AND: COMPANY_PUBLIC_CONDITIONS,
              },
            },
          },
        ],
      },
      include: REVIEW_INCLUDE,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Avis introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la récupération de l'avis :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer cet avis.",
    });
  }
}

/**
 * Répondre à un avis.
 *
 * POST /api/reviews/:id/response
 *
 * Seul le créateur destinataire de l'avis peut répondre. Une seule
 * réponse est autorisée par avis.
 */
async function createReviewResponse(req, res) {
  try {
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message:
          "Seuls les créateurs destinataires d'un avis peuvent y répondre.",
      });
    }

    const body = req.body || {};

    const unknownFields = Object.keys(body).filter(
      (field) => field !== "content",
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    const contentValidation = validateContent(
      body.content,
      "content",
      MAX_RESPONSE_LENGTH,
    );

    if (!contentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: contentValidation.message,
      });
    }

    const review = await prisma.review.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        id: true,
        creatorProfile: {
          select: {
            userId: true,
          },
        },
        response: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Avis introuvable.",
      });
    }

    if (review.creatorProfile.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Seul le créateur destinataire de l'avis peut y répondre.",
      });
    }

    if (review.response) {
      return res.status(409).json({
        success: false,
        message: "Une réponse a déjà été publiée pour cet avis.",
      });
    }

    const response = await prisma.reviewResponse.create({
      data: {
        reviewId: review.id,
        authorId: req.user.id,
        content: contentValidation.value,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Réponse publiée avec succès.",
      response,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Une réponse a déjà été publiée pour cet avis.",
      });
    }

    console.error("Erreur lors de la publication de la réponse :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de publier la réponse.",
    });
  }
}

/**
 * Modifier la réponse à un avis.
 *
 * PATCH /api/reviews/:id/response
 *
 * Seul l'auteur de la réponse peut la modifier. Seul le contenu change :
 * `createdAt` est préservé, `updatedAt` est actualisé automatiquement.
 */
async function updateReviewResponse(req, res) {
  try {
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Seuls les créateurs peuvent modifier une réponse.",
      });
    }

    const body = req.body || {};

    const unknownFields = Object.keys(body).filter(
      (field) => field !== "content",
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    const contentValidation = validateContent(
      body.content,
      "content",
      MAX_RESPONSE_LENGTH,
    );

    if (!contentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: contentValidation.message,
      });
    }

    const review = await prisma.review.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        id: true,
        response: {
          select: {
            id: true,
            authorId: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Avis introuvable.",
      });
    }

    if (!review.response) {
      return res.status(404).json({
        success: false,
        message: "Réponse introuvable.",
      });
    }

    if (review.response.authorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Seul l'auteur de la réponse peut la modifier.",
      });
    }

    const response = await prisma.reviewResponse.update({
      where: {
        id: review.response.id,
      },
      data: {
        content: contentValidation.value,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Réponse mise à jour avec succès.",
      response,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la modification de la réponse :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier la réponse.",
    });
  }
}

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  createReviewResponse,
  updateReviewResponse,
};
