const express = require("express");

const {
  getCreatorDirectory,
  getCreatorById,
} = require("../controllers/creatorDirectoryController");

const { publicReadLimiter } = require("../middlewares/rateLimiters");

const router = express.Router();

// L'annuaire public des créateurs est accessible à tous (avec limitation de débit)
// afin que les créateurs éligibles soient découvrables par les visiteurs et entreprises.
router.get("/", publicReadLimiter, getCreatorDirectory);

// Consulter la fiche publique d'un créateur depuis l'annuaire.
router.get("/:id", publicReadLimiter, getCreatorById);

module.exports = router;