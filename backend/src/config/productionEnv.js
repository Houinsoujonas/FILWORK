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
}

module.exports = {
  validateProductionEnvironment,
};
