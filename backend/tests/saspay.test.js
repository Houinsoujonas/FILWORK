const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.SASPAY_WEBHOOK_SECRET = process.env.SASPAY_WEBHOOK_SECRET || "test-webhook-secret-32chars";

const {
  computeWebhookSignature,
  verifyWebhookSignature,
  decimalAmount,
  commissionBps,
  calculateCommission,
  isConfigured,
  NETWORKS_BJ,
} = require("../src/services/sasPayService");

test("decimalAmount accepte les montants décimaux valides", () => {
  assert.equal(decimalAmount("2500"), "2500.00");
  assert.equal(decimalAmount("2500.50"), "2500.50");
  assert.equal(decimalAmount("0.00"), "0.00");
  assert.equal(decimalAmount("1234567890.99"), "1234567890.99");
});

test("decimalAmount refuse les montants invalides", () => {
  assert.throws(() => decimalAmount(""), /positif/);
  assert.throws(() => decimalAmount("-5"), /positif/);
  assert.throws(() => decimalAmount("abc"), /positif/);
  assert.throws(() => decimalAmount("1.999"), /positif/);
});

test("commissionBps lit FILWORK_COMMISSION_BPS avec défaut 0", () => {
  const previous = process.env.FILWORK_COMMISSION_BPS;

  delete process.env.FILWORK_COMMISSION_BPS;
  assert.equal(commissionBps(), 0);

  process.env.FILWORK_COMMISSION_BPS = "1000";
  assert.equal(commissionBps(), 1000);

  process.env.FILWORK_COMMISSION_BPS = "1001.5";
  assert.throws(() => commissionBps(), /entier/);

  if (previous === undefined) {
    delete process.env.FILWORK_COMMISSION_BPS;
  } else {
    process.env.FILWORK_COMMISSION_BPS = previous;
  }
});

test("calculateCommission calcule la commission en points de base sans flottant", () => {
  const { commissionAmount, creatorAmount } = calculateCommission("100000.00", 1000); // 10 %

  assert.equal(commissionAmount, "10000.00");
  assert.equal(creatorAmount, "90000.00");
});

test("calculateCommission avec 0 point de base reverse tout au créateur", () => {
  const { commissionAmount, creatorAmount } = calculateCommission("50000.00", 0);

  assert.equal(commissionAmount, "0.00");
  assert.equal(creatorAmount, "50000.00");
});

test("verifyWebhookSignature accepte une signature valide", () => {
  const rawBody = Buffer.from('{"event":"transaction.success"}');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = "test-webhook-secret";

  const signature = computeWebhookSignature(rawBody, timestamp, secret);

  const ok = verifyWebhookSignature({
    rawBody,
    signature,
    timestamp,
    secret,
  });

  assert.equal(ok, true);
});

test("verifyWebhookSignature rejette une mauvaise signature", () => {
  const rawBody = Buffer.from('{"event":"transaction.success"}');
  const timestamp = String(Math.floor(Date.now() / 1000));

  const ok = verifyWebhookSignature({
    rawBody,
    signature: "deadbeef".repeat(8),
    timestamp,
    secret: "test-webhook-secret",
  });

  assert.equal(ok, false);
});

test("verifyWebhookSignature rejette un horodatage trop ancien", () => {
  const rawBody = Buffer.from('{"event":"transaction.success"}');
  const timestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 minutes
  const secret = "test-webhook-secret";

  const signature = computeWebhookSignature(rawBody, timestamp, secret);

  const ok = verifyWebhookSignature({
    rawBody,
    signature,
    timestamp,
    secret,
  });

  assert.equal(ok, false);
});

test("NETWORKS_BJ contient les réseaux mobile money du Bénin", () => {
  assert.equal(NETWORKS_BJ.mtn_bj, "MTN MoMo Benin");
  assert.equal(NETWORKS_BJ.moov_bj, "Moov Money Benin");
  assert.equal(NETWORKS_BJ.celtiis_bj, "Celtiis Cash");
});

test("isConfigured retourne false sans SASPAY_API_KEY", () => {
  const previous = process.env.SASPAY_API_KEY;

  delete process.env.SASPAY_API_KEY;
  assert.equal(isConfigured(), false);

  if (previous === undefined) {
    delete process.env.SASPAY_API_KEY;
  } else {
    process.env.SASPAY_API_KEY = previous;
  }
});
