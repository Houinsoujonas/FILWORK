const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");
const { lockCollaboration } = require("../services/collaborationLock");

/**
 * Définit les relations et les informations accessibles
 * aux deux participants d'une collaboration.
 *
 * Une collaboration peut provenir :
 * - d'une candidature acceptée ;
 * - d'une invitation acceptée.
 */
const COLLABORATION_INCLUDE = {
  application: {
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,

      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          bio: true,
          niche: true,
          location: true,
          country: true,
          city: true,
          profileImageUrl: true,
          mediaKitUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          youtubeUrl: true,
          startingRate: true,
          rateCurrency: true,
          availabilityStatus: true,
        },
      },

      campaign: {
        select: {
          id: true,
          title: true,
          description: true,
          platforms: true,
          budget: true,
          currency: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,

          companyProfile: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              location: true,
              country: true,
              city: true,
              websiteUrl: true,
            },
          },
        },
      },
    },
  },

  invitation: {
    select: {
      id: true,
      status: true,
      message: true,
      proposedAmount: true,
      currency: true,
      respondedAt: true,
      createdAt: true,

      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          bio: true,
          niche: true,
          location: true,
          country: true,
          city: true,
          profileImageUrl: true,
          mediaKitUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          youtubeUrl: true,
          startingRate: true,
          rateCurrency: true,
          availabilityStatus: true,
        },
      },

      campaign: {
        select: {
          id: true,
          title: true,
          description: true,
          platforms: true,
          budget: true,
          currency: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,

          companyProfile: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              location: true,
              country: true,
              city: true,
              websiteUrl: true,
            },
          },
        },
      },
    },
  },

  deliverables: {
    orderBy: {
      createdAt: "asc",
    },
  },

  payments: {
    orderBy: {
      createdAt: "desc",
    },
  },
};

/**
 * Relations minimales nécessaires aux opérations de cycle de vie.
 *
 * Elles permettent d'identifier les deux participants sans exposer
 * d'informations supplémentaires dans les réponses publiques.
 */
const COLLABORATION_ACTION_INCLUDE = {
  application: {
    select: {
      creatorProfile: {
        select: {
          userId: true,
          displayName: true,
        },
      },
      campaign: {
        select: {
          title: true,
          companyProfile: {
            select: {
              userId: true,
              companyName: true,
            },
          },
        },
      },
    },
  },

  invitation: {
    select: {
      creatorProfile: {
        select: {
          userId: true,
          displayName: true,
        },
      },
      campaign: {
        select: {
          title: true,
          companyProfile: {
            select: {
              userId: true,
              companyName: true,
            },
          },
        },
      },
    },
  },
};

/**
 * États qui traduisent un engagement réel et empêchent le créateur
 * d'annuler unilatéralement une collaboration.
 *
 * Livrables :
 * - SUBMITTED : le créateur a fourni un travail ;
 * - REVISION_REQUESTED : un travail a déjà été fourni puis renvoyé ;
 * - APPROVED : le travail a été validé par l'entreprise.
 * PENDING n'est qu'une demande de l'entreprise, sans production du créateur.
 *
 * Paiements :
 * - PENDING : un règlement est engagé ou en cours ;
 * - PAID : un règlement a été effectué.
 * PLANNED n'est qu'une intention, FAILED une tentative sans règlement,
 * CANCELLED un paiement abandonné : aucun de ces états ne matérialise
 * un engagement du créateur.
 */
const CREATOR_CANCELLATION_BLOCKING_DELIVERABLE_STATUSES = [
  "SUBMITTED",
  "REVISION_REQUESTED",
  "APPROVED",
];

const CREATOR_CANCELLATION_BLOCKING_PAYMENT_STATUSES = ["PENDING", "PAID"];

const MAX_CANCELLATION_REASON_LENGTH = 2000;

/**
 * Identifie le créateur et l'entreprise associés à une collaboration,
 * quelle que soit son origine (candidature ou invitation).
 */
function getCollaborationParticipants(collaboration) {
  const origin = collaboration.application || collaboration.invitation;

  if (!origin) {
    return null;
  }

  const creatorUserId = origin.creatorProfile?.userId;
  const companyUserId = origin.campaign?.companyProfile?.userId;

  if (!creatorUserId || !companyUserId) {
    return null;
  }

  return {
    creatorUserId,
    companyUserId,
    creatorName: origin.creatorProfile?.displayName || "Le créateur",
    companyName: origin.campaign?.companyProfile?.companyName || "L'entreprise",
    campaignTitle: origin.campaign?.title || "la campagne",
  };
}

