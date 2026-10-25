const prisma = require("../config/prisma");

const ACTIVE_INVITATION_STATUSES = ["PENDING", "ACCEPTED"];

/**
 * Valider un montant décimal destiné à Prisma.
 * Le montant est conservé sous forme de chaîne pour éviter
 * les imprécisions des nombres flottants.
 */
function validateAmount(value) {
  if (value === undefined || value === null || value === "") {
    return {
      valid: true,
      value: null,
    };
  }

  const normalized = String(value).trim();

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    return {
      valid: false,
      message:
        "Le montant doit être positif ou nul, avec au maximum deux décimales.",
    };
  }

  return {
    valid: true,
    value: normalized,
  };
}

/**
 * Valider un message facultatif.
 */
function validateMessage(value) {
  if (value === undefined || value === null || value === "") {
    return {
      valid: true,
      value: null,
    };
  }

  if (typeof value !== "string") {
    return {
      valid: false,
      message: "Le message doit être une chaîne de caractères.",
    };
  }

  const normalized = value.trim();

  if (normalized.length > 5000) {
    return {
      valid: false,
      message: "Le message ne peut pas dépasser 5000 caractères.",
    };
  }

  return {
    valid: true,
    value: normalized || null,
  };
}

/**
 * Récupérer le profil entreprise du compte connecté.
 */
async function getCompanyProfile(userId) {
  return prisma.companyProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      userId: true,
      companyName: true,
    },
  });
}

/**
 * Récupérer le profil créateur.
 */
async function getCreatorProfile(userId) {
  return prisma.creatorProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      userId: true,
      displayName: true,
    },
  });
}

/**
 * Une entreprise invite un créateur à une campagne publiée
 * dont elle est propriétaire.
 */
async function createInvitation(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent inviter des créateurs.",
      });
    }

    const body = req.body || {};
    const { creatorProfileId } = body;

    if (
      typeof creatorProfileId !== "string" ||
      !creatorProfileId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Le profil du créateur est obligatoire.",
      });
    }

    const messageValidation = validateMessage(body.message);

    if (!messageValidation.valid) {
      return res.status(400).json({
        success: false,
        message: messageValidation.message,
      });
    }

    const amountValidation = validateAmount(body.proposedAmount);

    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: amountValidation.message,
      });
    }

    const currency =
      body.currency === undefined
        ? "XOF"
        : typeof body.currency === "string"
          ? body.currency.trim().toUpperCase()
          : "";

    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({
        success: false,
        message: "La devise doit être un code de trois lettres.",
      });
    }

    const companyProfile = await getCompanyProfile(req.user.id);

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil d'entreprise n'est associé à ce compte.",
      });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.campaignId,
        companyProfileId: companyProfile.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou accès non autorisé.",
      });
    }

    if (campaign.status !== "PUBLISHED") {
      return res.status(409).json({
        success: false,
        message:
          "Seules les campagnes publiées peuvent recevoir des invitations.",
      });
    }

    const creator = await prisma.creatorProfile.findUnique({
      where: {
        id: creatorProfileId.trim(),
      },
      select: {
        id: true,
        userId: true,
        displayName: true,
      },
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Profil créateur introuvable.",
      });
    }

    // Éviter deux parcours concurrents pour la même campagne :
    // une candidature encore en attente ou déjà acceptée bloque l'invitation.
    const existingApplication = await prisma.application.findFirst({
      where: {
        campaignId: campaign.id,
        creatorProfileId: creator.id,
        status: {
          in: ["PENDING", "ACCEPTED"],
        },
      },
      select: {
        id: true,
      },
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message:
          "Ce créateur possède déjà une candidature en attente ou acceptée pour cette campagne.",
      });
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        campaignId: campaign.id,
        creatorProfileId: creator.id,
        status: {
          in: ACTIVE_INVITATION_STATUSES,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message:
          "Une invitation en attente ou acceptée existe déjà pour ce créateur et cette campagne.",
      });
    }

    const invitation = await prisma.$transaction(async (tx) => {
      const createdInvitation = await tx.invitation.create({
        data: {
          campaignId: campaign.id,
          creatorProfileId: creator.id,
          message: messageValidation.value,
          proposedAmount: amountValidation.value,
          currency,
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
            },
          },
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: creator.userId,
          invitationId: createdInvitation.id,
          type: "INVITATION_RECEIVED",
          title: "Nouvelle invitation",
          message:
            `${companyProfile.companyName} vous invite à participer à la campagne ` +
            `« ${campaign.title} ».`,
        },
      });

      return createdInvitation;
    });

    return res.status(201).json({
      success: true,
      message: "Invitation envoyée avec succès.",
      invitation,
    });
  } catch (error) {
    // La contrainte en base protège aussi contre les requêtes simultanées.
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Une invitation active existe déjà pour ce créateur et cette campagne.",
      });
    }

    console.error(
      "Erreur lors de la création de l'invitation :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible d'envoyer l'invitation.",
    });
  }
}

/**
 * Le créateur consulte les invitations qui lui ont été envoyées.
 */
async function getReceivedInvitations(req, res) {
  try {
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Seuls les créateurs peuvent consulter leurs invitations reçues.",
      });
    }

    const creatorProfile = await getCreatorProfile(req.user.id);

    if (!creatorProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil créateur n'est associé à ce compte.",
      });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        creatorProfileId: creatorProfile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            platforms: true,
            budget: true,
            currency: true,
            status: true,
            companyProfile: {
              select: {
                id: true,
                companyName: true,
                logoUrl: true,
                location: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des invitations reçues :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les invitations.",
    });
  }
}

