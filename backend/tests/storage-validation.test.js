const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  validateImageUpload,
  validateFilename,
  hasValidMagicBytes,
  maxUploadBytes,
  ALLOWED_IMAGE_TYPES,
} = require("../src/services/storage");

const MAX_BYTES = 5 * 1024 * 1024;

function tinyPNG() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
}

function tinyJPEG() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a]);
}

function tinyGIF() {
  return Buffer.from("GIF89a...", "ascii");
}

function tinyWEBP() {
  return Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    Buffer.from([0x1a, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP", "ascii"),
  ]);
}

test("validateImageUpload accepte un PNG valide", () => {
  const buf = tinyPNG();
  assert.doesNotThrow(() => validateImageUpload({
    contentType: "image/png",
    sizeBytes: buf.length,
    buffer: buf,
    filename: "ok.png",
  }));
});

test("validateImageUpload rejette un mauvais MIME déclaré avec PNG réel", () => {
  assert.throws(() => validateImageUpload({
    contentType: "image/jpeg",
    sizeBytes: tinyPNG().length,
    buffer: tinyPNG(),
    filename: "bad.png",
  }));
});

test("validateImageUpload rejette un PNG image avec JPEG magic bytes", () => {
  // Buffer JPEG minimal mais déclaré image/png → mismatch
  assert.throws(() => validateImageUpload({
    contentType: "image/png",
    sizeBytes: tinyJPEG().length,
    buffer: tinyJPEG(),
    filename: "bad.jpg",
  }));
});

test("validateImageUpload rejette un WebP déclaré GIF", () => {
  assert.throws(() => validateImageUpload({
    contentType: "image/gif",
    sizeBytes: tinyWEBP().length,
    buffer: tinyWEBP(),
    filename: "bad.gif",
  }));
});

test("validateImageUpload rejette un GIF déclaré PNG", () => {
  assert.throws(() => validateImageUpload({
    contentType: "image/png",
    sizeBytes: tinyGIF().length,
    buffer: tinyGIF(),
    filename: "bad.png",
  }));
});

test("validateImageUpload accepte un JPEG valide", () => {
  const buf = tinyJPEG();
  assert.doesNotThrow(() => validateImageUpload({
    contentType: "image/jpeg",
    sizeBytes: buf.length,
    buffer: buf,
    filename: "ok.jpg",
  }));
});

test("validateImageUpload accepte un GIF89a valide", () => {
  const buf = tinyGIF();
  assert.doesNotThrow(() => validateImageUpload({
    contentType: "image/gif",
    sizeBytes: buf.length,
    buffer: buf,
    filename: "ok.gif",
  }));
});

test("validateImageUpload accepte un WebP minimal valide", () => {
  const webp = tinyWEBP();
  assert.doesNotThrow(() => validateImageUpload({
    contentType: "image/webp",
    sizeBytes: webp.length,
    buffer: webp,
    filename: "ok.webp",
  }));
});

test("validateImageUpload rejette un type MIME non autorisé", () => {
  assert.throws(() => validateImageUpload({
    contentType: "image/svg+xml",
    sizeBytes: 100,
  }));
});

test("validateImageUpload rejette une taille nulle", () => {
  assert.throws(() => validateImageUpload({
    contentType: "image/png",
    sizeBytes: 0,
  }));
});

test("validateImageUpload rejette une taille > STORAGE_MAX_UPLOAD_BYTES par défaut 5 Mo", () => {
  const big = MAX_BYTES + 1;

  assert.throws(() => validateImageUpload({
    contentType: "image/png",
    sizeBytes: big,
  }));
});

test("validateImageUpload rejette un nom de fichier pathologique", () => {
  assert.throws(() => validateFilename("../../etc/passwd"));
  assert.throws(() => validateFilename("/etc/passwd"));
  assert.throws(() => validateFilename("a\x00.png"));
  assert.throws(() => validateFilename("..hidden"));
});

test("validateFilename conserve seulement les noms simples (aucun chemin)", () => {
  assert.equal(validateFilename("photo.png"), "photo.png");
  assert.equal(validateFilename("photo.jpeg"), "photo.jpeg");
  assert.throws(() => validateFilename("C:\\dossier\\photo.png"));
  assert.throws(() => validateFilename("uploads/ok.jpeg"));
  assert.throws(() => validateFilename("..hidden"));
  assert.throws(() => validateFilename("a\tb"));
});

test("hasValidMagicBytes détecte les quatre types acceptés", () => {
  assert.equal(hasValidMagicBytes(tinyPNG(), "image/png"), true);
  assert.equal(hasValidMagicBytes(tinyJPEG(), "image/jpeg"), true);
  assert.equal(hasValidMagicBytes(tinyGIF(), "image/gif"), true);
  assert.equal(hasValidMagicBytes(tinyWEBP(), "image/webp"), true);
});

test("hasValidMagicBytes rejette les fausses signatures", () => {
  const badPng = Buffer.from([0x00, 0x50, 0x4e, 0x47]);
  assert.equal(hasValidMagicBytes(badPng, "image/png"), false);

  const badJpeg = Buffer.from([0x00, 0xd8, 0xff, 0xe0]);
  assert.equal(hasValidMagicBytes(badJpeg, "image/jpeg"), false);

  const badGif = Buffer.from("GIF98a", "ascii");
  assert.equal(hasValidMagicBytes(badGif, "image/gif"), false);
});

test("ALLOWED_IMAGE_TYPES couvre exactement jpeg, png, webp, gif", () => {
  const names = [...ALLOWED_IMAGE_TYPES].sort().join(",");
  assert.equal(names, "image/gif,image/jpeg,image/png,image/webp");
});

test("maxUploadBytes retourne 5 Mo par défaut", () => {
  // Supprimer la variable d'override si présente.
  const previous = process.env.STORAGE_MAX_UPLOAD_BYTES;
  delete process.env.STORAGE_MAX_UPLOAD_BYTES;

  assert.equal(maxUploadBytes(), 5 * 1024 * 1024);

  if (previous !== undefined) {
    process.env.STORAGE_MAX_UPLOAD_BYTES = previous;
  }
});
