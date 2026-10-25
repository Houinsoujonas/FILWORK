const prisma = require("../config/prisma");

/**
 * Vérifie qu'une collaboration existe et que l'utilisateur connecté
 * est bien l'entreprise ou le créateur qui y participe.
 *
 * La collaboration peut provenir d'une candidature ou d'une invitation.
 */
async function getAccessibleCollaboration(collaborationId, user) {
  const collaboration = await prisma.collaboration.findUnique({
    where: {
      id: collaborationId,
    },
    include: {
      application: {
        select: {
          creatorProfile: {
            select: {
              userId: true,
            },
          },
          campaign: {
            select: {
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
            },
          },
          campaign: {
            select: {
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
    },
  });

  if (!collaboration) {
    return null;
  }

  // Identifier l'origine réelle de la collaboration.
  const origin = collaboration.application || collaboration.invitation;

  if (!origin) {
    return null;
  }

  const creatorUserId = origin.creatorProfile?.userId;
  const companyUserId = origin.campaign?.companyProfile?.userId;

  // Vérifier que les deux participants sont correctement associés.
  if (!creatorUserId || !companyUserId) {
    return null;
  }

  // Aucun autre utilisateur ne doit accéder à la collaboration.
  if (user.id !== creatorUserId && user.id !== companyUserId) {
    return null;
  }

  // Ajouter les identifiants des participants pour les vérifications
  // internes du contrôleur.
  return {
    ...collaboration,
    _creatorUserId: creatorUserId,
    _companyUserId: companyUserId,
  };
}

/**
 * Créer un livrable pour une collaboration.
 * Seule l'entreprise propriétaire peut définir les livrables.
 */
async function createDeliverable(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent créer des livrables.",
      });
    }

    const body = req.body || {};

    const allowedFields = ["title", "description", "dueDate"];

    const unknownFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title || title.length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "Le titre est obligatoire et ne doit pas dépasser 200 caractères.",
      });
    }

    let description = null;

    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== "string") {
        return res.status(400).json({
          success: false,
          message: "La description doit être un texte.",
        });
      }

      description = body.description.trim();

      if (description.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "La description ne doit pas dépasser 5000 caractères.",
        });
      }

      if (description.length === 0) {
        description = null;
      }
    }

    let dueDate = null;

    if (body.dueDate !== undefined && body.dueDate !== null) {
      if (typeof body.dueDate !== "string" || !body.dueDate.trim()) {
        return res.status(400).json({
          success: false,
          message: "La date limite est invalide.",
        });
      }

      dueDate = new Date(body.dueDate);

      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "La date limite est invalide.",
        });
      }

      if (dueDate.getTime() < Date.now()) {
        return res.status(400).json({
          success: false,
          message: "La date limite ne peut pas être dans le passé.",
        });
      }
    }

    const collaboration = await getAccessibleCollaboration(
      req.params.collaborationId,
      req.user,
    );

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration introuvable ou accès non autorisé.",
      });
    }

    if (collaboration._companyUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Seule l'entreprise propriétaire peut définir les livrables.",
      });
    }

    if (collaboration.status !== "ACTIVE") {
      return res.status(409).json({
        success: false,
        message: "Cette collaboration n'est pas active.",
      });
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        collaborationId: collaboration.id,
        title,
        description,
        dueDate,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Livrable créé avec succès.",
      deliverable,
    });
  } catch (error) {
    console.error("Erreur lors de la création du livrable :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de créer le livrable.",
    });
  }
}

/**
 * Consulter les livrables d'une collaboration.
 * Seuls les deux participants peuvent y accéder.
 */
async function getCollaborationDeliverables(req, res) {
  try {
    const collaboration = await getAccessibleCollaboration(
      req.params.collaborationId,
      req.user,
    );

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration introuvable ou accès non autorisé.",
      });
    }

    const deliverables = await prisma.deliverable.findMany({
      where: {
        collaborationId: collaboration.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: deliverables.length,
      deliverables,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des livrables :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les livrables.",
    });
  }
}

/**
 * Le créateur soumet le lien de son travail.
 *
 * Un nouveau dépôt est autorisé si le livrable est en attente
 * ou si l'entreprise a demandé une révision.
 */
