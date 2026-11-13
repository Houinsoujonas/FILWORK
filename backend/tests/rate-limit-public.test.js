const assert = require("node:assert/strict");
const { once } = require("node:events");
const { after, before, test } = require("node:test");

const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";

const BACKEND = "C:\\Users\\SYKO Electronics\\FILWORK\\backend";
require(path.join(BACKEND, "node_modules", "dotenv")).config({
  path: path.join(BACKEND, ".env.test"),
});
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
// Neutralise le generalLimiter pour tester uniquement le publicReadLimiter.
process.env.RATE_LIMIT_GENERAL_PER_MINUTE = "10000";
process.env.RATE_LIMIT_PUBLIC_READ_PER_MINUTE = "3";

const app = require("../src/app");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("publicReadLimiter renvoie 429 sur /api/campaigns après dépassement", async () => {
  let lastStatus = 0;

  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${baseUrl}/api/campaigns`, { method: "GET" });
    lastStatus = res.status;
  }

  assert.equal(lastStatus, 429);

  const body = await fetch(`${baseUrl}/api/campaigns`, { method: "GET" }).then((r) => r.json());

  assert.equal(body.success, false);
  assert.equal(typeof body.message, "string");
});

test("publicReadLimiter renvoie 429 sur /api/reviews après dépassement", async () => {
  let lastStatus = 0;

  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${baseUrl}/api/reviews`, { method: "GET" });
    lastStatus = res.status;
  }

  assert.equal(lastStatus, 429);

  const body = await fetch(`${baseUrl}/api/reviews`, { method: "GET" }).then((r) => r.json());

  assert.equal(body.success, false);
  assert.equal(typeof body.message, "string");
});

test("les routes privées sont toujours servies par leur handler, même si la limite publique est épuisée", async () => {
  // /api/health n'utilise pas publicReadLimiter → réponse 200.
  const res = await fetch(`${baseUrl}/api/health`, { method: "GET" });
  assert.equal(res.status, 200);
});
