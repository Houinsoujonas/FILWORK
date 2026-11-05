const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  getCreatorDirectory,
  getCreatorById,
} = require("../controllers/creatorDirectoryController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// L'annuaire est réservé aux entreprises.
router.get("/", requireRole("COMPANY"), getCreatorDirectory);

// Consulter un profil créateur depuis l'annuaire.
router.get("/:id", requireRole("COMPANY"), getCreatorById);

module.exports = router;