async function submitDeliverable(req, res) {
  try {
    if (req.user.role !== "CREATOR") {
      return res.status(403).json({
        success: false,
        message: "Seuls les créateurs peuvent soumettre un livrable.",
      });
    }

    const body = req.body || {};

    const unknownFields = Object.keys(body).filter(
      (field) => field !== "assetUrl",
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    if (
      typeof body.assetUrl !== "string" ||
      !body.assetUrl.trim() ||
      body.assetUrl.trim().length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Un lien valide vers le livrable est obligatoire.",
      });
    }

    const assetUrl = body.assetUrl.trim();

    let parsedUrl;

    try {
      parsedUrl = new URL(assetUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Le lien du livrable est invalide.",
      });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        message: "Le lien doit utiliser HTTP ou HTTPS.",
      });
    }

    const deliverable = await prisma.deliverable.findUnique({
  where: {
    id: req.params.id,
  },
  include: {
    collaboration: {
      include: {
        application: {
          select: {
            creatorProfile: {
              select: {
                userId: true,
              },
            },
          },
        },
        invitation: {
          select: {
            creatorProfile: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    },
  },
});

// Identifier le créateur associé à la collaboration,
// qu'elle provienne d'une candidature ou d'une invitation.
const creatorUserId =
  deliverable?.collaboration?.application?.creatorProfile?.userId ??
  deliverable?.collaboration?.invitation?.creatorProfile?.userId;

if (!deliverable || creatorUserId !== req.user.id) {
  return res.status(404).json({
    success: false,
    message: "Livrable introuvable ou accès non autorisé.",
  });
}
    if (deliverable.collaboration.status !== "ACTIVE") {
      return res.status(409).json({
        success: false,
        message: "Cette collaboration n'est plus active.",
      });
    }

    if (!["PENDING", "REVISION_REQUESTED"].includes(deliverable.status)) {
      return res.status(409).json({
        success: false,
        message: "Ce livrable ne peut pas être soumis dans son état actuel.",
      });
    }

    const updateResult = await prisma.deliverable.updateMany({
      where: {
        id: deliverable.id,
        status: deliverable.status,
      },
      data: {
        status: "SUBMITTED",
        assetUrl,
        submittedAt: new Date(),
        feedback: null,
        reviewedAt: null,
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        success: false,
        message:
          "Le livrable a changé d'état. Actualisez la page et réessayez.",
      });
    }

    const updatedDeliverable = await prisma.deliverable.findUnique({
      where: {
        id: deliverable.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Livrable soumis avec succès.",
      deliverable: updatedDeliverable,
    });
  } catch (error) {
    console.error("Erreur lors de la soumission du livrable :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de soumettre le livrable.",
    });
  }
}

/**
 * L'entreprise valide le livrable ou demande une correction.
 */
async function reviewDeliverable(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent examiner un livrable.",
      });
    }

    const body = req.body || {};

    const unknownFields = Object.keys(body).filter(
      (field) => !["status", "feedback"].includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "La requête contient des champs non autorisés.",
      });
    }

    if (!["APPROVED", "REVISION_REQUESTED"].includes(body.status)) {
      return res.status(400).json({
        success: false,
        message: "Le statut doit être APPROVED ou REVISION_REQUESTED.",
      });
    }

    let feedback = null;

    if (body.feedback !== undefined && body.feedback !== null) {
      if (typeof body.feedback !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le commentaire doit être un texte.",
        });
      }

      feedback = body.feedback.trim();

      if (feedback.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Le commentaire ne doit pas dépasser 5000 caractères.",
        });
      }

      if (feedback.length === 0) {
        feedback = null;
      }
    }

    if (body.status === "REVISION_REQUESTED" && !feedback) {
      return res.status(400).json({
        success: false,
        message: "Précisez les corrections attendues.",
      });
    }

   const deliverable = await prisma.deliverable.findUnique({
  where: {
    id: req.params.id,
  },
  include: {
    collaboration: {
      include: {
        application: {
          select: {
            campaign: {
              select: {
                companyProfile: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
        invitation: {
          select: {
            campaign: {
              select: {
                companyProfile: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

// Identifier l'entreprise propriétaire de la campagne,
// que la collaboration provienne d'une candidature ou d'une invitation.
const companyUserId =
  deliverable?.collaboration?.application?.campaign
    ?.companyProfile?.userId ??
  deliverable?.collaboration?.invitation?.campaign
    ?.companyProfile?.userId;

if (!deliverable || companyUserId !== req.user.id) {
  return res.status(404).json({
    success: false,
    message: "Livrable introuvable ou accès non autorisé.",
  });
}

    if (deliverable.collaboration.status !== "ACTIVE") {
      return res.status(409).json({
        success: false,
        message: "Cette collaboration n'est plus active.",
      });
    }

    if (deliverable.status !== "SUBMITTED") {
      return res.status(409).json({
        success: false,
        message: "Seul un livrable soumis peut être examiné.",
      });
    }

    const updateResult = await prisma.deliverable.updateMany({
      where: {
        id: deliverable.id,
        status: "SUBMITTED",
      },
      data: {
        status: body.status,
        feedback,
        reviewedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        success: false,
        message: "Le livrable a déjà été examiné. Actualisez la page.",
      });
    }

    const updatedDeliverable = await prisma.deliverable.findUnique({
      where: {
        id: deliverable.id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        body.status === "APPROVED"
          ? "Livrable approuvé avec succès."
          : "Des corrections ont été demandées au créateur.",
      deliverable: updatedDeliverable,
    });
  } catch (error) {
    console.error("Erreur lors de l'examen du livrable :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible d'examiner le livrable.",
    });
  }
}

module.exports = {
  createDeliverable,
  getCollaborationDeliverables,
  submitDeliverable,
  reviewDeliverable,
};
