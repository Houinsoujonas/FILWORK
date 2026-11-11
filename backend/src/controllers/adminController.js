const prisma = require("../config/prisma");
const { sendPrismaError } = require("../utils/prismaErrors");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ["CREATOR", "COMPANY", "ADMIN"];

/**
 * Verrouille les lignes des administrateurs actifs pour sÃ©rialiser
 * les opÃ©rations sensibles sur les comptes administrateurs.
 */
async function lockActiveAdminIds(tx) {
  const rows = await tx.$queryRaw`SELECT id FROM "User" WHERE "role" = 'ADMIN' AND "isActive" = true FOR UPDATE`;
  return rows.map((row) => row.id);
}

async function countOtherActiveAdmins(tx, targetId) {
  const activeAdminIds = await lockActiveAdminIds(tx);
  return activeAdminIds.filter((id) => id !== targetId).length;
}

/**
 * Tableau de bord administratif.
 * Seul un utilisateur ADMIN peut accÃ©der Ã  cette fonctionnalitÃ©.
 */
async function getDashboardStats(req, res) {
  try {
    const [
      totalUsers,
      totalCreators,
      totalCompanies,
      totalAdmins,

      totalCampaigns,
      publishedCampaigns,
      draftCampaigns,

      totalApplications,
      pendingApplications,

      totalInvitations,
      pendingInvitations,

      totalCollaborations,
      activeCollaborations,

      totalDeliverables,
      pendingDeliverables,
      submittedDeliverables,

      totalPayments,
      paidPayments,

      unreadNotifications,
    ] = await Promise.all([
      // Utilisateurs
      prisma.user.count(),
      prisma.user.count({
        where: { role: "CREATOR" },
      }),
      prisma.user.count({
        where: { role: "COMPANY" },
      }),
      prisma.user.count({
        where: { role: "ADMIN" },
      }),

      // Campagnes
      prisma.campaign.count(),
      prisma.campaign.count({
        where: { status: "PUBLISHED" },
      }),
      prisma.campaign.count({
        where: { status: "DRAFT" },
      }),

      // Candidatures
      prisma.application.count(),
      prisma.application.count({
        where: { status: "PENDING" },
      }),

      // Invitations
      prisma.invitation.count(),
      prisma.invitation.count({
        where: { status: "PENDING" },
      }),

      // Collaborations
      prisma.collaboration.count(),
      prisma.collaboration.count({
        where: { status: "ACTIVE" },
      }),

      // Livrables
      prisma.deliverable.count(),
      prisma.deliverable.count({
        where: { status: "PENDING" },
      }),
      prisma.deliverable.count({
        where: { status: "SUBMITTED" },
      }),

      // Paiements
      prisma.payment.count(),
      prisma.payment.count({
        where: { status: "PAID" },
      }),

      // Notifications non lues
      prisma.notification.count({
        where: { isRead: false },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Statistiques administratives rÃ©cupÃ©rÃ©es avec succÃ¨s.",
      stats: {
        users: {
          total: totalUsers,
          creators: totalCreators,
          companies: totalCompanies,
          admins: totalAdmins,
        },

        campaigns: {
          total: totalCampaigns,
          published: publishedCampaigns,
          drafts: draftCampaigns,
        },

        applications: {
          total: totalApplications,
          pending: pendingApplications,
        },

        invitations: {
          total: totalInvitations,
          pending: pendingInvitations,
        },

        collaborations: {
          total: totalCollaborations,
          active: activeCollaborations,
        },

        deliverables: {
          total: totalDeliverables,
          pending: pendingDeliverables,
          submitted: submittedDeliverables,
        },

        payments: {
          total: totalPayments,
          paid: paidPayments,
        },

        notifications: {
          unread: unreadNotifications,
        },
      },
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la rÃ©cupÃ©ration des statistiques administratives :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©cupÃ©rer les statistiques administratives.",
    });
  }
}

/**
 * Liste des utilisateurs de FILWORK pour l'administration.
 *
 * FonctionnalitÃ©s :
 * - Pagination.
 * - Recherche par adresse e-mail.
 * - Filtrage par rÃ´le.
 * - Exclusion du mot de passe hachÃ© des rÃ©sultats.
 */
async function getAdminUsers(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numÃ©ro de page doit Ãªtre un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit Ãªtre comprise entre 1 et 100.",
      });
    }

    const allowedRoles = ["CREATOR", "COMPANY", "ADMIN"];

    let role;

    if (req.query.role !== undefined) {
      if (typeof req.query.role !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le rÃ´le fourni est invalide.",
        });
      }

      role = req.query.role.trim().toUpperCase();

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Le rÃ´le doit Ãªtre CREATOR, COMPANY ou ADMIN.",
        });
      }
    }

    let search;

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le terme de recherche est invalide.",
        });
      }

      search = req.query.search.trim();

      if (search.length > 100) {
        return res.status(400).json({
          success: false,
          message: "La recherche ne doit pas dÃ©passer 100 caractÃ¨res.",
        });
      }
    }

    const where = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.email = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({
        where,
      }),

      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,

        // Ne jamais inclure passwordHash dans la rÃ©ponse.
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,

          creatorProfile: {
            select: {
              id: true,
              displayName: true,
              niche: true,
              country: true,
              city: true,
            },
          },

          companyProfile: {
            select: {
              id: true,
              companyName: true,
              industry: true,
              country: true,
              city: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: users.length,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      users,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la rÃ©cupÃ©ration des utilisateurs administratifs :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©cupÃ©rer les utilisateurs.",
    });
  }
}

