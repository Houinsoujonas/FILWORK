/**
 * Processeur de la file d'envoi d'e-mails (Email Outbox).
 *
 * Ce script peut être exécuté périodiquement (cron, worker Render) pour
 * envoyer les e-mails en attente, gérer les nouvelles tentatives et
 * récupérer les tâches bloquées en statut PROCESSING.
 *
 * Usage : node scripts/processEmailOutbox.js [--once]
 *   --once : traite un seul lot puis s'arrête.
 *   sans --once : tourne en boucle avec un intervalle de traitement.
 */

const {
  processEmailOutboxBatch,
  startEmailOutboxWorker,
  stopEmailOutboxWorker,
} = require("../src/services/emailOutboxWorker");
const { getOutboxStats } = require("../src/services/outboxService");

const PROCESS_INTERVAL_MS =
  Number(process.env.EMAIL_OUTBOX_POLL_INTERVAL) || 30_000;

let running = true;

process.on("SIGINT", () => {
  running = false;
  stopEmailOutboxWorker();
});

process.on("SIGTERM", () => {
  running = false;
  stopEmailOutboxWorker();
});

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes("--once");

  const stats = await getOutboxStats();
  console.log(
    `[EmailOutbox] État initial : ${stats.pending} en attente, ${stats.processing} en cours, ${stats.sent} envoyés, ${stats.failed} échoués.`,
  );

  if (once) {
    const processed = await processEmailOutboxBatch();
    console.log(
      `[EmailOutbox] Traitement terminé : ${processed} e-mail(s) traité(s).`,
    );
    return;
  }

  console.log(
    `[EmailOutbox] Démarrage du processeur (intervalle : ${PROCESS_INTERVAL_MS} ms).`,
  );

  startEmailOutboxWorker({ intervalMs: PROCESS_INTERVAL_MS });

  // Maintient le processus actif jusqu'à réception d'un signal d'arrêt.
  while (running) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  stopEmailOutboxWorker();
  console.log("[EmailOutbox] Processeur arrêté.");
}

main().catch((error) => {
  console.error("[EmailOutbox] Erreur fatale :", error.message);
  process.exit(1);
});
