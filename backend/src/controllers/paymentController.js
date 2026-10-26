const prisma = require("../config/prisma");

const PAYMENT_STATUSES = ["PLANNED", "PENDING", "PAID", "FAILED", "CANCELLED"];

/**
 * Vérifier qu'une collaboration appartient à l'utilisateur connecté.
 *
 * Une collaboration peut provenir d'une candidature ou d'une invitation.
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

  // Déterminer l'origine de la collaboration.
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

  // Seuls le créateur et l'entreprise concernés peuvent accéder
  // à cette collaboration.
  if (user.id !== creatorUserId && user.id !== companyUserId) {
    return null;
  }

  return {
    ...collaboration,
    _creatorUserId: creatorUserId,
    _companyUserId: companyUserId,
  };
}

/**
 * Créer un paiement prévu pour une collaboration.
 * Seule l'entreprise propriétaire peut créer un paiement.
 */
async function createPayment(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent créer des paiements.",
      });
    }

    const body = req.body || {};
    const allowedFields = ["amount", "currency", "dueDate", "notes"];

    const unknownFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs non autorisés : ${unknownFields.join(", ")}.`,
      });
    }

    // Validation du montant.
    if (typeof body.amount !== "number" && typeof body.amount !== "string") {
      return res.status(400).json({
        success: false,
        message: "Le montant est obligatoire et doit être numérique.",
      });
    }

    const amountString = String(body.amount).trim();

    // Decimal(12,2) : maximum 10 chiffres avant la virgule.
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(amountString)) {
      return res.status(400).json({
        success: false,
        message:
          "Le montant est invalide. Deux décimales au maximum sont autorisées.",
      });
    }

    if (Number(amountString) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant doit être supérieur à zéro.",
      });
    }

    // Validation de la devise.
    let currency = "XOF";

    if (body.currency !== undefined) {
      if (
        typeof body.currency !== "string" ||
        !/^[A-Za-z]{3}$/.test(body.currency.trim())
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La devise doit être un code de trois lettres, par exemple XOF.",
        });
      }

      currency = body.currency.trim().toUpperCase();
    }

    // Validation de la date d'échéance.
    let dueDate = null;

    if (body.dueDate !== undefined && body.dueDate !== null) {
      if (typeof body.dueDate !== "string" || !body.dueDate.trim()) {
        return res.status(400).json({
          success: false,
          message: "La date d'échéance est invalide.",
        });
      }

      dueDate = new Date(body.dueDate);

      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "La date d'échéance est invalide.",
        });
      }
    }

    // Validation des notes.
    let notes = null;

    if (body.notes !== undefined && body.notes !== null) {
      if (typeof body.notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "Les notes doivent être un texte.",
        });
      }

      notes = body.notes.trim();

      if (notes.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Les notes ne doivent pas dépasser 5000 caractères.",
        });
      }

      if (notes.length === 0) {
        notes = null;
      }
    }

    // Vérifier que la collaboration est accessible.
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

    // Seule l'entreprise propriétaire peut planifier un paiement.
    if (collaboration._companyUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez gérer que les paiements de vos collaborations.",
      });
    }
    if (collaboration.status !== "ACTIVE") {
      return res.status(409).json({
        success: false,
        message:
          "Les paiements ne peuvent être planifiés que pour une collaboration active.",
      });
    }

    const payment = await prisma.payment.create({
      data: {
        collaborationId: collaboration.id,
        amount: amountString,
        currency,
        dueDate,
        notes,
        status: "PLANNED",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Paiement enregistré avec succès.",
      payment,
    });
  } catch (error) {
    console.error("Erreur lors de la création du paiement :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible d'enregistrer le paiement.",
    });
  }
}

/**
 * Consulter les paiements d'une collaboration.
 * Seuls ses deux participants peuvent y accéder.
 */
async function getCollaborationPayments(req, res) {
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

    const payments = await prisma.payment.findMany({
      where: {
        collaborationId: collaboration.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPaid = payments
      .filter((payment) => payment.status === "PAID")
      .reduce((total, payment) => total + Number(payment.amount), 0);

    return res.status(200).json({
      success: true,
      count: payments.length,
      totalPaid,
      payments,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des paiements :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les paiements.",
    });
  }
}

/**
 * Mettre à jour le statut d'un paiement.
 * Seule l'entreprise propriétaire peut modifier le statut.
 */
async function updatePaymentStatus(req, res) {
  try {
    if (req.user.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Seules les entreprises peuvent mettre à jour les paiements.",
      });
    }

    const body = req.body || {};
    const allowedFields = ["status", "reference", "notes"];

    const unknownFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs non autorisés : ${unknownFields.join(", ")}.`,
      });
    }

    if (
      typeof body.status !== "string" ||
      !PAYMENT_STATUSES.includes(body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le statut fourni est invalide.",
      });
    }

    let reference;
    let notes;

    if (body.reference !== undefined) {
      if (body.reference !== null && typeof body.reference !== "string") {
        return res.status(400).json({
          success: false,
          message: "La référence doit être un texte.",
        });
      }

      reference =
        typeof body.reference === "string"
          ? body.reference.trim() || null
          : null;

      if (reference && reference.length > 200) {
        return res.status(400).json({
          success: false,
          message: "La référence ne doit pas dépasser 200 caractères.",
        });
      }
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "Les notes doivent être un texte.",
        });
      }

      notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

      if (notes && notes.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Les notes ne doivent pas dépasser 5000 caractères.",
        });
      }
    }

    const payment = await prisma.payment.findUnique({
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

    // Identifier l'entreprise propriétaire de la campagne.
    const companyUserId =
      payment?.collaboration?.application?.campaign?.companyProfile?.userId ??
      payment?.collaboration?.invitation?.campaign?.companyProfile?.userId;

    // Refuser l'accès si le paiement n'existe pas ou appartient
    // à une autre entreprise.
    if (!payment || companyUserId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: "Paiement introuvable ou accès non autorisé.",
      });
    }

    // Transitions autorisées.
    const allowedTransitions = {
      PLANNED: ["PENDING", "CANCELLED"],
      PENDING: ["PAID", "FAILED", "CANCELLED"],
      FAILED: ["PENDING", "CANCELLED"],
      PAID: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[payment.status].includes(body.status)) {
      return res.status(409).json({
        success: false,
        message: `Transition impossible : ${payment.status} vers ${body.status}.`,
        currentStatus: payment.status,
      });
    }

    const data = {
      status: body.status,
    };

    if (reference !== undefined) {
      data.reference = reference;
    }

    if (notes !== undefined) {
      data.notes = notes;
    }

    if (body.status === "PAID") {
      data.paidAt = new Date();
    }

    // Éviter deux changements de statut concurrents.
    const updateResult = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: payment.status,
      },
      data,
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        success: false,
        message: "Le paiement a changé d'état. Actualisez la page.",
      });
    }

    const updatedPayment = await prisma.payment.findUnique({
      where: {
        id: payment.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Statut du paiement mis à jour.",
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du paiement :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de mettre à jour le paiement.",
    });
  }
}

module.exports = {
  createPayment,
  getCollaborationPayments,
  updatePaymentStatus,
};
