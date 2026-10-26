require("dotenv").config();

const prisma = require("../src/config/prisma");

async function cleanupExpiredTokens() {
  const now = new Date();

  // Supprimer uniquement les JWT révoqués déjà expirés.
  const revokedTokens = await prisma.revokedToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  // Supprimer les jetons de réinitialisation expirés ou déjà utilisés.
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

  console.log("[FILWORK] Nettoyage terminé.");
  console.log(
    `JWT révoqués expirés supprimés : ${revokedTokens.count}`,
  );
  console.log(
    `Jetons de réinitialisation supprimés : ${resetTokens.count}`,
  );
}

cleanupExpiredTokens()
  .catch((error) => {
    console.error(
      "[FILWORK] Erreur pendant le nettoyage :",
      error.message,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });