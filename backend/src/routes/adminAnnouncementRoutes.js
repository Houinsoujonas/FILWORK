const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireAdmin } = require("../middlewares/adminMiddleware");

const {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  getAdminAnnouncements,
  getAdminAnnouncementById,
  archiveAnnouncement,
} = require("../controllers/announcementController");

const router = express.Router();

// Toutes les routes administratives exigent une authentification
// et le rôle ADMIN.
router.use(authenticateToken, requireAdmin);

// Créer une annonce (brouillon).
router.post("/announcements", createAnnouncement);

// Modifier une annonce non publiée.
router.patch("/announcements/:id", updateAnnouncement);

// Publier une annonce.
router.post("/announcements/:id/publish", publishAnnouncement);

// Lister toutes les annonces avec leur état.
router.get("/announcements", getAdminAnnouncements);

// Récupérer une annonce pour l'édition administrative.
router.get("/announcements/:id", getAdminAnnouncementById);

// Archiver une annonce.
router.patch("/announcements/:id/archive", archiveAnnouncement);

module.exports = router;