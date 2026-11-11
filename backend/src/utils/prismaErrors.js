/**
 * Traduction centralisée des erreurs Prisma connues en réponses HTTP.
 *
 * Les contrôleurs continuent de gérer leurs cas métier explicites. Ce module
 * sert uniquement de filet de sécurité pour les erreurs Prisma qui ne sont
 * pas déjà interprétées : ressources introuvables, conflits d'unicité et
 * violations de clés étrangères.
 */

const PRISMA_ERROR_DEFAULTS = {
  P2000: {
    status: 400,
    message: "Une valeur fournie est trop longue pour ce champ.",
  },
  P2002: {
    status: 409,
    message: "Un enregistrement avec ces informations existe déjà.",
  },
  P2003: {
    status: 409,
    message:
      "L'opération est impossible car la ressource est référencée par d'autres données.",
  },
  P2025: {
    status: 404,
    message: "La ressource demandée est introuvable.",
  },
  // Conflit de transaction (deadlock ou échec de sérialisation).
  P2034: {
    status: 409,
    message: "Opération en conflit. Veuillez réessayer dans un instant.",
  },
};

/**
 * Retourne la réponse HTTP associée à une erreur Prisma connue, ou null.
 *
 * @param {unknown} error
 * @param {Record<string, string>} [messages] Messages personnalisés par code.
 * @returns {{ status: number, message: string } | null}
 */
function mapPrismaError(error, messages = {}) {
  if (
    !error ||
    typeof error !== "object" ||
    typeof error.code !== "string" ||
    !Object.prototype.hasOwnProperty.call(PRISMA_ERROR_DEFAULTS, error.code)
  ) {
    return null;
  }

  const defaults = PRISMA_ERROR_DEFAULTS[error.code];

  return {
    status: defaults.status,
    message: messages[error.code] || defaults.message,
  };
}

/**
 * Envoie une réponse JSON si l'erreur est une erreur Prisma connue.
 *
 * @param {import("express").Response} res
 * @param {unknown} error
 * @param {Record<string, string>} [messages]
 * @returns {boolean} true si une réponse a été envoyée.
 */
function sendPrismaError(res, error, messages) {
  const mapped = mapPrismaError(error, messages);

  if (!mapped) {
    return false;
  }

  res.status(mapped.status).json({
    success: false,
    message: mapped.message,
  });

  return true;
}

module.exports = {
  mapPrismaError,
  sendPrismaError,
};
