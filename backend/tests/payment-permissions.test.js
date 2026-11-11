/**
 * Tests d'intégration — Permissions et transitions de paiement manuel.
 *
 * Vérifie :
 *   - Seule l'entreprise concernée peut déclarer ou modifier le paiement.
 *   - Un créateur ne peut pas s'attribuer lui-même le statut payé.
 *   - Une autre entreprise ne peut pas intervenir sur ce paiement.
 *   - Les transitions interdites sont rejetées.
 *   - Deux demandes concurrentes pour la même transition n'aboutissent pas
 *     à un état incohérent.
 *   - Le créateur peut consulter, mais pas écrire.
 *
 * Nécessite filwork_test migrée.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { after } = require("node:test");

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

test("Permissions et transitions de paiement", async (t) => {
  const creatorEmail = process.env.TEST_CREATOR_EMAIL;
  const creatorPassword = process.env.TEST_CREATOR_PASSWORD;
  const companyEmail = process.env.TEST_COMPANY_EMAIL;
  const companyPassword = process.env.TEST_COMPANY_PASSWORD;
  const otherCompanyEmail = process.env.TEST_OTHER_COMPANY_EMAIL;
  const otherCompanyPassword = process.env.TEST_OTHER_COMPANY_PASSWORD;

  assert.ok(creatorEmail && creatorPassword, "Comptes de test créateur requis.");
  assert.ok(companyEmail && companyPassword, "Comptes de test entreprise requis.");
  assert.ok(otherCompanyEmail && otherCompanyPassword, "Compte entreprise concurrent requis.");

  const creatorToken = await login(creatorEmail, creatorPassword);
  const companyToken = await login(companyEmail, companyPassword);
  const otherCompanyToken = await login(otherCompanyEmail, otherCompanyPassword);

  // Campagne + publication + candidature + acceptation = collaboration.
  const campaignTitle = `Test paiement permissions ${Date.now()}`;

  const createCampaign = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: authHeaders(companyToken),
    body: JSON.stringify({
      title: campaignTitle,
      description: "Campagne de test pour valider les permissions de paiement.",
    }),
  });

  const createdCampaign = await createCampaign.json();
  assert.ok([200, 201].includes(createCampaign.status), JSON.stringify(createdCampaign));

  const campaignId = createdCampaign.campaign?.id ?? createdCampaign.data?.campaign?.id ?? createdCampaign.id;
  assert.ok(campaignId);

  const publish = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/publish`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
  });
  assert.equal(publish.status, 200);

  const apply = await fetch(`${API_BASE_URL}/api/applications/${campaignId}`, {
    method: "POST",
    headers: authHeaders(creatorToken),
    body: JSON.stringify({ message: "Candidature de test paiement." }),
  });

  const applyData = await apply.json();
  assert.ok([200, 201].includes(apply.status), JSON.stringify(applyData));

  const applications = await fetch(`${API_BASE_URL}/api/applications/campaigns/${campaignId}`, {
    headers: authHeaders(companyToken),
  });
  const applicationsData = await applications.json();
  const applicationId = applicationsData.applications?.[0]?.id ?? applicationsData.data?.applications?.[0]?.id;
  assert.ok(applicationId);

  const accept = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
    body: JSON.stringify({ status: "ACCEPTED", amount: 30000 }),
  });
  const acceptData = await accept.json();
  assert.equal(accept.status, 200, JSON.stringify(acceptData));

  const collaboration = acceptData.application?.collaboration ?? acceptData.collaboration;
  assert.ok(collaboration?.id);

  const collaborationId = collaboration.id;

  // Création du paiement par l'entreprise concernée.
  const createPayment = await fetch(
    `${API_BASE_URL}/api/payments/collaborations/${collaborationId}`,
    {
      method: "POST",
      headers: authHeaders(companyToken),
      body: JSON.stringify({
        amount: 30000,
        currency: "XOF",
        notes: "Paiement de test permissions.",
      }),
    },
  );

  const createdPayment = await createPayment.json();
  assert.equal(createPayment.status, 201, JSON.stringify(createdPayment));

  const paymentId = createdPayment.payment?.id ?? createdPayment.data?.payment?.id;
  assert.ok(paymentId);

  // 1. Une autre entreprise ne peut pas consulter les paiements.
  const otherCompanyGet = await fetch(
    `${API_BASE_URL}/api/payments/collaborations/${collaborationId}`,
    { headers: authHeaders(otherCompanyToken) },
  );
  assert.ok([403, 404].includes(otherCompanyGet.status), `attendu 403/404, reçu ${otherCompanyGet.status}`);

  // 2. Une autre entreprise ne peut pas créer de paiement.
  const otherCompanyCreate = await fetch(
    `${API_BASE_URL}/api/payments/collaborations/${collaborationId}`,
    {
      method: "POST",
      headers: authHeaders(otherCompanyToken),
      body: JSON.stringify({ amount: 100, currency: "XOF" }),
    },
  );
  assert.ok([403, 404].includes(otherCompanyCreate.status), `attendu 403/404, reçu ${otherCompanyCreate.status}`);

  // 3. Une autre entreprise ne peut pas modifier ce paiement.
  const otherCompanyPatch = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(otherCompanyToken),
      body: JSON.stringify({ status: "PENDING" }),
    },
  );
  assert.ok([403, 404].includes(otherCompanyPatch.status), `attendu 403/404, reçu ${otherCompanyPatch.status}`);

  // 4. Le créateur ne peut pas s'attribuer lui-même le statut payé.
  const creatorPatch = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(creatorToken),
      body: JSON.stringify({ status: "PENDING" }),
    },
  );
  assert.equal(creatorPatch.status, 403, `attendu 403, reçu ${creatorPatch.status}`);

  // 5. Le créateur peut consulter les paiements de la collaboration.
  const creatorGet = await fetch(
    `${API_BASE_URL}/api/payments/collaborations/${collaborationId}`,
    { headers: authHeaders(creatorToken) },
  );
  assert.equal(creatorGet.status, 200);

  // 6. Transition interdite : PLANNED -> PAID directement.
  const skipPending = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(companyToken),
      body: JSON.stringify({ status: "PAID" }),
    },
  );
  assert.equal(skipPending.status, 409, `attendu 409, reçu ${skipPending.status}`);

  // 7. L'entreprise déclare PENDING.
  const toPending = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(companyToken),
      body: JSON.stringify({ status: "PENDING" }),
    },
  );
  assert.equal(toPending.status, 200);
  const pendingData = await toPending.json();
  assert.equal(pendingData.payment.status, "PENDING");

  // 8. Deux PATCH concurrents vers PAID : un seul peut aboutir.
  const [p1, p2] = await Promise.all([
    fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
      method: "PATCH",
      headers: authHeaders(companyToken),
      body: JSON.stringify({ status: "PAID" }),
    }),
    fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
      method: "PATCH",
      headers: authHeaders(companyToken),
      body: JSON.stringify({ status: "PAID" }),
    }),
  ]);

  const concurrentStatuses = [p1.status, p2.status].sort();
  const paidCount = concurrentStatuses.filter((s) => s === 200).length;
  const conflictCount = concurrentStatuses.filter((s) => s === 409).length;

  assert.equal(paidCount, 1, `Un seul PATCH vers PAID peut réussir : ${JSON.stringify(concurrentStatuses)}`);
  assert.equal(conflictCount, 1);

  // 9. La valeur finale est bien PAID.
  const finalGet = await fetch(
    `${API_BASE_URL}/api/payments/collaborations/${collaborationId}`,
    { headers: authHeaders(creatorToken) },
  );
  const finalData = await finalGet.json();
  const finalPayment = finalData.payments?.find((p) => p.id === paymentId);
  assert.ok(finalPayment);
  assert.equal(finalPayment.status, "PAID");
  assert.ok(finalPayment.paidAt);

  // 10. Transition impossible depuis PAID (terminal).
  const afterPaid = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(companyToken),
      body: JSON.stringify({ status: "PENDING" }),
    },
  );
  assert.equal(afterPaid.status, 409);
});
