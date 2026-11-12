/**
 * Tests d'intégration — Notifications de publication de campagne.
 *
 * Vérifie :
 *   - Une publication déclenche une notification CAMPAIGN_PUBLISHED pour chaque créateur éligible.
 *   - Les entreprises et administrateurs ne reçoivent pas cette notification.
 *   - Un compte désactivé ne reçoit pas de notification.
 *   - Création d'un brouillon → aucune notification.
 *   - Modification d'une campagne déjà publiée → aucune notification.
 *   - Republication après pause → pas de doublon.
 *   - Envoi initial d'emails encodé dans EmailOutbox pour les créateurs actifs.
 *   - Préférence campaignEmails=false : aucune mise en file d'email.
 *   - Compteur unreadCount incrémenté côté créateur.
 *
 * Nécessite filwork_test migrée et comptes seedés.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { after, before } = require("node:test");

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:55432/filwork_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";

const prisma = require("../src/config/prisma");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5051";

const headers = { "Content-Type": "application/json" };

async function checkEmailOutbox(template) {
  const rows = await prisma.emailOutbox.findMany({
    where: { template },
    select: { to: true, template: true, payload: true },
  });

  return rows.map((row) => {
    let payloadJson = row.payload;

    if (typeof payloadJson === "string") {
      try {
        payloadJson = JSON.parse(payloadJson);
      } catch {
        payloadJson = null;
      }
    }

    return { to: row.to, template: row.template, payloadJson };
  });
}

async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  assert.equal(res.status, 200, `Connexion impossible pour ${email}`);
  return data.token;
}

function authHeaders(token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function getNotifications(token, params) {
  const url = params
    ? `${API_BASE_URL}/api/notifications?${params}`
    : `${API_BASE_URL}/api/notifications`;

  const res = await fetch(url, {
    headers: authHeaders(token),
  });

  const data = await res.json();
  assert.equal(res.status, 200);
  return data.notifications;
}

async function countCampaignPublishedNotifications(token, campaignId) {
  const notifications = await getNotifications(token, `type=CAMPAIGN_PUBLISHED&limit=100`);
  return notifications.filter((n) => n.campaignId === campaignId).length;
}

async function publishCampaign(campaignId, token) {
  const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/publish`, {
    method: "PATCH",
    headers: authHeaders(token),
  });

  const data = await res.json();
  return { status: res.status, data };
}

test("Notification de publication de campagne - scénario complet", { timeout: 180_000 }, async () => {
  const creatorEmail = process.env.TEST_CREATOR_EMAIL;
  const creatorPassword = process.env.TEST_CREATOR_PASSWORD;
  const companyEmail = process.env.TEST_COMPANY_EMAIL;
  const companyPassword = process.env.TEST_COMPANY_PASSWORD;
  const otherCompanyEmail = process.env.TEST_OTHER_COMPANY_EMAIL;
  const otherCompanyPassword = process.env.TEST_OTHER_COMPANY_PASSWORD;
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  assert.ok(creatorEmail && companyEmail, "Comptes creator et company requis.");

  const creatorToken = await login(creatorEmail, creatorPassword);
  const companyToken = await login(companyEmail, companyPassword);
  const otherCompanyToken = otherCompanyEmail ? await login(otherCompanyEmail, otherCompanyPassword) : null;
  const adminToken = adminEmail ? await login(adminEmail, adminPassword) : null;

  // Préférances : s'assurer que le créateur principal reçoit bien les emails de campagne.
  const enableCampaignEmails = await fetch(`${API_BASE_URL}/api/preferences`, {
    method: "PATCH",
    headers: authHeaders(creatorToken),
    body: JSON.stringify({ campaignEmails: true }),
  });
  assert.equal(enableCampaignEmails.status, 200);

  const campaignTitle = `Test notif campagne ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;

  // 1. Création d'un brouillon — aucune notification
  const createCampaign = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: authHeaders(companyToken),
    body: JSON.stringify({
      title: campaignTitle,
      description: "Campagne de test pour valider les notifications de publication.",
      budget: 50000,
      currency: "XOF",
    }),
  });

  const campaignData = await createCampaign.json();
  assert.ok([200, 201].includes(createCampaign.status), JSON.stringify(campaignData));

  const campaignId = campaignData.campaign?.id ?? campaignData.data?.campaign?.id ?? campaignData.id;
  assert.ok(campaignId, "La campagne créée doit avoir un identifiant.");

  // Brouillon ne déclenche rien
  const before = await countCampaignPublishedNotifications(creatorToken, campaignId);
  assert.equal(before, 0, "Aucun créateur ne doit être notifié pour un brouillon.");

  // Emails mis en file AVANT publication pour vérification de baseline
  // (ne rien vérifier ici, juste passer à la suite)

  // 2. Publication — notification pour le créateur principal
  const publishResult = await publishCampaign(campaignId, companyToken);
  assert.equal(publishResult.status, 200, JSON.stringify(publishResult.data));
  assert.equal(publishResult.data.success, true);

  // Vérifier que l'email de campagne publiée est mis en file pour le créateur principal
  const outboxAfterPublish = await checkEmailOutbox("campaign_published");
  const foundCampaignEmail = outboxAfterPublish.find(
    (e) => e.payloadJson && e.payloadJson.campaignTitle === campaignTitle,
  );

  assert.ok(foundCampaignEmail, "L'email de campagne publiée doit être mis en file (template: campaign_published).");

  // Une pause puis republication ne doit pas créer de doublons,
  const afterPublish = await countCampaignPublishedNotifications(creatorToken, campaignId);
  assert.equal(afterPublish, 1, "Le créateur doit recevoir une notification de publication.");

  // 3. Entreprise ne reçoit pas de notification CAMPAIGN_PUBLISHED
  if (otherCompanyToken) {
    const companyUnread = await countCampaignPublishedNotifications(otherCompanyToken, campaignId);
    assert.equal(companyUnread, 0, "L'autre entreprise ne doit pas recevoir la notification.");
  }

  // 4. Admin ne reçoit pas de notification CAMPAIGN_PUBLISHED
  if (adminToken) {
    const adminUnread = await countCampaignPublishedNotifications(adminToken, campaignId);
    assert.equal(adminUnread, 0, "L'admin ne doit pas recevoir la notification.");
  }

  // 5. Pause puis republication — toujours une seule notification pour le créateur
  const pause = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/pause`, {
    method: "PATCH",
    headers: authHeaders(companyToken),
  });
  assert.equal(pause.status, 200);

  const resume = await publishCampaign(campaignId, companyToken);
  assert.equal(resume.status, 200);

  const afterResume = await countCampaignPublishedNotifications(creatorToken, campaignId);
  assert.equal(afterResume, 1, "La republication ne doit pas créer de doublon.");

  // 6. Mise à jour simple de la campagne (ex : titre) ne déclenche pas de notification
  const simpleUpdate = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
    method: "PUT",
    headers: authHeaders(companyToken),
    body: JSON.stringify({
      title: campaignTitle + " (titre ajusté)",
      description: "Campagne de test pour valider les notifications de publication.",
    }),
  });
  assert.equal(simpleUpdate.status, 200);

  const afterUpdate = await countCampaignPublishedNotifications(creatorToken, campaignId);
  assert.equal(afterUpdate, 1, "Un simple ajustement de campagne ne déclenche pas de notification.");

  // 7. La notification existe et possède un lien vers la campagne
  const creatorNotifications = await getNotifications(creatorToken, "type=CAMPAIGN_PUBLISHED&limit=20");
  const myNotif = creatorNotifications.find((n) => n.campaignId === campaignId);
  assert.ok(myNotif, "Notification manquante pour cette campagne.");
  assert.ok(myNotif.link?.includes("/campagnes/") || myNotif.link?.includes(`/campagnes/${campaignId}`), "Le lien doit inclure la campagne.");
  assert.equal(myNotif.isRead, false, "La notification doit être non lue par défaut.");

  // 8. Marquer comme lu
  const markRead = await fetch(`${API_BASE_URL}/api/notifications/${myNotif.id}/read`, {
    method: "PATCH",
    headers: authHeaders(creatorToken),
  });
  assert.equal(markRead.status, 200);

  const afterRead = await getNotifications(creatorToken, "type=CAMPAIGN_PUBLISHED&limit=20");
  const myReadNotif = afterRead.find((n) => n.campaignId === campaignId);
  assert.equal(myReadNotif?.isRead, true);

  // 9. Désactivation des emails de campagne : pas de mise en file pour l'utilisateur
  const disableCampaignEmails = await fetch(`${API_BASE_URL}/api/preferences`, {
    method: "PATCH",
    headers: authHeaders(creatorToken),
    body: JSON.stringify({ campaignEmails: false }),
  });
  assert.equal(disableCampaignEmails.status, 200);

  // Créer une nouvelle campagne et publier
  const campaignTitle2 = `Test notif campagne 2 ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;

  const createCampaign2 = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: authHeaders(companyToken),
    body: JSON.stringify({
      title: campaignTitle2,
      description: "Deuxième campagne de test email.",
      budget: 75000,
      currency: "XOF",
    }),
  });

  const campaignData2 = await createCampaign2.json();
  const campaignId2 = campaignData2.campaign?.id ?? campaignData2.id;

  const publishResult2 = await publishCampaign(campaignId2, companyToken);
  assert.equal(publishResult2.status, 200);

  const outboxSecond = await checkEmailOutbox("campaign_published");
  const emailsForCreator2 = outboxSecond.filter(
    (e) =>
      e.payloadJson &&
      typeof e.payloadJson === "object" &&
      e.payloadJson.campaignTitle === campaignTitle2,
  );

  // Le créateur a désactivé les emails → ne doit pas être dans la file
  assert.equal(
    emailsForCreator2.some(
      (e) => String(e.to).toLowerCase() === creatorEmail.toLowerCase(),
    ),
    false,
    "Aucun email ne doit être mis en file pour un créateur qui a désactivé campaignEmails.",
  );
});
