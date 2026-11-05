const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  createReview,
  getReviews,
  getReviewById,
  createReviewResponse,
  updateReviewResponse,
} = require("../controllers/reviewController");

const router = express.Router();

// Consulter publiquement les avis.
router.get("/", getReviews);

// Consulter publiquement un avis.
router.get("/:id", getReviewById);

// Toutes les routes suivantes nécessitent une authentification.
router.use(authenticateToken);

// Publier un avis sur une collaboration terminée (entreprise).
router.post("/", requireRole("COMPANY"), createReview);

// Répondre à un avis en tant que créateur destinataire.
router.post(
  "/:id/response",
  requireRole("CREATOR"),
  createReviewResponse,
);

// Modifier sa propre réponse.
router.patch(
  "/:id/response",
  requireRole("CREATOR"),
  updateReviewResponse,
);

module.exports = router;
