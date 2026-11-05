const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const {
  normalizeTarget,
  sameTarget,
  maskTarget,
} = require("../src/config/databaseTarget");

const BACKEND_ROOT = path.resolve(__dirname, "..");
const TEST_ENV_FILE = path.join(BACKEND_ROOT, ".env.test");
const PROD_ENV_FILE = path.join(BACKEND_ROOT, ".env");

// Clés réellement issues de .env.test : elles ne doivent jamais être
// interprétées comme des sources de production.
const TEST_ENV_KEYS = new Set();

/**
 * Lit un fichier .env sans polluer process.env.
 * Utilisé pour comparer la cible de test à la cible de production.
 */
function parseEnvFile(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(file));
}

/**
 * Détecte les clés déclarées plusieurs fois dans un fichier .env.
 * dotenv conserve silencieusement la dernière valeur : un doublon peut donc
 * remplacer une URL valide par un exemple non renseigné.
 *
 * @param {string} file
 * @param {string[]} keys
 */
function assertNoDuplicateAssignments(file, keys) {
  if (!fs.existsSync(file)) {
    return;
  }

  const counts = new Map();
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);

    if (!match) {
      continue;
    }

    const key = match[1];

    if (keys.includes(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  for (const key of keys) {
    if ((counts.get(key) || 0) > 1) {
      throw new Error(
        `${file} contient plusieurs déclarations de ${key}. ` +
          "Conservez une seule déclaration effective.",
      );
    }
  }
}

/**
 * Vérifie que le secret JWT de test est suffisamment long et qu'il ne
 * réutilise pas le secret de production.
 *
 * @param {string} testSecret
 * @param {Record<string, string>} productionEnv
 */
function assertTestJwtSecret(testSecret, productionEnv) {
  if (typeof testSecret !== "string" || testSecret.trim().length < 32) {
    throw new Error(
      "JWT_SECRET de test absent ou trop court : au moins 32 caractères sont requis.",
    );
  }

  if (
    typeof productionEnv.JWT_SECRET === "string" &&
    productionEnv.JWT_SECRET &&
    productionEnv.JWT_SECRET === testSecret
  ) {
    throw new Error(
      "Refus : le secret JWT de test est identique au secret de production (.env).",
    );
  }
}

/**
 * En test, l'API ciblée doit être locale par défaut, afin d'éviter qu'une
 * variable d'environnement mal configurée ne fasse exécuter les tests contre
 * un déploiement distant. Un opt-in explicite reste possible pour une CI
 * contrôlée.
 *
 * @param {string | undefined} apiBaseUrl
 */
function assertLocalTestApi(apiBaseUrl) {
  if (!apiBaseUrl || process.env.TEST_ALLOW_REMOTE_API === "true") {
    return;
  }

  let parsed;

  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    throw new Error("API_BASE_URL n'est pas une URL valide.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

  if (!localHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(
      `Refus : API_BASE_URL cible un hôte non local (${parsed.hostname}). ` +
        "Définissez TEST_ALLOW_REMOTE_API=true uniquement pour une CI contrôlée.",
    );
  }
}

/**
 * Rassemble toutes les sources de production connues, sans jamais se
 * connecter à aucune d'elles :
 *   1. process.env.DATABASE_URL / DATABASE_URL_UNPOOLED (Render, CI, shell) ;
 *   2. backend/.env : DATABASE_URL / DATABASE_URL_UNPOOLED.
 *
 * Les clés injectées depuis .env.test sont ignorées : elles décrivent la
 * cible de test, pas la production.
 *
 * Politique fail-closed : si aucune source n'est disponible, si une source
 * est illisible, ou si une cible est ambiguë (hôte ou base manquant), le
 * garde-fou refuse de poursuivre.
 */
function collectProductionTargets() {
  const sources = [];

  for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
    if (TEST_ENV_KEYS.has(key)) {
      continue;
    }

    if (process.env[key]) {
      sources.push({ origin: `process.env.${key}`, url: process.env[key] });
    }
  }

  const fileVariables = parseEnvFile(PROD_ENV_FILE);

  for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
    if (fileVariables[key]) {
      sources.push({ origin: `.env:${key}`, url: fileVariables[key] });
    }
  }

  if (sources.length === 0) {
    throw new Error(
      "Impossible de vérifier la cible de production : aucune URL de production (DATABASE_URL / DATABASE_URL_UNPOOLED) n'est disponible. Refus par sécurité.",
    );
  }

  const targets = [];
  const seen = new Set();

  for (const source of sources) {
    const target = normalizeTarget(source.url);

    if (!target) {
      throw new Error(
        `Impossible de vérifier la cible de production : ${source.origin} est illisible. Refus par sécurité.`,
      );
    }

    if (!target.host || !target.database) {
      throw new Error(
        `Cible de production ambiguë : ${source.origin} ne précise pas d'hôte ou de base. Refus par sécurité.`,
      );
    }

    const signature = `${target.host}|${target.port}|${target.database}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      targets.push({ ...target, origin: source.origin });
    }
  }

  return targets;
}

/**
 * Charge .env.test (sans écraser les variables déjà fournies par le shell),
 * valide TEST_DATABASE_URL et refuse toute cible identique à la production.
 */
function loadTestEnv({ requireEnvFile = false } = {}) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("L'environnement de test ne doit jamais être chargé en production.");
  }

  process.env.NODE_ENV = "test";

  if (fs.existsSync(TEST_ENV_FILE)) {
    assertNoDuplicateAssignments(TEST_ENV_FILE, ["TEST_DATABASE_URL"]);

    const testVariables = parseEnvFile(TEST_ENV_FILE);

    for (const [key, value] of Object.entries(testVariables)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }

      // La valeur effective vient de .env.test : ce n'est pas une source
      // de production, même si la clé porte un nom de production.
      if (process.env[key] === value) {
        TEST_ENV_KEYS.add(key);
      }
    }
  } else if (requireEnvFile) {
    throw new Error(
      "Fichier .env.test introuvable. Copie .env.test.example vers .env.test.",
    );
  }

  const testUrl = process.env.TEST_DATABASE_URL;

  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL est absent. Renseigne-le dans .env.test ou dans l'environnement.",
    );
  }

  const testTarget = normalizeTarget(testUrl);

  if (!testTarget) {
    throw new Error("TEST_DATABASE_URL n'est pas une URL PostgreSQL valide.");
  }

  // Une cible sans hôte ou sans nom de base ne peut pas être comparée de
  // façon fiable : refus par sécurité.
  if (!testTarget.host || !testTarget.database) {
    throw new Error(
      "TEST_DATABASE_URL est ambiguë : hôte ou nom de base manquant. Refus par sécurité.",
    );
  }

  // Comparaison stricte avec toutes les sources de production disponibles.
  const productionTargets = collectProductionTargets();

  for (const productionTarget of productionTargets) {
    if (sameTarget(testTarget, productionTarget)) {
      throw new Error(
        `Refus : TEST_DATABASE_URL cible la même base que la production (${maskTarget(testTarget)}), via ${productionTarget.origin}.`,
      );
    }
  }

  if (process.env.API_BASE_URL === undefined) {
    process.env.API_BASE_URL = `http://localhost:${process.env.PORT || "5051"}`;
  }

  assertLocalTestApi(process.env.API_BASE_URL);

  assertTestJwtSecret(
    process.env.JWT_SECRET,
    parseEnvFile(PROD_ENV_FILE),
  );

  return { testUrl, testTarget, productionTargets };
}

module.exports = {
  BACKEND_ROOT,
  TEST_ENV_FILE,
  PROD_ENV_FILE,
  parseEnvFile,
  assertNoDuplicateAssignments,
  assertTestJwtSecret,
  assertLocalTestApi,
  normalizeTarget,
  sameTarget,
  maskTarget,
  collectProductionTargets,
  loadTestEnv,
};
