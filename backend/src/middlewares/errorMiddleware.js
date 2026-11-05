const crypto = require("node:crypto");

const { mapPrismaError } = require("../utils/prismaErrors");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Associe un identifiant de requête à chaque appel.
 *
 * L'identifiant fourni par le client est conservé uniquement s'il respecte
 * un format simple et borné. Sinon, un UUID est généré. Il est renvoyé dans
 * l'en-tête `X-Request-Id` et dans les réponses d'erreur.
 */
function requestIdMiddleware(req, res, next) {
  const incoming = req.get("x-request-id");
  const safeIncoming =
    typeof incoming === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(incoming)
      ? incoming
      : null;

  req.id = safeIncoming || crypto.randomUUID();

  res.setHeader("X-Request-Id", req.id);

  return next();
}

/**
 * Réponse JSON pour toute route inconnue.
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: "Route introuvable.",
    requestId: req.id,
  });
}

/**
 * Journalisation structurée : aucune donnée sensible ni corps de requête.
 */
function logError(req, status, error) {
  const entry = {
    level: status >= 500 ? "error" : "warn",
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    errorName: error?.name || "Error",
    errorCode: error?.code,
    message: error?.message,
  };

  if (!isProduction && status >= 500 && error?.stack) {
    entry.stack = error.stack;
  }

  const serialized = JSON.stringify(entry);

  if (status >= 500) {
    console.error(serialized);
  } else {
    console.warn(serialized);
  }
}

/**
 * Gestionnaire d'erreurs global.
 *
 * Express 5 transmet automatiquement les rejets des handlers asynchrones à
 * ce middleware. Les erreurs de parsing JSON (400) et de taille de corps
 * (413) sont traduites en JSON, comme les erreurs Prisma connues.
 */
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let message = "Une erreur interne est survenue.";

  if (
    error?.type === "entity.parse.failed" ||
    (error instanceof SyntaxError && error.status === 400 && "body" in error)
  ) {
    status = 400;
    message = "Le corps de la requête n'est pas un JSON valide.";
  } else if (error?.type === "entity.too.large" || error?.status === 413) {
    status = 413;
    message = "Le corps de la requête est trop volumineux.";
  } else {
    const prismaError = mapPrismaError(error);

    if (prismaError) {
      status = prismaError.status;
      message = prismaError.message;
    } else if (
      Number.isInteger(error?.status) &&
      error.status >= 400 &&
      error.status < 600
    ) {
      status = error.status;

      if (status < 500) {
        message = error.expose ? error.message : "Requête invalide.";
      }
    }
  }

  logError(req, status, error);

  return res.status(status).json({
    success: false,
    message,
    requestId: req.id,
  });
}

module.exports = {
  requestIdMiddleware,
  notFoundHandler,
  errorHandler,
};
