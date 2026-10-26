const prisma = require("../config/prisma");

const COMPANY_FIELDS = [
  "companyName",
  "industry",
  "description",
  "websiteUrl",
  "logoUrl",
  "location",
  "contactEmail",
  "contactPhone",
  "country",
  "city",
];

const CREATOR_FIELDS = [
  "displayName",
  "bio",
  "niche",
  "location",
  "profileImageUrl",
  "mediaKitUrl",
  "instagramUrl",
  "tiktokUrl",
  "youtubeUrl",
  "country",
  "city",
  "startingRate",
  "rateCurrency",
  "availabilityStatus",
];

const FIELD_MAX_LENGTHS = {
  companyName: 150,
  displayName: 150,
  industry: 100,
  description: 3000,
  bio: 2000,
  niche: 100,
  location: 150,
  websiteUrl: 500,
  logoUrl: 500,
  profileImageUrl: 500,
  mediaKitUrl: 500,
  instagramUrl: 500,
  tiktokUrl: 500,
  youtubeUrl: 500,
  contactEmail: 254,
 contactPhone: 30,
 country: 100,
 city: 100,
 rateCurrency: 3,
};

/**
 * Vérifie les champs reçus et prépare les données du profil.
 */
function extractProfileData(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      error: "Les informations du profil sont invalides.",
    };
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length > 0) {
    return {
      error: `Champ(s) non autorisé(s) : ${unknownFields.join(", ")}.`,
    };
  }

  const data = {};

  const requiredFields = ["companyName", "displayName"];
  const urlFields = [
    "websiteUrl",
    "logoUrl",
    "profileImageUrl",
    "mediaKitUrl",
    "instagramUrl",
    "tiktokUrl",
    "youtubeUrl",
  ];

  const availabilityValues = [
    "AVAILABLE",
    "LIMITED",
    "UNAVAILABLE",
  ];

  const isValidHttpUrl = (value) => {
    try {
      const url = new URL(value);

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch {
      return false;
    }
  };

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  for (const field of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const value = body[field];

    if (field === "startingRate") {
      if (value === null || value === "") {
        data[field] = null;
        continue;
      }

      const amount =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number(value.trim())
            : NaN;

      if (!Number.isFinite(amount) || amount < 0) {
        return {
          error: "Le tarif doit être un nombre positif ou nul.",
        };
      }

      data[field] = amount;
      continue;
    }

    if (value === null) {
      if (
        requiredFields.includes(field) ||
        field === "rateCurrency" ||
        field === "availabilityStatus"
      ) {
        return {
          error: `Le champ "${field}" ne peut pas être nul.`,
        };
      }

      data[field] = null;
      continue;
    }

    if (typeof value !== "string") {
      return {
        error: `Le champ "${field}" doit être un texte.`,
      };
    }

    const trimmedValue = value.trim();

    if (
      FIELD_MAX_LENGTHS[field] !== undefined &&
      trimmedValue.length > FIELD_MAX_LENGTHS[field]
    ) {
      return {
        error: `Le champ "${field}" dépasse la longueur autorisée.`,
      };
    }

    if (
      requiredFields.includes(field) &&
      trimmedValue.length === 0
    ) {
      return {
        error: `Le champ "${field}" est obligatoire.`,
      };
    }

    if (field === "contactEmail" && trimmedValue !== "") {
      if (!isValidEmail(trimmedValue)) {
        return {
          error: "L'adresse e-mail professionnelle est invalide.",
        };
      }
    }

    if (
      urlFields.includes(field) &&
      trimmedValue !== "" &&
      !isValidHttpUrl(trimmedValue)
    ) {
      return {
        error: `Le champ "${field}" doit contenir une URL HTTP ou HTTPS valide.`,
      };
    }

    if (field === "availabilityStatus") {
      const status = trimmedValue.toUpperCase();

      if (!availabilityValues.includes(status)) {
        return {
          error:
            "La disponibilité doit être AVAILABLE, LIMITED ou UNAVAILABLE.",
        };
      }

      data[field] = status;
      continue;
    }

    if (field === "rateCurrency") {
      const currency = trimmedValue.toUpperCase();

      if (!/^[A-Z]{3}$/.test(currency)) {
        return {
          error:
            "La devise doit être un code de trois lettres, par exemple XOF.",
        };
      }

      data[field] = currency;
      continue;
    }

    data[field] = trimmedValue;
  }

  return { data };
}

/**
 * Consulter le profil de l'utilisateur connecté.
 */
async function getMyProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        creatorProfile: {
  select: {
    id: true,
    userId: true,
    displayName: true,
    bio: true,
    niche: true,
    location: true,
    profileImageUrl: true,
    mediaKitUrl: true,
    instagramUrl: true,
    tiktokUrl: true,
    youtubeUrl: true,
    country: true,
    city: true,
    startingRate: true,
    rateCurrency: true,
    availabilityStatus: true,
    createdAt: true,
    updatedAt: true,
    creatorSocials: {
      orderBy: {
        createdAt: "desc",
      },
    },
    portfolioItems: {
      orderBy: {
        createdAt: "desc",
      },
    },
  },
},
        companyProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    let profile = null;

    if (user.role === "COMPANY") {
      profile = user.companyProfile;
    } else if (user.role === "CREATOR") {
      profile = user.creatorProfile;
    }

    const { creatorProfile, companyProfile, ...publicUser } = user;

    return res.status(200).json({
      success: true,
      user: publicUser,
      profile,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du profil :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer le profil.",
    });
  }
}

/**
 * Créer ou mettre à jour le profil de l'utilisateur connecté.
 */
async function saveMyProfile(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== "COMPANY" && role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Ce type de compte ne possède pas de profil public.",
      });
    }

    const isCompany = role === "COMPANY";

    const fields = isCompany ? COMPANY_FIELDS : CREATOR_FIELDS;

    const requiredField = isCompany ? "companyName" : "displayName";

    const result = extractProfileData(req.body, fields);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    const data = result.data;

    const existingProfile = isCompany
      ? await prisma.companyProfile.findUnique({
          where: { userId },
        })
      : await prisma.creatorProfile.findUnique({
          where: { userId },
        });

    if (!existingProfile && !data[requiredField]) {
      return res.status(400).json({
        success: false,
        message: `Le champ "${requiredField}" est obligatoire pour créer le profil.`,
      });
    }

    let profile;

if (isCompany) {
  profile = await prisma.companyProfile.upsert({
    where: { userId },

    create: {
      userId,
      ...data,
      companyName:
        data.companyName ?? existingProfile?.companyName,
    },

    update: data,
  });
} else {
  profile = await prisma.creatorProfile.upsert({
    where: { userId },

    create: {
      userId,
      ...data,
      displayName:
        data.displayName ?? existingProfile?.displayName,
    },

    update: data,
  });
}

    return res.status(200).json({
      success: true,
      message: existingProfile
        ? "Profil mis à jour avec succès."
        : "Profil créé avec succès.",
      profile,
    });
  } catch (error) {
    // Affiche l'erreur complète dans le terminal du serveur.
    console.error(
      "Erreur lors de l'enregistrement du profil :",
      error,
    );

    // Ne révèle pas les détails internes au client.
    return res.status(500).json({
      success: false,
      message: "Impossible d'enregistrer le profil.",
    });
  }
}

module.exports = {
  getMyProfile,
  saveMyProfile,
};