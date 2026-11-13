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
// Neutralise le public read limiter pour tester uniquement le generalLimiter.
process.env.RATE_LIMIT_PUBLIC_READ_PER_MINUTE = "10000";
process.env.RATE_LIMIT_GENERAL_PER_MINUTE = "3";

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

test("generalLimiter renvoie 429 après dépassement et structure JSON cohérente", async () => {
  let lastStatus = 0;

  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${baseUrl}/api/health`, { method: "GET" });
    lastStatus = res.status;
  }

  assert.equal(lastStatus, 429);

  const res = await fetch(`${baseUrl}/api/health`, { method: "GET" });

  assert.equal(res.status, 429);

  const body = await res.json();

  assert.equal(body.success, false);
  assert.equal(typeof body.message, "string");
  assert.ok(body.message.length > 0);
});

test("generalLimiter bloque aussi les routes internes protégées lorsqu'il est dépassé", async () => {
  const res = await fetch(`${baseUrl}/api/internal/cron/daily`, { method: "GET" });

  // Express-rate-limit place le compteur avant le handler, donc même une
  // route requireAdmin/requireSecret reçoit 429 si le compteur est saturé.
  assert.equal(res.status, 429);
});
