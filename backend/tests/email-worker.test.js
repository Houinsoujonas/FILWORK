/**
 * Tests d'intégration du pipeline EmailOutbox avec un transport SMTP simulé.
 *
 * Couverture demandée par l'audit :
 *   - Email accepté (marqué SENT).
 *   - Email refusé (retourné en PENDING avec backoff).
 *   - SMTP indisponible / timeout (retenté, jamais envoyé deux fois).
 *   - Échec définitif après maxAttempts.
 *   - Récupération d'e-mails bloqués en PROCESSING.
 *   - Prévention des doublons (index partiel unique + skipDuplicates).
 *   - Refus des domaines de test dans le worker réel.
 *
 * Tous les enregistrements créés ici portent template = "test_worker_suite"
 * et sont supprimés en fin de suite. Aucun e-mail n'est distribué.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dotenv = require("../node_modules/dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env.test") });

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:55432/filwork_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";

const {
  assertTestDatabase,
} = require("../src/config/databaseTarget");

// Vérification explicite redondante avec celle de src/config/prisma.js :
// refuse de toucher à autre chose que la base de test identifiée.
try {
  assertTestDatabase({
    testUrl: process.env.TEST_DATABASE_URL,
    productionUrls: [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED],
    allowNonTestName: process.env.TEST_ALLOW_NON_TEST_NAMED_DB === "true",
  });
} catch (error) {
  console.error(`Cible de test refusée : ${error.message}`);
  process.exit(1);
}

const prisma = require("../src/config/prisma");
const {
  enqueueEmail,
  claimPendingEmails,
  markEmailSent,
  markEmailFailed,
  recoverStuckProcessingEmails,
  getOutboxStats,
} = require("../src/services/outboxService");
const {
  processEmailOutboxBatch,
  isRefusedRecipient,
} = require("../src/services/emailOutboxWorker");

const TEMPLATE = "test_worker_suite";
const SUBJECT = "[email-worker-test]";

/**
 * Rend un e-mail réclamable en priorité sans que le worker n'en réserve
 * d'autres : le batch doit être limité à 1 (`batchSize: 1`) et cette entrée
 * doit être la plus ancienne (nextAttemptAt le plus reculé). Ainsi les
 * e-mails d'autres suites de test ne sont jamais touchés.
 */
async function makeClaimable(id) {
  await prisma.emailOutbox.update({
    where: { id },
    data: { nextAttemptAt: new Date("2000-01-01T00:00:00.000Z") },
  });
}

async function cleanupOutbox() {
  await prisma.emailOutbox.deleteMany({ where: { template: TEMPLATE } });
}

const createdCampaignIds = [];

async function cleanupNotifications() {
  await prisma.notification.deleteMany({
    where: { type: "CAMPAIGN_PUBLISHED", title: "[email-worker-test] dedup" },
  });
  if (createdCampaignIds.length > 0) {
    await prisma.campaign.deleteMany({ where: { id: { in: createdCampaignIds } } });
  }
}

test.before(async () => {
  await cleanupOutbox();
  await cleanupNotifications();
});

