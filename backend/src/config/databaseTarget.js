// Garde-fous partagés entre le client Prisma, le serveur HTTP et les scripts.
//
// Objectif : empêcher qu'une instance applicative utilise une base de test
// (et inversement), sans jamais journaliser d'identifiants de connexion.

// Un nom de base explicitement identifié comme base de test.
// Les frontières évitent de confondre "contest" ou "latest" avec "test".
const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])(?:test|tests|testing)(?:$|[_-])/i;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Extrait l'hôte, le port et la base d'une URL PostgreSQL.
 * Retourne null si l'URL est absente ou invalide.
 *
 * @param {string | undefined} rawUrl
 */
function normalizeTarget(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl.trim());

    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      return null;
    }

    return {
      protocol: parsed.protocol,
      host: parsed.hostname.toLowerCase(),
      port: parsed.port || "5432",
      database: decodeURIComponent(parsed.pathname.replace(/^\//, "")).toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Deux cibles désignent la même base si l'hôte, le port et le nom
 * de base sont identiques. Les identifiants sont volontairement ignorés.
 */
function sameTarget(first, second) {
  return Boolean(
    first &&
      second &&
      first.host === second.host &&
      first.port === second.port &&
      first.database === second.database,
  );
}

/**
 * Représentation sûre pour les logs : jamais d'utilisateur ni de mot de passe.
 */
function maskTarget(target) {
  if (!target) {
    return "(cible invalide)";
  }

  return `${target.host}:${target.port}/${target.database}`;
}

/**
 * Vrai si le nom de base contient un marqueur "test" délimité.
 */
function isExplicitlyTestTarget(target) {
  return Boolean(target && TEST_DATABASE_NAME_PATTERN.test(target.database));
}

/**
 * Valide une URL PostgreSQL et retourne sa cible normalisée.
 */
function assertDatabaseUrl(rawUrl, envName) {
  const target = normalizeTarget(rawUrl);

  if (!target) {
    throw new Error(`${envName} n'est pas une URL PostgreSQL valide.`);
  }

  if (!target.host || !target.database) {
    throw new Error(
      `${envName} est ambiguë : hôte ou nom de base manquant. Refus par sécurité.`,
    );
  }

  return target;
}

/**
 * Garde-fou du client Prisma applicatif.
 *
 * Refuse :
 *   - une URL absente ou non PostgreSQL ;
 *   - une base dont le nom est explicitement un nom de test ;
 *   - une cible identique à TEST_DATABASE_URL.
 *
 * @param {{
 *   applicationUrl: string | undefined,
 *   testUrl?: string | undefined,
 *   envName?: string,
 * }} options
 */
function assertApplicationDatabase({
  applicationUrl,
  testUrl,
  envName = "DATABASE_URL",
}) {
  const target = assertDatabaseUrl(applicationUrl, envName);

  if (isExplicitlyTestTarget(target)) {
    throw new Error(
      `Refus : ${envName} cible une base explicitement identifiée comme base de test (${maskTarget(target)}).`,
    );
  }

  const testTarget = normalizeTarget(testUrl);

  if (testTarget && sameTarget(target, testTarget)) {
    throw new Error(
      `Refus : ${envName} cible la même base que TEST_DATABASE_URL (${maskTarget(target)}).`,
    );
  }

  return target;
}

/**
 * Garde-fou des scripts et du client Prisma de test.
 *
 * Refuse :
 *   - une URL absente ou ambiguë ;
 *   - une base qui n'est pas explicitement identifiée comme base de test
 *     (sauf opt-in contrôlé pour une CI) ;
 *   - une cible identique à l'une des URLs de production connues.
 *
 * @param {{
 *   testUrl: string | undefined,
 *   productionUrls?: Array<string | undefined>,
 *   envName?: string,
 *   allowNonTestName?: boolean,
 * }} options
 */
function assertTestDatabase({
  testUrl,
  productionUrls = [],
  envName = "TEST_DATABASE_URL",
  allowNonTestName = false,
}) {
  const target = assertDatabaseUrl(testUrl, envName);

  if (!isExplicitlyTestTarget(target) && !allowNonTestName) {
    throw new Error(
      `Refus : ${envName} ne désigne pas explicitement une base de test (${maskTarget(target)}).`,
    );
  }

  for (const productionUrl of productionUrls) {
    const productionTarget = normalizeTarget(productionUrl);

    if (productionTarget && sameTarget(target, productionTarget)) {
      throw new Error(
        `Refus : ${envName} cible la même base que la production (${maskTarget(target)}).`,
      );
    }
  }

  return target;
}

/**
 * Vérifie la cohérence environnement / port / interface d'écoute.
 *
 * - l'API de test écoute 5051 par défaut, en local ;
 * - l'API applicative n'utilise jamais 5051.
 *
 * Les opt-ins TEST_ALLOW_OTHER_PORT et TEST_ALLOW_REMOTE_API restent
 * réservés aux CI contrôlées.
 *
 * @param {{
 *   nodeEnv: string | undefined,
 *   port: number,
 *   host: string,
 *   allowTestNonStandardPort?: boolean,
 *   allowRemoteTestHost?: boolean,
 * }} options
 */
function assertPortConfiguration({
  nodeEnv,
  port,
  host,
  allowTestNonStandardPort = false,
  allowRemoteTestHost = false,
}) {
  const numericPort = Number(port);

  if (
    !Number.isInteger(numericPort) ||
    numericPort < 1 ||
    numericPort > 65535
  ) {
    throw new Error(`PORT invalide : ${port}.`);
  }

  const isTest = nodeEnv === "test";

  if (isTest) {
    if (numericPort !== 5051 && !allowTestNonStandardPort) {
      throw new Error(
        `Refus : l'API de test doit écouter sur le port 5051 (port reçu : ${numericPort}).`,
      );
    }

    if (!LOCAL_HOSTS.has(String(host).toLowerCase()) && !allowRemoteTestHost) {
      throw new Error(
        `Refus : l'API de test doit écouter sur une interface locale (hôte reçu : ${host}).`,
      );
    }
  } else if (numericPort === 5051) {
    throw new Error(
      "Refus : le port 5051 est réservé à l'API de test. Le site applicatif doit utiliser un autre port (5000 par défaut).",
    );
  }

  return { port: numericPort, host };
}

module.exports = {
  TEST_DATABASE_NAME_PATTERN,
  LOCAL_HOSTS,
  normalizeTarget,
  sameTarget,
  maskTarget,
  isExplicitlyTestTarget,
  assertDatabaseUrl,
  assertApplicationDatabase,
  assertTestDatabase,
  assertPortConfiguration,
};
