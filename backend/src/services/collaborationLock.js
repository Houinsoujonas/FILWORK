/**
 * Verrouillage transactionnel d'une collaboration.
 *
 * Toutes les écritures liées à une collaboration (clôture, annulation,
 * création/soumission/examen de livrable, création/mise à jour de paiement)
 * doivent acquérir ce verrou en premier, dans une transaction PostgreSQL.
 *
 * Le verrou `FOR UPDATE` sérialise les opérations concurrentes : une clôture
 * ne peut pas s'intercaler entre la vérification du statut et l'écriture d'un
 * livrable ou d'un paiement. Il est libéré automatiquement à la fin de la
 * transaction (commit ou rollback).
 *
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {string} collaborationId
 * @returns {Promise<{ id: string, status: string } | null>}
 */
async function lockCollaboration(tx, collaborationId) {
  const rows = await tx.$queryRaw`
    SELECT "id", "status"
    FROM "Collaboration"
    WHERE "id" = ${collaborationId}
    FOR UPDATE
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Verrouillage transactionnel d'une campagne.
 *
 * Les transitions de statut d'une campagne (publication, suspension,
 * clôture) et les opérations qui créent une candidature, une invitation
 * ou une collaboration doivent acquérir ce verrou en premier, dans une
 * transaction PostgreSQL.
 *
 * Le verrou `FOR UPDATE` sérialise ces opérations : une clôture ne peut
 * pas s'intercaler entre la vérification du statut PUBLISHED et la
 * création d'une candidature ou d'une invitation. Il est libéré
 * automatiquement à la fin de la transaction (commit ou rollback).
 *
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {string} campaignId
 * @returns {Promise<{ id: string, status: string } | null>}
 */
async function lockCampaign(tx, campaignId) {
  const rows = await tx.$queryRaw`
    SELECT "id", "status"
    FROM "Campaign"
    WHERE "id" = ${campaignId}
    FOR UPDATE
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0];
}

module.exports = {
  lockCollaboration,
  lockCampaign,
};
