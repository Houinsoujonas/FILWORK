const prisma = require("../config/prisma");

const ALLOWED_FIELDS = [
  "title",
  "description",
  "objectives",
  "deliverables",
  "location",
  "platforms",
  "budget",
  "currency",
  "startDate",
  "endDate",
];

const OPTIONAL_TEXT_FIELDS = {
  objectives: 3000,
  deliverables: 3000,
  location: 200,
};

function validateCampaignData(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      error: "Les données de la campagne sont invalides.",
    };
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !ALLOWED_FIELDS.includes(field),
  );

  if (unknownFields.length > 0) {
    return {
      error: `Champs non autorisés : ${unknownFields.join(", ")}.`,
    };
  }

  const title =
    typeof body.title === "string" ? body.title.trim() : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  if (!title) {
    return {
      error: "Le titre de la campagne est obligatoire.",
    };
  }

  if (title.length > 200) {
    return {
      error: "Le titre ne doit pas dépasser 200 caractères.",
    };
  }

  if (!description) {
    return {
      error: "La description de la campagne est obligatoire.",
    };
  }

  if (description.length > 10000) {
    return {
      error: "La description ne doit pas dépasser 10 000 caractères.",
    };
  }

  const data = {
    title,
    description,
  };

  // Validation des champs textuels facultatifs.
  for (const [field, maxLength] of Object.entries(
    OPTIONAL_TEXT_FIELDS,
  )) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const value = body[field];

    if (value !== null && typeof value !== "string") {
      return {
        error: `Le champ "${field}" doit être un texte.`,
      };
    }

    if (value === null) {
      data[field] = null;
      continue;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length > maxLength) {
      return {
        error: `Le champ "${field}" dépasse la longueur autorisée.`,
      };
    }

    data[field] = trimmedValue || null;
  }

  // Validation des plateformes ciblées.
  if (Object.prototype.hasOwnProperty.call(body, "platforms")) {
    if (!Array.isArray(body.platforms)) {
      return {
        error: "Les plateformes doivent être fournies sous forme de liste.",
      };
    }

    if (body.platforms.length > 10) {
      return {
        error: "Une campagne ne peut pas cibler plus de 10 plateformes.",
      };
    }

    const platforms = [];

    for (const platform of body.platforms) {
      if (typeof platform !== "string") {
        return {
          error: "Chaque plateforme doit être un texte.",
        };
      }

      const value = platform.trim();

      if (!value || value.length > 50) {
        return {
          error: "Chaque plateforme doit comporter entre 1 et 50 caractères.",
        };
      }

      const alreadyExists = platforms.some(
        (item) => item.toLowerCase() === value.toLowerCase(),
      );

      if (!alreadyExists) {
        platforms.push(value);
      }
    }

    data.platforms = platforms;
  }

  // Validation du budget.
  if (Object.prototype.hasOwnProperty.call(body, "budget")) {
    const value = body.budget;

    if (value === null) {
      data.budget = null;
    } else {
      if (
        typeof value !== "number" &&
        typeof value !== "string"
      ) {
        return {
          error: "Le budget doit être un nombre positif ou nul.",
        };
      }

      const budget = String(value).trim();

      if (!/^\d+(\.\d{1,2})?$/.test(budget)) {
        return {
          error: "Le budget doit être positif ou nul, avec au maximum deux décimales.",
        };
      }

      data.budget = budget;
    }
  }

  // Validation de la devise.
  if (Object.prototype.hasOwnProperty.call(body, "currency")) {
    if (
      typeof body.currency !== "string" ||
      !/^[A-Za-z]{3}$/.test(body.currency.trim())
    ) {
      return {
        error: "La devise doit être un code de trois lettres, par exemple XOF.",
      };
    }

    data.currency = body.currency.trim().toUpperCase();
  }

  // Validation des dates.
  for (const field of ["startDate", "endDate"]) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const value = body[field];

    if (value === null) {
      data[field] = null;
      continue;
    }

    if (typeof value !== "string" || !value.trim()) {
      return {
        error: `La date "${field}" est invalide.`,
      };
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return {
        error: `La date "${field}" est invalide.`,
      };
    }

    data[field] = date;
  }

  // Vérification de la cohérence des dates fournies.
  if (
    data.startDate instanceof Date &&
    data.endDate instanceof Date &&
    data.startDate > data.endDate
  ) {
    return {
      error: "La date de début doit précéder la date de fin.",
    };
  }

  return {
    data,
  };
}

/**
 * Lister et rechercher les campagnes publiées.
 * Cette route est publique : aucun JWT n'est nécessaire.
 */
