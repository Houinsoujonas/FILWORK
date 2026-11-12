/**
 * Publication de campagne — notification aux créateurs éligibles.
 *
 * Événement : une entreprise publie une campagne (`DRAFT|PAUSED → PUBLISHED`).
 *
 * Destinataires : tous les comptes `CREATOR` actifs dont le profil créateur
 * existe, en excluant les comptes désactivés et les adresses documentaires
 * réservées (RFC 2606) utilisées uniquement pour les exemples.
 *
 * Canaux :
 *   1) Notification in-app (tableau de bord créateur) — créée dans la même
 *      transaction que la transition de campagne.
 *   2) Email dans l'EmailOutbox — mis en file pour chaque destinataire
 *      actif, avec préférence respectée (`campaignEmails`). L'envoi réel
 *      est assuré par le worker / le déclencheur SMTP configuré.
 *
 * Déduplication : une contrainte unique partielle garantit une seule
 * notification de type CAMPAIGN_PUBLISHED par (userId, campaignId). La
 * mise en pause puis republication ne produit donc jamais de doublon.
 *
 * Comportement robuste : une erreur lors du dispatch ne remet pas en cause
 * la transition de statut déjà commise.
 */

const prisma = require("../config/prisma");
const { RESERVED_EMAIL_CONDITIONS } = require("./profileVisibility");
const { enqueueCampaignPublishedEmail } = require("./emailService");
const { buildLink } = require("./notificationService");

const BATCH_SIZE = 500;

/**
 * Notifie les créateurs éligibles qu'une campagne vient d'être publiée.
 * Doit être appelée APRÈS la validation transactionnelle de la transition.
 *
 * @param {{campaign: object, companyName: string}} context
 */
async function notifyEligibleCreators({ campaign, companyName }) {
  if (!campaign?.id) {
    return { notified: 0, enqueuedEmails: 0 };
  }

  const link = buildLink(`/campagnes/${campaign.id}`);
  const title = `Nouvelle opportunité : ${companyName} publie une campagne`;
  const message = `${companyName} vient de publier « ${campaign.title} ». Consultez les détails et postulez dès maintenant.`;

  let cursor = null;
  let totalNotified = 0;
  let totalEnqueuedEmails = 0;

  // Parcours par lots pour ne pas matérialiser tous les créateurs en mémoire.
  while (true) {
    const where = {
      user: {
        isActive: true,
        role: "CREATOR",
        NOT: RESERVED_EMAIL_CONDITIONS,
      },
    };

    const creators = await prisma.creatorProfile.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    });

    if (creators.length === 0) {
      break;
    }

    cursor = creators[creators.length - 1].id;

    const userIds = creators.map((creator) => creator.userId);

    // 1) Créer les notifications in-app (en lots).
    const notifyData = creators.map((creator) => ({
      userId: creator.userId,
      type: "CAMPAIGN_PUBLISHED",
      title,
      message,
      link,
      campaignId: campaign.id,
    }));

    try {
      await prisma.notification.createMany({
        data: notifyData,
        skipDuplicates: true,
      });
      totalNotified += notifyData.length;
    } catch (error) {
      console.error(
        `Erreur lors de la création des notifications CAMPAIGN_PUBLISHED pour la campagne ${campaign.id} :`,
        error.message,
      );
    }

    // 2) Mettre en file les emails pour les utilisateurs actifs avec préférence.
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, campaignEmails: true },
    });

    const preferencesByUserId = new Map(
      preferences.map((p) => [p.userId, p.campaignEmails]),
    );

    for (const creator of creators) {
      if (!creator.user?.email) {
        continue;
      }

      // Par défaut les préférences sont activées ; l'utilisateur peut opt-out.
      const allowed = preferencesByUserId.get(creator.userId) ?? true;

      if (!allowed) {
        continue;
      }

      try {
        const enqueued = await enqueueCampaignPublishedEmail({
          to: creator.user.email,
          displayName: creator.displayName,
          companyName,
          campaignTitle: campaign.title,
          campaignDescription: campaign.description,
          link,
        });

        if (enqueued) {
          totalEnqueuedEmails += 1;
        }
      } catch (error) {
        console.error(
          `Erreur lors de la mise en file de l'email de campagne publiée pour ${creator.userId} :`,
          error.message,
        );
      }
    }
  }

  return { notified: totalNotified, enqueuedEmails: totalEnqueuedEmails };
}

module.exports = {
  notifyEligibleCreators,
};
