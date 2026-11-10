// Indicateurs dérivés d'un profil créateur, partagés entre l'annuaire
// public, l'espace entreprise et la fiche détaillée.

export function compactNumber(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

export function creatorAudience(creator) {
  return (creator?.creatorSocials || []).reduce(
    (total, social) => total + (Number(social.followerCount) || 0),
    0,
  );
}

export function creatorPlace(creator) {
  return (
    [creator?.city, creator?.country].filter(Boolean).join(", ") ||
    creator?.location ||
    ""
  );
}
