/**
 * Nettoyage centralisé des données de test liées à une campagne.
 *
 * Ordre vérifié contre prisma/schema.prisma :
 *   1. Notification (références application/invitation/collaboration) ;
 *   2. ReviewResponse puis Review (ON DELETE RESTRICT côté Review) ;
 *   3. Collaboration (ON DELETE RESTRICT côté Collaboration.application /
 *      invitation) ;
 *   4. Campaign (cascade sur Application, Invitation, Deliverable, Payment).
 *
 * Deliverable et Payment sont supprimés en cascade par la suppression de la
 * Collaboration. Les notifications sont supprimées explicitement car leurs
 * relations utilisent ON DELETE SET NULL.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string | null | undefined} campaignId
 */
async function cleanupCampaignCascade(prisma, campaignId) {
  if (!campaignId) {
    return;
  }

  const collaborations = await prisma.collaboration.findMany({
    where: {
      OR: [
        {
          application: {
            is: {
              campaignId,
            },
          },
        },
        {
          invitation: {
            is: {
              campaignId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  const applications = await prisma.application.findMany({
    where: {
      campaignId,
    },
    select: {
      id: true,
    },
  });

  const invitations = await prisma.invitation.findMany({
    where: {
      campaignId,
    },
    select: {
      id: true,
    },
  });

  const collaborationIds = collaborations.map((item) => item.id);
  const applicationIds = applications.map((item) => item.id);
  const invitationIds = invitations.map((item) => item.id);

  const notificationFilters = [];

  if (collaborationIds.length > 0) {
    notificationFilters.push({
      collaborationId: {
        in: collaborationIds,
      },
    });
  }

  if (applicationIds.length > 0) {
    notificationFilters.push({
      applicationId: {
        in: applicationIds,
      },
    });
  }

  if (invitationIds.length > 0) {
    notificationFilters.push({
      invitationId: {
        in: invitationIds,
      },
    });
  }

  if (notificationFilters.length > 0) {
    await prisma.notification.deleteMany({
      where: {
        OR: notificationFilters,
      },
    });
  }

  if (collaborationIds.length > 0) {
    const reviews = await prisma.review.findMany({
      where: {
        collaborationId: {
          in: collaborationIds,
        },
      },
      select: {
        id: true,
      },
    });

    const reviewIds = reviews.map((review) => review.id);

    if (reviewIds.length > 0) {
      await prisma.reviewResponse.deleteMany({
        where: {
          reviewId: {
            in: reviewIds,
          },
        },
      });

      await prisma.review.deleteMany({
        where: {
          id: {
            in: reviewIds,
          },
        },
      });
    }

    await prisma.collaboration.deleteMany({
      where: {
        id: {
          in: collaborationIds,
        },
      },
    });
  }

  await prisma.campaign.deleteMany({
    where: {
      id: campaignId,
    },
  });
}

module.exports = {
  cleanupCampaignCascade,
};
