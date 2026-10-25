const prisma = require("../config/prisma");

/**
 * Tableau de bord administratif.
 * Seul un utilisateur ADMIN peut accéder à cette fonctionnalité.
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
      message: "Statistiques administratives récupérées avec succès.",
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
    console.error(
      "Erreur lors de la récupération des statistiques administratives :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les statistiques administratives.",
    });
  }
}

/**
 * Liste des utilisateurs de FILWORK pour l'administration.
 *
 * Fonctionnalités :
 * - Pagination.
 * - Recherche par adresse e-mail.
 * - Filtrage par rôle.
 * - Exclusion du mot de passe haché des résultats.
 */
async function getAdminUsers(req, res) {
  try {
    // 1. Valider la pagination.
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de page doit être un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit être comprise entre 1 et 100.",
      });
    }

    // 2. Valider le rôle demandé.
    const allowedRoles = ["CREATOR", "COMPANY", "ADMIN"];

    let role;

    if (req.query.role !== undefined) {
      if (typeof req.query.role !== "string") {
        return res.status(400).json({
          success: false,
          message: "Le rôle fourni est invalide.",
        });
      }

      role = req.query.role.trim().toUpperCase();

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Le rôle doit être CREATOR, COMPANY ou ADMIN.",
        });
      }
    }

    // 3. Valider le terme de recherche.
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
          message: "La recherche ne doit pas dépasser 100 caractères.",
        });
      }
    }

    // 4. Construire les filtres.
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

    // 5. Compter les résultats et récupérer la page demandée.
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

        // Ne jamais inclure passwordHash dans la réponse.
        select: {
          id: true,
          email: true,
          role: true,
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
    console.error(
      "Erreur lors de la récupération des utilisateurs administratifs :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les utilisateurs.",
    });
  }
}

/**
 * Consulter les campagnes de FILWORK depuis le back-office.
 *
 * Fonctionnalités :
 * - Pagination.
 * - Recherche par titre ou description.
 * - Filtrage par statut.
 * - Informations sur l'entreprise propriétaire.
 * - Nombre de candidatures et d'invitations.
 */
async function getAdminCampaigns(req, res) {
  try {
    // 1. Valider la pagination.
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de page doit être un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit être comprise entre 1 et 100.",
      });
    }

    // 2. Valider le statut demandé.
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
          message: "Le statut doit être DRAFT, PUBLISHED, PAUSED ou CLOSED.",
        });
      }
    }

    // 3. Valider la recherche.
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
          message: "La recherche ne doit pas dépasser 100 caractères.",
        });
      }
    }

    // 4. Construire les filtres.
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

    // 5. Récupérer les campagnes et le nombre total de résultats.
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
    console.error(
      "Erreur lors de la récupération des campagnes administratives :",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les campagnes.",
    });
  }
}

/**
 * Consulter toutes les collaborations depuis le back-office.
 *
 * Fonctionnalités :
 * - Pagination.
 * - Filtrage par statut.
 * - Filtrage par origine : candidature ou invitation.
 * - Informations sur le créateur et l'entreprise.
 * - Nombre de livrables et de paiements associés.
 */
async function getAdminCollaborations(req, res) {
  try {
    // 1. Valider la pagination.
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de page doit être un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit être comprise entre 1 et 100.",
      });
    }

    // 2. Valider le statut.
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
            "Le statut doit être ACTIVE, COMPLETED ou CANCELLED.",
        });
      }
    }

    // 3. Valider l'origine.
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
            "L'origine doit être APPLICATION ou INVITATION.",
        });
      }
    }

    // 4. Construire les filtres.
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

    // 5. Compter les résultats et récupérer la page demandée.
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
    console.error(
      "Erreur lors de la récupération des collaborations administratives :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les collaborations.",
    });
  }
}

/**
 * Consulter les livrables de FILWORK depuis le back-office.
 *
 * Fonctionnalités :
 * - Pagination.
 * - Filtrage par statut.
 * - Recherche par titre ou description.
 * - Informations sur le créateur, la campagne et l'entreprise.
 */
async function getAdminDeliverables(req, res) {
  try {
    // 1. Valider la pagination.
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de page doit être un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit être comprise entre 1 et 100.",
      });
    }

    // 2. Valider le statut du livrable.
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
            "Le statut doit être PENDING, SUBMITTED, REVISION_REQUESTED ou APPROVED.",
        });
      }
    }

    // 3. Valider la recherche.
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
          message: "La recherche ne doit pas dépasser 100 caractères.",
        });
      }
    }

    // 4. Construire les filtres.
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

    // 5. Compter les résultats et récupérer les livrables.
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
    console.error(
      "Erreur lors de la récupération des livrables administratifs :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les livrables.",
    });
  }
}

/**
 * Consulter les paiements de FILWORK depuis le back-office.
 *
 * Fonctionnalités :
 * - Pagination.
 * - Filtrage par statut.
 * - Filtrage selon l'origine de la collaboration.
 * - Informations sur le créateur, la campagne et l'entreprise.
 *
 * Cette fonction permet de consulter les paiements.
 * Elle ne réalise aucun transfert d'argent.
 */
async function getAdminPayments(req, res) {
  try {
    // 1. Valider la pagination.
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Le numéro de page doit être un entier positif.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "La limite doit être comprise entre 1 et 100.",
      });
    }

    // 2. Valider le statut du paiement.
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
            "Le statut doit être PLANNED, PENDING, PAID, FAILED ou CANCELLED.",
        });
      }
    }

    // 3. Valider l'origine de la collaboration.
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
          message: "L'origine doit être APPLICATION ou INVITATION.",
        });
      }
    }

    // 4. Construire les filtres.
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

    // 5. Compter les résultats et récupérer les paiements.
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
    console.error(
      "Erreur lors de la récupération des paiements administratifs :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les paiements.",
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
};
