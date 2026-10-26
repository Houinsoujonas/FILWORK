const prisma = require("../config/prisma");

const SOCIAL_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "LINKEDIN",
  "FACEBOOK",
  "TWITCH",
];

const AVAILABILITY_STATUSES = [
  "AVAILABLE",
  "LIMITED",
  "UNAVAILABLE",
];

function readText(value, field, maxLength) {
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

function readAmount(value, field) {
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

function readInteger(value, field, defaultValue, maxValue) {
  if (value === undefined) {
    return { value: defaultValue };
  }

  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value)
  ) {
    return {
      error: `Le paramètre "${field}" doit être un entier positif ou nul.`,
    };
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 0) {
    return {
      error: `Le paramètre "${field}" est invalide.`,
    };
  }

  if (number > maxValue) {
    return {
      error: `Le paramètre "${field}" dépasse la limite autorisée.`,
    };
  }

  return { value: number };
}

/**
 * Recherche des créateurs pour les entreprises connectées.
 *
 * GET /api/creators
 */
async function getCreatorDirectory(req, res) {
  // Le répertoire est réservé aux entreprises.
  if (req.user.role !== "COMPANY") {
    return res.status(403).json({
      success: false,
      message:
        "Seules les entreprises peuvent consulter le répertoire des créateurs.",
    });
  }

  try {
    const query = req.query || {};

    const searchResult = readText(
      query.search,
      "search",
      100,
    );

    const nicheResult = readText(
      query.niche,
      "niche",
      100,
    );

    const locationResult = readText(
      query.location,
      "location",
      200,
    );

    const platformResult = readText(
      query.platform,
      "platform",
      50,
    );

    const availabilityResult = readText(
      query.availabilityStatus,
      "availabilityStatus",
      30,
    );

    const minRateResult = readAmount(
      query.minRate,
      "minRate",
    );

    const maxRateResult = readAmount(
      query.maxRate,
      "maxRate",
    );

    const minFollowersResult = readInteger(
      query.minFollowers,
      "minFollowers",
      null,
      2147483647,
    );

    const pageResult = readInteger(
      query.page,
      "page",
      1,
      1000000,
    );

    const limitResult = readInteger(
      query.limit,
      "limit",
      12,
      50,
    );

    const validations = [
      searchResult,
      nicheResult,
      locationResult,
      platformResult,
      availabilityResult,
      minRateResult,
      maxRateResult,
      minFollowersResult,
      pageResult,
      limitResult,
    ];

    const invalidParameter = validations.find(
      (result) => result.error,
    );

    if (invalidParameter) {
      return res.status(400).json({
        success: false,
        message: invalidParameter.error,
      });
    }

    const search = searchResult.value;
    const niche = nicheResult.value;
    const location = locationResult.value;

    const platform = platformResult.value
      ? platformResult.value.toUpperCase()
      : null;

    const availabilityStatus = availabilityResult.value
      ? availabilityResult.value.toUpperCase()
      : null;

    const minRate = minRateResult.value;
    const maxRate = maxRateResult.value;
    const minFollowers = minFollowersResult.value;
    const page = pageResult.value;
    const limit = limitResult.value;

    if (
      platform &&
      !SOCIAL_PLATFORMS.includes(platform)
    ) {
      return res.status(400).json({
        success: false,
        message: "La plateforme sociale demandée est invalide.",
      });
    }

    if (
      availabilityStatus &&
      !AVAILABILITY_STATUSES.includes(availabilityStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le statut de disponibilité est invalide.",
      });
    }

    if (
      minRate !== null &&
      maxRate !== null &&
      Number(minRate) > Number(maxRate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le tarif minimal ne peut pas dépasser le tarif maximal.",
      });
    }

    // Chaque condition est ajoutée séparément afin de pouvoir
    // combiner plusieurs filtres sans écraser les précédents.
    const conditions = [
      {
        user: {
          is: {
            role: "CREATOR",
          },
        },
      },
    ];

    if (search) {
      conditions.push({
        OR: [
          {
            displayName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            bio: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            niche: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (niche) {
      conditions.push({
        niche: {
          contains: niche,
          mode: "insensitive",
        },
      });
    }

    if (location) {
      conditions.push({
        OR: [
          {
            location: {
              contains: location,
              mode: "insensitive",
            },
          },
          {
            city: {
              contains: location,
              mode: "insensitive",
            },
          },
          {
            country: {
              contains: location,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (availabilityStatus) {
      conditions.push({
        availabilityStatus,
      });
    }

    if (minRate !== null || maxRate !== null) {
      const rateCondition = {};

      if (minRate !== null) {
        rateCondition.gte = minRate;
      }

      if (maxRate !== null) {
        rateCondition.lte = maxRate;
      }

      conditions.push({
        startingRate: rateCondition,
      });
    }

    if (platform || minFollowers !== null) {
      const socialCondition = {};

      if (platform) {
        socialCondition.platform = platform;
      }

      if (minFollowers !== null) {
        socialCondition.followerCount = {
          gte: minFollowers,
        };
      }

      conditions.push({
        creatorSocials: {
          some: socialCondition,
        },
      });
    }

    const where = {
      AND: conditions,
    };

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },

        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          displayName: true,
          bio: true,
          niche: true,
          location: true,
          country: true,
          city: true,
          profileImageUrl: true,
          mediaKitUrl: true,
          startingRate: true,
          rateCurrency: true,
          availabilityStatus: true,
          createdAt: true,

          creatorSocials: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              platform: true,
              profileUrl: true,
              followerCount: true,
            },
          },

          portfolioItems: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              url: true,
              campaignName: true,
              createdAt: true,
            },
          },
        },
      }),

      prisma.creatorProfile.count({
        where,
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: creators.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      creators,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la recherche des créateurs :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer le répertoire des créateurs.",
    });
  }
}

module.exports = {
  getCreatorDirectory,
};