const express = require("express");

const {
  authenticateToken,
} = require("../middlewares/authMiddleware");

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
  createInvitation,
);

// Consulter les invitations reçues par le créateur.
// GET /api/invitations/received
router.get(
  "/invitations/received",
  authenticateToken,
  getReceivedInvitations,
);

// Consulter les invitations envoyées par l'entreprise.
// GET /api/invitations/sent
router.get(
  "/invitations/sent",
  authenticateToken,
  getSentInvitations,
);

// Accepter ou refuser une invitation.
// PATCH /api/invitations/:invitationId/respond
router.patch(
  "/invitations/:invitationId/respond",
  authenticateToken,
  respondToInvitation,
);

// Retirer une invitation encore en attente.
// PATCH /api/invitations/:invitationId/withdraw
router.patch(
  "/invitations/:invitationId/withdraw",
  authenticateToken,
  withdrawInvitation,
);

module.exports = router;