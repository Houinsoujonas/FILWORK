const { rateLimit } = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

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

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
};