const express = require("express");

const { authenticateToken } = require("../middlewares/authMiddleware");

const { requireAdmin } = require("../middlewares/adminMiddleware");

const {
  getDashboardStats,
  getAdminUsers,
  getAdminCampaigns,
   getAdminCollaborations,
   getAdminDeliverables,
   getAdminPayments,
  updateAdminUser,
  deactivateUser,
  reactivateUser,
} = require("../controllers/adminController");

const router = express.Router();

// Toutes les routes administratives exigent une authentification
// et le rôle ADMIN.
router.use(authenticateToken, requireAdmin);

// Consulter et filtrer les livrables de la plateforme.
router.get("/deliverables", getAdminDeliverables);

// Consulter et filtrer les paiements de la plateforme.
router.get("/payments", getAdminPayments);

// Tableau de bord administratif.
router.get("/dashboard", getDashboardStats);

// Liste et recherche des utilisateurs.
router.get("/users", getAdminUsers);

// Modifier un utilisateur (e-mail, rôle).
router.patch("/users/:id", updateAdminUser);

// Désactiver un compte utilisateur.
router.patch("/users/:id/deactivate", deactivateUser);

// Réactiver un compte utilisateur.
router.patch("/users/:id/reactivate", reactivateUser);

// Consulter et rechercher toutes les campagnes.
router.get("/campaigns", getAdminCampaigns);

// Consulter et filtrer toutes les collaborations.
router.get("/collaborations", getAdminCollaborations);

module.exports = router;
