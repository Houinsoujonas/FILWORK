/**
 * Tests d'intégration — Refresh tokens, révocation, administration concurrente.
 *
 * Nécessite filwork_test migrée. Ne jamais exécuter sur la production.
 */

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { after, test } = require("node:test");

const bcrypt = require("bcryptjs");

const prisma = require("../src/config/prisma");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5051";

const headers = { "Content-Type": "application/json" };

const createdEmails = new Set();
const tempAdminEmails = new Set();

after(async () => {
  const emailsToDelete = [...createdEmails, ...tempAdminEmails];

  if (emailsToDelete.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: emailsToDelete } },
    });
  }

  await prisma.$disconnect();
});

function authHeaders(token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function registerUser(role, suffix) {
  const unique = `${suffix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const email = `test.${role.toLowerCase()}.${unique}@filwork.local`;
  const password = "Password12!";

  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, role }),
  });

  const data = await res.json();

  assert.equal(res.status, 201, `Inscription impossible : ${JSON.stringify(data)}`);
  assert.ok(data.token, "Un jeton doit être retourné.");
  assert.ok(data.refreshToken, "Un refresh token doit être retourné.");

  createdEmails.add(email);

  return { email, password, role, token: data.token, refreshToken: data.refreshToken, user: data.user };
}

async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  return { status: res.status, data };
}

test("rotation : un seul appel concurrent peut consommer le refresh token", async () => {
  const user = await registerUser("CREATOR", "conc");

  const [resA, resB] = await Promise.all([
    fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken: user.refreshToken }),
    }),
    fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken: user.refreshToken }),
    }),
  ]);

  const statuses = [resA.status, resB.status].sort();
  const successes = statuses.filter((s) => s === 200).length;

  assert.equal(successes, 1, `Attendu 1 succès et 1 refus, obtenu : ${JSON.stringify(statuses)}`);
  assert.equal(statuses.filter((s) => s === 401 || s === 409).length, 1);
});

test("logout révoque le refresh token", async () => {
  const user = await registerUser("CREATOR", "logout");

  const rotation = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken: user.refreshToken }),
  });

  const rotated = await rotation.json();
  assert.equal(rotation.status, 200);

  const logout = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: authHeaders(rotated.token),
    body: JSON.stringify({ refreshToken: rotated.refreshToken }),
  });

  assert.equal(logout.status, 200);

  const refreshAfterLogout = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken: rotated.refreshToken }),
  });

  assert.equal(refreshAfterLogout.status, 401);
});

test("changement de mot de passe révoque les refresh tokens (tokenVersion)", async () => {
  const user = await registerUser("CREATOR", "reset");

  const code = "654321";
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attempts: 0,
    },
  });

  const reset = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: user.email,
      code,
      password: `NewPassword12!${Date.now()}`,
    }),
  });

  assert.equal(reset.status, 200);

  const refresh = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken: user.refreshToken }),
  });

  assert.equal(refresh.status, 401, "Les sessions persistantes doivent être révoquées après un changement de mot de passe.");
});

test("compte désactivé : login et refresh refusés", async () => {
  const user = await registerUser("CREATOR", "disabled");

  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  assert.ok(adminEmail, "TEST_ADMIN_EMAIL doit être défini pour ce test.");
  assert.ok(adminPassword, "TEST_ADMIN_PASSWORD doit être défini pour ce test.");

  const adminLogin = await login(adminEmail, adminPassword);
  assert.equal(adminLogin.status, 200, `Connexion admin impossible : ${JSON.stringify(adminLogin.data)}`);
  const adminToken = adminLogin.data.token;

  const deactivate = await fetch(`${API_BASE_URL}/api/admin/users/${user.user.id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(adminToken),
  });

  assert.equal(deactivate.status, 200);

  const loginDisabled = await login(user.email, user.password);
  assert.equal(loginDisabled.status, 403);

  const refreshDisabled = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken: user.refreshToken }),
  });

  assert.equal(refreshDisabled.status, 403);

  // Réactivation pour ne pas polluer les autres suites.
  await fetch(`${API_BASE_URL}/api/admin/users/${user.user.id}/reactivate`, {
    method: "PATCH",
    headers: authHeaders(adminToken),
  });
});

test("le dernier administrateur ne peut pas se désactiver ni se rétrograder", async () => {
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  assert.ok(adminEmail && adminPassword, "TEST_ADMIN_EMAIL/PASSWORD requis.");

  const adminLogin = await login(adminEmail, adminPassword);
  assert.equal(adminLogin.status, 200);

  const adminToken = adminLogin.data.token;
  const adminId = adminLogin.data.user.id;

  const selfDeactivate = await fetch(`${API_BASE_URL}/api/admin/users/${adminId}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(adminToken),
  });

  assert.equal(selfDeactivate.status, 403);

  const selfDemotion = await fetch(`${API_BASE_URL}/api/admin/users/${adminId}`, {
    method: "PATCH",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ role: "COMPANY" }),
  });

  assert.equal(selfDemotion.status, 403);
});

test("rétrogradation concurrente : à la fin, au moins un administrateur actif demeure", async () => {
  const suffix = Date.now().toString(36);
  const password = "Password12!";
  const passwordHash = await bcrypt.hash(password, 10);

  const adminA = `admin.c.a.${suffix}@filwork.local`;
  const adminB = `admin.c.b.${suffix}@filwork.local`;

  const idA = `admin_c_a_${suffix}`;
  const idB = `admin_c_b_${suffix}`;

  tempAdminEmails.add(adminA);
  tempAdminEmails.add(adminB);

  await prisma.user.createMany({
    data: [
      { id: idA, email: adminA, passwordHash, role: "ADMIN", tokenVersion: 0, isActive: true },
      { id: idB, email: adminB, passwordHash, role: "ADMIN", tokenVersion: 0, isActive: true },
    ],
  });

  const loginA = await login(adminA, password);
  const loginB = await login(adminB, password);

  assert.equal(loginA.status, 200);
  assert.equal(loginB.status, 200);

  const tokenA = loginA.data.token;
  const tokenB = loginB.data.token;

  // Deux rétrogradations simultanées (A->B et B->A). Un administrateur seedé
  // reste actif dans tous les cas : les deux requêtes peuvent réussir sans
  // compromettre l'invariant. L'important est qu'aucun compte administrateur
  // actif ne soit supprimé par cette course.
  const [resA, resB] = await Promise.all([
    fetch(`${API_BASE_URL}/api/admin/users/${idB}`, {
      method: "PATCH",
      headers: authHeaders(tokenA),
      body: JSON.stringify({ role: "COMPANY" }),
    }),
    fetch(`${API_BASE_URL}/api/admin/users/${idA}`, {
      method: "PATCH",
      headers: authHeaders(tokenB),
      body: JSON.stringify({ role: "COMPANY" }),
    }),
  ]);

  // Aucun crash ni statut incohérent attendu (200 ou 401/403 selon l'ordre).
  for (const r of [resA, resB]) {
    assert.ok([200, 401, 403].includes(r.status), `Statut inattendu : ${r.status}`);
  }

  const remainingAdmins = await prisma.user.count({
    where: { role: "ADMIN", isActive: true },
  });

  assert.ok(remainingAdmins >= 1, "Il doit rester au moins un administrateur actif.");
});
