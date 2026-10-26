const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  getMyCollaborations,
  getCollaborationById,
} = require("../controllers/collaborationController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Consulter les collaborations de l'utilisateur connecté.
router.get("/", getMyCollaborations);

// Consulter une collaboration précise.
router.get("/:id", getCollaborationById);

module.exports = router;