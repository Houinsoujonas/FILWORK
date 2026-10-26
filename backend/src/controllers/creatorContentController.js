const prisma = require("../config/prisma");

const SOCIAL_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "LINKEDIN",
  "FACEBOOK",
  "TWITCH",
];

const PORTFOLIO_TYPES = ["IMAGE", "VIDEO", "LINK"];

const SOCIAL_FIELDS = [
  "platform",
  "profileUrl",
  "followerCount",
];

const PORTFOLIO_FIELDS = [
  "title",
  "description",
  "type",
  "url",
  "campaignName",
];

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isValidBody(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Le corps de la requête est invalide.";
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length > 0) {
    return `Champ(s) non autorisé(s) : ${unknownFields.join(", ")}.`;
  }

  return null;
}

async function findCreatorProfile(userId) {
  return prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

function validateSocialData(body, isCreate = false) {
  const bodyError = isValidBody(body, SOCIAL_FIELDS);

  if (bodyError) {
    return { error: bodyError };
  }

  const data = {};

  if (isCreate || Object.hasOwn(body, "platform")) {
    if (
      typeof body.platform !== "string" ||
      !SOCIAL_PLATFORMS.includes(body.platform.trim().toUpperCase())
    ) {
      return {
        error: `La plateforme doit être l'une des suivantes : ${SOCIAL_PLATFORMS.join(", ")}.`,
      };
    }

    data.platform = body.platform.trim().toUpperCase();
  }

  if (isCreate || Object.hasOwn(body, "profileUrl")) {
    if (
      typeof body.profileUrl !== "string" ||
      !isValidHttpUrl(body.profileUrl.trim())
    ) {
      return {
        error: "Le lien du profil social doit être une URL HTTP ou HTTPS valide.",
      };
    }

    data.profileUrl = body.profileUrl.trim();
  }

  if (Object.hasOwn(body, "followerCount")) {
    const count = body.followerCount;

    if (count === null) {
      data.followerCount = null;
    } else if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 2147483647
    ) {
      return {
        error: "Le nombre d'abonnés doit être un entier positif ou nul.",
      };
    } else {
      data.followerCount = count;
    }
  }

  if (!isCreate && Object.keys(data).length === 0) {
    return {
      error: "Au moins un champ doit être fourni pour la modification.",
    };
  }

  return { data };
}

function validatePortfolioData(body, isCreate = false) {
  const bodyError = isValidBody(body, PORTFOLIO_FIELDS);

  if (bodyError) {
    return { error: bodyError };
  }

  const data = {};
  const stringLimits = {
    title: 150,
    description: 3000,
    campaignName: 150,
  };

  for (const field of ["title", "description", "campaignName"]) {
    if (!Object.hasOwn(body, field)) {
      continue;
    }

    const value = body[field];

    if (field !== "title" && value === null) {
      data[field] = null;
      continue;
    }

    if (typeof value !== "string") {
      return {
        error: `Le champ "${field}" doit être un texte.`,
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length > stringLimits[field]) {
      return {
        error: `Le champ "${field}" dépasse la longueur autorisée.`,
      };
    }

    if (field === "title" && !trimmedValue) {
      return {
        error: "Le titre est obligatoire.",
      };
    }

    data[field] = trimmedValue;
  }

  if (isCreate && !data.title) {
    return { error: "Le titre est obligatoire." };
  }

  if (isCreate || Object.hasOwn(body, "type")) {
    if (
      typeof body.type !== "string" ||
      !PORTFOLIO_TYPES.includes(body.type.trim().toUpperCase())
    ) {
      return {
        error: `Le type doit être ${PORTFOLIO_TYPES.join(", ")}.`,
      };
    }

    data.type = body.type.trim().toUpperCase();
  }

  if (isCreate || Object.hasOwn(body, "url")) {
    if (
      typeof body.url !== "string" ||
      !isValidHttpUrl(body.url.trim())
    ) {
      return {
        error: "L'adresse de la réalisation doit être une URL HTTP ou HTTPS valide.",
      };
    }

    data.url = body.url.trim();
  }

  if (isCreate && (!data.type || !data.url)) {
    return {
      error: "Le titre, le type et l'URL sont obligatoires.",
    };
  }

  if (!isCreate && Object.keys(data).length === 0) {
    return {
      error: "Au moins un champ doit être fourni pour la modification.",
    };
  }

  return { data };
}

// =====================================================
// RÉSEAUX SOCIAUX
// =====================================================

async function getMySocials(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent gérer leurs réseaux sociaux.",
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const socials = await prisma.creatorSocial.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      socials,
    });
  } catch (error) {
    console.error("Erreur de récupération des réseaux sociaux :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les réseaux sociaux.",
    });
  }
}

