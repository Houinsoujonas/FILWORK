// Libellés et formatage partagés par les espaces publics et privés.

const LABELS = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  PAUSED: "Suspendue",
  CLOSED: "Clôturée",
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  WITHDRAWN: "Retirée",
  ACTIVE: "Active",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  SUBMITTED: "Soumis",
  REVISION_REQUESTED: "Révision demandée",
  APPROVED: "Approuvé",
  PLANNED: "Planifié",
  PAID: "Payé",
  FAILED: "Échoué",
  AVAILABLE: "Disponible",
  LIMITED: "Disponibilité limitée",
  UNAVAILABLE: "Indisponible",
  CREATOR: "Créateur",
  COMPANY: "Entreprise",
  ADMIN: "Administrateur",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  TWITCH: "Twitch",
  IMAGE: "Image",
  VIDEO: "Vidéo",
  LINK: "Lien",
};

export function label(value) {
  if (!value) {
    return "-";
  }

  return LABELS[value] || String(value);
}

export function formatMoney(value, currency = "XOF") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "-";
  }

  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency || ""}`.trim();
  }
}

export function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat("fr-FR").format(number);
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function initials(name) {
  return String(name || "FILWORK")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function homeForRole(role) {
  if (role === "COMPANY") {
    return "/espace/entreprise";
  }

  if (role === "ADMIN") {
    return "/administration";
  }

  return "/espace/createur";
}

export function collaborationCreator(collaboration) {
  return (
    collaboration?.application?.creatorProfile ||
    collaboration?.invitation?.creatorProfile ||
    null
  );
}

export function collaborationCampaign(collaboration) {
  return (
    collaboration?.application?.campaign ||
    collaboration?.invitation?.campaign ||
    null
  );
}

export function collaborationAmount(collaboration) {
  return (
    collaboration?.agreedAmount ??
    collaboration?.invitation?.proposedAmount ??
    collaboration?.application?.agreedAmount ??
    null
  );
}
