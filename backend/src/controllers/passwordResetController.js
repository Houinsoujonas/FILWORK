const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

const prisma = require("../config/prisma");
const { sendPasswordResetEmail } = require("../services/emailService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const GENERIC_RESET_MESSAGE =
  "Si un compte correspond à cette adresse, un e-mail de réinitialisation sera envoyé.";

const INVALID_TOKEN_MESSAGE =
  "Le lien de réinitialisation est invalide ou a expiré.";

/**
 * Prépare le lien destiné à l'interface frontend.
 */
function buildResetUrl(token) {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");

  if (!configuredUrl) {
    throw new Error("FRONTEND_URL doit être configurée en production.");
  }

  const frontendUrl = new URL(configuredUrl);

  if (!["http:", "https:"].includes(frontendUrl.protocol)) {
    throw new Error("Le protocole de FRONTEND_URL est invalide.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    frontendUrl.protocol !== "https:"
  ) {
    throw new Error("FRONTEND_URL doit utiliser HTTPS en production.");
  }

  const resetUrl = new URL("/reset-password", frontendUrl);

  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
}

/**
 * Demande de réinitialisation du mot de passe.
 */
async function forgotPassword(req, res) {
  const body = req.body || {};

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Veuillez fournir une adresse e-mail valide.",
    });
  }

  let createdTokenId = null;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });

    // La réponse publique reste identique si le compte
    // n'existe pas, afin de limiter l'énumération des comptes.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: GENERIC_RESET_MESSAGE,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    // Seul le hash du jeton sera stocké en base de données.
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const now = new Date();

    const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

    const resetUrl = buildResetUrl(token);

    // Invalider les anciennes demandes encore utilisables.
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    createdTokenId = resetToken.id;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      });
    } catch (error) {
      // Ne pas laisser un jeton utilisable si l'envoi
      // du message échoue.
      await prisma.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      throw error;
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_RESET_MESSAGE,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la demande de réinitialisation :",
      error.message,
    );

    // En cas d'échec, invalider le jeton qui aurait
    // éventuellement déjà été enregistré.
    if (createdTokenId) {
      try {
        await prisma.passwordResetToken.updateMany({
          where: {
            id: createdTokenId,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        });
      } catch (cleanupError) {
        console.error(
          "Erreur lors de l'invalidation du jeton :",
          cleanupError.message,
        );
      }
    }

    // La réponse publique ne révèle pas si le compte existe.
    return res.status(200).json({
      success: true,
      message: GENERIC_RESET_MESSAGE,
    });
  }
}

/**
 * Vérification du jeton et changement du mot de passe.
 */
async function resetPassword(req, res) {
  const body = req.body || {};

  const token = typeof body.token === "string" ? body.token.trim() : "";

  const password = typeof body.password === "string" ? body.password : "";

  // Le jeton généré contient 32 octets, représentés
  // par une chaîne hexadécimale de 64 caractères.
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: INVALID_TOKEN_MESSAGE,
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

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    const now = new Date();

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt <= now
    ) {
      return res.status(400).json({
        success: false,
        message: INVALID_TOKEN_MESSAGE,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      // Une seule requête peut consommer ce jeton.
      // Le contrôle atomique évite les doubles utilisations.
      const consumeResult = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumeResult.count !== 1) {
        const error = new Error("RESET_TOKEN_INVALID_OR_USED");

        error.code = "RESET_TOKEN_INVALID_OR_USED";

        throw error;
      }

      await tx.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
          tokenVersion: {
            increment: 1,
          },
        },
      });

      // Invalider les autres demandes de réinitialisation
      // encore actives pour ce compte.
      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Votre mot de passe a été modifié avec succès.",
    });
  } catch (error) {
    if (error.code === "RESET_TOKEN_INVALID_OR_USED") {
      return res.status(400).json({
        success: false,
        message: INVALID_TOKEN_MESSAGE,
      });
    }

    console.error(
      "Erreur lors de la réinitialisation du mot de passe :",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la réinitialisation du mot de passe.",
    });
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};