/**
 * Charge l'état courant des livrables et paiements dans la transaction
 * (la collaboration est déjà verrouillée par l'appelant).
 */
async function getCreatorEngagement(tx, collaborationId) {
  const deliverables = await tx.deliverable.findMany({
    where: {
      collaborationId,
    },
    select: {
      status: true,
    },
  });

  const payments = await tx.payment.findMany({
    where: {
      collaborationId,
    },
    select: {
      status: true,
    },
  });

  const blockingDeliverables = deliverables.filter((deliverable) =>
    CREATOR_CANCELLATION_BLOCKING_DELIVERABLE_STATUSES.includes(
      deliverable.status,
    ),
  ).length;

  const blockingPayments = payments.filter((payment) =>
    CREATOR_CANCELLATION_BLOCKING_PAYMENT_STATUSES.includes(payment.status),
  ).length;

  return {
    blocked: blockingDeliverables > 0 || blockingPayments > 0,
    blockingDeliverables,
    blockingPayments,
  };
}

/**
 * Détermine les collaborations accessibles à l'utilisateur connecté.
 *
 * Un créateur ne voit que ses propres collaborations.
 * Une entreprise ne voit que les collaborations associées à ses campagnes.
 *
 * Les deux origines sont prises en compte :
 * - application ;
 * - invitation.
 */
async function getOwnershipFilter(user) {
  // Cas du créateur.
  if (user.role === "CREATOR") {
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!creatorProfile) {
      return {
        error: "Aucun profil créateur n'est associé à ce compte.",
        status: 400,
      };
    }

    return {
      where: {
        OR: [
          {
            application: {
              is: {
                creatorProfileId: creatorProfile.id,
              },
            },
          },
          {
            invitation: {
              is: {
                creatorProfileId: creatorProfile.id,
              },
            },
          },
        ],
      },
    };
  }

  // Cas de l'entreprise.
  if (user.role === "COMPANY") {
    const companyProfile = await prisma.companyProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!companyProfile) {
      return {
        error: "Aucun profil d'entreprise n'est associé à ce compte.",
        status: 400,
      };
    }

    return {
      where: {
        OR: [
          {
            application: {
              is: {
                campaign: {
                  is: {
                    companyProfileId: companyProfile.id,
                  },
                },
              },
            },
          },
          {
            invitation: {
              is: {
                campaign: {
                  is: {
                    companyProfileId: companyProfile.id,
                  },
                },
              },
            },
          },
        ],
      },
    };
  }

  // Les autres rôles ne sont pas autorisés.
  return {
    error: "Ce type de compte ne peut pas accéder aux collaborations.",
    status: 403,
  };
}

/**
 * Consulter les collaborations de l'utilisateur connecté.
 *
 * GET /api/collaborations
 */
async function getMyCollaborations(req, res) {
  try {
    const ownership = await getOwnershipFilter(req.user);

    if (ownership.error) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error,
      });
    }

    const collaborations = await prisma.collaboration.findMany({
      where: ownership.where,

      orderBy: {
        createdAt: "desc",
      },

      include: COLLABORATION_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      count: collaborations.length,
      collaborations,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la récupération des collaborations :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les collaborations.",
    });
  }
}

/**
 * Consulter une collaboration précise.
 *
 * GET /api/collaborations/:id
 *
 * L'accès est limité à l'entreprise propriétaire de la campagne
 * et au créateur participant, quelle que soit l'origine de la
 * collaboration.
 */
async function getCollaborationById(req, res) {
  try {
    const ownership = await getOwnershipFilter(req.user);

    if (ownership.error) {
      return res.status(ownership.status).json({
        success: false,
        message: ownership.error,
      });
    }

    const collaboration = await prisma.collaboration.findFirst({
      where: {
        id: req.params.id,
        ...ownership.where,
      },

      include: COLLABORATION_INCLUDE,
    });

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration introuvable ou accès non autorisé.",
      });
    }

    return res.status(200).json({
      success: true,
      collaboration,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la récupération de la collaboration :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer cette collaboration.",
    });
  }
}

/**
 * Charge une collaboration accessible à l'utilisateur connecté,
 * avec les informations nécessaires aux actions de cycle de vie.
 */
async function getActionableCollaboration(req) {
  const ownership = await getOwnershipFilter(req.user);

  if (ownership.error) {
    return {
      error: ownership.error,
      status: ownership.status,
    };
  }

  const collaboration = await prisma.collaboration.findFirst({
    where: {
      id: req.params.id,
      ...ownership.where,
    },
    include: COLLABORATION_ACTION_INCLUDE,
  });

  if (!collaboration) {
    return {
      error: "Collaboration introuvable ou accès non autorisé.",
      status: 404,
    };
  }

  const participants = getCollaborationParticipants(collaboration);

  if (!participants) {
    return {
      error:
        "Impossible d'identifier les participants de cette collaboration.",
      status: 409,
    };
  }

  return {
    collaboration,
    participants,
  };
}

