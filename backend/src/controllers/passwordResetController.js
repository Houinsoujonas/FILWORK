const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const { enqueuePasswordResetCodeEmail } = require("../services/emailService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/;

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

const MAX_RESET_ATTEMPTS = 5;

const RESET_CODE_LENGTH = 6;

const GENERIC_RESET_MESSAGE =
  "Si un compte correspond à cette adresse, un e-mail de réinitialisation sera envoyé.";

const INVALID_CODE_MESSAGE =
  "Le code de réinitialisation est invalide ou a expiré.";

/**
 * Génère un code numérique à six chiffres.
 *
 * @returns {string}
 */
function generateResetCode() {
  let code = "";
  for (let i = 0; i < RESET_CODE_LENGTH; i += 1) {
    code += String(crypto.randomInt(0, 10));
  }
  return code;
}

/**
 * Calcule le hash SHA-256 d'un code de réinitialisation.
 *
 * @param {string} code
 * @returns {string}
 */
function hashResetCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Prépare l'URL de la page de réinitialisation côté frontend,
 * en y associant l'adresse e-mail concernée.
 *
 * @param {string} email
 * @returns {string}
 */
function buildResetUrl(email) {
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
  resetUrl.searchParams.set("email", email);
  return resetUrl.toString();
}

/**
 * Demande de réinitialisation du mot de passe par code.
 *
 * Génère un code à six chiffres, stocke uniquement son hash, et met en file
 * l'e-mail contenant le code. La réponse publique reste identique si le
 * compte n'existe pas, afin de limiter l'énumération des comptes.
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
        creatorProfile: {
          select: { displayName: true },
        },
        companyProfile: {
          select: { companyName: true },
        },
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

    const displayName =
      user.creatorProfile?.displayName ||
      user.companyProfile?.companyName ||
      undefined;

    const code = generateResetCode();

    // Seul le hash du code sera stocké en base de données.
    // Le code en clair ne doit jamais être journalisé.
    const codeHash = hashResetCode(code);

    const now = new Date();

    const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MS);

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
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    createdTokenId = resetToken.id;

    const resetUrl = buildResetUrl(user.email);

    // Mettre en file l'e-mail contenant le code.
    // L'échec de l'envoi ne doit pas annuler la demande.
    try {
      await enqueuePasswordResetCodeEmail({
        to: user.email,
        displayName,
        code,
        resetUrl,
      });
    } catch (emailError) {
      console.error(
        "Erreur lors de la mise en file de l'e-mail de code de réinitialisation :",
        emailError.message,
      );

      // Ne pas laisser un code utilisable si l'envoi échoue.
      await prisma.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_RESET_MESSAGE,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la demande de réinitialisation :",
      error.message,
    );

    // En cas d'échec, invalider le code qui aurait
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
          "Erreur lors de l'invalidation du code :",
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
 * Vérification du code et changement du mot de passe.
 *
 * L'adresse e-mail est requise pour rattacher le code au bon compte : un code
 * à six chiffres n'est pas unique globalement et seul son hash est stocké.
 */
async function resetPassword(req, res) {
  const body = req.body || {};

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const code = typeof body.code === "string" ? body.code.trim() : "";

  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      message: INVALID_CODE_MESSAGE,
    });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: INVALID_CODE_MESSAGE,
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
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: INVALID_CODE_MESSAGE,
      });
    }

    const now = new Date();

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        codeHash: true,
        attempts: true,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: INVALID_CODE_MESSAGE,
      });
    }

    if (resetToken.attempts >= MAX_RESET_ATTEMPTS) {
      return res.status(400).json({
        success: false,
        message: INVALID_CODE_MESSAGE,
      });
    }

    const submittedHash = hashResetCode(code);

    const codeIsValid =
      submittedHash.length === resetToken.codeHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(submittedHash),
        Buffer.from(resetToken.codeHash),
      );

    if (!codeIsValid) {
      // Incrémenter le compteur uniquement tant que la limite n'est pas atteinte.
      await prisma.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          attempts: { lt: MAX_RESET_ATTEMPTS },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      // Bloquer le code dès que le nombre maximal de tentatives est atteint.
      if (resetToken.attempts + 1 >= MAX_RESET_ATTEMPTS) {
        await prisma.passwordResetToken.updateMany({
          where: { id: resetToken.id, usedAt: null },
          data: { usedAt: now },
        });
      }

      return res.status(400).json({
        success: false,
        message: INVALID_CODE_MESSAGE,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      // Consommer le code de façon atomique : une seule requête concurrente
      // peut réussir.
      const consumeResult = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: MAX_RESET_ATTEMPTS },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumeResult.count !== 1) {
        const error = new Error("RESET_CODE_INVALID_OR_USED");
        error.code = "RESET_CODE_INVALID_OR_USED";
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
    if (sendPrismaError(res, error)) {
      return;
    }

    if (error.code === "RESET_CODE_INVALID_OR_USED") {
      return res.status(400).json({
        success: false,
        message: INVALID_CODE_MESSAGE,
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
