const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const { enqueueWelcomeEmail } = require("../services/emailService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ROLES = ["CREATOR", "COMPANY"];

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * Crée un refresh token sécurisé et le stocke sous forme de hash.
 *
 * @param {string} userId
 * @param {number} tokenVersion
 * @param {object|null} [tx] - Contexte transactionnel Prisma (optionnel)
 * @returns {Promise<{token: string, expiresAt: Date}>}
 */
async function createRefreshTokenRecord(userId, tokenVersion, tx = null) {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const client = tx || prisma;

  await client.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      tokenVersion: Number.isInteger(tokenVersion) ? tokenVersion : 0,
    },
  });

  return { token, expiresAt };
}

/**
 * Génère un jeton JWT pour l'utilisateur.
 */
function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET n'est pas configuré.");
  }

  return jwt.sign(
    {
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      algorithm: "HS256",
    },
  );
}

/**
 * Retourne les informations publiques d'un utilisateur.
 */
function getPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Inscription d'un nouvel utilisateur.
 */
async function register(req, res) {
  try {
    const body = req.body || {};

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    const role =
      typeof body.role === "string" ? body.role.trim().toUpperCase() : "";

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir une adresse e-mail valide.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe est trop long.",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Le type de compte doit être CREATOR ou COMPANY.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est déjà utilisée.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Créer le compte, ses préférences et son refresh token dans une seule
    // transaction afin d'éviter toute inscription partielle.
    let refreshTokenString;
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      await tx.notificationPreference.create({
        data: { userId: created.id },
      });

      const createdRefresh = await createRefreshTokenRecord(
        created.id,
        created.tokenVersion ?? 0,
        tx,
      );

      refreshTokenString = createdRefresh.token;

      return created;
    });

    // Mettre en file l'e-mail de bienvenue. L'échec de l'envoi
    // ne doit pas annuler l'inscription réussie.
    try {
      await enqueueWelcomeEmail({
        to: user.email,
        displayName: undefined,
        role: user.role,
      });
    } catch (emailError) {
      console.error(
        "Erreur lors de la mise en file de l'e-mail de bienvenue :",
        emailError.message,
      );
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Votre compte a été créé avec succès.",
      user: getPublicUser(user),
      token,
      refreshToken: refreshTokenString,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est déjà utilisée.",
      });
    }

    console.error("Erreur lors de l'inscription :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la création du compte.",
    });
  }
}

/**
 * Connexion d'un utilisateur existant.
 */
async function login(req, res) {
  try {
    const body = req.body || {};

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "L'adresse e-mail et le mot de passe sont obligatoires.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Ce compte est désactivé. Veuillez contacter l'administration.",
      });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    const token = generateToken(user);

    const { token: refreshTokenString } = await createRefreshTokenRecord(
      user.id,
      user.tokenVersion ?? 0,
    );

    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      user: getPublicUser(user),
      token,
      refreshToken: refreshTokenString,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la connexion :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion.",
    });
  }
}

/**
 * Renouvelle une session en échangeant un refresh token contre
 * une nouvelle paire d'access token / refresh token (rotation).
 *
 * POST /api/auth/refresh
 */
async function refresh(req, res) {
  const body = req.body || {};

  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Le refresh token est obligatoire.",
    });
  }

  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // Revendication atomique du refresh token : une seule requête peut
      // faire passer un token valide de revokedAt=NULL à revokedAt=now.
      const claimed = await tx.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
          replacedByTokenHash: null,
        },
      });

      if (claimed.count !== 1) {
        const existing = await tx.refreshToken.findUnique({
          where: { tokenHash },
          include: { user: true },
        });

        if (!existing) {
          return { type: "not-found" };
        }

        if (existing.revokedAt !== null) {
          // Rejeu détecté : révoquer toutes les sessions persistantes du compte.
          await tx.refreshToken.updateMany({
            where: {
              userId: existing.userId,
              revokedAt: null,
            },
            data: {
              revokedAt: now,
            },
          });

          return { type: "reuse" };
        }

        return { type: "expired" };
      }

      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      const user = storedToken.user;

      if (!user.isActive) {
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });

        return { type: "inactive" };
      }

      if (storedToken.tokenVersion !== user.tokenVersion) {
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });

        return { type: "invalid-version" };
      }

      const newRefreshTokenString = generateRefreshToken();
      const newRefreshTokenHash = hashToken(newRefreshTokenString);
      const newExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

      await tx.refreshToken.create({
        data: {
          tokenHash: newRefreshTokenHash,
          userId: user.id,
          expiresAt: newExpiresAt,
          tokenVersion: user.tokenVersion ?? 0,
        },
      });

      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          replacedByTokenHash: newRefreshTokenHash,
        },
      });

      const accessToken = generateToken(user);

      return {
        type: "ok",
        user,
        accessToken,
        refreshToken: newRefreshTokenString,
      };
    });

    switch (outcome.type) {
      case "ok":
        return res.status(200).json({
          success: true,
          message: "Session renouvelée avec succès.",
          user: getPublicUser(outcome.user),
          token: outcome.accessToken,
          accessToken: outcome.accessToken,
          refreshToken: outcome.refreshToken,
        });

      case "not-found":
        return res.status(401).json({
          success: false,
          message: "Refresh token invalide. Veuillez vous reconnecter.",
        });

      case "reuse":
        return res.status(401).json({
          success: false,
          message:
            "Session compromise. Tous les jetons ont été révoqués. Veuillez vous reconnecter.",
        });

      case "expired":
        return res.status(401).json({
          success: false,
          message: "Refresh token expiré. Veuillez vous reconnecter.",
        });

      case "invalid-version":
        return res.status(401).json({
          success: false,
          message: "Session invalide. Veuillez vous reconnecter.",
        });

      case "inactive":
        return res.status(403).json({
          success: false,
          message: "Ce compte est désactivé. Veuillez contacter l'administration.",
        });

      default:
        return res.status(500).json({
          success: false,
          message: "Une erreur est survenue lors du renouvellement de session.",
        });
    }
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors du renouvellement de session :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du renouvellement de session.",
    });
  }
}

module.exports = {
  register,
  login,
  refresh,
};
