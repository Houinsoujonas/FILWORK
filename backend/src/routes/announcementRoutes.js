const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");

const {
  getMyAnnouncements,
  getAnnouncementById,
} = require("../controllers/announcementController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Consulter les annonces publiées accessibles à l'utilisateur connecté.
router.get("/", getMyAnnouncements);

// Consulter une annonce spécifique.
router.get("/:id", getAnnouncementById);

module.exports = router;