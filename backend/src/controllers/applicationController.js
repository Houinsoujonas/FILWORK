const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const { lockCampaign } = require("../services/collaborationLock");
const { findUnknownFields } = require("../utils/validation");

/**
 * Valider le montant convenu lors de l'acceptation d'une candidature.
 * Le montant doit être strictement supérieur à zéro.
 */
function validateAgreedAmount(value) {
  if (value === undefined || value === null || value === "") {
    return {
      valid: false,
      message:
        "Le montant convenu est obligatoire pour accepter une candidature.",
    };
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return {
      valid: false,
      message: "Le montant convenu doit être un nombre strictement positif.",
    };
  }

  const normalized = String(value).trim();

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    return {
      valid: false,
      message:
        "Le montant convenu doit être strictement positif, avec au maximum deux décimales.",
    };
  }

  if (Number(normalized) <= 0) {
    return {
      valid: false,
      message: "Le montant convenu doit être strictement supérieur à zéro.",
    };
  }

  return {
    valid: true,
    value: normalized,
  };
}

/**
 * Permet à un créateur de candidater à une campagne publiée.
 */
async function submitApplication(req, res) {
  try {
    // Seuls les créateurs peuvent candidater.
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Seuls les créateurs peuvent candidater aux campagnes.",
      });
    }

    const campaignId = req.params.campaignId;
    const body = req.body || {};

    // Le créateur peut uniquement envoyer un message.
    const unknownFields = Object.keys(body).filter(
      (field) => field !== "message",
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    let message = null;

    if (Object.prototype.hasOwnProperty.call(body, "message")) {
      if (body.message !== null && typeof body.message !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le message de candidature doit être un texte.",
        });
      }

      if (typeof body.message === "string") {
        message = body.message.trim();

        if (message.length > 5000) {
          return res.status(400).json({
            success: false,
            message: "Le message ne doit pas dépasser 5000 caractères.",
          });
        }

        if (message.length === 0) {
          message = null;
        }
      }
    }

    // Récupérer le profil du créateur connecté.
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        displayName: true,
      },
    });

    if (!creatorProfile) {
      return res.status(400).json({
        success: false,
        message: "Complétez votre profil créateur avant de candidater.",
      });
    }

    // La campagne doit exister et être publiée.
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        companyProfile: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.status !== "PUBLISHED") {
      return res.status(409).json({
        success: false,
        message: "Cette campagne n'accepte pas de candidatures actuellement.",
      });
    }

    // Empêcher une candidature lorsqu'une invitation active
    // existe déjà pour ce créateur et cette campagne.
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        campaignId: campaign.id,
        creatorProfileId: creatorProfile.id,
        status: {
          in: ["PENDING", "ACCEPTED"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message:
          "Une invitation active existe déjà pour cette campagne. Répondez à cette invitation avant de candidater.",
      });
    }

    // Créer la candidature dans une transaction qui verrouille la campagne.
    // Le verrou garantit qu'une clôture ne peut pas s'intercaler entre la
    // vérification du statut PUBLISHED et la création de la candidature.
    // Le schéma Prisma empêche par ailleurs un créateur de candidater deux
    // fois à la même campagne grâce à sa contrainte unique.
    const outcome = await prisma.$transaction(async (tx) => {
      const lockedCampaign = await lockCampaign(tx, campaign.id);

      if (!lockedCampaign) {
        return { type: "campaign-missing" };
      }

      if (lockedCampaign.status !== "PUBLISHED") {
        return {
          type: "campaign-not-published",
          currentStatus: lockedCampaign.status,
        };
      }

      // Revérifier sous verrou : une invitation a pu être créée
      // concurremment après la vérification initiale.
      const activeInvitation = await tx.invitation.findFirst({
        where: {
          campaignId: campaign.id,
          creatorProfileId: creatorProfile.id,
          status: {
            in: ["PENDING", "ACCEPTED"],
          },
        },
        select: {
          id: true,
        },
      });

      if (activeInvitation) {
        return { type: "invitation" };
      }

      const createdApplication = await tx.application.create({
        data: {
          campaignId: campaign.id,
          creatorProfileId: creatorProfile.id,
          message,
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              companyProfile: {
                select: {
                  companyName: true,
                },
              },
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

      return { type: "ok", application: createdApplication };
    });

    if (outcome.type === "campaign-missing") {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (outcome.type === "campaign-not-published") {
      return res.status(409).json({
        success: false,
        message: "Cette campagne n'accepte pas de candidatures actuellement.",
        currentStatus: outcome.currentStatus,
      });
    }

    if (outcome.type === "invitation") {
      return res.status(409).json({
        success: false,
        message:
          "Une invitation active existe déjà pour cette campagne. Répondez à cette invitation avant de candidater.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Votre candidature a été envoyée avec succès.",
      application: outcome.application,
    });
  } catch (error) {
    // P2002 correspond à une violation d'une contrainte unique Prisma.
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Vous avez déjà candidaté à cette campagne.",
      });
    }

    console.error("Erreur lors de la création de la candidature :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible d'envoyer la candidature.",
    });
  }
}

