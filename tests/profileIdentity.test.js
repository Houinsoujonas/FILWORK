import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCompanyIdentity,
  getCreatorIdentity,
  isPlaceholderName,
} from "../src/lib/profileIdentity.js";

test("un nom de démonstration horodaté n’est pas présenté comme un nom réel", () => {
  assert.equal(isPlaceholderName("Entreprise Test 20261027230119"), true);
  assert.equal(isPlaceholderName("Créateur Test 20261027230119"), true);
  assert.equal(isPlaceholderName("Entreprise Test FILWORK"), true);
  assert.equal(isPlaceholderName(""), true);
  assert.equal(isPlaceholderName(null), true);
});

test("un nom réel n’est pas confondu avec un nom de démonstration", () => {
  assert.equal(isPlaceholderName("Maison Lumière"), false);
  assert.equal(isPlaceholderName("Contest Studio"), false);
});

test("l’identité entreprise reprend le profil authentifié", () => {
  const identity = getCompanyIdentity({
    companyName: "Maison Lumière",
    industry: "Décoration",
    description: "Atelier de décoration intérieure.",
  });

  assert.deepEqual(identity, {
    name: "Maison Lumière",
    isPlaceholder: false,
    isIncomplete: false,
  });
});

test("un profil entreprise de test déclenche l’invitation à le compléter", () => {
  const identity = getCompanyIdentity({
    companyName: "Entreprise Test 20261027230119",
    industry: "Marketing",
    description: null,
  });

  assert.equal(identity.isPlaceholder, true);
  assert.equal(identity.isIncomplete, true);
});

test("l’identité créateur signale un profil de test ou incomplet", () => {
  const placeholder = getCreatorIdentity({
    displayName: "Créateur Test 20261027230119",
    bio: null,
    niche: null,
  });

  assert.equal(placeholder.isPlaceholder, true);
  assert.equal(placeholder.isIncomplete, true);

  const incomplete = getCreatorIdentity({
    displayName: "Awa Diallo",
    bio: "",
    niche: "Photographie",
  });

  assert.equal(incomplete.isPlaceholder, false);
  assert.equal(incomplete.isIncomplete, true);
});

test("un profil créateur réel est reconnu comme complet", () => {
  const identity = getCreatorIdentity({
    displayName: "Awa Diallo",
    bio: "Photographe indépendante.",
    niche: "Photographie",
  });

  assert.deepEqual(identity, {
    name: "Awa Diallo",
    isPlaceholder: false,
    isIncomplete: false,
  });
});
