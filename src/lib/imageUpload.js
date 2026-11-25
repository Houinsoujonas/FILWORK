const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Choisissez une image JPEG, PNG, WebP ou GIF.";
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return "L’image doit peser 5 Mo maximum.";
  }

  if (file.name.length > 180) {
    return "Le nom du fichier est trop long.";
  }

  return "";
}
