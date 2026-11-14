"use strict";

/**
 * Abstraction de stockage de fichiers (indépendante du fournisseur).
 *
 * Fournisseurs disponibles :
 *   - "none" (défaut) : aucun stockage configuré, /api/uploads renvoie 503.
 *   - "vercel-blob"   : stockage objet Vercel Blob (public, adapté aux
 *     avatars, logos et images de campagne). Nécessite :
 *       * soit un store connecté au projet Vercel (auth OIDC automatique,
 *         BLOB_STORE_ID / VERCEL_OIDC_TOKEN injectés par la plateforme) ;
 *       * soit BLOB_READ_WRITE_TOKEN (token statique, p.ex. pour les tests
 *         et les environnements hors-Vercel). STORAGE_TOKEN est accepté pour
 *         compatibilité arrière.
 *
 * Variables d'environnement prévues (voir docs/environment-variables.md) :
 *   - STORAGE_PROVIDER : "none" (défaut) | "vercel-blob"
 *   - BLOB_READ_WRITE_TOKEN : token du store Vercel Blob (optionnel si OIDC)
 *   - STORAGE_TOKEN    : alias de compatibilité pour BLOB_READ_WRITE_TOKEN
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
// Le SDK @vercel/blob est installé (dépendance du projet, audit propre).
// L'authentification est résolue, dans l'ordre :
//   1. OIDC automatique lorsque le store est lié au projet Vercel (aucun
//      token à gérer) ;
//   2. BLOB_READ_WRITE_TOKEN (ou son alias STORAGE_TOKEN) lorsqu'il est
//      fourni explicitement.
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

/**
 * Token statique éventuel du fournisseur. Absent en contexte OIDC Vercel.
 */
function staticStorageToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.STORAGE_TOKEN || null;
}

/**
 * Vrai lorsque l'exécution se fait dans un contexte OIDC Vercel (store lié
 * au projet) : le SDK se charge alors de l'authentification.
 */
function oidcContextAvailable() {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_ENV),
  );
}

function isConfigured() {
  const provider = (process.env.STORAGE_PROVIDER || "none").toLowerCase();

  if (provider === "none") {
    return false;
  }

  return Boolean(staticStorageToken() || oidcContextAvailable());
}

/**
 * Retourne le fournisseur de stockage actif ou lève une erreur explicite.
 * Les implémentations concrètes sont branchées ici sans réécrire les routes.
 */
function getStorageProvider() {
  const provider = (process.env.STORAGE_PROVIDER || "none").toLowerCase();
  const token = staticStorageToken();

  if (provider === "none") {
    const error = new Error(
      "Stockage non configuré. Définissez STORAGE_PROVIDER et BLOB_READ_WRITE_TOKEN (ou liez un store Vercel Blob au projet) — voir docs/storage-provider.md.",
    );
    error.statusCode = 503;
    error.code = "STORAGE_NOT_CONFIGURED";
    throw error;
  }

  if (provider === "vercel-blob") {
    if (!token && !oidcContextAvailable()) {
      const error = new Error(
        "STORAGE_PROVIDER=vercel-blob mais aucune authentification disponible : définissez BLOB_READ_WRITE_TOKEN, ou liez un store Vercel Blob au projet (OIDC).",
      );
      error.statusCode = 503;
      error.code = "STORAGE_NOT_CONFIGURED";
      throw error;
    }

    let blob;

    try {
      blob = require("@vercel/blob");
    } catch {
      const error = new Error(
        "STORAGE_PROVIDER=vercel-blob choisi, mais le SDK @vercel/blob n'est pas installé. Installez-le avant de l'activer et vérifiez `npm audit`.",
      );
      error.statusCode = 503;
      error.code = "STORAGE_SDK_MISSING";
      throw error;
    }

    return { provider, sdk: blob, token };
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

  const { provider, sdk, token } = getStorageProvider();

  if (provider === "vercel-blob") {
    const options = {
      access: "public",
      contentType,
      // Chemins immuables : un suffixe aléatoire évite tout écrasement
      // accidentel entre deux uploads portant le même nom de fichier.
      addRandomSuffix: true,
      token: token || undefined,
    };

    try {
      const result = await sdk.put(`uploads/${safeName}`, buffer, options);

      return { url: result.url, pathname: result.pathname };
    } catch (error) {
      const wrapped = new Error(
        "Le fournisseur de stockage a refusé l'upload. Réessayez plus tard ou contactez le support FILWORK.",
      );
      wrapped.statusCode = 502;
      wrapped.code = "STORAGE_UPSTREAM_ERROR";
      wrapped.cause = error instanceof Error ? error.message : String(error);
      throw wrapped;
    }
  }

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
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) {
    const error = new Error("URL de fichier invalide.");
    error.statusCode = 400;
    error.code = "STORAGE_INVALID_URL";
    throw error;
  }

  const { provider, sdk, token } = getStorageProvider();

  if (provider === "vercel-blob") {
    if (!sdk.del) {
      const error = new Error(
        "Le SDK @vercel/blob installé n'expose pas `del`. Vérifiez la version.",
      );
      error.statusCode = 503;
      error.code = "STORAGE_SDK_MISSING";
      throw error;
    }

    try {
      await sdk.del([url], { token: token || undefined });
      return { deleted: true };
    } catch (error) {
      const wrapped = new Error(
        "La suppression du fichier a échoué. Réessayez ou contactez le support FILWORK.",
      );
      wrapped.statusCode = 502;
      wrapped.code = "STORAGE_UPSTREAM_ERROR";
      wrapped.cause = error instanceof Error ? error.message : String(error);
      throw wrapped;
    }
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
  staticStorageToken,
  oidcContextAvailable,
};
