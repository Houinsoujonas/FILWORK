"use strict";

/**
 * SasPay — intégration de paiement pour FILWORK.
 *
 * Encaissement : l'entreprise paie FILWORK via softpay (push mobile money
 * ou page de paiement hébergée). Reversement : FILWORK reverse au créateur
 * la part convenue moins la commission FILWORK.
 *
 * Sécurité :
 *   - aucune clé secrète n'est journalisée ni renvoyée au client ;
 *   - les appels métier exigent une clé API côté serveur uniquement ;
 *   - les webhooks sont vérifiés par signature HMAC-SHA256 avant tout traitement ;
 *   - les webhooks ne sont jamais fiables tels quels : l'état réel du paiement
 *     est revérifié auprès de l'API SasPay avant toute mise à jour locale ;
 *   - les envois sont idempotents (Idempotency-Key + revendication atomique).
 *
 * Le reversement n'est déclenché que manuellement par un administrateur
 * (décision juridique : FILWORK ne conserve pas les fonds de tiers comme
 * un portefeuille sans cadre réglementaire validé).
 */

const crypto = require("node:crypto");

const SASPAY_BASE_URL = process.env.SASPAY_BASE_URL || "https://api.saspay.me/api/v1";

const REQUEST_TIMEOUT_MS = 15_000;
const WEBHOOK_TOLERANCE_SECONDS = 300;

/** Codes réseau mobile money pour le Bénin (XOF/BJ, indicatif +229). */
const NETWORKS_BJ = {
  celtiis_bj: "Celtiis Cash",
  moov_bj: "Moov Money Benin",
  mtn_bj: "MTN MoMo Benin",
};

/**
 * Configuration SasPay activée uniquement si explicitement demandé.
 *
 * Même en présence d'une clé API accidentellement configurée, le service
 * reste désactivé tant que SASPAY_ENABLED n'est pas "true". Cela empêche
 * tout paiement, reversement ou appel réseau durant la phase de suivi
 * manuelle.
 */
function isConfigured() {
  return (
    process.env.SASPAY_ENABLED === "true" &&
    Boolean(process.env.SASPAY_API_KEY)
  );
}

function baseUrl() {
  return (process.env.SASPAY_BASE_URL || SASPAY_BASE_URL).replace(/\/+$/, "");
}

function error(message, statusCode = 502) {
  const e = new Error(message);
  e.statusCode = statusCode;
  e.code = "SASPAY_UPSTREAM";
  return e;
}

function notConfigured() {
  const e = new Error(
    "La clé API SasPay (SASPAY_API_KEY) est introuvable. Configurez SasPay et redémarrez le serveur.",
  );
  e.statusCode = 503;
  e.code = "SASPAY_NOT_CONFIGURED";
  return e;
}

/** Montants décimaux en chaîne ex. "2500.00" — jamais de flottant. */
function decimalAmount(value) {
  const str = String(value);
  const m = str.match(/^(\d{1,10})(\.(\d{1,2}))?$/);

  if (!m) {
    const e = new Error("Le montant doit être positif avec au plus deux décimales.");
    e.statusCode = 400;
    e.code = "SASPAY_AMOUNT_INVALID";
    throw e;
  }

  const [, intPart, , frac = "00"] = m;
  return `${intPart}.${frac.padEnd(2, "0")}`;
}

/** Commission en points de base depuis l'environnement. Défaut : 0 (non fixée). */
function commissionBps() {
  const raw = process.env.FILWORK_COMMISSION_BPS;

  if (raw === undefined) {
    return 0;
  }

  const bps = Number(raw);

  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) {
    const e = new Error(
      "FILWORK_COMMISSION_BPS doit être un entier entre 0 et 10000 (points de base).",
    );
    e.statusCode = 500;
    e.code = "SASPAY_CONFIG_INVALID";
    throw e;
  }

  return bps;
}

/** Calcule commission et part créateur. Montants convertis en centimes. */
function calculateCommission(amount, bps) {
  const cents = Math.round(Number(amount) * 100);
  const commissionCents = Math.floor((cents * bps) / 10000);
  const creatorCents = cents - commissionCents;

  return {
    commissionAmount: (commissionCents / 100).toFixed(2),
    creatorAmount: (creatorCents / 100).toFixed(2),
  };
}

