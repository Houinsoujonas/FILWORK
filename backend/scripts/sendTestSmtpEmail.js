"use strict";

/**
 * Test SMTP réel unique (Brevo) — validation UTF-8 définitive.
 *
 * - Base autorisée : filwork_dev uniquement (vérifiée via SELECT current_database()).
 * - Une seule nouvelle entrée EmailOutbox, un seul destinataire, une seule tentative SMTP.
 * - Aucun worker continu, aucun traitement global, aucun retry automatique.
 * - Ne pas modifier les anciennes entrées SENT/FAILED.
 * - Ne jamais afficher de secrets/URLs de connexion.
 *
 * Exécution : node scripts/sendTestSmtpEmail.js
 * (fichier UTF-8, ne pas utiliser de here-string PowerShell pipé vers stdin)
 */

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const nodemailer = require("nodemailer");
const prisma = require("../src/config/prisma");
const { maskTarget, normalizeTarget } = require("../src/config/databaseTarget");
const {
  enqueueEmail,
  markEmailSent,
  markEmailFailed,
} = require("../src/services/outboxService");

// Anciennes entrées à ne jamais modifier
const OLD_SENT_ID = "cmwfxjcvj0000s4vas64o4vih";
const OLD_FAILED_ID = "cmwa7ub8g0004cwvagk6jf8lb";

const TO = "maurelkss@gmail.com";
const SUBJECT = "Test SMTP FILWORK — vérification UTF-8 définitive";
const TEXT =
  "Bonjour, ceci est le dernier test technique UTF-8 de FILWORK via Brevo. " +
  "Vérification : pièce, réception, étudiant, à bientôt — tout fonctionne correctement.";
const HTML = [
  '<!doctype html>',
  '<html lang="fr">',
  "<head>",
  '<meta charset="UTF-8" />',
  '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
  "<title>Test SMTP FILWORK</title>",
  "</head>",
  '<body style="font-family:Arial,sans-serif;line-height:1.5;">',
  "<p>Bonjour, ceci est le dernier test technique UTF-8 de FILWORK via Brevo.</p>",
  "<p>Vérification : pièce, réception, étudiant, à bientôt — tout fonctionne correctement.</p>",
  "</body>",
  "</html>",
].join("\n");

function escapeForLog(s) {
  // safe diagnostic: show code points only, not secrets; content here is known test content
  return String(s);
}

function codePointsOf(str) {
  return Array.from(String(str)).map((ch) => {
    const cp = ch.codePointAt(0);
    return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  });
}

function hasCorruption(str) {
  const s = String(str);
  return s.includes("\uFFFD") || s.includes("?");
}

function assertContent(label, value, expected) {
  if (value !== expected) {
    throw new Error(`${label} ne correspond pas exactement au contenu attendu.`);
  }
  if (hasCorruption(value)) {
    throw new Error(`${label} contient un caractère corrompu (?, U+FFFD).`);
  }
}

function assertRequiredCharsPresent(content) {
  // Caractères requis présents dans le contenu de test (selon contenu recommandé).
  const required = ["é", "è", "à", "—"];
  for (const ch of required) {
    if (!String(content).includes(ch)) {
      throw new Error(`Caractère Unicode requis manquant dans le contenu: ${ch}`);
    }
  }
}

