"use strict";

/**
 * Abstraction de stockage de fichiers (indépendante du fournisseur).
 *
 * FILWORK accepte actuellement uniquement des URL (aucun upload n'est activé).
 * Ce module prépare le basculement vers un stockage persistant compatible
 * Vercel, sans modifier les routes existantes.
 *
 * Variables d'environnement prévues (voir docs/environment-variables.md) :
 *   - STORAGE_PROVIDER : "vercel-blob" | "s3" | "none" (défaut)
 *   - STORAGE_TOKEN    : token du fournisseur (obligatoire si provider != "none")
 *   - STORAGE_BASE_URL : préfixe public des URLs (optionnel)
 *   - STORAGE_MAX_UPLOAD_BYTES : taille max par fichier (défaut 5 Mo)
 */

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function maxUploadBytes() {
  const raw = Number(process.env.STORAGE_MAX_UPLOAD_BYTES);

  if (Number.isInteger(raw) && raw > 0) {
    return raw;
  }

  return DEFAULT_MAX_BYTES;
}

/** Valide type et taille d'un fichier image. */
function validateImageUpload({ contentType, sizeBytes }) {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    const error = new Error(
      "Type de fichier non autorisé. Formats acceptés : jpeg, png, webp, gif.",
    );
    error.statusCode = 400;
    error.code = "STORAGE_UNSUPPORTED_TYPE";
    throw error;
  }

  if (typeof sizeBytes !== "number" || sizeBytes <= 0) {
    const error = new Error("Taille de fichier invalide.");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_SIZE";
    throw error;
  }

  if (sizeBytes > maxUploadBytes()) {
    const error = new Error(
      `Le fichier dépasse la taille maximale autorisée de ${maxUploadBytes()} octets.`,
    );
    error.statusCode = 413;
    error.code = "STORAGE_FILE_TOO_LARGE";
    throw error;
  }
}

function isConfigured() {
  return Boolean(process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== "none");
}

/**
 * Retourne le fournisseur de stockage actif ou lève une erreur explicite.
 * Les implémentations concrètes sont branchées ici sans réécrire les routes.
 */
function getStorageProvider() {
  const provider = process.env.STORAGE_PROVIDER || "none";

  if (provider === "none" || !process.env.STORAGE_TOKEN) {
    const error = new Error(
      "Stockage non configuré. Définissez STORAGE_PROVIDER et STORAGE_TOKEN (voir docs/storage-provider.md).",
    );
    error.statusCode = 503;
    error.code = "STORAGE_NOT_CONFIGURED";
    throw error;
  }

  if (provider === "vercel-blob") {
    // Nécessite l'installation du SDK officiel : npm install @vercel/blob
    const error = new Error(
      "STORAGE_PROVIDER=vercel-blob choisi, mais le SDK @vercel/blob n'est pas installé. Ajoutez-le à package.json avant de déployer.",
    );
    error.statusCode = 503;
    error.code = "STORAGE_SDK_MISSING";
    throw error;
  }

  if (provider === "s3") {
    // Nécessite l'installation de @aws-sdk/client-s3 et un bucket configuré.
    const error = new Error(
      "STORAGE_PROVIDER=s3 choisi, mais @aws-sdk/client-s3 n'est pas installé. Ajoutez-le à package.json avant de déployer.",
    );
    error.statusCode = 503;
    error.code = "STORAGE_SDK_MISSING";
    throw error;
  }

  const error = new Error(`STORAGE_PROVIDER inconnu : ${provider}.`);
  error.statusCode = 503;
  error.code = "STORAGE_PROVIDER_UNKNOWN";
  throw error;
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  validateImageUpload,
  isConfigured,
  getStorageProvider,
  maxUploadBytes,
};
