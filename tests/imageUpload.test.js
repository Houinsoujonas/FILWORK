import test from "node:test";
import assert from "node:assert/strict";

import { MAX_IMAGE_UPLOAD_BYTES, validateImageFile } from "../src/lib/imageUpload.js";

test("une image JPEG conforme est acceptée", () => {
  assert.equal(
    validateImageFile({ type: "image/jpeg", size: 1024, name: "portrait.jpg" }),
    "",
  );
});

test("un format non pris en charge est refusé", () => {
  assert.match(
    validateImageFile({ type: "image/svg+xml", size: 1024, name: "logo.svg" }),
    /JPEG, PNG, WebP ou GIF/,
  );
});

test("une image au-dessus de la limite de 5 Mo est refusée", () => {
  assert.match(
    validateImageFile({
      type: "image/png",
      size: MAX_IMAGE_UPLOAD_BYTES + 1,
      name: "logo.png",
    }),
    /5 Mo maximum/,
  );
});

test("un nom de fichier dépassant la limite backend est refusé", () => {
  assert.match(
    validateImageFile({
      type: "image/webp",
      size: 1024,
      name: `${"a".repeat(177)}.webp`,
    }),
    /nom du fichier est trop long/,
  );
});