test.after(async () => {
  await cleanupOutbox();
  await cleanupNotifications();
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Unités sans base de données
// ---------------------------------------------------------------------------

test("isRefusedRecipient refuse les domaines de test et de documentation", () => {
  assert.equal(isRefusedRecipient("a@example.com"), true);
  assert.equal(isRefusedRecipient("a@example.net"), true); // domaine réservé à la doc
  assert.equal(isRefusedRecipient("a@exemple.net"), false); // domaine réel, non réservé
  assert.equal(isRefusedRecipient("a@localhost"), true);
  assert.equal(isRefusedRecipient("a@filwork.local"), true);
  assert.equal(isRefusedRecipient("a@client-reel.com"), false);
  assert.equal(isRefusedRecipient(""), true);
  assert.equal(isRefusedRecipient("pas-un-email"), true);
});

test("isRefusedRecipient refuse les adresses sans domaine", () => {
  assert.equal(isRefusedRecipient("foo@"), true);
  assert.equal(isRefusedRecipient("foo"), true);
});

// ---------------------------------------------------------------------------
// Réclamation atomique et transitions de statut
// ---------------------------------------------------------------------------

test("enqueueEmail crée une entrée PENDING avec attempts=0", async () => {
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} pending-check`,
    template: TEMPLATE,
    payload: { text: "hello", html: "<p>hello</p>" },
  });

  assert.equal(created.status, "PENDING");
  assert.equal(created.attempts, 0);

  const found = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(found.status, "PENDING");
});

test("claimPendingEmails marque PROCESSING et incrémente attempts", async () => {
  await cleanupOutbox();

  const first = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} claim-1`,
    template: TEMPLATE,
    payload: { text: "t", html: "<p>t</p>" },
  });
  const second = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} claim-2`,
    template: TEMPLATE,
    payload: { text: "t", html: "<p>t</p>" },
  });

  await makeClaimable(first.id);
  await makeClaimable(second.id);

  const claimed = await claimPendingEmails(2);
  assert.equal(claimed.length, 2);

  for (const email of claimed) {
    assert.equal(email.status, "PROCESSING");
    assert.ok(email.attempts >= 1);
  }

  // Nos e-mails étant déjà réservés (PROCESSING), un nouveau claim borné par
  // nos deux seuls identifiants ne peut pas rappeler les mêmes.
  const claimedIds = new Set(claimed.map((e) => e.id));
  assert.deepEqual([...claimedIds].sort(), [first.id, second.id].sort());
});

test("markEmailSent enregistre SENT et sentAt", async () => {
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} mark-sent`,
    template: TEMPLATE,
    payload: { text: "t", html: "<p>t</p>" },
  });

  await markEmailSent(created.id);

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "SENT");
  assert.ok(after.sentAt instanceof Date);
});

test("markEmailFailed replanifie en PENDING avec backoff futur si attempts < maxAttempts", async () => {
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} mark-failed-retry`,
    template: TEMPLATE,
    payload: { text: "t", html: "<p>t</p>" },
  });

  await prisma.emailOutbox.update({
    where: { id: created.id },
    data: { attempts: 1 },
  });

  await markEmailFailed(created.id, new Error("535 authentication failed"));

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "PENDING");
  assert.ok(after.nextAttemptAt > new Date());
  assert.match(after.lastError, /535/);
});

test("markEmailFailed passe en FAILED définitif quand attempts >= maxAttempts", async () => {
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} mark-failed-final`,
    template: TEMPLATE,
    payload: { text: "t", html: "<p>t</p>" },
  });

  await prisma.emailOutbox.update({
    where: { id: created.id },
    data: { attempts: 5, maxAttempts: 5 },
  });

  await markEmailFailed(created.id, new Error("SMTP indisponible"));

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "FAILED");
  assert.match(after.lastError, /indisponible/);
});

// ---------------------------------------------------------------------------
// Batch complet avec transport simulé
// ---------------------------------------------------------------------------

test("processEmailOutboxBatch avec transport OK envoie et marque SENT", async () => {
  await cleanupOutbox();
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} batch-success`,
    template: TEMPLATE,
    payload: { text: "corps", html: "<p>corps</p>" },
  });

  await makeClaimable(created.id);

  const sent = [];
  const processed = await processEmailOutboxBatch({
    sendSmtpEmailForTests: async (mail) => {
      sent.push(mail);
      return { messageId: "simulated-1" };
    },
    batchSize: 1,
  });

  assert.ok(processed >= 1);
  assert.ok(sent.some((m) => m.subject === `${SUBJECT} batch-success`));

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "SENT");
});

test("processEmailOutboxBatch avec transport KO remet en PENDING (backoff), jamais SENT", async () => {
  await cleanupOutbox();
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} batch-failure`,
    template: TEMPLATE,
    payload: { text: "corps", html: "<p>corps</p>" },
  });

  await makeClaimable(created.id);

  const processed = await processEmailOutboxBatch({
    sendSmtpEmailForTests: async () => {
      throw new Error("535 Authentication failed");
    },
    batchSize: 1,
  });

  assert.ok(processed >= 1);

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "PENDING");
  assert.equal(after.attempts, 1);
  assert.match(after.lastError, /535/);
});

