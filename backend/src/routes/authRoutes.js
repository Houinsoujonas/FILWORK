const express = require("express");

const {
  register,
  login,
} = require("../controllers/authController");

const {
  forgotPassword,
  resetPassword,
} = require("../controllers/passwordResetController");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  logout,
} = require("../controllers/sessionController");

const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require("../middlewares/rateLimiters");

const router = express.Router();

// Inscription : 5 requêtes par heure en production.
router.post("/register", registerLimiter, register);

// Connexion : 10 requêtes toutes les 15 minutes en production.
router.post("/login", loginLimiter, login);

// Demande de réinitialisation du mot de passe.
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword,
);

// Validation du jeton et changement du mot de passe.
router.post(
  "/reset-password",
  resetPasswordLimiter,
  resetPassword,
);

// Déconnexion et révocation du jeton courant.
router.post("/logout", authenticateToken, logout);

// Informations de l'utilisateur connecté.
router.get("/me", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authentification vérifiée.",
    user: req.user,
  });
});

module.exports = router;