async function getPublishedCampaigns(req, res) {
  try {
    const query = req.query || {};

    // Valider les paramètres textuels.
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

      // Un paramètre vide est traité comme absent.
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

    // Valider les montants transmis dans l'URL.
    function readBudgetParam(value, field) {
      if (value === undefined) {
        return { value: null };
      }

      if (
        typeof value !== "string" ||
        !/^\d+(\.\d{1,2})?$/.test(value.trim())
      ) {
        return {
          error: `Le paramètre "${field}" doit être un montant positif ou nul, avec au maximum deux décimales.`,
        };
      }

      return { value: value.trim() };
    }

    // Valider les paramètres de pagination.
    function readIntegerParam(value, field, defaultValue, maxValue) {
      if (value === undefined) {
        return { value: defaultValue };
      }

      if (
        typeof value !== "string" ||
        !/^\d+$/.test(value)
      ) {
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

    const searchResult = readTextParam(
      query.search,
      "search",
      100,
    );

    const platformResult = readTextParam(
      query.platform,
      "platform",
      50,
    );

    const locationResult = readTextParam(
      query.location,
      "location",
      200,
    );

    const minBudgetResult = readBudgetParam(
      query.minBudget,
      "minBudget",
    );

    const maxBudgetResult = readBudgetParam(
      query.maxBudget,
      "maxBudget",
    );

    const pageResult = readIntegerParam(
      query.page,
      "page",
      1,
      null,
    );

    const limitResult = readIntegerParam(
      query.limit,
      "limit",
      20,
      100,
    );

    const validationResults = [
      searchResult,
      platformResult,
      locationResult,
      minBudgetResult,
      maxBudgetResult,
      pageResult,
      limitResult,
    ];

    const invalidParameter = validationResults.find(
      (result) => result.error,
    );

    if (invalidParameter) {
      return res.status(400).json({
        success: false,
        message: invalidParameter.error,
      });
    }

    const search = searchResult.value;
    const platform = platformResult.value;
    const location = locationResult.value;
    const minBudget = minBudgetResult.value;
    const maxBudget = maxBudgetResult.value;
    const page = pageResult.value;
    const limit = limitResult.value;

    if (
      minBudget !== null &&
      maxBudget !== null &&
      Number(minBudget) > Number(maxBudget)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le budget minimal ne peut pas dépasser le budget maximal.",
      });
    }

    // Seules les campagnes publiées sont accessibles publiquement.
    const where = {
      status: "PUBLISHED",
    };

    // Recherche textuelle dans le titre et la description.
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Filtrer par plateforme ciblée.
    if (platform) {
      where.platforms = {
        has: platform,
      };
    }

    // Filtrer par localisation de la campagne.
    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    // Filtrer par budget minimal et/ou maximal.
    if (minBudget !== null || maxBudget !== null) {
      where.budget = {};

      if (minBudget !== null) {
        where.budget.gte = minBudget;
      }

      if (maxBudget !== null) {
        where.budget.lte = maxBudget;
      }
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          companyProfile: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              location: true,
            },
          },
        },
      }),

      prisma.campaign.count({
        where,
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      campaigns,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la recherche des campagnes publiées :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les campagnes.",
    });
  }
}

/**
 * Créer une campagne pour l'entreprise connectée.
 */
async function createCampaign(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent créer des campagnes.",
      });
    }

    const validation = validateCampaignData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const companyProfile = await prisma.companyProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Complétez votre profil d'entreprise avant de créer une campagne.",
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...validation.data,
        companyProfileId: companyProfile.id,
      },
      include: {
        companyProfile: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            location: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Campagne créée avec succès.",
      campaign,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la création de la campagne :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de créer la campagne.",
    });
  }
}

/**
 * Lister les campagnes appartenant à l'entreprise connectée.
 */
async function getMyCampaigns(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Cette fonctionnalité est réservée aux entreprises.",
      });
    }

    const companyProfile = await prisma.companyProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Complétez votre profil d'entreprise pour consulter vos campagnes.",
      });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        companyProfileId: companyProfile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des campagnes de l'entreprise :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer vos campagnes.",
    });
  }
}

/**
 * Retrouver une campagne appartenant à l'entreprise connectée.
 */
async function findOwnedCampaign(userId, campaignId) {
  const companyProfile = await prisma.companyProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!companyProfile) {
    return {
      status: 400,
      error: "Complétez votre profil d'entreprise avant de continuer.",
    };
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      companyProfileId: companyProfile.id,
    },
  });

  if (!campaign) {
    return {
      status: 404,
      error: "Campagne introuvable ou accès non autorisé.",
    };
  }

  return {
    campaign,
  };
}

