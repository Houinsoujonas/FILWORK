const crypto = require("node:crypto");
const express = require("express");

const { processEmailOutboxBatch } = require("../services/emailOutboxWorker");
const { cleanupExpiredTokens } = require("../services/maintenanceService");

const router = express.Router();

/**
 * Routes internes réservées aux tâches planifiées (Vercel Cron).
 *
 * Authentification : en-tête Authorization: Bearer <CRON_SECRET>.
 * Si CRON_SECRET n'est pas défini dans l'environnement, ces routes refusent
 * systématiquement l'accès (503) — jamais en accès libre.
 */
function assertCronSecret(req, res) {
  const expected = process.env.CRON_SECRET;

  if (!expected || expected.length < 16) {
    res.status(503).json({
      success: false,
      message: "Contrôle d'accès aux tâches internes non configuré (CRON_SECRET manquant).",
    });
    return false;
  }

  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    res.status(401).json({ success: false, message: "Accès refusé." });
    return false;
  }

  if (!crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ success: false, message: "Accès refusé." });
    return false;
  }

  return true;
}

router.all("/cron/daily", (req, res) => {
  if (!assertCronSecret(req, res)) {
    return;
  }

  // Entrepôt unique exécuté une fois par jour (compatible Vercel Hobby,
  // qui n'autorise qu'un seul cron par jour).
  Promise.allSettled([cleanupExpiredTokens(), processEmailOutboxBatch()])
    .then((results) => {
      const [cleanupResult, processed] = results;

      res.status(200).json({
        success: true,
        cleanup:
          cleanupResult.status === "fulfilled"
            ? cleanupResult.value
            : { error: cleanupResult.reason?.message ?? "erreur" },
        emailsProcessed:
          processed.status === "fulfilled" ? processed.value : 0,
      });
    })
    .catch((error) => {
      console.error("[Cron] Erreur dans le cron quotidien :", error.message);
      res.status(500).json({ success: false, message: "Cron impossible." });
    });
});

router.all("/cron/process-emails", (req, res) => {
  if (!assertCronSecret(req, res)) {
    return;
  }

  processEmailOutboxBatch()
    .then((processed) => {
      res.status(200).json({ success: true, processed });
    })
    .catch((error) => {
      console.error("[Cron] Erreur lors du traitement des emails :", error.message);
      res.status(500).json({ success: false, message: "Traitement impossible." });
    });
});

router.all("/cron/cleanup-tokens", (req, res) => {
  if (!assertCronSecret(req, res)) {
    return;
  }

  cleanupExpiredTokens()
    .then((result) => {
      res.status(200).json({ success: true, ...result });
    })
    .catch((error) => {
      console.error("[Cron] Erreur lors du nettoyage des jetons :", error.message);
      res.status(500).json({ success: false, message: "Nettoyage impossible." });
    });
});

module.exports = router;