async function main() {
  let smtpAttempted = false;
  let createdId = null;
  let smtpAuthResult = "non effectuée";
  let sendMailResult = "non effectué";
  let finalRow = null;

  try {
    // --- 1) Base réellement ciblée ---
    const dbRows = await prisma.$queryRaw`SELECT current_database() AS db`;
    const dbName = String(dbRows && dbRows[0] && dbRows[0].db || "").toLowerCase();
    const target = normalizeTarget(process.env.DATABASE_URL);
    const masked = maskTarget(target);
    const isNeon = !!(target && /neon/i.test(target.host));

    if (dbName !== "filwork_dev") {
      throw new Error(`Base refusée : current_database()="${dbName}" (attendu: filwork_dev). Arrêt sans écriture.`);
    }
    if (isNeon) {
      throw new Error("Cible Neon détectée. Arrêt immédiat (Neon non autorisé).");
    }

    // --- 2) Contrôle préalable de la file ---
    const [pendingProcessing, oldSent, oldFailed] = await Promise.all([
      prisma.emailOutbox.findMany({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        select: { id: true, status: true, template: true, to: true },
      }),
      prisma.emailOutbox.findUnique({ where: { id: OLD_SENT_ID }, select: { id: true, status: true, updatedAt: true } }),
      prisma.emailOutbox.findUnique({ where: { id: OLD_FAILED_ID }, select: { id: true, status: true, updatedAt: true } }),
    ]);

    if (pendingProcessing.length > 0) {
      throw new Error(
        `File non vide: ${pendingProcessing.length} entrée(s) PENDING/PROCESSING détectée(s). Arrêt sans écriture/envoi.`
      );
    }

    // --- 3) Vérification Unicode avant insertion ---
    assertContent("subject (avant insertion)", SUBJECT, SUBJECT);
    assertContent("text (avant insertion)", TEXT, TEXT);
    assertContent("html (avant insertion)", HTML, HTML);
    if (!HTML.includes('charset="UTF-8"')) {
      throw new Error('Le HTML ne déclare pas charset="UTF-8".');
    }
    assertRequiredCharsPresent(`${SUBJECT}\n${TEXT}\n${HTML}`);

    const before = {
      subjectCodePoints: codePointsOf(SUBJECT),
      textCodePoints: codePointsOf(TEXT),
      htmlCodePoints: codePointsOf(HTML),
    };

    // --- 4) Configuration SMTP (sans afficher de secrets) ---
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpHost || !Number.isInteger(smtpPort) || !smtpUser || !smtpPass) {
      throw new Error("Configuration SMTP incomplète. Arrêt sans écriture/envoi.");
    }

    // --- 5) Création d'une seule entrée EmailOutbox ---
    const created = await enqueueEmail({
      to: TO,
      subject: SUBJECT,
      template: "manual_smtp_utf8_final_test",
      payload: { text: TEXT, html: HTML },
      maxAttempts: 1,
    });
    createdId = created.id;

    // Re-vérifier immédiatement l'état de la file (seule notre entrée doit être PENDING)
    const queueAfterCreate = await prisma.emailOutbox.findMany({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      select: { id: true, status: true },
    });
    if (queueAfterCreate.length !== 1 || queueAfterCreate[0].id !== createdId) {
      throw new Error("État de file inattendu après création (entrée unique non garantie). Arrêt sans envoi.");
    }

    // --- 6) Lecture/contrôle après insertion en base ---
    const stored = await prisma.emailOutbox.findUnique({
      where: { id: createdId },
      select: { id: true, to: true, subject: true, status: true, attempts: true, maxAttempts: true, payload: true },
    });
    if (!stored) throw new Error("Entrée créée introuvable en lecture. Arrêt sans envoi.");

    let payload = stored.payload || {};
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    const storedText = payload.text || "";
    const storedHtml = payload.html || "";

    assertContent("subject (après lecture DB)", stored.subject, SUBJECT);
    assertContent("text (après lecture DB)", storedText, TEXT);
    assertContent("html (après lecture DB)", storedHtml, HTML);
    assertRequiredCharsPresent(`${stored.subject}\n${storedText}\n${storedHtml}`);

    if (stored.to !== TO) throw new Error("Destinataire en base incorrect. Arrêt sans envoi.");
    if (stored.status !== "PENDING" || stored.maxAttempts !== 1) {
      throw new Error("Statut/maxAttempts inattendu. Arrêt sans envoi.");
    }

    // Contrôle final: toujours aucune autre entrée en attente
    const queueFinal = await prisma.emailOutbox.count({
      where: { status: { in: ["PENDING", "PROCESSING"] }, id: { not: createdId } },
    });
    if (queueFinal !== 0) {
      throw new Error("Autre entrée PENDING/PROCESSING détectée avant envoi. Arrêt sans envoi.");
    }

    // --- 7) Claim atomique ciblé (une seule entrée) ---
    const now = new Date();
    const claimed = await prisma.$queryRaw`
      UPDATE "EmailOutbox"
      SET "status" = 'PROCESSING',
          "attempts" = "attempts" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" IN (
        SELECT "id" FROM "EmailOutbox"
        WHERE "id" = ${createdId}
          AND "status" = 'PENDING'
          AND "nextAttemptAt" <= ${now}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;

    if (!Array.isArray(claimed) || claimed.length !== 1 || claimed[0].id !== createdId) {
      throw new Error("Réclamation ciblée échouée ou non unique. Arrêt (aucun envoi SMTP effectué).");
    }

    // --- 8) Envoi SMTP unique (mécanisme existant: transport Nodemailer) ---
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 8_000,
    });

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    smtpAttempted = true; // unique tentative autorisée

    try {
      await transporter.verify();
      smtpAuthResult = "réussie (verify OK)";
    } catch (e) {
      smtpAuthResult = "échec (verify)";
      await markEmailFailed(createdId, e);
      sendMailResult = `non effectué (échec vérification/auth SMTP: ${e && e.code ? e.code : "erreur"})`;
      // pas de retry
    }

    if (smtpAuthResult.startsWith("réussie")) {
      try {
        const info = await transporter.sendMail({
          from,
          to: TO,
          subject: SUBJECT,
          text: TEXT,
          html: HTML,
        });
        sendMailResult = `accepté (SMTP sendMail OK${info && info.messageId ? ", messageId présent" : ""})`;
        await markEmailSent(createdId);
      } catch (e) {
        sendMailResult = `refusé/erreur (sendMail: ${e && e.code ? e.code : "erreur"})`;
        await markEmailFailed(createdId, e);
        // pas de retry (maxAttempts=1)
      }
    }

    // --- 9) Vérifications finales ---
    finalRow = await prisma.emailOutbox.findUnique({
      where: { id: createdId },
      select: { id: true, to: true, subject: true, status: true, attempts: true, maxAttempts: true, createdAt: true, sentAt: true, payload: true },
    });
    const [oldSentAfter, oldFailedAfter, othersProcessedCount, finalCounts] = await Promise.all([
      prisma.emailOutbox.findUnique({ where: { id: OLD_SENT_ID }, select: { id: true, status: true, updatedAt: true } }),
      prisma.emailOutbox.findUnique({ where: { id: OLD_FAILED_ID }, select: { id: true, status: true, updatedAt: true } }),
      prisma.emailOutbox.count({
        where: {
          NOT: { id: { in: [OLD_SENT_ID, OLD_FAILED_ID, createdId] } },
          OR: [{ status: "SENT" }, { status: "PROCESSING" }],
        },
      }),
      prisma.emailOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    // Rapport final (sans secrets)
    const payloadAfter = (() => {
      let p = (finalRow && finalRow.payload) || {};
      if (typeof p === "string") { try { p = JSON.parse(p); } catch { p = {}; } }
      return p;
    })();

    const report = {
      A_base: {
        current_database: dbName,
        confirmation_filwork_dev: dbName === "filwork_dev",
        neon_contacte: false,
        cible_normalisee: masked,
      },
      B_preparation: {
        id_entree_creee: createdId,
        destinataire: TO,
        objet: SUBJECT,
        unicode_avant_insertion: {
          subject_ok: SUBJECT === stored.subject,
          text_ok: TEXT === storedText,
          html_ok: HTML === storedHtml,
          subject_codepoints: before.subjectCodePoints,
        },
        unicode_apres_lecture_db: {
          subject_ok: finalRow && finalRow.subject === SUBJECT,
          text_ok: payloadAfter.text === TEXT,
          html_ok: payloadAfter.html === HTML,
          subject_codepoints: codePointsOf(finalRow ? finalRow.subject : ""),
          text_codepoints_extrait: codePointsOf(payloadAfter.text || "").slice(0, 80),
        },
      },
      C_envoi: {
        appels_smtp: smtpAttempted ? 1 : 0,
        authentification_smtp: smtpAuthResult,
        resultat_sendMail: sendMailResult,
        statut_emailOutbox: finalRow ? finalRow.status : null,
        tentatives: finalRow ? `${finalRow.attempts}/${finalRow.maxAttempts}` : null,
        sentAt: finalRow ? finalRow.sentAt : null,
      },
      D_securite: {
        un_seul_destinataire: TO,
        une_seule_entree_creee: !!createdId,
        une_seule_tentative_max: (finalRow ? finalRow.attempts : 0) <= 1 && (smtpAttempted ? 1 : 0) <= 1,
        aucun_autre_email_traite: othersProcessedCount === 0,
        aucun_worker_continu_demarre: true,
        ancienne_entree_sent_inchangee: !!(oldSent && oldSentAfter && oldSent.status === oldSentAfter.status && String(oldSent.updatedAt) === String(oldSentAfter.updatedAt)),
        ancienne_entree_failed_inchangee: !!(oldFailed && oldFailedAfter && oldFailed.status === oldFailedAfter.status && String(oldFailed.updatedAt) === String(oldFailedAfter.updatedAt)),
        aucun_secret_expose: true,
      },
      E_conclusion: {
        smtp: smtpAuthResult.startsWith("réussie") && String(sendMailResult).startsWith("accepté") ? "ACCEPTÉ" : "REFUSÉ/ÉCHEC",
        statut: finalRow ? finalRow.status : "INCONNU",
        reception_gmail: "NON CONFIRMÉE (à confirmer par l'utilisateur)",
      },
      diagnostics_file: {
        counts_final: Object.fromEntries(finalCounts.map((r) => [r.status, r._count._all])),
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  try { await prisma.$disconnect(); } catch (_) {}
  // Ne pas exposer de secrets; message générique + code si présent
  console.error(JSON.stringify({ fatal: true, error: err && err.message ? err.message : "Erreur", code: err && err.code ? err.code : undefined }, null, 2));
  process.exit(1);
});
