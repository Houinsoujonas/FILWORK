/**
 * Validation centralisée des variables d'environnement en production.
 *
 * Cette validation est exécutée par les deux points d'entrée du backend :
 *   - src/server.js (npm start, démarrage classique) ;
 *   - api/index.js (Vercel Functions, démarrage serverless).
 *
 * En production :
 *   - JWT_SECRET doit être défini et contenir au moins 32 caractères ;
 *   - FRONTEND_URL doit être une URL HTTPS valide ;
 *   - CORS_ORIGINS doit contenir au moins une origine, chaque origine
 *     devant être une URL HTTPS valide et non locale.
 *
 * En dehors de la production (développement, test), la fonction ne bloque
 * rien afin de préserver le fonctionnement local et les tests.
 */

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

function isLocalHostname(hostname) {
  return LOCAL_HOSTNAMES.has(String(hostname || "").toLowerCase());
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePostgresUrl(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} doit être définie en production.`);
  }

  let parsed;

  try {
    parsed = new URL(value.trim());
  } catch {
    parsed = null;
  }

  if (!parsed || (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:")) {
    throw new Error(`${name} doit être une URL PostgreSQL valide en production.`);
  }

  return parsed;
}

function validateProductionEnvironment() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return;
  }

  // JWT_SECRET est requis quel que soit le point d'entrée.
  if (
    typeof process.env.JWT_SECRET !== "string" ||
    !process.env.JWT_SECRET.trim() ||
    process.env.JWT_SECRET.trim().length < 32
  ) {
    throw new Error(
      "JWT_SECRET doit être défini et contenir au moins 32 caractères en production.",
    );
  }

  // FRONTEND_URL doit être une URL HTTPS valide.
  let frontendUrl;

  try {
    frontendUrl = new URL(process.env.FRONTEND_URL);
  } catch {
    frontendUrl = null;
  }

  if (!frontendUrl || frontendUrl.protocol !== "https:") {
    throw new Error(
      "FRONTEND_URL doit être une URL HTTPS valide en production.",
    );
  }

  // CORS_ORIGINS : au moins une origine, chacune exigée en HTTPS et non locale.
  const origins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error(
      "CORS_ORIGINS doit contenir au moins une origine HTTPS non locale en production.",
    );
  }

  for (const origin of origins) {
    let parsed;

    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        `CORS_ORIGINS contient une origine invalide : ${origin}.`,
      );
    }

    if (parsed.protocol !== "https:") {
      throw new Error(
        `En production, chaque origine CORS doit utiliser HTTPS : ${origin}`,
      );
    }

    if (isLocalHostname(parsed.hostname)) {
      throw new Error(
        `En production, CORS_ORIGINS ne doit contenir aucune origine locale : ${origin}`,
      );
    }
  }

  // Base de données : URL poolée (Neon pgbouncer) pour PrismaPg et URL
  // directe pour les migrations. Les deux sont exigées pour éviter un démarrage
  // qui fonctionnerait en lecture puis échouerait par saturation du pool.
  validatePostgresUrl(process.env.DATABASE_URL, "DATABASE_URL");
  validatePostgresUrl(process.env.DATABASE_URL_UNPOOLED, "DATABASE_URL_UNPOOLED");

  // CRON_SECRET est requis : le déclencheur externe (5 min) et le cron
  // quotidien Vercel appellent les routes internes avec ce secret.
  if (
    typeof process.env.CRON_SECRET !== "string" ||
    process.env.CRON_SECRET.trim().length < 16
  ) {
    throw new Error(
      "CRON_SECRET doit être défini et contenir au moins 16 caractères en production.",
    );
  }

  // SMTP : obligatoire pour que la file EmailOutbox soit exploitable.
  // Désactivable explicitement avec EMAIL_OUTBOX_ENABLED=false (processus
  // sans e-mails transactionnels — à documenter dans ce cas).
  if (process.env.EMAIL_OUTBOX_ENABLED !== "false") {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM;

    if (typeof host !== "string" || !host.trim()) {
      throw new Error(
        "SMTP_HOST doit être défini en production (ou EMAIL_OUTBOX_ENABLED=false si la messagerie est désactivée).",
      );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(
        "SMTP_PORT doit être un entier entre 1 et 65535 en production.",
      );
    }

    if (typeof user !== "string" || !user.trim()) {
      throw new Error("SMTP_USER doit être défini en production.");
    }

    if (typeof pass !== "string" || !pass) {
      throw new Error("SMTP_PASS doit être défini en production.");
    }

    if (typeof from !== "string") {
      throw new Error("MAIL_FROM doit être défini en production.");
    }

    const mailFrom = from.trim();
    const isPlainAddress = EMAIL_REGEX.test(mailFrom);
    const isNamedAddress = /^[^<>]+<\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*>$/.test(mailFrom);

    if (!isPlainAddress && !isNamedAddress) {
      throw new Error(
        "MAIL_FROM doit être une adresse e-mail valide ou un expéditeur « Nom <adresse> » en production.",
      );
    }
  }
}

module.exports = {
  validateProductionEnvironment,
};
