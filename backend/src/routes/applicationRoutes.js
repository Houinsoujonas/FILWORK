const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  submitApplication,
  getMyApplications,
  getCampaignApplications,
  updateApplicationStatus,
  withdrawApplication,
} = require("../controllers/applicationController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Permet à un créateur de candidater à une campagne.
router.post("/:campaignId", requireRole("CREATOR"), submitApplication);

// Permet à un créateur de consulter ses candidatures.
router.get(
  "/my-applications",
  requireRole("CREATOR"),
  getMyApplications,
);

// Permet à une entreprise de consulter les candidatures
// reçues pour l'une de ses campagnes.
router.get(
  "/campaigns/:campaignId",
  requireRole("COMPANY"),
  getCampaignApplications,
);

// Permet à une entreprise d'accepter ou de refuser une candidature.
router.patch(
  "/:applicationId/status",
  requireRole("COMPANY"),
  updateApplicationStatus,
);
// Retirer sa propre candidature.
router.patch(
  "/:applicationId/withdraw",
  requireRole("CREATOR"),
  withdrawApplication,
);

module.exports = router;