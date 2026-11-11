const prisma = require("../config/prisma");

/**
 * Supprime les jetons expirés ou déjà utilisés :
 * - JWT révoqués expirés (table RevokedToken) ;
 * - jetons de réinitialisation expirés ou consommés (PasswordResetToken).
 *
 * @returns {Promise<{revokedDeleted: number, resetDeleted: number}>}
 */
async function cleanupExpiredTokens() {
  const now = new Date();

  const revokedTokens = await prisma.revokedToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  const resetTokens = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        {
          expiresAt: {
            lt: now,
          },
        },
        {
          usedAt: {
            not: null,
          },
        },
      ],
    },
  });

  return {
    revokedDeleted: revokedTokens.count,
    resetDeleted: resetTokens.count,
  };
}

module.exports = {
  cleanupExpiredTokens,
};
