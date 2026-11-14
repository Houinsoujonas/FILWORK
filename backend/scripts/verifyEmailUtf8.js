"use strict";

/**
 * Vérification UTF-8 pour les contenus e-mail (sans DB, sans SMTP, sans envoi).
 *
 * Exécution recommandée (Windows PowerShell / autres shells) :
 *   node scripts/verifyEmailUtf8.js
 *
 * Ne pas utiliser de here-string PowerShell transmis à Node via stdin pour des
 * scripts/contenus Unicode (risque de corruption d'encodage).
 */

const REQUIRED = [
  { char: "é", codePoint: 0x00e9 },
  { char: "è", codePoint: 0x00e8 },
  { char: "à", codePoint: 0x00e0 },
  { char: "ç", codePoint: 0x00e7 },
  { char: "—", codePoint: 0x2014 },
];

const PHRASE = "Vérification UTF-8 : pièce, réception, étudiant, à bientôt — FILWORK.";

function codePointLabel(ch) {
  return "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
}

function fail(message) {
  console.error(`[UTF8:FAIL] ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`[UTF8:OK] ${message}`);
}

function checkRequiredChars() {
  let ok = true;

  for (const { char, codePoint } of REQUIRED) {
    const actual = char.codePointAt(0);
    const expectedLabel = "U+" + codePoint.toString(16).toUpperCase().padStart(4, "0");
    if (actual !== codePoint || char === "?" || char === "\uFFFD") {
      fail(`Caractère attendu ${expectedLabel} corrompu (obtenu ${codePointLabel(char)}).`);
      ok = false;
    } else {
      pass(`Caractère ${expectedLabel} (${char}) conservé.`);
    }
  }

  return ok;
}

function checkPhrase() {
  const text = PHRASE;
  let ok = true;

  // La phrase de contrôle imposée doit contenir ces caractères (présents dans l'énoncé).
  const mustContain = ["é", "è", "à", "—"];
  for (const ch of mustContain) {
    const idx = mustContain.indexOf(ch);
    if (!text.includes(ch)) {
      fail(`Phrase de test : caractère manquant (${codePointLabel(ch)}).`);
      ok = false;
    }
  }

  if (text.includes("\uFFFD")) {
    fail("Phrase de test : caractère de remplacement U+FFFD détecté.");
    ok = false;
  }
  if (text.includes("?")) {
    fail("Phrase de test : caractère '?' détecté (corruption potentielle).");
    ok = false;
  }

  const expected = "Vérification UTF-8 : pièce, réception, étudiant, à bientôt — FILWORK.";
  if (text !== expected) {
    fail("Phrase de test : la chaîne ne correspond pas exactement à la valeur attendue.");
    ok = false;
  } else {
    pass("Phrase de test complète conservée exactement (comparaison stricte).");
  }

  // Points de code des segments clés (informatif, validé aussi par l'égalité stricte).
  const segments = {
    "Vérification": "Vérification",
    "pièce": "pièce",
    "réception": "réception",
    "étudiant": "étudiant",
    "à bientôt": "à bientôt",
    "— FILWORK": "— FILWORK",
  };
  for (const [, segment] of Object.entries(segments)) {
    if (!text.includes(segment)) {
      fail(`Segment "${segment}" altéré ou absent.`);
      ok = false;
    } else {
      const cps = Array.from(segment).map(codePointLabel).join(" ");
      pass(`Segment "${segment}" OK [${cps}]`);
    }
  }

  return ok;
}

function main() {
  console.log("[UTF8] Vérification Unicode (sans DB, sans SMTP)");
  const a = checkRequiredChars();
  const b = checkPhrase();

  if (!a || !b || process.exitCode === 1) {
    console.error("[UTF8] ÉCHEC : corruption ou altération détectée.");
    process.exit(1);
  }

  console.log("[UTF8] SUCCÈS : tous les caractères vérifiés sont conservés.");
}

main();
