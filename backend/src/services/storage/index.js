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

// Types MIME acceptés (format Vercel Blob `images + GIF`).
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ---------------------------------------------------------------------------
// Uploads d'images vers le fournisseur configuré.
//
// IMPORTANT (2026-11) : le SDK `@vercel/blob` n'est PAS installé par défaut
// car la version la plus récente dépend d'une version vulnérable de `zod`
// (<4.6.6, CVE Memory-exhaustion). Un SDK non vulnérable sera installé
// lorsqu'il sera disponible. Les implémentations réelles sont gardées
// isolées dans `uploadImage` et `deleteImage` et déterminent la cible
// uniquement via l'environnement :
//   - STORAGE_PROVIDER : "none" | "vercel-blob"
//   - STORAGE_TOKEN    : token fournisseur (requis si provider != "none")
//   - STORAGE_BASE_URL : préfixe public (optionnel, pour construction d'URLs)
//   - STORAGE_MAX_UPLOAD_BYTES : taille max (défaut 5 Mo)
// ---------------------------------------------------------------------------

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function maxUploadBytes() {
  const raw = Number(process.env.STORAGE_MAX_UPLOAD_BYTES);

  if (Number.isInteger(raw) && raw > 0) {
    return raw;
  }

  return DEFAULT_MAX_BYTES;
}

/**
 * Vérifie que le contenu d'un buffer correspond à la signature binaire
 * attendue pour le type MIME déclaré.
 *
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {boolean}
 */
function hasValidMagicBytes(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return false;
  }

  if (contentType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (contentType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (contentType === "image/gif") {
    const head = buffer.slice(0, 6).toString("ascii");
    return head === "GIF87a" || head === "GIF89a";
  }

  if (contentType === "image/webp") {
    if (buffer.length < 12) {
      return false;
    }

    return (
      buffer.slice(0, 4).toString("ascii") === "RIFF" &&
      buffer.slice(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

/**
 * Nettoie et valide un nom de fichier fourni côté client.
 * Retourne une chaîne sûre ou lève une erreur.
 *
 * @param {string} name
 * @returns {string}
 */
function validateFilename(name) {
  if (typeof name !== "string") {
    const error = new Error("Le nom de fichier est invalide.");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_FILENAME";
    throw error;
  }

  // Seule la dernière composante est acceptée ; // ou \\ n'importe où → refus.
  if (/[/\\]/.test(name)) {
    const error = new Error("Le nom de fichier ne doit pas contenir de chemin.");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_FILENAME";
    throw error;
  }

  const base = name.trim();

  if (!base) {
    const error = new Error("Le nom de fichier est invalide.");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_FILENAME";
    throw error;
  }

  // Caractères interdits ou explicitement dangereux.
  if (/[\x00-\x1f\x7f<>:"|?*]/.test(base) || /\.\./.test(base)) {
    const error = new Error("Le nom de fichier contient des caractères refusés.");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_FILENAME";
    throw error;
  }

  // Limite la longueur.
  if (base.length > 180) {
    const error = new Error("Le nom de fichier est trop long (max 180 caractères).");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_FILENAME";
    throw error;
  }

  return base;
}

/**
 * Valide type MIME, taille, signature binaire et nom de fichier.
 * Signature du payload ^Buffer$` buffer reste optionnelle en test unitaire.
 */
function validateImageUpload({ contentType, sizeBytes, buffer, filename } = {}) {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    const error = new Error(
      "Type de fichier non autorisé. Formats acceptés : jpeg, png, webp, gif.",
    );
    error.statusCode = 400;
    error.code = "STORAGE_UNSUPPORTED_TYPE";
    throw error;
  }

  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
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

  if (buffer !== undefined && !hasValidMagicBytes(buffer, contentType)) {
    const error = new Error(
      "Le contenu du fichier ne correspond pas au type MIME déclaré.",
    );
    error.statusCode = 400;
    error.code = "STORAGE_MIME_MISMATCH";
    throw error;
  }

  if (filename !== undefined) {
    validateFilename(filename);
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
    // Le SDK n'est pas installé par défaut (voir en-tête du module).
    // Lorsque un SDK non vulnérable sera disponible, ajouter @vercel/blob
    // à package.json et retirer l'instruction ci-dessous.
    let blob;

    try {
      blob = require("@vercel/blob");
    } catch {
      const error = new Error(
        "STORAGE_PROVIDER=vercel-blob choisi, mais le SDK @vercel/blob n'est pas installé. Installez-le avant de l'activer, et vérifiez `npm audit` pour confirmer zéro vulnérabilité.",
      );
      error.statusCode = 503;
      error.code = "STORAGE_SDK_MISSING";
      throw error;
    }

    return { provider, sdk: blob };
  }

  const error = new Error(`STORAGE_PROVIDER inconnu : ${provider}.`);
  error.statusCode = 503;
  error.code = "STORAGE_PROVIDER_UNKNOWN";
  throw error;
}

/**
 * Envoie une image encodée en base64 vers le fournisseur configuré.
 * Retourne l'URL publique accessible par le navigateur.
 */
async function uploadImage({ buffer, contentType, filename }) {
  const safeName = validateFilename(filename);

  validateImageUpload({
    contentType,
    sizeBytes: buffer.length,
    buffer,
    filename: safeName,
  });

  const { provider, sdk } = getStorageProvider();

  if (provider === "vercel-blob") {
    const pathname =
      safeName && !safeName.includes("/")
        ? safeName
        : `uploads/${Date.now()}-${safeName}`;

    const result = await sdk.put(pathname, buffer, {
      access: "public",
      contentType,
      token: process.env.STORAGE_TOKEN,
    });

    return { url: result.url, pathname: result.pathname };
  }

  // Provider inconnu :
  const error = new Error(`STORAGE_PROVIDER non supporté pour upload : ${provider}`);
  error.statusCode = 503;
  error.code = "STORAGE_PROVIDER_UNSUPPORTED";
  throw error;
}

/**
 * Supprime une image dans le fournisseur configuré.
 * @param {string} url URL publique retournée par `uploadImage`
 */
async function deleteImage(url) {
  const { provider, sdk } = getStorageProvider();

  if (provider === "vercel-blob") {
    if (!sdk.del) {
      const error = new Error(
        "Le SDK @vercel/blob installé n'expose pas `del`. Vérifiez la version.",
      );
      error.statusCode = 503;
      error.code = "STORAGE_SDK_MISSING";
      throw error;
    }

    await sdk.del([url], { token: process.env.STORAGE_TOKEN });
    return { deleted: true };
  }

  const error = new Error(`STORAGE_PROVIDER non supporté pour delete : ${provider}`);
  error.statusCode = 503;
  error.code = "STORAGE_PROVIDER_UNSUPPORTED";
  throw error;
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  hasValidMagicBytes,
  validateFilename,
  validateImageUpload,
  isConfigured,
  getStorageProvider,
  uploadImage,
  deleteImage,
  maxUploadBytes,
};
