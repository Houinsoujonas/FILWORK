const prisma = require("../config/prisma");

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

    // Créer la candidature.
    // Le schéma Prisma empêche un créateur de candidater deux fois
    // à la même campagne grâce à sa contrainte unique.
    const application = await prisma.application.create({
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

    return res.status(201).json({
      success: true,
      message: "Votre candidature a été envoyée avec succès.",
      application,
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

    if (
      typeof body.status !== "string" ||
      !["ACCEPTED", "REJECTED"].includes(body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le statut doit être ACCEPTED ou REJECTED.",
      });
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
    const updatedApplication = await prisma.$transaction(async (tx) => {
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
        return null;
      }

      let collaboration = null;

      // Une acceptation crée automatiquement une collaboration.
      if (body.status === "ACCEPTED") {
        collaboration = await tx.collaboration.create({
          data: {
            applicationId: application.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
            status: true,
            startDate: true,
          },
        });
      }

      const accepted = body.status === "ACCEPTED";

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
          type: accepted
            ? "APPLICATION_ACCEPTED"
            : "APPLICATION_REJECTED",
          title,
          message,
        },
      });

      // Retourner les données actualisées.
      return tx.application.findUnique({
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
              startDate: true,
            },
          },
        },
      });
    });

    if (!updatedApplication) {
      return res.status(409).json({
        success: false,
        message: "Cette candidature a déjà été traitée.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        body.status === "ACCEPTED"
          ? "Candidature acceptée. Collaboration créée et notification envoyée."
          : "Candidature refusée. Une notification a été créée pour le créateur.",
      application: updatedApplication,
    });
  } catch (error) {
    console.error(
      "Erreur lors du traitement de la candidature :",
      error,
    );

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

    // Vérifier à nouveau le statut au moment de la modification
    // pour éviter un retrait simultané à son acceptation.
    const updateResult = await prisma.application.updateMany({
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
      return res.status(409).json({
        success: false,
        message:
          "La candidature a déjà été traitée ou retirée. Actualisez son statut.",
      });
    }

    // Récupérer la candidature mise à jour.
    const updatedApplication = await prisma.application.findUnique({
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

    return res.status(200).json({
      success: true,
      message: "Votre candidature a été retirée avec succès.",
      application: updatedApplication,
    });
  } catch (error) {
    console.error(
      "Erreur lors du retrait de la candidature :",
      error,
    );

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