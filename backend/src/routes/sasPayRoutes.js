const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");
const { requireAdmin } = require("../middlewares/adminMiddleware");

const {
  initializePayment,
  getPaymentStatus,
} = require("../controllers/sasPayController");

const {
  initializePayoutForPayment,
  verifyPayoutForPayment,
} = require("../controllers/sasPayPayoutController");

const router = express.Router();

// Initier un paiement SasPay pour un paiement de collaboration (entreprise).
router.post(
  "/payments/:paymentId/saspay/initialize",
  authenticateToken,
  requireRole("COMPANY"),
  initializePayment,
);

// Vérifier l'état réel d'un paiement auprès de SasPay.
router.get(
  "/payments/:paymentId/saspay/status",
  authenticateToken,
  requireRole("COMPANY"),
  getPaymentStatus,
);

// Reversement au créateur — strictement réservé aux administrateurs.
router.post(
  "/payouts/:paymentId/saspay/initialize",
  authenticateToken,
  requireAdmin,
  initializePayoutForPayment,
);

// Vérifier l'état réel d'un reversement.
router.get(
  "/payouts/:paymentId/saspay/verify",
  authenticateToken,
  requireAdmin,
  verifyPayoutForPayment,
);

module.exports = router;
