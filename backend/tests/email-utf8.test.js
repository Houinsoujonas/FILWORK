"use strict";

/**
 * Tests de non-régression UTF-8 (sans DB, sans SMTP réel, sans envoi).
 *
 * - Vérifie la conservation exacte des caractères Unicode dans les contenus e-mail.
 * - Vérifie la transmission jusqu'au transport simulé (sendMail injecté) sans DB.
 *
 * Exécution (recommandée, fichier UTF-8) :
 *   node --test tests/email-utf8.test.js
 * Ne pas utiliser de here-string PowerShell pipé vers Node pour des contenus Unicode.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";

// Phrase de contrôle exacte imposée par la mission.
const PHRASE = "Vérification UTF-8 : pièce, réception, étudiant, à bientôt — FILWORK.";
// Variante incluant explicitement tous les caractères obligatoires (é, è, à, ç, —).
const RICH = "Vérification UTF-8 : pièce, réception, étudiant, garçon, à bientôt — FILWORK.";

const CODE_POINTS = {
  "é": 0x00e9,
  "è": 0x00e8,
  "à": 0x00e0,
  "ç": 0x00e7,
  "—": 0x2014,
};

function assertNoCorruption(value, label) {
  assert.equal(typeof value, "string", `${label} doit être une chaîne`);
  assert.ok(!value.includes("\uFFFD"), `${label} ne doit pas contenir U+FFFD`);
  assert.ok(!value.includes("?"), `${label} ne doit pas contenir '?' (corruption)`);
}

function assertContainsChars(value, chars, label) {
  for (const ch of chars) {
    const cp = CODE_POINTS[ch];
    const tag = cp ? `U+${cp.toString(16).toUpperCase().padStart(4, "0")}` : "U+????";
    assert.ok(value.includes(ch), `${label} doit contenir "${ch}" (${tag})`);
  }
}

function assertExact(value, expected, label) {
  assert.equal(value, expected, `${label} doit être conservé exactement`);
  const cps = (s) => Array.from(s).map((c) => c.codePointAt(0));
  assert.deepEqual(cps(value), cps(expected), `${label} : points de code identiques`);
}

// ---------------------------------------------------------------------------
// 1) Génération de contenus (emailTemplates) — pur, sans DB
// ---------------------------------------------------------------------------

test("UTF-8: emailTemplates conserve subject/text/html (accents, ç et tiret cadratin)", (t) => {
  // emailTemplates -> emailService -> outboxService -> prisma (config).
  // On stub les modules DB pour garantir zéro connexion/écriture PostgreSQL.
  const prismaPath = require.resolve("../src/config/prisma");
  const outboxPath = require.resolve("../src/services/outboxService");
  const servicePath = require.resolve("../src/services/emailService");
  const templatesPath = require.resolve("../src/services/emailTemplates");

  const originals = new Map();
  for (const p of [prismaPath, outboxPath, servicePath, templatesPath]) {
    if (require.cache[p]) originals.set(p, require.cache[p]);
  }

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: {},
  };
  require.cache[outboxPath] = {
    id: outboxPath,
    filename: outboxPath,
    loaded: true,
    exports: { enqueueEmail: async () => ({ id: "stub" }) },
  };
  delete require.cache[servicePath];
  delete require.cache[templatesPath];

  t.after(() => {
    for (const p of [prismaPath, outboxPath, servicePath, templatesPath]) {
      const orig = originals.get(p);
      if (orig) require.cache[p] = orig;
      else delete require.cache[p];
    }
  });

  const templates = require("../src/services/emailTemplates");
  const to = "destinataire@example.com";
  const title = RICH;
  const body = `Message : ${RICH}\nLigne : été, déjà, français, leçon.`;

  const announcement = templates.announcementEmail({
    to,
    displayName: "Étudiant",
    title,
    body,
    link: "https://example.com/à-bientôt",
  });

  for (const field of ["subject", "text", "html"]) {
    assertNoCorruption(announcement[field], `announcement.${field}`);
    assertContainsChars(announcement[field], ["é", "è", "à", "ç", "—"], `announcement.${field}`);
  }
  assert.ok(announcement.subject.includes(title), "announcement.subject doit contenir le titre exact");
  assert.ok(announcement.text.includes(body), "announcement.text doit contenir le corps");

  // Autres modèles avec entrées Unicode (prénoms, URL, textes).
  const welcome = templates.welcomeEmail({ to, displayName: "François — Été", role: "CREATOR" });
  assert.ok(welcome.text.includes("François — Été"), "welcome.text conserve le prénom et le tiret");
  assert.ok(welcome.html.includes("François — Été"), "welcome.html conserve le prénom et le tiret");
  assertNoCorruption(welcome.text, "welcome.text");
  assertNoCorruption(welcome.html, "welcome.html");

  const reset = templates.passwordResetCodeEmail({
    to,
    displayName: "Adèle",
    code: "123456",
    resetUrl: "https://example.com/réinitialisation",
  });
  assert.ok(reset.html.includes("Adèle"), "reset.html conserve le prénom accentué");
  assert.ok(reset.text.includes("Adèle"), "reset.text conserve le prénom accentué");
  assertNoCorruption(reset.html, "reset.html");

  const proposal = templates.collaborationProposalEmail({
    to,
    displayName: "Maëlys",
    companyName: "Société — Édition",
    campaignTitle: `Campagne ${RICH}`,
  });
  assertContainsChars(proposal.subject, ["é", "è", "à", "ç", "—"], "proposal.subject");
  assertContainsChars(proposal.text, ["é", "è", "à", "ç", "—"], "proposal.text");
  assertContainsChars(proposal.html, ["é", "è", "à", "ç", "—"], "proposal.html");
  assertNoCorruption(proposal.subject, "proposal.subject");
});

// ---------------------------------------------------------------------------
// 2) Transmission jusqu'au transport simulé (sendMail injecté) — sans DB
//    On simule outboxService pour éviter toute écriture/lecture PostgreSQL.
// ---------------------------------------------------------------------------

test("UTF-8: processEmailOutboxBatch transmet subject/text/html intacts au transport simulé", async (t) => {
  const workerPath = require.resolve("../src/services/emailOutboxWorker");
  const outboxPath = require.resolve("../src/services/outboxService");

  const originalWorker = require.cache[workerPath];
  const originalOutbox = require.cache[outboxPath];

  const subject = RICH;
  const text = RICH;
  const html = `<p>${RICH}</p>`;

  // Mock outboxService (aucune DB, aucun accès réseau).
  require.cache[outboxPath] = {
    id: outboxPath,
    filename: outboxPath,
    loaded: true,
    exports: {
      recoverStuckProcessingEmails: async () => 0,
      claimPendingEmails: async () => [
        {
          id: "email_utf8_test",
          to: "destinataire@example.com",
          subject,
          template: "manual_utf8_test",
          payload: { text, html },
          attempts: 1,
          maxAttempts: 5,
          status: "PROCESSING",
        },
      ],
      markEmailSent: async () => {},
      markEmailFailed: async () => {
        throw new Error("markEmailFailed ne doit pas être appelé");
      },
    },
  };

  delete require.cache[workerPath];

  t.after(() => {
    delete require.cache[workerPath];
    if (originalOutbox) require.cache[outboxPath] = originalOutbox;
    else delete require.cache[outboxPath];
    if (originalWorker) require.cache[workerPath] = originalWorker;
  });

  const { processEmailOutboxBatch } = require("../src/services/emailOutboxWorker");

  const sent = [];
  const processed = await processEmailOutboxBatch({
    sendSmtpEmailForTests: async (mail) => {
      sent.push({ ...mail });
      return { messageId: "simulated-utf8" };
    },
    batchSize: 1,
  });

  assert.equal(processed, 1, "un e-mail doit être traité");
  assert.equal(sent.length, 1, "un unique appel transport simulé");

  const mail = sent[0];
  assert.equal(mail.to, "destinataire@example.com");
  assertExact(mail.subject, subject, "transport.subject");
  assertExact(mail.text, text, "transport.text");
  assertExact(mail.html, html, "transport.html");

  for (const field of ["subject", "text", "html"]) {
    assertNoCorruption(mail[field], `transport.${field}`);
    assertContainsChars(mail[field], ["é", "è", "à", "ç", "—"], `transport.${field}`);
  }
});

// ---------------------------------------------------------------------------
// 3) Phrase de contrôle exacte (comparaison stricte + points de code)
// ---------------------------------------------------------------------------

test("UTF-8: phrase de contrôle exacte et points de code des caractères obligatoires", () => {
  const expected = "Vérification UTF-8 : pièce, réception, étudiant, à bientôt — FILWORK.";
  assertExact(PHRASE, expected, "PHRASE");
  assertNoCorruption(PHRASE, "PHRASE");

  // Caractères obligatoires à vérifier.
  assert.deepEqual(Array.from("é").map((c) => c.codePointAt(0)), [0x00e9]);
  assert.deepEqual(Array.from("è").map((c) => c.codePointAt(0)), [0x00e8]);
  assert.deepEqual(Array.from("à").map((c) => c.codePointAt(0)), [0x00e0]);
  assert.deepEqual(Array.from("ç").map((c) => c.codePointAt(0)), [0x00e7]);
  assert.deepEqual(Array.from("—").map((c) => c.codePointAt(0)), [0x2014]);

  // RICH inclut aussi "ç" (garçon) en plus de la phrase imposée.
  assertContainsChars(RICH, ["é", "è", "à", "ç", "—"], "RICH");
  assertNoCorruption(RICH, "RICH");
});
