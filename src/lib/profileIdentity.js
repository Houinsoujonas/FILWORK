// Décide comment présenter l'identité d'un profil authentifié.
//
// Un nom vide ou manifestement laissé par un jeu de données de test
// (mot « test »/« demo » ou horodatage) ne doit pas être présenté comme
// le nom réel de l'utilisateur. Les profils concernés sont invités à
// renseigner leur véritable identité.

const PLACEHOLDER_NAME_PATTERN = /\b(?:test|tests|demo|démo)\b|\d{8,}/i;

const COMPANY_FIELDS = ["companyName", "industry", "description"];
const CREATOR_FIELDS = ["displayName", "bio", "niche"];

export function isPlaceholderName(value) {
  const name = String(value ?? "").trim();

  if (!name) {
    return true;
  }

  return PLACEHOLDER_NAME_PATTERN.test(name);
}

function buildIdentity(profile, nameField, fields) {
  const name = String(profile?.[nameField] ?? "").trim();

  return {
    name,
    isPlaceholder: isPlaceholderName(name),
    isIncomplete: fields.some(
      (field) => !String(profile?.[field] ?? "").trim(),
    ),
  };
}

export function getCompanyIdentity(profile) {
  return buildIdentity(profile, "companyName", COMPANY_FIELDS);
}

export function getCreatorIdentity(profile) {
  return buildIdentity(profile, "displayName", CREATOR_FIELDS);
}
