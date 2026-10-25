const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  getMyProfile,
  saveMyProfile,
} = require("../controllers/profileController");

const {
  getMySocials,
  createMySocial,
  updateMySocial,
  deleteMySocial,
  getMyPortfolio,
  createMyPortfolioItem,
  updateMyPortfolioItem,
  deleteMyPortfolioItem,
} = require("../controllers/creatorContentController");

const router = express.Router();

// Toutes les routes de ce fichier nécessitent une authentification.
router.use(authenticateToken);

// Profil général.
router.get("/me", getMyProfile);
router.put("/me", saveMyProfile);

// Réseaux sociaux du créateur.
router.get("/me/socials", getMySocials);
router.post("/me/socials", createMySocial);
router.put("/me/socials/:socialId", updateMySocial);
router.delete("/me/socials/:socialId", deleteMySocial);

// Portfolio du créateur.
router.get("/me/portfolio", getMyPortfolio);
router.post("/me/portfolio", createMyPortfolioItem);
router.put("/me/portfolio/:itemId", updateMyPortfolioItem);
router.delete("/me/portfolio/:itemId", deleteMyPortfolioItem);

module.exports = router;