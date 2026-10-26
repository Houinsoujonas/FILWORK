const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  createDeliverable,
  getCollaborationDeliverables,
  submitDeliverable,
  reviewDeliverable,
} = require("../controllers/deliverableController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Créer un livrable pour une collaboration.
router.post(
  "/collaborations/:collaborationId",
  createDeliverable,
);

// Consulter les livrables d'une collaboration.
router.get(
  "/collaborations/:collaborationId",
  getCollaborationDeliverables,
);

// Soumettre un livrable en tant que créateur.
router.patch("/:id/submit", submitDeliverable);

// Examiner un livrable en tant qu'entreprise.
router.patch("/:id/review", reviewDeliverable);

module.exports = router;