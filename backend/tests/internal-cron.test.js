const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { before, after } = require("node:test");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:55432/filwork_test";
process.env.CRON_SECRET = "cron-secret-test-32-chars-minimum";

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

test("les routes internes refusent l'accès sans Bearer CRON_SECRET", async () => {
  const resEmails = await fetch(`${baseUrl}/api/internal/cron/process-emails`);
  assert.equal(resEmails.status, 401);

  const resCleanup = await fetch(`${baseUrl}/api/internal/cron/cleanup-tokens`);
  assert.equal(resCleanup.status, 401);

  const resDaily = await fetch(`${baseUrl}/api/internal/cron/daily`);
  assert.equal(resDaily.status, 401);
});

test("les routes internes refusent un mauvais secret", async () => {
  const res = await fetch(`${baseUrl}/api/internal/cron/process-emails`, {
    headers: { Authorization: "Bearer mauvais-secret" },
  });

  assert.equal(res.status, 401);
});

test("les routes internes acceptent le bon secret", async () => {
  const res = await fetch(`${baseUrl}/api/internal/cron/process-emails`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  // En NODE_ENV=test : aucune connexion SMTP ni base requise.
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.processed, 0);
});

test("le cron quotidien accepte le bon secret", async () => {
  const res = await fetch(`${baseUrl}/api/internal/cron/daily`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(typeof data.emailsProcessed, "number");
});
