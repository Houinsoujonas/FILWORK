const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

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
router.get("/me/socials", requireRole("CREATOR"), getMySocials);
router.post("/me/socials", requireRole("CREATOR"), createMySocial);
router.put(
  "/me/socials/:socialId",
  requireRole("CREATOR"),
  updateMySocial,
);
router.delete(
  "/me/socials/:socialId",
  requireRole("CREATOR"),
  deleteMySocial,
);

// Portfolio du créateur.
router.get("/me/portfolio", requireRole("CREATOR"), getMyPortfolio);
router.post(
  "/me/portfolio",
  requireRole("CREATOR"),
  createMyPortfolioItem,
);
router.put(
  "/me/portfolio/:itemId",
  requireRole("CREATOR"),
  updateMyPortfolioItem,
);
router.delete(
  "/me/portfolio/:itemId",
  requireRole("CREATOR"),
  deleteMyPortfolioItem,
);

module.exports = router;