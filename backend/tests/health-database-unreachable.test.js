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

// Cible explicitement un schéma Postgres qui n'existe pas : le health
// endpoint doit répondre 503, sans écriture.
const prodTarget = process.env.TEST_DATABASE_URL;
const u = new URL(prodTarget);
u.pathname = "/filwork_http_test";

process.env.TEST_DATABASE_URL = u.toString();

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

test("GET /api/health/database retourne 503 quand le schéma n'est pas atteignable", async () => {
  const res = await fetch(`${baseUrl}/api/health/database`);

  assert.equal(res.status, 503);

  const body = await res.json();

  assert.equal(body.success, false);
  assert.ok(body.database === "unavailable" || body.database === "connected");
});
