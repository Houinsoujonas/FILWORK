// Critères métier de visibilité des contenus destinés à la découverte.
//
// Un profil n'est pas jugé "de test" à partir de son nom : un créateur peut
// légitimement s'appeler "Testimony" ou travailler dans le "testing". Les
// critères reposent sur :
//   1. la complétude du profil (un profil vide n'est pas découvrable) ;
//   2. l'usage d'un domaine e-mail réservé à la documentation (RFC 2606),
//      qui ne peut pas correspondre à un compte réel exploitable.

const RESERVED_DOCUMENTATION_DOMAINS = Object.freeze([
  "example.com",
  "example.net",
  "example.org",
]);

// TLD réservés par la RFC 2606 / RFC 6761.
const RESERVED_TLDS = Object.freeze([
  ".example",
  ".invalid",
  ".test",
  ".localhost",
]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Vrai si l'e-mail utilise un domaine réservé à la documentation.
 * Ne dépend pas du nom affiché.
 */
function isReservedDocumentationEmail(email) {
  if (!hasText(email)) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex === -1) {
    return false;
  }

  const domain = normalized.slice(atIndex + 1);

  if (!domain) {
    return false;
  }

  return (
    RESERVED_DOCUMENTATION_DOMAINS.some(
      (reserved) =>
        domain === reserved || domain.endsWith(`.${reserved}`),
    ) || RESERVED_TLDS.some((tld) => domain.endsWith(tld))
  );
}

// Filtres Prisma équivalents au prédicat ci-dessus, pour que la liste et le
// comptage restent cohérents côté base.
const RESERVED_EMAIL_CONDITIONS = Object.freeze([
  ...RESERVED_DOCUMENTATION_DOMAINS.flatMap((domain) => [
    { email: { endsWith: `@${domain}`, mode: "insensitive" } },
    { email: { endsWith: `.${domain}`, mode: "insensitive" } },
  ]),
  ...RESERVED_TLDS.map((tld) => ({
    email: { endsWith: tld, mode: "insensitive" },
  })),
]);

/**
 * Conditions Prisma d'un profil créateur découvrable :
 *   - compte de rôle CREATOR ;
 *   - nom affiché, bio et niche renseignés ;
 *   - e-mail hors domaines de documentation.
 *
 * Un profil incomplet reste accessible à son propriétaire, mais n'apparaît
 * ni dans l'annuaire ni dans les recherches des entreprises.
 */
const CREATOR_DISCOVERY_CONDITIONS = Object.freeze([
  {
    user: {
      is: {
        role: "CREATOR",
        NOT: RESERVED_EMAIL_CONDITIONS,
      },
    },
  },
  { displayName: { not: "" } },
  { bio: { not: null } },
  { NOT: { bio: "" } },
  { niche: { not: null } },
  { NOT: { niche: "" } },
]);

/**
 * Conditions Prisma d'un profil entreprise publiable :
 *   - nom et description renseignés ;
 *   - e-mail hors domaines de documentation.
 */
const COMPANY_PUBLIC_CONDITIONS = Object.freeze([
  { companyName: { not: "" } },
  { description: { not: null } },
  { NOT: { description: "" } },
  {
    user: {
      is: {
        NOT: RESERVED_EMAIL_CONDITIONS,
      },
    },
  },
]);

/**
 * Conditions Prisma d'une campagne publiquement visible :
 *   - statut PUBLISHED ;
 *   - entreprise émettrice complète.
 */
const PUBLIC_CAMPAIGN_CONDITIONS = Object.freeze([
  { status: "PUBLISHED" },
  {
    companyProfile: {
      is: {
        AND: COMPANY_PUBLIC_CONDITIONS,
      },
    },
  },
]);

/**
 * Prédicat pur, utilisé par les tests et les contrôles non-Prisma.
 * `role` et `email` sont optionnels : ils renforcent le contrôle lorsqu'ils
 * sont disponibles.
 */
function isCreatorProfileVisible(profile) {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  const user = profile.user;

  if (user && typeof user === "object") {
    if (user.role && user.role !== "CREATOR") {
      return false;
    }

    if (isReservedDocumentationEmail(user.email)) {
      return false;
    }
  }

  return (
    hasText(profile.displayName) &&
    hasText(profile.bio) &&
    hasText(profile.niche)
  );
}

function isCompanyProfilePublic(profile) {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  const user = profile.user;

  if (user && typeof user === "object" && isReservedDocumentationEmail(user.email)) {
    return false;
  }

  return hasText(profile.companyName) && hasText(profile.description);
}

function isPublicCampaign(campaign) {
  return Boolean(
    campaign &&
      campaign.status === "PUBLISHED" &&
      isCompanyProfilePublic(campaign.companyProfile),
  );
}

module.exports = {
  RESERVED_DOCUMENTATION_DOMAINS,
  RESERVED_TLDS,
  RESERVED_EMAIL_CONDITIONS,
  CREATOR_DISCOVERY_CONDITIONS,
  COMPANY_PUBLIC_CONDITIONS,
  PUBLIC_CAMPAIGN_CONDITIONS,
  isReservedDocumentationEmail,
  isCreatorProfileVisible,
  isCompanyProfilePublic,
  isPublicCampaign,
};