/**
 * Clôturer une collaboration.
 *
 * PATCH /api/collaborations/:id/complete
 *
 * Seule l'entreprise participante peut clôturer. La date de clôture réelle
 * est enregistrée dans `endDate`. L'opération est idempotente : une
 * collaboration déjà clôturée renvoie 200, un autre état terminal renvoie 409.
 */
async function completeCollaboration(req, res) {
  try {
    const loaded = await getActionableCollaboration(req);

    if (loaded.error) {
      return res.status(loaded.status).json({
        success: false,
        message: loaded.error,
      });
    }

    const { collaboration, participants } = loaded;

    if (participants.companyUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "Seule l'entreprise participante peut clôturer cette collaboration.",
      });
    }

    const body = req.body || {};

    if (Object.keys(body).length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const locked = await lockCollaboration(tx, collaboration.id);

      if (!locked) {
        return { type: "missing" };
      }

      if (locked.status === "COMPLETED") {
        return { type: "already" };
      }

      if (locked.status !== "ACTIVE") {
        return { type: "conflict", currentStatus: locked.status };
      }

      await tx.collaboration.update({
        where: {
          id: collaboration.id,
        },
        data: {
          status: "COMPLETED",
          endDate: new Date(),
        },
      });

      // Les deux participants sont notifiés dans la même transaction que
      // le changement de statut, y compris l'entreprise qui a déclenché
      // la clôture.
      await tx.notification.create({
        data: {
          userId: participants.creatorUserId,
          collaborationId: collaboration.id,
          type: "COLLABORATION_COMPLETED",
          title: "Collaboration clôturée",
          message: `${participants.companyName} a clôturé la collaboration liée à la campagne « ${participants.campaignTitle} ».`,
        },
      });

      await tx.notification.create({
        data: {
          userId: participants.companyUserId,
          collaborationId: collaboration.id,
          type: "COLLABORATION_COMPLETED",
          title: "Collaboration clôturée",
          message: `Vous avez clôturé la collaboration liée à la campagne « ${participants.campaignTitle} ». Le créateur a été informé.`,
        },
      });

      return { type: "ok" };
    });

    if (outcome.type === "missing") {
      return res.status(404).json({
        success: false,
        message: "Collaboration introuvable ou accès non autorisé.",
      });
    }

    if (outcome.type === "conflict") {
      return res.status(409).json({
        success: false,
        message:
          outcome.currentStatus === "CANCELLED"
            ? "Cette collaboration a été annulée et ne peut pas être clôturée."
            : "Cette collaboration ne peut pas être clôturée dans son état actuel.",
        currentStatus: outcome.currentStatus,
      });
    }

    const refreshed = await prisma.collaboration.findUnique({
      where: {
        id: collaboration.id,
      },
      include: COLLABORATION_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message:
        outcome.type === "already"
          ? "Cette collaboration est déjà clôturée."
          : "Collaboration clôturée avec succès.",
      collaboration: refreshed,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la clôture de la collaboration :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de clôturer cette collaboration.",
    });
  }
}

/**
 * Annuler une collaboration.
 *
 * PATCH /api/collaborations/:id/cancel
 *
 * - l'entreprise peut annuler librement, avec un motif obligatoire ;
 * - le créateur ne peut annuler que s'il n'existe aucun engagement
 *   (livrable déjà soumis ou paiement en attente/payé).
 *
 * L'opération est idempotente : une collaboration déjà annulée renvoie 200,
 * un autre état terminal renvoie 409.
 */