/**
 * Permet au créateur connecté de consulter ses candidatures.
 */
async function getMyApplications(req, res) {
  try {
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Cette fonctionnalité est réservée aux créateurs.",
      });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!creatorProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil créateur n'est associé à ce compte.",
      });
    }

    const applications = await prisma.application.findMany({
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
            publishedAt: true,
            companyProfile: {
              select: {
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
      count: applications.length,
      applications,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la récupération des candidatures du créateur :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer vos candidatures.",
    });
  }
}

/**
 * Permet à une entreprise de consulter les candidatures reçues
 * pour une campagne qui lui appartient.
 */
async function getCampaignApplications(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Cette fonctionnalité est réservée aux entreprises.",
      });
    }

    const companyProfile = await prisma.companyProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Complétez votre profil d'entreprise.",
      });
    }

    // Vérifier que la campagne appartient à cette entreprise.
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.campaignId,
        companyProfileId: companyProfile.id,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou accès non autorisé.",
      });
    }

    const applications = await prisma.application.findMany({
      where: {
        campaignId: campaign.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        creatorProfile: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            niche: true,
            location: true,
            profileImageUrl: true,
            mediaKitUrl: true,
            instagramUrl: true,
            tiktokUrl: true,
            youtubeUrl: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      campaign,
      count: applications.length,
      applications,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la récupération des candidatures de la campagne :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les candidatures.",
    });
  }
}

/**
 * Accepter ou refuser une candidature.
 *
 * Lorsqu'une candidature est acceptée :
 * - son statut passe à ACCEPTED ;
 * - une collaboration est créée ;
 * - une notification est créée pour le créateur.
 *
 * Les trois opérations sont exécutées dans une seule transaction.
 */
