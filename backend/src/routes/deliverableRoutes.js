const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  createDeliverable,
  getCollaborationDeliverables,
  submitDeliverable,
  reviewDeliverable,
} = require("../controllers/deliverableController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Créer un livrable pour une collaboration (entreprise uniquement).
router.post(
  "/collaborations/:collaborationId",
  requireRole("COMPANY"),
  createDeliverable,
);

// Consulter les livrables d'une collaboration.
// Les deux participants sont autorisés : le contrôleur vérifie la propriété.
router.get(
  "/collaborations/:collaborationId",
  getCollaborationDeliverables,
);

// Soumettre un livrable en tant que créateur.
router.patch(
  "/:id/submit",
  requireRole("CREATOR"),
  submitDeliverable,
);

// Examiner un livrable en tant qu'entreprise.
router.patch(
  "/:id/review",
  requireRole("COMPANY"),
  reviewDeliverable,
);

module.exports = router;