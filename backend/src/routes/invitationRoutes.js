const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

const { requireRole } = require("../middlewares/roleMiddleware");

const {
  createInvitation,
  getReceivedInvitations,
  getSentInvitations,
  respondToInvitation,
  withdrawInvitation,
} = require("../controllers/invitationController");

const router = express.Router();

// Envoyer une invitation pour une campagne appartenant à l'entreprise.
// POST /api/campaigns/:campaignId/invitations
router.post(
  "/campaigns/:campaignId/invitations",
  authenticateToken,
  requireRole("COMPANY"),
  createInvitation,
);

// Consulter les invitations reçues par le créateur.
// GET /api/invitations/received
router.get(
  "/invitations/received",
  authenticateToken,
  requireRole("CREATOR"),
  getReceivedInvitations,
);

// Consulter les invitations envoyées par l'entreprise.
// GET /api/invitations/sent
router.get(
  "/invitations/sent",
  authenticateToken,
  requireRole("COMPANY"),
  getSentInvitations,
);

// Accepter ou refuser une invitation.
// PATCH /api/invitations/:invitationId/respond
router.patch(
  "/invitations/:invitationId/respond",
  authenticateToken,
  requireRole("CREATOR"),
  respondToInvitation,
);

// Retirer une invitation encore en attente.
// PATCH /api/invitations/:invitationId/withdraw
router.patch(
  "/invitations/:invitationId/withdraw",
  authenticateToken,
  requireRole("COMPANY"),
  withdrawInvitation,
);

module.exports = router;