/**
 * Tests d'intégration — Notifications de paiement et transitions refusées.
 *
 * Vérifie :
 *   - Une transition de paiement refusée par les règles métier (409) ne
 *     crée AUCUNE notification pour le créateur.
 *   - Une tentative effectuée par un compte sans le rôle COMPANY (403) ne
 *     crée AUCUNE notification.
 *   - Une valeur de statut invalide (400) ne crée AUCUNE notification.
 *   - Chaque transition effectivement validée (200) crée exactement UNE
 *     notification PAYMENT_STATUS_UPDATED.
 *   - Un refus depuis l'état terminal PAID (409) ne crée aucune notification
 *     supplémentaire.
 *
 * Nécessite filwork_test migrée.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:55432/filwork_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5051";

const headers = { "Content-Type": "application/json" };

async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  assert.equal(res.status, 200, `Connexion impossible pour ${email}`);
  assert.ok(data.token, "Un jeton doit être retourné.");

  return data.token;
}

function authHeaders(token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function setupCollaborationWithPayment() {
  const creatorEmail = process.env.TEST_CREATOR_EMAIL;
  const creatorPassword = process.env.TEST_CREATOR_PASSWORD;
  const companyEmail = process.env.TEST_COMPANY_EMAIL;
  const companyPassword = process.env.TEST_COMPANY_PASSWORD;

  assert.ok(creatorEmail && creatorPassword, "Compte créateur de test requis.");
  assert.ok(companyEmail && companyPassword, "Compte entreprise de test requis.");

  const creatorToken = await login(creatorEmail, creatorPassword);
  const companyToken = await login(companyEmail, companyPassword);

  const campaignTitle = `Test notifications paiement ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;

  const createCampaign = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: authHeaders(companyToken),
    body: JSON.stringify({
      title: campaignTitle,
      description: "Campagne de test pour valider les notifications de paiement.",
    }),
  });

  const createdCampaign = await createCampaign.json();
  assert.ok(
    [200, 201].includes(createCampaign.status),
    JSON.stringify(createdCampaign),
  );

  const campaignId =
    createdCampaign.campaign?.id ??
    createdCampaign.data?.campaign?.id ??
    createdCampaign.id;
  assert.ok(campaignId, "La campagne créée doit avoir un identifiant.");

  const publish = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/publish`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
  });
  assert.equal(publish.status, 200);

  const apply = await fetch(`${API_BASE_URL}/api/applications/${campaignId}`, {
    method: "POST",
    headers: authHeaders(creatorToken),
    body: JSON.stringify({ message: "Candidature de test notifications." }),
  });
  const applyData = await apply.json();
  assert.ok([200, 201].includes(apply.status), JSON.stringify(applyData));

  const applications = await fetch(
    `${API_BASE_URL}/api/applications/campaigns/${campaignId}`,
    { headers: authHeaders(companyToken) },
  );
  const applicationsData = await applications.json();
  const applicationId =
    applicationsData.applications?.[0]?.id ??
    applicationsData.data?.applications?.[0]?.id;
  assert.ok(applicationId);

  const accept = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "ACCEPTED", amount: 15000 }),
  });
  const acceptData = await accept.json();
  assert.equal(accept.status, 200, JSON.stringify(acceptData));

  const collaboration =
    acceptData.application?.collaboration ?? acceptData.collaboration;
  assert.ok(collaboration?.id);

  const collaborationId = collaboration.id;

  const createPayment = await fetch(
    `${API_BASE_URL}/api/payments/collaborations/${collaborationId}`,
    {
      method: "POST",
      headers: authHeaders(companyToken),
      body: JSON.stringify({
        amount: 15000,
        currency: "XOF",
        notes: "Paiement de test notifications.",
      }),
    },
  );
  const createdPayment = await createPayment.json();
  assert.equal(createPayment.status, 201, JSON.stringify(createdPayment));

  const paymentId =
    createdPayment.payment?.id ?? createdPayment.data?.payment?.id;
  assert.ok(paymentId);

  return { creatorToken, companyToken, collaborationId, paymentId };
}

async function countPaymentNotifications(creatorToken, collaborationId) {
  const res = await fetch(`${API_BASE_URL}/api/notifications`, {
    headers: authHeaders(creatorToken),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);

  const notifications = data.notifications ?? [];

  return notifications.filter(
    (n) =>
      n.type === "PAYMENT_STATUS_UPDATED" &&
      n.collaborationId === collaborationId,
  ).length;
}

test("les transitions refusées ne créent aucune notification", async () => {
  const {
    creatorToken,
    companyToken,
    collaborationId,
    paymentId,
  } = await setupCollaborationWithPayment();

  assert.equal(
    await countPaymentNotifications(creatorToken, collaborationId),
    0,
    "Aucune notification ne doit exister avant toute transition.",
  );

  // Transitions interdites par les règles métier (409).
  const skipPending = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "PAID" }),
  });
  assert.equal(skipPending.status, 409);

  const failedFromPlanned = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "FAILED" }),
  });
  assert.equal(failedFromPlanned.status, 409);

  // Statut hors énumération (400) — jamais une transition valide.
  const invalidStatus = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "BOGUS" }),
  });
  assert.equal(invalidStatus.status, 400);

  // Tentative du créateur (403 via requireRole("COMPANY")).
  const creatorAttempt = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(creatorToken),
    body: JSON.stringify({ status: "PENDING" }),
  });
  assert.equal(creatorAttempt.status, 403);

  assert.equal(
    await countPaymentNotifications(creatorToken, collaborationId),
    0,
    "Aucune notification ne doit être créée par des requêtes refusées.",
  );
});

test("les notifications ne sont créées qu'après validation, jamais depuis PAID", async () => {
  const {
    creatorToken,
    companyToken,
    collaborationId,
    paymentId,
  } = await setupCollaborationWithPayment();

  // Transition valide : PLANNED -> PENDING.
  const toPending = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "PENDING" }),
  });
  assert.equal(toPending.status, 200);

  assert.equal(
    await countPaymentNotifications(creatorToken, collaborationId),
    1,
    "Une notification doit être créée après une transition validée.",
  );

  // Transition valide : PENDING -> PAID.
  const toPaid = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "PAID" }),
  });
  assert.equal(toPaid.status, 200);

  assert.equal(
    await countPaymentNotifications(creatorToken, collaborationId),
    2,
    "Une seconde notification doit être créée après la transition validée suivante.",
  );

  // Refus depuis PAID (terminal) : aucune notification supplémentaire.
  const afterPaid = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "PENDING" }),
  });
  assert.equal(afterPaid.status, 409);

  const afterPaidFailed = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "FAILED" }),
  });
  assert.equal(afterPaidFailed.status, 409);

  assert.equal(
    await countPaymentNotifications(creatorToken, collaborationId),
    2,
    "Un état terminal refusé ne doit pas créer de notification supplémentaire.",
  );
});
