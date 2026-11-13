/**
 * Journalisation structurée (JSON Lines).
 *
 * Chaque entrée :
 *   - level : "error" | "warn" | "info" | "debug"
 *   - timestamp : ISO8601
 *   - message : libellé court sans secrets ni tokens
 *   - code : code interne additionnel (optionnel)
 *   - requestId : identifiant de requête (optionnel)
 *
 * Compatible Vercel Logs. Jamais de tokens, de mots de passe, ni d'adresses
 * e-mail en clair dans le champ `message` ou `code`.
 */

const isProduction = process.env.NODE_ENV === "production";
const verbose =
  !isProduction && process.env.LOG_LEVEL !== "silent" && process.env.LOG_LEVEL !== "error";

function buildEntry(level, message, extra = {}) {
  return {
    level,
    timestamp: new Date().toISOString(),
    message: String(message || "").slice(0, 500),
    ...extra,
  };
}

function info(message, extra = {}) {
  const entry = buildEntry("info", message, extra);

  if (verbose) {
    console.log(JSON.stringify(entry));
  }
}

function debug(message, extra = {}) {
  info(message, extra);
}

function warn(message, extra = {}) {
  console.warn(JSON.stringify(buildEntry("warn", message, extra)));
}

function error(message, extra = {}) {
  console.error(JSON.stringify(buildEntry("error", message, extra)));
}

module.exports = {
  info,
  debug,
  warn,
  error,
};
