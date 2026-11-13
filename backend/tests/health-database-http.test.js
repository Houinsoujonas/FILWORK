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

test("GET /api/health/database retourne 200 schema=ready quand filwork_test est migrée", async () => {
  const res = await fetch(`${baseUrl}/api/health/database`);

  assert.equal(res.status, 200);

  const body = await res.json();

  assert.equal(body.success, true);
  assert.equal(body.database, "connected");
  assert.equal(body.schema, "ready");
});

test("GET /api/health/database retourne un identifiant de session x-request-id", async () => {
  const res = await fetch(`${baseUrl}/api/health/database`);

  assert.ok(res.headers.get("x-request-id"));
});
