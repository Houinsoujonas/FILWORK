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
process.env.SASPAY_ENABLED = "false";
// Une clé API « accidentellement » présente ne doit rien changer.
process.env.SASPAY_API_KEY = "sk_live_fake_key_that_must_not_be_used";

const app = require("../src/app");
const {
  isConfigured,
  initializeSoftpayPayment,
} = require("../src/services/sasPayService");

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

/**
 * Installe un garde-fou sur globalThis.fetch : les requêtes vers le
 * serveur de test local sont autorisées, toute autre destination est
 * comptabilisée puis rejetée.
 */
function installFetchGuard() {
  const originalFetch = globalThis.fetch;
  const blocked = [];

  globalThis.fetch = async (url, ...args) => {
    const urlStr = String(url || "");

    if (urlStr.startsWith("http://127.0.0.1:")) {
      return originalFetch(url, ...args);
    }

    blocked.push(urlStr);

    throw new Error(
      `fetch ne doit pas être appelé lorsque SasPay est désactivé (destination: ${urlStr}).`,
    );
  };

  return {
    blocked,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

test("isConfigured reste false même avec SASPAY_API_KEY présente", () => {
  assert.equal(isConfigured(), false);
});

test("initializeSoftpayPayment ne doit pas contacter le réseau", async () => {
  const guard = installFetchGuard();

  try {
    await assert.rejects(
      () =>
        initializeSoftpayPayment({
          amount: "1000.00",
          currency: "XOF",
          country: "BJ",
          network: "mtn_bj",
          customer: {
            email: "test@example.com",
            first_name: "Test",
            last_name: "Test",
            phone: "+22901000000",
          },
          idempotencyKey: "test-key",
        }),
      /SASPAY_API_KEY|non configuré|introuvable/i,
    );

    assert.equal(guard.blocked.length, 0, "fetch sortant ne doit pas être appelé.");
  } finally {
    guard.restore();
  }
});

test("webhook SasPay refuse la requête sans appel réseau lorsque SASPAY_ENABLED=false", async () => {
  const guard = installFetchGuard();

  try {
    const res = await fetch(`${baseUrl}/api/webhooks/saspay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": "deadbeef",
        "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify({ event: "transaction.success", data: {} }),
    });

    assert.equal(res.status, 503);
    assert.equal(guard.blocked.length, 0, "fetch sortant ne doit pas être appelé.");
  } finally {
    guard.restore();
  }
});

test("initialisation d'un paiement SasPay refuse sans appel réseau", async () => {
  const guard = installFetchGuard();

  try {
    const res = await fetch(`${baseUrl}/api/payments/fake-payment-id/saspay/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ network: "mtn_bj" }),
    });

    // 401 attendu (pas de jeton) — jamais d'appel sortant.
    assert.equal(res.status, 401);
    assert.equal(guard.blocked.length, 0);
  } finally {
    guard.restore();
  }
});

test("vérification d'un paiement SasPay refuse sans appel réseau", async () => {
  const guard = installFetchGuard();

  try {
    const res = await fetch(`${baseUrl}/api/payments/fake-payment-id/saspay/status`, {
      method: "GET",
      headers: {},
    });

    assert.equal(res.status, 401);
    assert.equal(guard.blocked.length, 0);
  } finally {
    guard.restore();
  }
});

test("vérification d'un payout SasPay refuse sans appel réseau", async () => {
  const guard = installFetchGuard();

  try {
    const res = await fetch(`${baseUrl}/api/payouts/fake-payment-id/saspay/verify`, {
      method: "GET",
      headers: {},
    });

    assert.equal(res.status, 401);
    assert.equal(guard.blocked.length, 0);
  } finally {
    guard.restore();
  }
});
