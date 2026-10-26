const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const {
  getCreatorDirectory,
} = require("../controllers/creatorDirectoryController");

const router = express.Router();

// Toutes les routes nécessitent une authentification.
router.use(authenticateToken);

// Le contrôleur réserve cette fonctionnalité au rôle COMPANY.
router.get("/", getCreatorDirectory);

module.exports = router;