/**
 * Consulter les campagnes de FILWORK depuis le back-office.
 *
 * FonctionnalitÃ©s :
 * - Pagination.
 * - Recherche par titre ou description.
 * - Filtrage par statut.
 * - Informations sur l'entreprise propriÃ©taire.
 * - Nombre de candidatures et d'invitations.
 */
async function getAdminCampaigns(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numÃ©ro de page doit Ãªtre un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit Ãªtre comprise entre 1 et 100.",
      });
    }

    const allowedStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"];

    let status;

    if (req.query.status !== undefined) {
      if (typeof req.query.status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le statut fourni est invalide.",
        });
      }

      status = req.query.status.trim().toUpperCase();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Le statut doit Ãªtre DRAFT, PUBLISHED, PAUSED ou CLOSED.",
        });
      }
    }

    let search;

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le terme de recherche est invalide.",
        });
      }

      search = req.query.search.trim();

      if (search.length > 100) {
        return res.status(400).json({
          success: false,
          message: "La recherche ne doit pas dÃ©passer 100 caractÃ¨res.",
        });
      }
    }

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [total, campaigns] = await Promise.all([
      prisma.campaign.count({
        where,
      }),

      prisma.campaign.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          title: true,
          description: true,
          objectives: true,
          deliverables: true,
          location: true,
          platforms: true,
          budget: true,
          currency: true,
          startDate: true,
          endDate: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,

          companyProfile: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              industry: true,
              country: true,
              city: true,
            },
          },

          _count: {
            select: {
              applications: true,
              invitations: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: campaigns.length,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      campaigns,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la rÃ©cupÃ©ration des campagnes administratives :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©cupÃ©rer les campagnes.",
    });
  }
}

/**
 * Consulter toutes les collaborations depuis le back-office.
 *
 * FonctionnalitÃ©s :
 * - Pagination.
 * - Filtrage par statut.
 * - Filtrage par origine : candidature ou invitation.
 * - Informations sur le crÃ©ateur et l'entreprise.
 * - Nombre de livrables et de paiements associÃ©s.
 */
