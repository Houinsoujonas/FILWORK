const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  createPayment,
  getCollaborationPayments,
  updatePaymentStatus,
} = require("../controllers/paymentController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Enregistrer un paiement prévu pour une collaboration.
router.post(
  "/collaborations/:collaborationId",
  createPayment,
);

// Consulter les paiements d'une collaboration.
router.get(
  "/collaborations/:collaborationId",
  getCollaborationPayments,
);

// Mettre à jour le statut d'un paiement.
router.patch("/:id/status", updatePaymentStatus);

module.exports = router;