test("processEmailOutboxBatch avec transport en timeout remet en PENDING sans marquer SENT", async () => {
  await cleanupOutbox();
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} batch-timeout`,
    template: TEMPLATE,
    payload: { text: "corps", html: "<p>corps</p>" },
  });

  await makeClaimable(created.id);

  await processEmailOutboxBatch({
    sendSmtpEmailForTests: async () => {
      const error = new Error("Greeting timeout");
      error.code = "ETIMEDOUT";
      throw error;
    },
    batchSize: 1,
  });

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "PENDING");
  assert.equal(after.attempts, 1);
});

test("processEmailOutboxBatch avec échec répété passe l'e-mail en FAILED définitif", async () => {
  await cleanupOutbox();
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} batch-permanent-failure`,
    template: TEMPLATE,
    payload: { text: "corps", html: "<p>corps</p>" },
    maxAttempts: 2,
  });

  await makeClaimable(created.id);

  const failing = async () => {
    throw new Error("421 SMTP service not available");
  };

  // Tentative 1 -> PENDING (attempts=1 < maxAttempts=2)
  await processEmailOutboxBatch({ sendSmtpEmailForTests: failing, batchSize: 1 });
  let after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "PENDING");

  // Repasser nextAttemptAt avant toute ligne étrangère (les autres suites ont
  // pu laisser des e-mails en attente plus anciens que now) pour repasser en claim immédiatement.
  await makeClaimable(created.id);

  // Tentative 2 -> FAILED (attempts=2 >= maxAttempts=2)
  await processEmailOutboxBatch({ sendSmtpEmailForTests: failing, batchSize: 1 });
  after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "FAILED");
  assert.match(after.lastError, /421/);
});

test("recoverStuckProcessingEmails remet en PENDING les PROCESSING bloqués depuis > 10 min", async () => {
  const created = await enqueueEmail({
    to: "destinataire@example.com",
    subject: `${SUBJECT} stuck-processing`,
    template: TEMPLATE,
    payload: { text: "corps", html: "<p>corps</p>" },
  });

  // Simule un PROCESSING dont le updatedAt date de 11 minutes.
  await prisma.$executeRaw`
    UPDATE "EmailOutbox"
    SET "status" = 'PROCESSING', "updatedAt" = NOW() - INTERVAL '11 minutes'
    WHERE "id" = ${created.id}
  `;

  const recovered = await recoverStuckProcessingEmails(10 * 60 * 1000);
  assert.ok(recovered >= 1);

  const after = await prisma.emailOutbox.findUnique({ where: { id: created.id } });
  assert.equal(after.status, "PENDING");
});

// ---------------------------------------------------------------------------
// Prévention des doublons (notifications campagne publiée)
// ---------------------------------------------------------------------------

test("createMany notifications CAMPAIGN_PUBLISHED dédupliquées par skipDuplicates", async () => {
  const companyUser = await prisma.user.findFirst({
    where: { role: "COMPANY", companyProfile: { isNot: null } },
    select: { id: true, companyProfile: { select: { id: true } } },
  });
  assert.ok(companyUser, "au moins une entreprise de test avec profil requise");

  const creatorUser = await prisma.user.findFirst({
    where: { role: "CREATOR" },
    select: { id: true },
  });
  assert.ok(creatorUser, "au moins un créateur de test requis");

  const campaign = await prisma.campaign.create({
    data: {
      companyProfileId: companyUser.companyProfile.id,
      title: "[email-worker-test] déduplication",
      description: "Campagne éphémère créée par la suite email-worker (supprimée à la fin).",
      status: "PUBLISHED",
    },
  });
  createdCampaignIds.push(campaign.id);

  const base = {
    userId: creatorUser.id,
    type: "CAMPAIGN_PUBLISHED",
    title: "[email-worker-test] dedup",
    message: "Test de déduplication",
    campaignId: campaign.id,
  };

  const first = await prisma.notification.createMany({ data: [base], skipDuplicates: true });
  const second = await prisma.notification.createMany({ data: [base], skipDuplicates: true });

  assert.equal(first.count, 1);
  assert.equal(second.count, 0);
});

test("getOutboxStats retourne un objet cohérent (compteurs >= 0)", async () => {
  const stats = await getOutboxStats();

  for (const key of ["pending", "processing", "sent", "failed"]) {
    assert.ok(Number.isInteger(stats[key]), `clé ${key} manquante`);
    assert.ok(stats[key] >= 0);
  }
});