async function getAdminCollaborations(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numÃ©ro de page doit Ãªtre un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit Ãªtre comprise entre 1 et 100.",
      });
    }

    const allowedStatuses = [
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
    ];

    let status;

    if (req.query.status !== undefined) {
      if (typeof req.query.status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le statut fourni est invalide.",
        });
      }

      status = req.query.status.trim().toUpperCase();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Le statut doit Ãªtre ACTIVE, COMPLETED ou CANCELLED.",
        });
      }
    }

    const allowedOrigins = ["APPLICATION", "INVITATION"];

    let origin;

    if (req.query.origin !== undefined) {
      if (typeof req.query.origin !== "string") {
        return res.status(400).json({
          success: false,
          message: "L'origine fournie est invalide.",
        });
      }

      origin = req.query.origin.trim().toUpperCase();

      if (!allowedOrigins.includes(origin)) {
        return res.status(400).json({
          success: false,
          message:
            "L'origine doit Ãªtre APPLICATION ou INVITATION.",
        });
      }
    }

    const where = {};

    if (status) {
      where.status = status;
    }

    if (origin === "APPLICATION") {
      where.applicationId = {
        not: null,
      };
    } else if (origin === "INVITATION") {
      where.invitationId = {
        not: null,
      };
    }

    const [total, collaborations] = await Promise.all([
      prisma.collaboration.count({
        where,
      }),

      prisma.collaboration.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          applicationId: true,
          invitationId: true,
          agreedAmount: true,
          currency: true,
          status: true,
          startDate: true,
          endDate: true,
          terms: true,
          createdAt: true,
          updatedAt: true,

          application: {
            select: {
              id: true,
              status: true,

              creatorProfile: {
                select: {
                  id: true,
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
                      companyName: true,
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
              proposedAmount: true,
              currency: true,
              respondedAt: true,

              creatorProfile: {
                select: {
                  id: true,
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
                      companyName: true,
                    },
                  },
                },
              },
            },
          },

          _count: {
            select: {
              deliverables: true,
              payments: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: collaborations.length,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      collaborations,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la rÃ©cupÃ©ration des collaborations administratives :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©cupÃ©rer les collaborations.",
    });
  }
}

/**
 * Consulter les livrables de FILWORK depuis le back-office.
 *
 * FonctionnalitÃ©s :
 * - Pagination.
 * - Filtrage par statut.
 * - Recherche par titre ou description.
 * - Informations sur le crÃ©ateur, la campagne et l'entreprise.
 */