async function updateApplicationStatus(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent traiter les candidatures.",
      });
    }

    const body = req.body || {};

    const unknownFields = findUnknownFields(body, ["status", "amount"]);

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs non autorisés : ${unknownFields.join(", ")}.`,
      });
    }

    if (
      typeof body.status !== "string" ||
      !["ACCEPTED", "REJECTED"].includes(body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le statut doit être ACCEPTED ou REJECTED.",
      });
    }

    const accepted = body.status === "ACCEPTED";

    // Une acceptation doit préciser le montant convenu, strictement positif.
    let agreedAmount = null;

    if (accepted) {
      const amountValidation = validateAgreedAmount(body.amount);

      if (!amountValidation.valid) {
        return res.status(400).json({
          success: false,
          message: amountValidation.message,
        });
      }

      agreedAmount = amountValidation.value;
    }

    // Récupérer le profil de l'entreprise connectée.
    const companyProfile = await prisma.companyProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        companyName: true,
      },
    });

    if (!companyProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil d'entreprise n'est associé à ce compte.",
      });
    }

    // Vérifier la propriété de la campagne et récupérer le créateur.
    const application = await prisma.application.findUnique({
      where: {
        id: req.params.applicationId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
            currency: true,
            companyProfileId: true,
          },
        },
        creatorProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
          },
        },
      },
    });

    if (
      !application ||
      application.campaign.companyProfileId !== companyProfile.id
    ) {
      return res.status(404).json({
        success: false,
        message: "Candidature introuvable ou accès non autorisé.",
      });
    }

    if (application.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Cette candidature a déjà été traitée.",
      });
    }

    // Modifier la candidature, créer éventuellement la collaboration
    // et enregistrer la notification dans une seule transaction.
    // La campagne est verrouillée en premier pour sérialiser l'acceptation
    // avec une clôture ou une autre transition de campagne.
    const outcome = await prisma.$transaction(async (tx) => {
      const lockedCampaign = await lockCampaign(tx, application.campaign.id);

      if (!lockedCampaign) {
        return { type: "campaign-missing" };
      }

      if (accepted && lockedCampaign.status !== "PUBLISHED") {
        return {
          type: "campaign-not-published",
          currentStatus: lockedCampaign.status,
        };
      }

      // Vérifier l'absence de collaboration avant toute écriture :
      // une collaboration ne doit jamais être créée deux fois.
      if (accepted) {
        const existingCollaboration = await tx.collaboration.findUnique({
          where: {
            applicationId: application.id,
          },
          select: {
            id: true,
          },
        });

        if (existingCollaboration) {
          return { type: "duplicate" };
        }
      }

      // La condition sur le statut protège contre les traitements simultanés.
      const updateResult = await tx.application.updateMany({
        where: {
          id: application.id,
          status: "PENDING",
        },
        data: {
          status: body.status,
        },
      });

      if (updateResult.count === 0) {
        return { type: "already" };
      }

      // Une acceptation crée automatiquement une collaboration
      // avec le montant convenu et la devise de la campagne.
      if (accepted) {
        await tx.collaboration.create({
          data: {
            applicationId: application.id,
            agreedAmount,
            currency: application.campaign.currency,
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

      const title = accepted
        ? "Candidature acceptée !"
        : "Réponse à votre candidature";

      const message = accepted
        ? `${companyProfile.companyName} a accepté votre candidature pour la campagne « ${application.campaign.title} ». Une collaboration a été créée.`
        : `${companyProfile.companyName} a refusé votre candidature pour la campagne « ${application.campaign.title} ».`;

      // Créer la notification destinée au créateur.
      await tx.notification.create({
        data: {
          userId: application.creatorProfile.userId,
          applicationId: application.id,
          type: accepted ? "APPLICATION_ACCEPTED" : "APPLICATION_REJECTED",
          title,
          message,
        },
      });

      // Retourner les données actualisées.
      const updatedApplication = await tx.application.findUnique({
        where: {
          id: application.id,
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

      return { type: "ok", application: updatedApplication };
    });

    if (outcome.type === "campaign-missing") {
      return res.status(404).json({
        success: false,
        message: "Candidature introuvable ou accès non autorisé.",
      });
    }

    if (outcome.type === "campaign-not-published") {
      return res.status(409).json({
        success: false,
        message:
          "Seule une campagne publiée peut faire l'objet d'une acceptation.",
        currentStatus: outcome.currentStatus,
      });
    }

    if (outcome.type === "duplicate") {
      return res.status(409).json({
        success: false,
        message: "Une collaboration existe déjà pour cette candidature.",
      });
    }

    if (outcome.type === "already") {
      return res.status(409).json({
        success: false,
        message: "Cette candidature a déjà été traitée.",
      });
    }

    return res.status(200).json({
      success: true,
      message: accepted
        ? "Candidature acceptée. Collaboration créée et notification envoyée."
        : "Candidature refusée. Une notification a été créée pour le créateur.",
      application: outcome.application,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors du traitement de la candidature :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de traiter la candidature.",
    });
  }
}

/**
 * Permet à un créateur de retirer sa propre candidature.
 * Seules les candidatures en attente peuvent être retirées.
 */
async function withdrawApplication(req, res) {
  try {
    // Vérifier le rôle de l'utilisateur connecté.
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Seuls les créateurs peuvent retirer une candidature.",
      });
    }

    // Récupérer le profil du créateur connecté.
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!creatorProfile) {
      return res.status(400).json({
        success: false,
        message: "Aucun profil créateur n'est associé à ce compte.",
      });
    }

    // Vérifier que la candidature appartient à ce créateur.
    const application = await prisma.application.findFirst({
      where: {
        id: req.params.applicationId,
        creatorProfileId: creatorProfile.id,
      },
      select: {
        id: true,
        status: true,
        campaignId: true,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Candidature introuvable ou accès non autorisé.",
      });
    }

    // Une candidature déjà acceptée ou refusée ne peut pas être retirée.
    if (application.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Seule une candidature en attente peut être retirée.",
        currentStatus: application.status,
      });
    }

    // Le verrou de campagne sérialise le retrait avec l'acceptation et la
    // clôture de la campagne : une clôture ne peut pas s'intercaler entre
    // la vérification du statut et la mise à jour de la candidature.
    const outcome = await prisma.$transaction(async (tx) => {
      const lockedCampaign = await lockCampaign(tx, application.campaignId);

      if (!lockedCampaign) {
        return { type: "campaign-missing" };
      }

      // Vérifier à nouveau le statut au moment de la modification
      // pour éviter un retrait simultané à son acceptation.
      const updateResult = await tx.application.updateMany({
        where: {
          id: application.id,
          creatorProfileId: creatorProfile.id,
          status: "PENDING",
        },
        data: {
          status: "WITHDRAWN",
        },
      });

      if (updateResult.count === 0) {
        return { type: "already" };
      }

      // Récupérer la candidature mise à jour dans la même transaction.
      const updatedApplication = await tx.application.findUnique({
        where: {
          id: application.id,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          campaign: {
            select: {
              id: true,
              title: true,
              companyProfile: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
      });

      return { type: "ok", application: updatedApplication };
    });

    if (outcome.type === "campaign-missing") {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (outcome.type === "already") {
      return res.status(409).json({
        success: false,
        message:
          "La candidature a déjà été traitée ou retirée. Actualisez son statut.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Votre candidature a été retirée avec succès.",
      application: outcome.application,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors du retrait de la candidature :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de retirer la candidature.",
    });
  }
}

module.exports = {
  submitApplication,
  getMyApplications,
  getCampaignApplications,
  updateApplicationStatus,
  withdrawApplication,
};
