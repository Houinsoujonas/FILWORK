/**
 * Tests d'intégration — POST /api/uploads.
 *
 * - Sans jeton : 401.
 * - Avec jeton mais STORAGE_PROVIDER=none : 503 STORAGE_NOT_CONFIGURED.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:5432/filwork_http_test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.STORAGE_PROVIDER = "none";
delete process.env.STORAGE_TOKEN;

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5051";

test("POST /api/uploads refuse une requête sans authentification (401)", async () => {
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "test.png",
      data: `data:image/png;base64,${pngBytes.toString("base64")}`,
    }),
  });

  assert.equal(res.status, 401);
});

test("POST /api/uploads retourne 503 STORAGE_NOT_CONFIGURED si STORAGE_PROVIDER=none", async () => {
  const login = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_CREATOR_EMAIL,
      password: process.env.TEST_CREATOR_PASSWORD,
    }),
  });

  const data = await login.json();
  assert.ok(login.status === 200, "Connexion impossible (filwork_test requis).");

  const token = data.token;

  // Mini-PNG valide (signature + 4 octets vides pour atteindre 8 octets).
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: "test.png",
      data: `data:image/png;base64,${pngBytes.toString("base64")}`,
    }),
  });

  assert.equal(res.status, 503);

  const body = await res.json();
  assert.equal(body.code, "STORAGE_NOT_CONFIGURED");
});

test("POST /api/uploads rejette un corps supérieur à la limite de la route (>8 Mo)", async () => {
  const login = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_CREATOR_EMAIL,
      password: process.env.TEST_CREATOR_PASSWORD,
    }),
  });

  const data = await login.json();
  assert.ok(login.status === 200, "Connexion impossible (filwork_test requis).");

  const token = data.token;

  // Construire un buffer volontairement très volumineux pour Storage,
  // ici 9 Mo de zéros encodés en base64 → ~12 Mo de texte.
  const bigBuffer = Buffer.alloc(9 * 1024 * 1024, 0);
  const bigBase64 = bigBuffer.toString("base64");

  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: "big.png",
      data: `data:image/png;base64,${bigBase64}`,
    }),
  });

  // 413 généré par express.json limit 8mb ou par le contrôle de taille dans le handler.
  assert.equal(res.status, 413);
});

test("POST /api/uploads rejette un filename pathologique", async () => {
  const login = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_CREATOR_EMAIL,
      password: process.env.TEST_CREATOR_PASSWORD,
    }),
  });

  const data = await login.json();
  assert.ok(login.status === 200, "Connexion impossible (filwork_test requis).");

  const token = data.token;

  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: "../../etc/passwd",
      data: `data:image/png;base64,${pngBytes.toString("base64")}`,
    }),
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.code, "STORAGE_INVALID_FILENAME");
});

test("POST /api/uploads rejette un faux MIME (image/jpeg déclarée image/png)", async () => {
  const login = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_CREATOR_EMAIL,
      password: process.env.TEST_CREATOR_PASSWORD,
    }),
  });

  const data = await login.json();
  assert.ok(login.status === 200, "Connexion impossible (filwork_test requis).");

  const token = data.token;

  // Vrai PNG déclaré image/jpeg → rejet côté validation.
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: "ok.png",
      data: `data:image/jpeg;base64,${pngBytes.toString("base64")}`,
    }),
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.code, "STORAGE_MIME_MISMATCH");
});