/**
 * L'entreprise consulte les invitations envoyées pour ses campagnes.
 */
async function getSentInvitations(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message:
          "Seules les entreprises peuvent consulter les invitations envoyées.",
      });
    }

    const companyProfile = await getCompanyProfile(req.user.id);

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil d'entreprise n'est associé à ce compte.",
      });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        campaign: {
          is: {
            companyProfileId: companyProfile.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        creatorProfile: {
          select: {
            id: true,
            displayName: true,
            niche: true,
            location: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des invitations envoyées :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les invitations envoyées.",
    });
  }
}

/**
 * Le créateur accepte ou refuse sa propre invitation.
 *
 * L'acceptation et la création de la collaboration ainsi que
 * la notification à l'entreprise sont atomiques.
 */
async function respondToInvitation(req, res) {
  try {
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Seuls les créateurs peuvent répondre aux invitations.",
      });
    }

    const body = req.body || {};

    if (
      typeof body.status !== "string" ||
      !["ACCEPTED", "REJECTED"].includes(body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le statut doit être ACCEPTED ou REJECTED.",
      });
    }

    const creatorProfile = await getCreatorProfile(req.user.id);

    if (!creatorProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil créateur n'est associé à ce compte.",
      });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: req.params.invitationId,
        creatorProfileId: creatorProfile.id,
      },
      include: {
        creatorProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            companyProfile: {
              select: {
                id: true,
                userId: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation introuvable ou accès non autorisé.",
      });
    }

    if (invitation.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Cette invitation a déjà été traitée.",
      });
    }

    const accepted = body.status === "ACCEPTED";

    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          creatorProfileId: creatorProfile.id,
          status: "PENDING",
        },
        data: {
          status: body.status,
          respondedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      let collaboration = null;

      if (accepted) {
        collaboration = await tx.collaboration.create({
          data: {
            invitationId: invitation.id,
            agreedAmount: invitation.proposedAmount,
            currency: invitation.currency,
            status: "ACTIVE",
          },
          select: {
            id: true,
            status: true,
            agreedAmount: true,
            currency: true,
            startDate: true,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: invitation.campaign.companyProfile.userId,
          invitationId: invitation.id,
          type: accepted
            ? "INVITATION_ACCEPTED"
            : "INVITATION_REJECTED",
          title: accepted
            ? "Invitation acceptée"
            : "Invitation refusée",
          message: accepted
            ? `${creatorProfile.displayName} a accepté votre invitation pour la campagne « ${invitation.campaign.title} ». Une collaboration a été créée.`
            : `${creatorProfile.displayName} a refusé votre invitation pour la campagne « ${invitation.campaign.title} ».`,
        },
      });

      const updatedInvitation = await tx.invitation.findUnique({
        where: {
          id: invitation.id,
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
            },
          },
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
            },
          },
          collaboration: {
            select: {
              id: true,
              status: true,
              agreedAmount: true,
              currency: true,
              startDate: true,
            },
          },
        },
      });

      return {
        invitation: updatedInvitation,
        collaboration,
      };
    });

    if (!result) {
      return res.status(409).json({
        success: false,
        message: "Cette invitation a déjà été traitée.",
      });
    }

    return res.status(200).json({
      success: true,
      message: accepted
        ? "Invitation acceptée. Collaboration créée et entreprise notifiée."
        : "Invitation refusée. Entreprise notifiée.",
      invitation: result.invitation,
      collaboration: result.collaboration,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Cette invitation ne peut pas créer une nouvelle collaboration.",
      });
    }

    console.error(
      "Erreur lors du traitement de l'invitation :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de traiter l'invitation.",
    });
  }
}

/**
 * L'entreprise retire une invitation encore en attente.
 */
async function withdrawInvitation(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent retirer leurs invitations.",
      });
    }

    const companyProfile = await getCompanyProfile(req.user.id);

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil d'entreprise n'est associé à ce compte.",
      });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: req.params.invitationId,
        campaign: {
          is: {
            companyProfileId: companyProfile.id,
          },
        },
      },
      include: {
        creatorProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation introuvable ou accès non autorisé.",
      });
    }

    if (invitation.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message:
          "Seules les invitations encore en attente peuvent être retirées.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
        },
        data: {
          status: "WITHDRAWN",
          respondedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        return false;
      }

      await tx.notification.create({
        data: {
          userId: invitation.creatorProfile.userId,
          invitationId: invitation.id,
          type: "INVITATION_WITHDRAWN",
          title: "Invitation retirée",
          message:
            `${companyProfile.companyName} a retiré son invitation pour la campagne ` +
            `« ${invitation.campaign.title} ».`,
        },
      });

      return true;
    });

    if (!result) {
      return res.status(409).json({
        success: false,
        message:
          "Cette invitation a déjà reçu une réponse ou a été retirée.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation retirée. Le créateur a été notifié.",
    });
  } catch (error) {
    console.error(
      "Erreur lors du retrait de l'invitation :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de retirer cette invitation.",
    });
  }
}

module.exports = {
  createInvitation,
  getReceivedInvitations,
  getSentInvitations,
  respondToInvitation,
  withdrawInvitation,
};