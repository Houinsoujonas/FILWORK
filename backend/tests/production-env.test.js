const test = require("node:test");
const assert = require("node:assert/strict");

const { validateProductionEnvironment } = require("../src/config/productionEnv");

const KEYS = [
  "NODE_ENV",
  "JWT_SECRET",
  "FRONTEND_URL",
  "CORS_ORIGINS",
];

function snapshotEnv() {
  const snapshot = {};

  for (const key of KEYS) {
    snapshot[key] = process.env[key];
  }

  return snapshot;
}

function restoreEnv(snapshot) {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  }
}

function withProdEnv(t, overrides) {
  const snap = snapshotEnv();

  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = "x".repeat(64);
  process.env.FRONTEND_URL = "https://filwork.example.com";
  process.env.CORS_ORIGINS = "https://filwork.example.com";

  Object.assign(process.env, overrides);

  t.after(() => restoreEnv(snap));
}

test("validation ignorée hors production", () => {
  const snap = snapshotEnv();

  process.env.NODE_ENV = "development";
  delete process.env.JWT_SECRET;
  delete process.env.FRONTEND_URL;
  delete process.env.CORS_ORIGINS;

  assert.doesNotThrow(() => validateProductionEnvironment());

  restoreEnv(snap);
});

test("production : JWT_SECRET trop court refusé", (t) => {
  withProdEnv(t, { JWT_SECRET: "court" });

  assert.throws(() => validateProductionEnvironment(), /JWT_SECRET/);
});

test("production : FRONTEND_URL non HTTPS refusé", (t) => {
  withProdEnv(t, { FRONTEND_URL: "http://filwork.example.com" });

  assert.throws(() => validateProductionEnvironment(), /FRONTEND_URL/);
});

test("production : CORS vide refusé", (t) => {
  withProdEnv(t, { CORS_ORIGINS: "" });

  assert.throws(() => validateProductionEnvironment(), /CORS_ORIGINS/);
});

test("production : CORS sans origine HTTPS non locale refusé (locales HTTPS)", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "https://localhost:5173,https://127.0.0.1:5173",
  });

  assert.throws(() => validateProductionEnvironment(), /locale/);
});

test("production : origine HTTP non locale refusée (HTTPS exigé)", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "http://app.filwork.example.com",
  });

  assert.throws(() => validateProductionEnvironment(), /HTTPS/);
});

test("production : origine HTTPS locale refusée", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "https://localhost:5173",
  });

  assert.throws(() => validateProductionEnvironment(), /locale/);
});

test("production : origine 0.0.0.0 refusée", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "https://0.0.0.0:443",
  });

  assert.throws(() => validateProductionEnvironment(), /locale/);
});

test("production : origine http locale mélangée à HTTPS refusée", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "https://app.filwork.example.com,http://localhost:5173",
  });

  assert.throws(() => validateProductionEnvironment(), /HTTPS/);
});

test("production : origine mixte localhost HTTPS refusée", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "https://app.filwork.example.com,https://127.0.0.1:5173",
  });

  assert.throws(() => validateProductionEnvironment(), /locale/);
});

test("production : origine invalide refusée", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "pas-une-url",
  });

  assert.throws(() => validateProductionEnvironment(), /invalide/);
});

test("production : configuration correcte acceptée", (t) => {
  withProdEnv(t, {
    CORS_ORIGINS: "https://app.filwork.example.com,https://www.filwork.example.com",
  });

  assert.doesNotThrow(() => validateProductionEnvironment());
});