async function cancelCollaboration(req, res) {
  try {
    const loaded = await getActionableCollaboration(req);

    if (loaded.error) {
      return res.status(loaded.status).json({
        success: false,
        message: loaded.error,
      });
    }

    const { collaboration, participants } = loaded;

    const isCompany = participants.companyUserId === req.user.id;
    const isCreator = participants.creatorUserId === req.user.id;

    if (!isCompany && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "Vous ne participez pas à cette collaboration.",
      });
    }

    const body = req.body || {};

    const unknownFields = Object.keys(body).filter(
      (field) => field !== "reason",
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    let reason = null;

    if (body.reason !== undefined && body.reason !== null) {
      if (typeof body.reason !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le motif d'annulation doit être un texte.",
        });
      }

      reason = body.reason.trim();

      if (reason.length === 0) {
        reason = null;
      }
    }

    if (reason && reason.length > MAX_CANCELLATION_REASON_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Le motif d'annulation ne doit pas dépasser ${MAX_CANCELLATION_REASON_LENGTH} caractères.`,
      });
    }

    // Le motif obligatoire de l'entreprise est vérifié dans la transaction,
    // après avoir constaté que la collaboration est encore ACTIVE. Une
    // annulation déjà effectuée reste ainsi idempotente (200).

    const outcome = await prisma.$transaction(async (tx) => {
      const locked = await lockCollaboration(tx, collaboration.id);

      if (!locked) {
        return { type: "missing" };
      }

      if (locked.status === "CANCELLED") {
        return { type: "already" };
      }

      if (locked.status !== "ACTIVE") {
        return { type: "conflict", currentStatus: locked.status };
      }

      if (isCompany && !reason) {
        return { type: "missing-reason" };
      }

      // Le créateur ne peut pas se désengager unilatéralement si un
      // livrable a déjà été produit ou si un paiement est engagé.
      if (isCreator) {
        const engagement = await getCreatorEngagement(tx, collaboration.id);

        if (engagement.blocked) {
          return {
            type: "engagement",
            blockingDeliverables: engagement.blockingDeliverables,
            blockingPayments: engagement.blockingPayments,
          };
        }
      }

      await tx.collaboration.update({
        where: {
          id: collaboration.id,
        },
        data: {
          status: "CANCELLED",
          endDate: new Date(),
          cancellationReason: reason,
          cancelledByRole: req.user.role,
        },
      });

      const actorUserId = isCompany
        ? participants.companyUserId
        : participants.creatorUserId;

      const otherUserId = isCompany
        ? participants.creatorUserId
        : participants.companyUserId;

      const actorName = isCompany
        ? participants.companyName
        : participants.creatorName;

      const reasonSuffix = reason ? ` Motif : ${reason}` : "";

      const otherPartyMessage = `${actorName} a annulé la collaboration liée à la campagne « ${participants.campaignTitle} ».${reasonSuffix}`;

      const actorMessage = `Vous avez annulé la collaboration liée à la campagne « ${participants.campaignTitle} ».${reasonSuffix}`;

      // Les deux participants sont notifiés dans la même transaction que
      // le changement de statut, y compris l'auteur de l'annulation.
      await tx.notification.create({
        data: {
          userId: otherUserId,
          collaborationId: collaboration.id,
          type: "COLLABORATION_CANCELLED",
          title: "Collaboration annulée",
          message: otherPartyMessage,
        },
      });

      await tx.notification.create({
        data: {
          userId: actorUserId,
          collaborationId: collaboration.id,
          type: "COLLABORATION_CANCELLED",
          title: "Collaboration annulée",
          message: actorMessage,
        },
      });

      return { type: "ok" };
    });

    if (outcome.type === "missing") {
      return res.status(404).json({
        success: false,
        message: "Collaboration introuvable ou accès non autorisé.",
      });
    }

    if (outcome.type === "missing-reason") {
      return res.status(400).json({
        success: false,
        message: "Un motif d'annulation est obligatoire.",
      });
    }

    if (outcome.type === "conflict") {
      return res.status(409).json({
        success: false,
        message:
          outcome.currentStatus === "COMPLETED"
            ? "Cette collaboration a été clôturée et ne peut pas être annulée."
            : "Cette collaboration ne peut pas être annulée dans son état actuel.",
        currentStatus: outcome.currentStatus,
      });
    }

    if (outcome.type === "engagement") {
      return res.status(409).json({
        success: false,
        message:
          "Vous ne pouvez pas annuler cette collaboration : un livrable a déjà été soumis ou un paiement est engagé.",
        engagement: {
          blockingDeliverables: outcome.blockingDeliverables,
          blockingPayments: outcome.blockingPayments,
        },
      });
    }

    const refreshed = await prisma.collaboration.findUnique({
      where: {
        id: collaboration.id,
      },
      include: COLLABORATION_INCLUDE,
    });

    return res.status(200).json({
      success: true,
      message:
        outcome.type === "already"
          ? "Cette collaboration est déjà annulée."
          : "Collaboration annulée avec succès.",
      collaboration: refreshed,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de l'annulation de la collaboration :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible d'annuler cette collaboration.",
    });
  }
}

module.exports = {
  getMyCollaborations,
  getCollaborationById,
  completeCollaboration,
  cancelCollaboration,
};