async function getAdminDeliverables(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numÃ©ro de page doit Ãªtre un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit Ãªtre comprise entre 1 et 100.",
      });
    }

    const allowedStatuses = [
      "PENDING",
      "SUBMITTED",
      "REVISION_REQUESTED",
      "APPROVED",
    ];

    let status;

    if (req.query.status !== undefined) {
      if (typeof req.query.status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le statut fourni est invalide.",
        });
      }

      status = req.query.status.trim().toUpperCase();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Le statut doit Ãªtre PENDING, SUBMITTED, REVISION_REQUESTED ou APPROVED.",
        });
      }
    }

    let search;

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le terme de recherche est invalide.",
        });
      }

      search = req.query.search.trim();

      if (search.length > 100) {
        return res.status(400).json({
          success: false,
          message: "La recherche ne doit pas dÃ©passer 100 caractÃ¨res.",
        });
      }
    }

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [total, deliverables] = await Promise.all([
      prisma.deliverable.count({
        where,
      }),

      prisma.deliverable.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueDate: true,
          submittedAt: true,
          assetUrl: true,
          feedback: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,

          collaboration: {
            select: {
              id: true,
              status: true,
              agreedAmount: true,
              currency: true,

              application: {
                select: {
                  id: true,

                  creatorProfile: {
                    select: {
                      id: true,
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
                          companyName: true,
                        },
                      },
                    },
                  },
                },
              },

              invitation: {
                select: {
                  id: true,

                  creatorProfile: {
                    select: {
                      id: true,
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
                          companyName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: deliverables.length,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      deliverables,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la rÃ©cupÃ©ration des livrables administratifs :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©cupÃ©rer les livrables.",
    });
  }
}

/**
 * Consulter les paiements de FILWORK depuis le back-office.
 *
 * FonctionnalitÃ©s :
 * - Pagination.
 * - Filtrage par statut.
 * - Filtrage selon l'origine de la collaboration.
 * - Informations sur le crÃ©ateur, la campagne et l'entreprise.
 *
 * Cette fonction permet de consulter les paiements.
 * Elle ne rÃ©alise aucun transfert d'argent.
 */
async function getAdminPayments(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numÃ©ro de page doit Ãªtre un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit Ãªtre comprise entre 1 et 100.",
      });
    }

    const allowedStatuses = [
      "PLANNED",
      "PENDING",
      "PAID",
      "FAILED",
      "CANCELLED",
    ];

    let status;

    if (req.query.status !== undefined) {
      if (typeof req.query.status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le statut fourni est invalide.",
        });
      }

      status = req.query.status.trim().toUpperCase();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Le statut doit Ãªtre PLANNED, PENDING, PAID, FAILED ou CANCELLED.",
        });
      }
    }

    const allowedOrigins = ["APPLICATION", "INVITATION"];

    let origin;

    if (req.query.origin !== undefined) {
      if (typeof req.query.origin !== "string") {
        return res.status(400).json({
          success: false,
          message: "L'origine fournie est invalide.",
        });
      }

      origin = req.query.origin.trim().toUpperCase();

      if (!allowedOrigins.includes(origin)) {
        return res.status(400).json({
          success: false,
          message: "L'origine doit Ãªtre APPLICATION ou INVITATION.",
        });
      }
    }

    const where = {};

    if (status) {
      where.status = status;
    }

    if (origin === "APPLICATION") {
      where.collaboration = {
        is: {
          applicationId: {
            not: null,
          },
        },
      };
    } else if (origin === "INVITATION") {
      where.collaboration = {
        is: {
          invitationId: {
            not: null,
          },
        },
      };
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({
        where,
      }),

      prisma.payment.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          dueDate: true,
          paidAt: true,
          reference: true,
          notes: true,
          createdAt: true,
          updatedAt: true,

          collaboration: {
            select: {
              id: true,
              status: true,
              agreedAmount: true,
              currency: true,
              applicationId: true,
              invitationId: true,

              application: {
                select: {
                  id: true,
                  status: true,

                  creatorProfile: {
                    select: {
                      id: true,
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
                          companyName: true,
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
                  proposedAmount: true,
                  currency: true,

                  creatorProfile: {
                    select: {
                      id: true,
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
                          companyName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: payments.length,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      payments,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error(
      "Erreur lors de la rÃ©cupÃ©ration des paiements administratifs :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©cupÃ©rer les paiements.",
    });
  }
}

/**
 * Modifier un utilisateur depuis le back-office.
 *
 * Seuls les champs autorisÃ©s peuvent Ãªtre modifiÃ©s : adresse e-mail, rÃ´le.
 * Un administrateur ne peut pas modifier son propre rÃ´le ni se dÃ©sactiver.
 * Seul un ADMIN peut attribuer le rÃ´le ADMIN.
 * Le dernier administrateur actif ne peut pas Ãªtre rÃ©trogradÃ© ni dÃ©sactivÃ©.
 */
async function updateAdminUser(req, res) {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant utilisateur est invalide.",
      });
    }

    const body = req.body || {};
    const allowedFields = ["email", "role"];

    const unknownFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Champs non autorisÃ©s : ${unknownFields.join(", ")}.`,
      });
    }

    // Validation et normalisation de l'e-mail.
    let email;
    if (body.email !== undefined) {
      if (typeof body.email !== "string") {
        return res.status(400).json({
          success: false,
          message: "L'adresse e-mail doit Ãªtre un texte.",
        });
      }

      email = body.email.trim().toLowerCase();

      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Veuillez fournir une adresse e-mail valide.",
        });
      }
    }

    // Validation et normalisation du rÃ´le.
    let role;
    if (body.role !== undefined) {
      if (typeof body.role !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le rÃ´le doit Ãªtre un texte.",
        });
      }

      role = body.role.trim().toUpperCase();

      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Le rÃ´le doit Ãªtre CREATOR, COMPANY ou ADMIN.",
        });
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: id.trim() },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    // Un administrateur ne peut pas modifier son propre rÃ´le.
    if (
      role !== undefined &&
      req.user.id === targetUser.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez pas modifier votre propre rÃ´le.",
      });
    }

    // Seul un ADMIN peut attribuer le rÃ´le ADMIN.
    if (
      role === "ADMIN" &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Seul un administrateur peut attribuer le rÃ´le ADMIN.",
      });
    }

    const wouldDemoteLastAdmin =
      targetUser.role === "ADMIN" &&
      targetUser.isActive &&
      role !== undefined &&
      role !== "ADMIN";

    const outcome = await prisma.$transaction(async (tx) => {
      // Si la modification retire le dernier administrateur actif, refuser.
      if (wouldDemoteLastAdmin) {
        const otherActiveAdmins = await countOtherActiveAdmins(tx, targetUser.id);

        if (otherActiveAdmins === 0) {
          return { type: "last-admin" };
        }
      }

      // VÃ©rifier l'unicitÃ© de l'e-mail si modifiÃ©.
      if (email && email !== targetUser.email) {
        const existingUser = await tx.user.findUnique({
          where: { email },
        });

        if (existingUser && existingUser.id !== targetUser.id) {
          return { type: "duplicate-email" };
        }
      }

      const data = {};

      if (email !== undefined) {
        data.email = email;
      }

      if (role !== undefined) {
        data.role = role;
      }

      // Invalider les sessions existantes de l'utilisateur cible.
      const updatedUser = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          ...data,
          tokenVersion: {
            increment: 1,
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return { type: "ok", user: updatedUser };
    });

    if (outcome.type === "last-admin") {
      return res.status(403).json({
        success: false,
        message:
          "OpÃ©ration refusÃ©e : le dernier administrateur actif ne peut pas Ãªtre rÃ©trogradÃ©.",
      });
    }

    if (outcome.type === "duplicate-email") {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est dÃ©jÃ  utilisÃ©e.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Utilisateur mis Ã  jour avec succÃ¨s.",
      user: outcome.user,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la mise Ã  jour de l'utilisateur :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de mettre Ã  jour l'utilisateur.",
    });
  }
}

/**
 * DÃ©sactiver un utilisateur depuis le back-office.
 * L'utilisateur ne peut plus se connecter ni utiliser ses sessions existantes.
 * Le dernier administrateur actif ne peut pas Ãªtre dÃ©sactivÃ©.
 */
async function deactivateUser(req, res) {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant utilisateur est invalide.",
      });
    }

    // Un administrateur ne peut pas se dÃ©sactiver lui-mÃªme.
    if (req.user.id === id.trim()) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez pas dÃ©sactiver votre propre compte.",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: id.trim() },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (!targetUser.isActive) {
      return res.status(409).json({
        success: false,
        message: "Ce compte est dÃ©jÃ  dÃ©sactivÃ©.",
      });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      if (targetUser.role === "ADMIN") {
        const otherActiveAdmins = await countOtherActiveAdmins(tx, targetUser.id);

        if (otherActiveAdmins === 0) {
          return { type: "last-admin" };
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          isActive: false,
          tokenVersion: {
            increment: 1,
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return { type: "ok", user: updatedUser };
    });

    if (outcome.type === "last-admin") {
      return res.status(403).json({
        success: false,
        message:
          "OpÃ©ration refusÃ©e : le dernier administrateur actif ne peut pas Ãªtre dÃ©sactivÃ©.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Compte dÃ©sactivÃ© avec succÃ¨s.",
      user: outcome.user,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la dÃ©sactivation du compte :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de dÃ©sactiver le compte.",
    });
  }
}

/**
 * RÃ©activer un utilisateur depuis le back-office.
 */
async function reactivateUser(req, res) {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant utilisateur est invalide.",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: id.trim() },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (targetUser.isActive) {
      return res.status(409).json({
        success: false,
        message: "Ce compte est dÃ©jÃ  actif.",
      });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Verrouiller les admins actifs avant toute rÃ©activation pour Ã©viter
      // des Ã©tats intermÃ©diaires pendant les opÃ©rations concurrentes.
      if (targetUser.role === "ADMIN") {
        await lockActiveAdminIds(tx);
      }

      return tx.user.update({
        where: { id: targetUser.id },
        data: {
          isActive: true,
          tokenVersion: {
            increment: 1,
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Compte rÃ©activÃ© avec succÃ¨s.",
      user: updatedUser,
    });
  } catch (error) {
    if (sendPrismaError(res, error)) {
      return;
    }

    console.error("Erreur lors de la rÃ©activation du compte :", error.message);

    return res.status(500).json({
      success: false,
      message: "Impossible de rÃ©activer le compte.",
    });
  }
}

module.exports = {
  getDashboardStats,
  getAdminUsers,
  getAdminCampaigns,
  getAdminCollaborations,
  getAdminDeliverables,
  getAdminPayments,
  updateAdminUser,
  deactivateUser,
  reactivateUser,
};
