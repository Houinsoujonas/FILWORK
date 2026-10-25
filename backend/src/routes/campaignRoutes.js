const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  getPublishedCampaigns,
  createCampaign,
  getMyCampaigns,
  updateCampaign,
  publishCampaign,
  pauseCampaign,
  closeCampaign,
  deleteCampaign,
} = require("../controllers/campaignController");

const router = express.Router();

// Consulter les campagnes publiées sans se connecter.
router.get("/", getPublishedCampaigns);

// Toutes les routes suivantes nécessitent une authentification.
router.use(authenticateToken);

// Créer une campagne.
router.post("/", createCampaign);

// Consulter les campagnes de l'entreprise connectée.
router.get("/my-campaigns", getMyCampaigns);

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