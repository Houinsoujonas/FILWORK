const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const {
  uploadImage,
  maxUploadBytes,
  hasValidMagicBytes,
  validateFilename,
  validateImageUpload,
} = require("../services/storage");

const router = express.Router();

// Toutes les routes d'upload exigent une authentification.
router.use(authenticateToken);

// Marge maximale acceptée pour le contrôle de taille dans ce handler
// (au-delà, ou si le JSON dépasse 8 Mo, express.json montée sur /api/uploads rejette d'abord).
const MAX_BUFFER = 20 * 1024 * 1024; // 20 Mo de marge avant validation finale

/**
 * POST /api/uploads
 * Charge une image : payload JSON `{ filename, data }` où `data` est une
 * chaîne base64 éventuellement préfixée de `data:image/...;base64,`.
 *
 * Limite `express.json(MAX_JSON_BODY)` montée dans `src/app.js` pour cette route.
 */
router.post("/", async (req, res) => {
  // Protéger doublement le corps contre l'abus.
  const contentLength = Number.parseInt(String(req.headers["content-length"] || "0"), 10);

  if (Number.isFinite(contentLength) && contentLength > MAX_BUFFER) {
    return res.status(413).json({
      success: false,
      message:
        "Le corps de la requête dépasse la taille maximale acceptée (> " +
        maxUploadBytes() +
        " octets).",
    });
  }

  const body = req.body || {};
  const filename = typeof body.filename === "string" ? body.filename.trim() : null;
  const raw = typeof body.data === "string" ? body.data : null;

  if (!filename || !raw) {
    return res.status(400).json({
      success: false,
      message: "Les champs 'filename' et 'data' (base64) sont requis.",
    });
  }

  const dataUrlMatch = raw.match(/^data:([a-zA-Z0-9/+\-.]+);base64,(.+)$/);

  let contentType;
  if (dataUrlMatch) {
    const declared = dataUrlMatch[1].toLowerCase();

    if (
      declared !== "image/jpeg" &&
      declared !== "image/png" &&
      declared !== "image/webp" &&
      declared !== "image/gif"
    ) {
      return res.status(400).json({
        success: false,
        message: "Type de fichier non autorisé.",
        code: "STORAGE_UNSUPPORTED_TYPE",
      });
    }

    contentType = declared;
  } else {
    contentType = "image/jpeg"; // par défaut ; vérifié ensuite par la signature
  }

  if (raw.length > MAX_BUFFER * 2) {
    return res.status(413).json({
      success: false,
      message: "Le fichier dépasse la taille maximale acceptée.",
    });
  }

  const base64 = dataUrlMatch ? dataUrlMatch[2] : raw;

  let buffer;

  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return res.status(400).json({
      success: false,
      message: "Données base64 invalides.",
      code: "STORAGE_INVALID_BASE64",
    });
  }

  if (buffer.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Données base64 invalides.",
      code: "STORAGE_INVALID_BASE64",
    });
  }

  try {
    const safeName = validateFilename(filename);
    validateImageUpload({
      contentType,
      sizeBytes: buffer.length,
      buffer,
      filename: safeName,
    });
  } catch (error) {
    const status = Number(error?.statusCode) || 400;

    return res.status(status).json({
      success: false,
      message: error.message,
      code: error.code || "STORAGE_INVALID_INPUT",
    });
  }

  try {
    const result = await uploadImage({ buffer, contentType, filename });

    return res.status(201).json({
      success: true,
      url: result.url,
      pathname: result.pathname,
    });
  } catch (error) {
    const code = String(error?.code || "UNKNOWN");
    const statusCode = Number(error?.statusCode) || 503;

    console.error(`Erreur upload (${code}) :`, error?.message);

    return res.status(statusCode).json({
      success: false,
      message: error?.message || "Le stockage n'est pas encore configuré.",
      code,
    });
  }
});

module.exports = router;