/**
 * Modifier une campagne appartenant à l'entreprise connectée.
 *
 * Le titre et la description doivent être fournis.
 */
async function updateCampaign(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent modifier leurs campagnes.",
      });
    }

    const result = await findOwnedCampaign(
      req.user.id,
      req.params.id,
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    if (result.campaign.status === "CLOSED") {
      return res.status(409).json({
        success: false,
        message: "Une campagne clôturée ne peut plus être modifiée.",
      });
    }

    const validation = validateCampaignData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const campaign = await prisma.campaign.update({
      where: {
        id: result.campaign.id,
      },
      data: validation.data,
      include: {
        companyProfile: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            location: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Campagne mise à jour avec succès.",
      campaign,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la modification de la campagne :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier la campagne.",
    });
  }
}

/**
 * Publier une campagne.
 */
async function publishCampaign(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent publier des campagnes.",
      });
    }

    const result = await findOwnedCampaign(
      req.user.id,
      req.params.id,
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    if (result.campaign.status === "CLOSED") {
      return res.status(409).json({
        success: false,
        message: "Une campagne clôturée ne peut pas être publiée.",
      });
    }

    if (result.campaign.status === "PUBLISHED") {
      return res.status(200).json({
        success: true,
        message: "Cette campagne est déjà publiée.",
        campaign: result.campaign,
      });
    }

    const campaign = await prisma.campaign.update({
      where: {
        id: result.campaign.id,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      include: {
        companyProfile: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            location: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Campagne publiée avec succès.",
      campaign,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la publication de la campagne :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de publier la campagne.",
    });
  }
}

/**
 * Suspendre une campagne publiée.
 */
async function pauseCampaign(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent suspendre leurs campagnes.",
      });
    }

    const result = await findOwnedCampaign(
      req.user.id,
      req.params.id,
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    if (result.campaign.status === "PAUSED") {
      return res.status(200).json({
        success: true,
        message: "Cette campagne est déjà suspendue.",
        campaign: result.campaign,
      });
    }

    if (result.campaign.status !== "PUBLISHED") {
      return res.status(409).json({
        success: false,
        message: "Seule une campagne publiée peut être suspendue.",
      });
    }

    const campaign = await prisma.campaign.update({
      where: {
        id: result.campaign.id,
      },
      data: {
        status: "PAUSED",
      },
      include: {
        companyProfile: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            location: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Campagne suspendue avec succès.",
      campaign,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la suspension de la campagne :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de suspendre la campagne.",
    });
  }
}

/**
 * Clôturer une campagne appartenant à l'entreprise connectée.
 */
async function closeCampaign(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent clôturer leurs campagnes.",
      });
    }

    const result = await findOwnedCampaign(
      req.user.id,
      req.params.id,
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    if (result.campaign.status === "CLOSED") {
      return res.status(200).json({
        success: true,
        message: "Cette campagne est déjà clôturée.",
        campaign: result.campaign,
      });
    }

    const campaign = await prisma.campaign.update({
      where: {
        id: result.campaign.id,
      },
      data: {
        status: "CLOSED",
      },
      include: {
        companyProfile: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            location: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Campagne clôturée avec succès.",
      campaign,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la clôture de la campagne :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de clôturer la campagne.",
    });
  }
}



/**
 * Supprimer un brouillon appartenant à l'entreprise connectée.
 * La suppression est interdite si la campagne possède des candidatures.
 */
async function deleteCampaign(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent supprimer leurs campagnes.",
      });
    }

    const result = await findOwnedCampaign(
      req.user.id,
      req.params.id,
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    if (result.campaign.status !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Seuls les brouillons peuvent être supprimés.",
      });
    }

    const deletion = await prisma.campaign.deleteMany({
      where: {
        id: result.campaign.id,
        companyProfileId: result.campaign.companyProfileId,
        status: "DRAFT",
        applications: {
          none: {},
        },
      },
    });

    if (deletion.count === 0) {
      return res.status(409).json({
        success: false,
        message:
          "La campagne ne peut pas être supprimée. Vérifiez son statut et ses candidatures.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brouillon supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la campagne :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer la campagne.",
    });
  }
}

module.exports = {
  getPublishedCampaigns,
  createCampaign,
  getMyCampaigns,
  updateCampaign,
  publishCampaign,
  pauseCampaign,
  closeCampaign,
  deleteCampaign,
};