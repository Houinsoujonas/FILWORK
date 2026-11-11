const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:5432/filwork_email_templates_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";

const {
  escapeHtml,
} = require("../src/services/emailService");

const {
  welcomeEmail,
  collaborationProposalEmail,
  passwordResetCodeEmail,
  newApplicationEmail,
  announcementEmail,
  campaignClosedEmail,
} = require("../src/services/emailTemplates");

test("escapeHtml échappe les caractères dangereux", () => {
  const escaped = escapeHtml('<script>alert("XSS")</script>');
  assert.equal(escaped.includes("<script>"), false);
  assert.match(escaped, /&lt;script&gt;/);
});

test("welcomeEmail retourne un message cohérent", () => {
  const result = welcomeEmail({
    to: "test@example.com",
    displayName: "<b>Alice</b>",
    role: "CREATOR",
  });

  assert.equal(result.to, "test@example.com");
  assert.match(result.subject, /espace créateur/i);
  assert.match(result.text, /Alice/);
  assert.equal(result.html.includes("<script>"), false);
});

test("campaignClosedEmail échappe le titre de campagne", () => {
  const result = campaignClosedEmail({
    to: "creator@example.com",
    displayName: "Bob",
    campaignTitle: "<img src=x onerror=alert(1)>",
  });

  assert.equal(result.html.includes("<img"), false);
  assert.match(result.html, /&lt;img/);
});

test("passwordResetCodeEmail échappe le code", () => {
  const result = passwordResetCodeEmail({
    to: "user@example.com",
    displayName: "Eve",
    code: "123456",
  });

  assert.match(result.text, /123456/);
  assert.equal(result.text.includes("<"), false);
});

test("collaborationProposalEmail échappe les données", () => {
  const result = collaborationProposalEmail({
    to: "creator@example.com",
    displayName: "<script>",
    companyName: "<script>",
    campaignTitle: "<script>",
  });

  assert.equal(result.html.includes("<script>"), false);
});

test("newApplicationEmail échappe les données", () => {
  const result = newApplicationEmail({
    to: "company@example.com",
    displayName: "<script>",
    creatorName: "<script>",
    campaignTitle: "<script>",
  });

  assert.equal(result.html.includes("<script>"), false);
});

test("announcementEmail échappe le titre et le corps", () => {
  const result = announcementEmail({
    to: "all@example.com",
    displayName: "Admin",
    title: "<script>",
    body: "<script>",
  });

  assert.equal(result.html.includes("<script>"), false);
});
