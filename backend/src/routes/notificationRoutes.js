const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Consulter les notifications de l'utilisateur connecté.
router.get("/", getMyNotifications);

// Marquer une notification comme lue.
router.patch("/:id/read", markNotificationAsRead);

// Marquer toutes les notifications comme lues.
router.patch("/read-all", markAllNotificationsAsRead);

module.exports = router;