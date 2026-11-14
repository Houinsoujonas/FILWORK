const assert = require("node:assert/strict");
const { after, test } = require("node:test");

const prisma = require("../src/config/prisma");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5051";
const headers = { "Content-Type": "application/json" };
const createdEmails = new Set();

function authHeaders(token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function registerCreator(label) {
  const suffix = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const email = `test.creator.${suffix}@filwork.local`;
  const password = "Password12!";
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, role: "CREATOR" }),
  });
  const body = await response.json();

  assert.equal(response.status, 201, JSON.stringify(body));
  createdEmails.add(email);

  return { email, token: body.token, user: body.user };
}

async function createProfile(token, displayName) {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ displayName }),
  });

  assert.equal(response.status, 200, "La création du profil créateur a échoué.");
}

after(async () => {
  if (createdEmails.size > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: [...createdEmails] } },
    });
  }

  await prisma.$disconnect();
});

test("un créateur ne peut ni modifier ni supprimer les réseaux et réalisations d'un autre créateur", async () => {
  const owner = await registerCreator("owner-content");
  const attacker = await registerCreator("attacker-content");

  await createProfile(owner.token, "Créateur propriétaire");
  await createProfile(attacker.token, "Créateur tiers");

  const socialResponse = await fetch(`${API_BASE_URL}/api/profile/me/socials`, {
    method: "POST",
    headers: authHeaders(owner.token),
    body: JSON.stringify({
      platform: "INSTAGRAM",
      profileUrl: "https://instagram.com/owner-content",
    }),
  });
  const socialBody = await socialResponse.json();
  assert.equal(socialResponse.status, 201, JSON.stringify(socialBody));

  const portfolioResponse = await fetch(`${API_BASE_URL}/api/profile/me/portfolio`, {
    method: "POST",
    headers: authHeaders(owner.token),
    body: JSON.stringify({
      title: "Réalisation propriétaire",
      type: "IMAGE",
      url: "https://example.invalid/owner-content.png",
    }),
  });
  const portfolioBody = await portfolioResponse.json();
  assert.equal(portfolioResponse.status, 201, JSON.stringify(portfolioBody));

  for (const request of [
    {
      method: "PUT",
      path: `/api/profile/me/socials/${socialBody.social.id}`,
      body: { profileUrl: "https://instagram.com/attacker" },
    },
    {
      method: "DELETE",
      path: `/api/profile/me/socials/${socialBody.social.id}`,
    },
    {
      method: "PUT",
      path: `/api/profile/me/portfolio/${portfolioBody.item.id}`,
      body: { title: "Réalisation détournée" },
    },
    {
      method: "DELETE",
      path: `/api/profile/me/portfolio/${portfolioBody.item.id}`,
    },
  ]) {
    const response = await fetch(`${API_BASE_URL}${request.path}`, {
      method: request.method,
      headers: authHeaders(attacker.token),
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    assert.equal(response.status, 404, `${request.method} ${request.path}`);
  }

  const ownerSocials = await fetch(`${API_BASE_URL}/api/profile/me/socials`, {
    headers: authHeaders(owner.token),
  });
  const ownerPortfolio = await fetch(`${API_BASE_URL}/api/profile/me/portfolio`, {
    headers: authHeaders(owner.token),
  });

  const ownerSocialsBody = await ownerSocials.json();
  const ownerPortfolioBody = await ownerPortfolio.json();
  assert.equal(ownerSocialsBody.socials[0].profileUrl, "https://instagram.com/owner-content");
  assert.equal(ownerPortfolioBody.items[0].title, "Réalisation propriétaire");

  const notification = await prisma.notification.create({
    data: {
      userId: owner.user.id,
      type: "ANNOUNCEMENT",
      title: "Notification propriétaire",
      message: "Cette notification ne doit pas être modifiée par un tiers.",
    },
  });

  const foreignNotification = await fetch(
    `${API_BASE_URL}/api/notifications/${notification.id}/read`,
    {
      method: "PATCH",
      headers: authHeaders(attacker.token),
    },
  );
  assert.equal(foreignNotification.status, 404);

  const unchangedNotification = await prisma.notification.findUnique({
    where: { id: notification.id },
    select: { isRead: true, readAt: true },
  });
  assert.equal(unchangedNotification.isRead, false);
  assert.equal(unchangedNotification.readAt, null);
});
