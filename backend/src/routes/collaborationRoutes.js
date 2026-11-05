const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  getMyCollaborations,
  getCollaborationById,
  completeCollaboration,
  cancelCollaboration,
} = require("../controllers/collaborationController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Consulter les collaborations de l'utilisateur connecté.
router.get("/", getMyCollaborations);

// Clôturer une collaboration (entreprise participante uniquement).
router.patch(
  "/:id/complete",
  requireRole("COMPANY"),
  completeCollaboration,
);

// Annuler une collaboration (entreprise avec motif, ou créateur sans engagement).
// Les deux rôles sont autorisés : le contrôleur vérifie la participation.
router.patch("/:id/cancel", cancelCollaboration);

// Consulter une collaboration précise.
router.get("/:id", getCollaborationById);

module.exports = router;