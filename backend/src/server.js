const path = require("node:path");

const {
  assertApplicationDatabase,
  assertTestDatabase,
  assertPortConfiguration,
  maskTarget,
} = require("./config/databaseTarget");

const isTest = process.env.NODE_ENV === "test";

// En mode test, charger exclusivement .env.test pour ne jamais
// exposer les secrets ou la base de production.
const envFile = isTest ? ".env.test" : ".env";

require("dotenv").config({
  path: path.resolve(__dirname, "..", envFile),
});

// Le fichier d'environnement chargé doit correspondre au mode effectif.
// Sinon, le client Prisma pourrait sélectionner une autre base que celle
// validée ci-dessous.
if (isTest && process.env.NODE_ENV !== "test") {
  console.error(
    "[FILWORK] Configuration refusée : .env.test doit définir NODE_ENV=test.",
  );

  process.exit(1);
}

if (!isTest && process.env.NODE_ENV === "test") {
  console.error(
    "[FILWORK] Configuration refusée : NODE_ENV=test exige de démarrer avec .env.test (NODE_ENV=test dans l'environnement).",
  );

  process.exit(1);
}

// Le mode production est évalué après le chargement de l'environnement.
const isProduction = process.env.NODE_ENV === "production";

// Vérifier la configuration indispensable à l'authentification JWT.
if (
  typeof process.env.JWT_SECRET !== "string" ||
  !process.env.JWT_SECRET.trim()
) {
  console.error(
    "[FILWORK] Erreur de configuration : JWT_SECRET doit être défini dans le fichier .env.",
  );

  process.exit(1);
}

// En production, refuser une configuration CORS qui ne contiendrait que des
// origines locales : le frontend déployé ne pourrait pas appeler l'API.
if (isProduction) {
  const origins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const hasNonLocalOrigin = origins.some((origin) => {
    try {
      const { hostname } = new URL(origin);

      return !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
        hostname.toLowerCase(),
      );
    } catch {
      return false;
    }
  });

  if (!hasNonLocalOrigin) {
    console.error(
      "[FILWORK] Configuration refusée : CORS_ORIGINS doit contenir au moins une origine non locale en production.",
    );

    process.exit(1);
  }

  let frontendUrl;

  try {
    frontendUrl = new URL(process.env.FRONTEND_URL);
  } catch {
    frontendUrl = null;
  }

  if (!frontendUrl || frontendUrl.protocol !== "https:") {
    console.error(
      "[FILWORK] Configuration refusée : FRONTEND_URL doit être une URL HTTPS en production.",
    );

    process.exit(1);
  }
}

const PORT = Number(process.env.PORT) || (isTest ? 5051 : 5000);
const HOST = process.env.HOST || (isTest ? "127.0.0.1" : "0.0.0.0");

// Refuser une cible de base incohérente avant d'exposer le serveur HTTP.
let databaseTarget;

try {
  databaseTarget = isTest
    ? assertTestDatabase({
        testUrl: process.env.TEST_DATABASE_URL,
        productionUrls: [
          process.env.DATABASE_URL,
          process.env.DATABASE_URL_UNPOOLED,
        ],
        allowNonTestName: process.env.TEST_ALLOW_NON_TEST_NAMED_DB === "true",
      })
    : assertApplicationDatabase({
        applicationUrl: process.env.DATABASE_URL,
        testUrl: process.env.TEST_DATABASE_URL,
        envName: "DATABASE_URL",
      });

  assertPortConfiguration({
    nodeEnv: process.env.NODE_ENV,
    port: PORT,
    host: HOST,
    allowTestNonStandardPort: process.env.TEST_ALLOW_OTHER_PORT === "true",
    allowRemoteTestHost: process.env.TEST_ALLOW_REMOTE_API === "true",
  });
} catch (error) {
  console.error(`[FILWORK] Configuration refusée : ${error.message}`);
  process.exit(1);
}

const app = require("./app");
const prisma = require("./config/prisma");
const {
  startEmailOutboxWorker,
  stopEmailOutboxWorker,
} = require("./services/emailOutboxWorker");

const server = app.listen(PORT, HOST, () => {
  console.log(`[FILWORK] Environnement : ${process.env.NODE_ENV || "development"}`);
  console.log(`[FILWORK] Base de données : ${maskTarget(databaseTarget)}`);
  console.log(`Serveur FILWORK démarré sur le port ${PORT}`);
  console.log(`Vérification : http://localhost:${PORT}/api/health`);

  // Le traitement de la file d'envoi est désactivé en mode test pour ne pas
  // interférer avec les assertions (aucun SMTP réel n'y est configuré).
  if (!isTest && process.env.EMAIL_OUTBOX_ENABLED !== "false") {
    startEmailOutboxWorker();
    console.log("[FILWORK] Processeur de la file d'e-mails démarré.");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `[FILWORK] Le port ${PORT} est déjà utilisé. Arrêt pour éviter d'utiliser une autre instance.`,
    );
  } else {
    console.error("[FILWORK] Erreur du serveur HTTP :", error.message);
  }

  process.exitCode = 1;
});

let shuttingDown = false;

/**
 * Arrêt propre : arrêter d'accepter les requêtes, puis libérer Prisma.
 * Un délai maximal évite qu'un processus bloqué ne reste actif.
 */
function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  stopEmailOutboxWorker();

  console.log(`[FILWORK] Arrêt demandé (${signal}).`);

  const forceExit = setTimeout(() => {
    console.error("[FILWORK] Arrêt forcé après expiration du délai.");
    process.exit(1);
  }, 10000);

  forceExit.unref();

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        "[FILWORK] Erreur lors de la fermeture de Prisma :",
        disconnectError.message,
      );
    }

    clearTimeout(forceExit);

    if (error) {
      console.error("[FILWORK] Erreur lors de l'arrêt du serveur :", error.message);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = server;
