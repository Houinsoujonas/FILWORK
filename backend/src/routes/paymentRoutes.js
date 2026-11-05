const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  createPayment,
  getCollaborationPayments,
  updatePaymentStatus,
} = require("../controllers/paymentController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Enregistrer un paiement prévu pour une collaboration (entreprise).
router.post(
  "/collaborations/:collaborationId",
  requireRole("COMPANY"),
  createPayment,
);

// Consulter les paiements d'une collaboration.
// Les deux participants sont autorisés : le contrôleur vérifie la propriété.
router.get(
  "/collaborations/:collaborationId",
  getCollaborationPayments,
);

// Mettre à jour le statut d'un paiement (entreprise).
router.patch(
  "/:id/status",
  requireRole("COMPANY"),
  updatePaymentStatus,
);

module.exports = router;