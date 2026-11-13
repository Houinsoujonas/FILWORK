const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  getPublishedCampaigns,
  getPublishedCampaignById,
  createCampaign,
  getMyCampaigns,
  updateCampaign,
  publishCampaign,
  pauseCampaign,
  closeCampaign,
  deleteCampaign,
} = require("../controllers/campaignController");

const router = express.Router();

// Limiter la lecture publique avant d'exposer la liste des campagnes.
const { publicReadLimiter } = require("../middlewares/rateLimiters");


// Consulter les campagnes publiées sans se connecter.
router.get("/", publicReadLimiter, getPublishedCampaigns);

// Consulter les campagnes de l'entreprise connectée.
// Déclarée avant /:id pour ne pas être interprétée comme un identifiant.
router.get(
  "/my-campaigns",
  authenticateToken,
  requireRole("COMPANY"),
  getMyCampaigns,
);

// Consulter publiquement une campagne publiée.
router.get("/:id", publicReadLimiter, getPublishedCampaignById);

// Toutes les routes suivantes nécessitent une authentification
// et sont réservées aux entreprises.
router.use(authenticateToken, requireRole("COMPANY"));

// Créer une campagne.
router.post("/", createCampaign);

// Modifier une campagne appartenant à l'entreprise connectée.
router.put("/:id", updateCampaign);

// Supprimer un brouillon sans candidature.
router.delete("/:id", deleteCampaign);

// Publier une campagne.
router.patch("/:id/publish", publishCampaign);

router.patch("/:id/close", closeCampaign);

// Suspendre une campagne publiée.
router.patch("/:id/pause", pauseCampaign);

module.exports = router;