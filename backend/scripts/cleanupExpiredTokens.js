require("dotenv").config();

const prisma = require("../src/config/prisma");
const { cleanupExpiredTokens } = require("../src/services/maintenanceService");

(async () => {
  try {
    const result = await cleanupExpiredTokens();

    console.log("[FILWORK] Nettoyage terminé.");
    console.log(`JWT révoqués expirés supprimés : ${result.revokedDeleted}`);
    console.log(`Jetons de réinitialisation supprimés : ${result.resetDeleted}`);
  } catch (error) {
    console.error("[FILWORK] Erreur pendant le nettoyage :", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