async function createMySocial(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent ajouter des réseaux sociaux.",
    });
  }

  const validation = validateSocialData(req.body, true);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const social = await prisma.creatorSocial.create({
      data: {
        creatorProfileId: profile.id,
        ...validation.data,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Réseau social ajouté avec succès.",
      social,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Un compte pour cette plateforme est déjà enregistré.",
      });
    }

    console.error("Erreur de création du réseau social :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible d'ajouter le réseau social.",
    });
  }
}

async function updateMySocial(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent modifier leurs réseaux sociaux.",
    });
  }

  const validation = validateSocialData(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const social = await prisma.creatorSocial.update({
      where: {
        id: req.params.socialId,
        creatorProfileId: profile.id,
      },
      data: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Réseau social modifié avec succès.",
      social,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Réseau social introuvable pour ce profil.",
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Un compte pour cette plateforme est déjà enregistré.",
      });
    }

    console.error("Erreur de modification du réseau social :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier le réseau social.",
    });
  }
}

async function deleteMySocial(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent supprimer leurs réseaux sociaux.",
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const result = await prisma.creatorSocial.deleteMany({
      where: {
        id: req.params.socialId,
        creatorProfileId: profile.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Réseau social introuvable pour ce profil.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Réseau social supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur de suppression du réseau social :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer le réseau social.",
    });
  }
}

// =====================================================
// PORTFOLIO
// =====================================================

async function getMyPortfolio(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent gérer leur portfolio.",
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const items = await prisma.portfolioItem.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Erreur de récupération du portfolio :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer le portfolio.",
    });
  }
}

async function createMyPortfolioItem(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent ajouter des réalisations.",
    });
  }

  const validation = validatePortfolioData(req.body, true);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const item = await prisma.portfolioItem.create({
      data: {
        creatorProfileId: profile.id,
        ...validation.data,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Réalisation ajoutée au portfolio.",
      item,
    });
  } catch (error) {
    console.error("Erreur de création du portfolio :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible d'ajouter la réalisation.",
    });
  }
}

async function updateMyPortfolioItem(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent modifier leur portfolio.",
    });
  }

  const validation = validatePortfolioData(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const item = await prisma.portfolioItem.update({
      where: {
        id: req.params.itemId,
        creatorProfileId: profile.id,
      },
      data: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Réalisation modifiée avec succès.",
      item,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Réalisation introuvable pour ce profil.",
      });
    }

    console.error("Erreur de modification du portfolio :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier la réalisation.",
    });
  }
}

async function deleteMyPortfolioItem(req, res) {
  if (req.user.role !== "CREATOR") {
    return res.status(403).json({
      success: false,
      message: "Seuls les créateurs peuvent supprimer des réalisations.",
    });
  }

  try {
    const profile = await findCreatorProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    const result = await prisma.portfolioItem.deleteMany({
      where: {
        id: req.params.itemId,
        creatorProfileId: profile.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Réalisation introuvable pour ce profil.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Réalisation supprimée avec succès.",
    });
  } catch (error) {
    console.error("Erreur de suppression du portfolio :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer la réalisation.",
    });
  }
}

module.exports = {
  getMySocials,
  createMySocial,
  updateMySocial,
  deleteMySocial,
  getMyPortfolio,
  createMyPortfolioItem,
  updateMyPortfolioItem,
  deleteMyPortfolioItem,
};