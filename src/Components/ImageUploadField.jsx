import { useState } from "react";

import { Field } from "./AppUI";
import { api, errorMessage } from "../lib/api";
import { validateImageFile } from "../lib/imageUpload";

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}

function uploadErrorMessage(error) {
  if (error?.status === 503 || error?.data?.code === "STORAGE_NOT_CONFIGURED") {
    return "L’envoi d’images est indisponible pour le moment.";
  }

  if (error?.status === 413) {
    return "Cette image dépasse la taille maximale autorisée.";
  }

  if (error?.status === 400) {
    return errorMessage(error);
  }

  return "Le serveur n’a pas pu enregistrer cette image. Réessayez plus tard.";
}

export default function ImageUploadField({
  label = "Importer une image",
  onUploaded,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";

    if (!file) return;

    setError("");

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);

    try {
      const data = await api.post("/uploads", {
        filename: file.name,
        data: await readImageAsDataUrl(file),
      });

      if (!data?.url) {
        throw new Error("L’API n’a pas retourné l’adresse de l’image.");
      }

      onUploaded(data.url);
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field
      label={label}
      hint="JPEG, PNG, WebP ou GIF, 5 Mo maximum. L’image sera accessible par son lien public."
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
      {uploading && <small role="status">Envoi de l’image…</small>}
      {error && <small className="form-notice form-notice--error" role="alert">{error}</small>}
    </Field>
  );
}
