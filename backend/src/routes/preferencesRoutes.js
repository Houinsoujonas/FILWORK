const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");

const {
  getMyPreferences,
  updateMyPreferences,
} = require("../controllers/preferencesController");

const router = express.Router();

// Consulter les préférences de communication de l'utilisateur connecté.
router.get("/preferences", authenticateToken, getMyPreferences);

// Mettre à jour les préférences de communication de l'utilisateur connecté.
router.patch("/preferences", authenticateToken, updateMyPreferences);

module.exports = router;