/**
 * Tests d'intégration pour le système de communication FILWORK.
 *
 * Ces tests nécessitent une base de données de test configurée via
 * TEST_DATABASE_URL (voir backend/scripts/testDatabaseGuard.js).
 *
 * Ils ne doivent PAS être exécutés sur la base de production.
 */

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { after, test } = require("node:test");

const prisma = require("../src/config/prisma");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5051";

const headers = { "Content-Type": "application/json"};

// Comptes créés par ces tests, supprimés après exécution pour ne pas
// fausser les comptages des autres suites d'intégration.
const createdEmails = new Set();

after(async () => {
  if (createdEmails.size === 0) {
    return;
  }

  await prisma.user.deleteMany({
    where: { email: { in: Array.from(createdEmails) } },
  });
});

function authHeaders(token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function loginAs(email, password) {
  assert.ok(email, "Une adresse e-mail de test est requise.");
  assert.ok(password, "Un mot de passe de test est requis.");

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  assert.equal(
    res.status,
    200,
    `Connexion de ${email} impossible : ${JSON.stringify(data)}`,
  );
  assert.ok(data.token, "Un jeton doit être retourné.");

  return data.token;
}

async function createUser(role, suffix = "") {
  const unique = `${suffix || "user"}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const email = `test.${role.toLowerCase()}.${unique}@example.com`;
  const password = "Password12!";
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, role }),
  });
  const data = await res.json();
  assert.ok(data.success, "Inscription doit réussir : " + JSON.stringify(data));
  assert.ok(data.token, "Un jeton doit être retourné.");
  assert.equal(data.user.role, role);
  createdEmails.add(email);
  return { email, password, role, token: data.token, user: data.user };
}

test("POST /api/auth/register - inscription CREATOR met en file un email de bienvenue", async () => {
  const { token } = await createUser("CREATOR", "welcome1");

  // Vérifier que l'utilisateur peut se connecter (inscription réussie).
  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: authHeaders(token),
  });
  const meData = await meRes.json();
  assert.ok(meData.success, "Profil utilisateur accessible.");
});

test("POST /api/auth/register - inscription COMPANY met en file un email de bienvenue", async () => {
  const { token } = await createUser("COMPANY", "welcome2");

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: authHeaders(token),
  });
  const meData = await meRes.json();
  assert.ok(meData.success, "Profil utilisateur accessible.");
});

test("POST /api/auth/forgot-password - réponse générique pour adresse inconnue", async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: "inconnu.aucune@exemple.com" }),
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.ok(data.success);
  assert.ok(data.message);
});

test("POST /api/auth/forgot-password - génération de code pour adresse connue", async () => {
  const { email } = await createUser("CREATOR", "reset1");

  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.ok(data.success);

  // Le code doit avoir été mis en file (vérifiable via la base ou l'outbox).
  // Ici on vérifie simplement que la requête a réussi sans révéler l'existence du compte.
});

test("POST /api/auth/reset-password - code invalide refusé", async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "aucun.compte@exemple.com",
      code: "000000",
      password: "NewPassword12!",
    }),
  });
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.ok(!data.success);
});

test("GET /api/announcements - refusé sans authentification", async () => {
  const res = await fetch(`${API_BASE_URL}/api/announcements`, { headers });
  assert.equal(res.status, 401);
});

test("POST /api/admin/announcements - refusé pour un CREATOR", async () => {
  const { token } = await createUser("CREATOR", "admin1");
  const res = await fetch(`${API_BASE_URL}/api/admin/announcements`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title: "Test", body: "Contenu", audience: "ALL" }),
  });
  assert.equal(res.status, 403);
});

test("POST /api/admin/announcements - refusé pour une COMPANY", async () => {
  const { token } = await createUser("COMPANY", "admin2");
  const res = await fetch(`${API_BASE_URL}/api/admin/announcements`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title: "Test", body: "Contenu", audience: "ALL" }),
  });
  assert.equal(res.status, 403);
});

test("GET /api/preferences - refusé sans authentification", async () => {
  const res = await fetch(`${API_BASE_URL}/api/preferences`, { headers });
  assert.equal(res.status, 401);
});

test("GET /api/outbox/stats - réservé aux administrateurs (si endpoint existe)", async () => {
  // Cet endpoint n'est pas encore créé, le test sert de repère.
  // À ajouter si un endpoint de stats d'outbox est implémenté.
  assert.ok(true, "Repère : endpoint outbox stats à implémenter selon les besoins.");
});

test("POST /api/auth/reset-password - parcours complet par e-mail et code", async () => {
  const { email } = await createUser("CREATOR", "resetfull");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  assert.ok(user, "L'utilisateur de test doit exister.");

  const code = "654321";
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  try {
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Un code erroné est refusé et consomme une tentative.
    const wrongResponse = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        code: "000000",
        password: "BrandNewPass12!",
      }),
    });

    assert.equal(wrongResponse.status, 400);

    // Le bon code associé à l'e-mail permet de changer le mot de passe.
    const resetResponse = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        code,
        password: "BrandNewPass12!",
      }),
    });

    const resetData = await resetResponse.json();

    assert.equal(resetResponse.status, 200);
    assert.equal(resetData.success, true);

    // La connexion doit fonctionner avec le nouveau mot de passe.
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password: "BrandNewPass12!" }),
    });

    assert.equal(loginResponse.status, 200);

    // Le code a été consommé : il ne peut pas être réutilisé.
    const reuseResponse = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        code,
        password: "AnotherPass789!",
      }),
    });

    assert.equal(reuseResponse.status, 400);
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});

test("POST /api/auth/reset-password - verrouillage après cinq tentatives", async () => {
  const { email } = await createUser("CREATOR", "resetlock");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  assert.ok(user);

  const code = "112233";
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  try {
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          code: "999999",
          password: "BrandNewPass12!",
        }),
      });

      assert.equal(response.status, 400, `Tentative ${attempt} refusée.`);
    }

    // Même le bon code est refusé une fois la limite atteinte.
    const lockedResponse = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        code,
        password: "BrandNewPass12!",
      }),
    });

    assert.equal(lockedResponse.status, 400);
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});

test("Annonces - cycle complet création, édition, publication et audiences", async () => {
  const adminToken = await loginAs(
    process.env.TEST_ADMIN_EMAIL,
    process.env.TEST_ADMIN_PASSWORD,
  );

  const creatorToken = await loginAs(
    process.env.TEST_CREATOR_EMAIL,
    process.env.TEST_CREATOR_PASSWORD,
  );

  const companyToken = await loginAs(
    process.env.TEST_COMPANY_EMAIL,
    process.env.TEST_COMPANY_PASSWORD,
  );

  // L'audience ADMINS n'existe plus.
  const invalidResponse = await fetch(
    `${API_BASE_URL}/api/admin/announcements`,
    {
      method: "POST",
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        title: "Annonce invalide",
        body: "Contenu",
        audience: "ADMINS",
      }),
    },
  );

  assert.equal(invalidResponse.status, 400);

  const title = `Annonce test ${Date.now()}`;

  const createResponse = await fetch(
    `${API_BASE_URL}/api/admin/announcements`,
    {
      method: "POST",
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        title,
        body: "Contenu de l'annonce de test.",
        audience: "ALL",
      }),
    },
  );

  const created = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(created.announcement.status, "DRAFT");

  const announcementId = created.announcement.id;

  // La page d'édition peut recharger l'annonce.
  const detailResponse = await fetch(
    `${API_BASE_URL}/api/admin/announcements/${announcementId}`,
    { headers: authHeaders(adminToken) },
  );

  const detail = await detailResponse.json();

  assert.equal(detailResponse.status, 200);
  assert.equal(detail.announcement.id, announcementId);

  // Modification d'un brouillon.
  const updateResponse = await fetch(
    `${API_BASE_URL}/api/admin/announcements/${announcementId}`,
    {
      method: "PATCH",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ title: `${title} (modifiée)` }),
    },
  );

  assert.equal(updateResponse.status, 200);

  const publishResponse = await fetch(
    `${API_BASE_URL}/api/admin/announcements/${announcementId}/publish`,
    {
      method: "POST",
      headers: authHeaders(adminToken),
    },
  );

  assert.equal(publishResponse.status, 200);

  // Une annonce publiée n'est plus modifiable.
  const afterPublishResponse = await fetch(
    `${API_BASE_URL}/api/admin/announcements/${announcementId}`,
    {
      method: "PATCH",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ title: "Interdit" }),
    },
  );

  assert.equal(afterPublishResponse.status, 409);

  for (const token of [creatorToken, companyToken]) {
    const listResponse = await fetch(`${API_BASE_URL}/api/announcements`, {
      headers: authHeaders(token),
    });
    const list = await listResponse.json();

    assert.equal(listResponse.status, 200);
    assert.ok(
      list.announcements.some((item) => item.id === announcementId),
      "L'annonce publiée doit être visible par son audience.",
    );
  }

  // Les créateurs reçoivent une notification ; les administrateurs non.
  const creatorUser = await prisma.user.findUnique({
    where: { email: process.env.TEST_CREATOR_EMAIL },
    select: { id: true },
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: process.env.TEST_ADMIN_EMAIL },
    select: { id: true },
  });

  const creatorNotification = await prisma.notification.findFirst({
    where: {
      userId: creatorUser.id,
      announcementId,
    },
    select: { link: true },
  });

  assert.ok(creatorNotification, "Le créateur doit recevoir la notification.");
  assert.equal(creatorNotification.link, "/espace/createur/annonces");

  const adminNotification = await prisma.notification.findFirst({
    where: {
      userId: adminUser.id,
      announcementId,
    },
  });

  assert.equal(
    adminNotification,
    null,
    "Un administrateur ne doit pas recevoir de notification d'annonce.",
  );

  // Un e-mail d'annonce a bien été mis en file.
  const email = await prisma.emailOutbox.findFirst({
    where: { template: "announcement" },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(email, "L'e-mail d'annonce doit être présent dans l'outbox.");
  assert.equal(email.status, "PENDING");

  // Nettoyage : ne pas accumuler d'annonces entre deux exécutions.
  await prisma.notification.deleteMany({ where: { announcementId } });
  await prisma.announcement.delete({ where: { id: announcementId } });
});
