const { rateLimit } = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

// En production, les overrides de limites d'environnement sont ignorés :
// seules les valeurs définies dans le code s'appliquent. En test, ils servent
// à simuler un 429 rapide sans attendre 60 s ni augmenter les charges.
const isTest = process.env.NODE_ENV === "test";

const overridePublicRead = isTest
  ? Number.parseInt(process.env.RATE_LIMIT_PUBLIC_READ_PER_MINUTE, 10)
  : Number.NaN;
const overrideGeneral = isTest
  ? Number.parseInt(process.env.RATE_LIMIT_GENERAL_PER_MINUTE, 10)
  : Number.NaN;

// Limiter les tentatives de connexion.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
  },
});

// Limiter les créations de comptes.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProduction ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de tentatives d'inscription. Réessayez dans une heure.",
  },
});

// Limiter les demandes de réinitialisation.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de demandes de réinitialisation. Réessayez plus tard.",
  },
});

// Limiter les tentatives de validation des jetons.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de tentatives. Réessayez dans 15 minutes.",
  },
});

// Limiter les renouvellements de session (refresh token).
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 30 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de renouvellements de session. Réessayez dans 15 minutes.",
  },
});

// Limiter les appels au webhook SasPay (public, mais signature vérifiée).
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de requêtes sur le webhook. Réessayez dans une minute.",
  },
});

// Limiter les recherches publiques `/api/campaigns` (lecture seule).
const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit:
    Number.isInteger(overridePublicRead) && overridePublicRead > 0
      ? overridePublicRead
      : isProduction
      ? 120
      : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de requêtes en lecture publique. Patientez une minute avant de réessayer.",
  },
});

// Limitation globale générique (protection simple contre l'abus de masse).
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit:
    Number.isInteger(overrideGeneral) && overrideGeneral > 0
      ? overrideGeneral
      : isProduction
      ? 600
      : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de requêtes. Patientez une minute avant de réessayer.",
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  refreshLimiter,
  webhookLimiter,
  publicReadLimiter,
  generalLimiter,
};