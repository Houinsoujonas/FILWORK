const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:55432/filwork_test";

const { enqueueEmail } = require("../src/services/outboxService");
const { processEmailOutboxBatch } = require("../src/services/emailOutboxWorker");

test("enqueueEmail refuse les adresses invalides", async () => {
  await assert.rejects(
    () =>
      enqueueEmail({
        to: "pas-un-email",
        subject: "Test",
        template: "welcome",
        payload: {},
      }),
    /invalide/,
  );

  await assert.rejects(
    () => enqueueEmail({ to: "", subject: "Test", template: "welcome", payload: {} }),
    /invalide/,
  );

  await assert.rejects(
    () => enqueueEmail({ to: "a@b", subject: "Test", template: "welcome", payload: {} }),
    /invalide/,
  );
});

test("enqueueEmail refuse un sujet vide", async () => {
  await assert.rejects(
    () =>
      enqueueEmail({
        to: "contact@example.com",
        subject: "",
        template: "welcome",
        payload: {},
      }),
    /obligatoire/,
  );
});

test("enqueueEmail refuse un modèle vide", async () => {
  await assert.rejects(
    () =>
      enqueueEmail({
        to: "contact@example.com",
        subject: "Test",
        template: "",
        payload: {},
      }),
    /obligatoire/,
  );
});

test("processEmailOutboxBatch refuse d'envoyer en NODE_ENV=test", async () => {
  const processed = await processEmailOutboxBatch();

  assert.equal(processed, 0);
});