async function sasPayFetch(path, { method = "GET", body, idempotencyKey, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (!isConfigured()) {
    throw notConfigured();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    Authorization: `Bearer ${process.env.SASPAY_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let response;
  let parsed;

  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw error("SasPay n'a pas répondu dans le délai imparti.", 504);
    }

    throw error(`SasPay est injoignable : ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  return { status: response.status, body: parsed };
}

function envelope({ status, body }) {
  const success = Boolean(body && body.success);
  const data = body && body.data ? body.data : null;
  const error = body && body.error ? body.error : null;

  return { status, success, data, error };
}

/** Signer un corps webhook avec un secret donné (pour tests et vérification). */
function computeWebhookSignature(rawBody, timestamp, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

/** Vérifie signature et horodatage d'un webhook SasPay. */
function verifyWebhookSignature({ rawBody, signature, timestamp, secret }) {
  if (!secret) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - Number(timestamp));

  if (!Number.isFinite(Number(timestamp)) || age > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  if (!signature || typeof signature !== "string") {
    return false;
  }

  const expected = computeWebhookSignature(rawBody, timestamp, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

/** Initier un paiement softpay (mobile money / push). */
async function initializeSoftpayPayment(args) {
  const {
    amount,
    currency = "XOF",
    country = "BJ",
    network,
    description,
    customer,
    metadata,
    idempotencyKey,
    otp,
  } = args;

  const body = {
    amount: decimalAmount(amount),
    currency: String(currency).toUpperCase(),
    country: String(country).toUpperCase(),
    network,
    description: description || undefined,
    customer,
    metadata: metadata || undefined,
    otp: otp || undefined,
  };

  const res = await sasPayFetch("/payments/softpay/", {
    method: "POST",
    body,
    idempotencyKey,
  });

  return envelope(res);
}

/** Initier une session de checkout hébergé. */
async function initializeCheckoutSession(args) {
  const {
    amount,
    currency = "XOF",
    country = "BJ",
    description,
    customer,
    returnUrl,
    metadata,
    idempotencyKey,
  } = args;

  const body = {
    amount: decimalAmount(amount),
    currency: String(currency).toUpperCase(),
    country: String(country).toUpperCase(),
    description: description || undefined,
    customer,
    return_url: returnUrl,
    metadata: metadata || undefined,
  };

  const res = await sasPayFetch("/checkout-sessions/", {
    method: "POST",
    body,
    idempotencyKey,
  });

  return envelope(res);
}

/** Statut réel d'un paiement (jamais un statut mémorisé). */
async function verifyPayment(providerId) {
  const res = await sasPayFetch(`/payments/${providerId}/verify/`, {
    method: "GET",
  });

  return envelope(res);
}

/** Initier un payout (réservé aux administrateurs, SasPay doit l'activer). */
async function initializePayout(args) {
  const {
    amount,
    currency = "XOF",
    country = "BJ",
    method,
    recipient,
    customer,
    description,
    metadata,
    idempotencyKey,
  } = args;

  const body = {
    amount: decimalAmount(amount),
    currency: String(currency).toUpperCase(),
    country: String(country).toUpperCase(),
    method,
    recipient,
    customer,
    description: description || undefined,
    metadata: metadata || undefined,
  };

  const res = await sasPayFetch("/payouts/initialize/", {
    method: "POST",
    body,
    idempotencyKey,
  });

  return envelope(res);
}

/** Statut réel d'un payout. */
async function verifyPayout(providerId) {
  const res = await sasPayFetch(`/payouts/${providerId}/verify/`, {
    method: "GET",
  });

  return envelope(res);
}

module.exports = {
  SASPAY_BASE_URL,
  NETWORKS_BJ,
  isConfigured,
  decimalAmount,
  commissionBps,
  calculateCommission,
  computeWebhookSignature,
  verifyWebhookSignature,
  initializeSoftpayPayment,
  initializeCheckoutSession,
  verifyPayment,
  initializePayout,
  verifyPayout,
};
