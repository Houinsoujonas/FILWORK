const prisma = require("../config/prisma");

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

module.exports = {
  getMyCollaborations,
  getCollaborationById,
};
