const express = require("express");

const { handleSasPayWebhook } = require("../controllers/sasPayWebhookController");
const { webhookLimiter } = require("../middlewares/rateLimiters");

const router = express.Router();

/**
 * POST /api/webhooks/saspay
 *
 * Le corps doit rester BRUT (Buffer) pour que la signature soit vérifiable.
 * Le montage avec express.raw se fait dans src/app.js AVANT express.json.
 */
router.post("/", webhookLimiter, handleSasPayWebhook);

module.exports = router;
