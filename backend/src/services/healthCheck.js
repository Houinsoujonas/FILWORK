/**
 * Vérification de la santé de la base de données.
 *
 * Distingue :
 *   - Base inaccessible (connexion impossible ou erreur SQL/Prisma inattendue)
 *   - Connexion PostgreSQL fonctionnelle, mais schéma applicatif absent
 *   - Base correctement initialisée
 *
 * Aucun message de la table cible Prisma n'est renvoyé au client : seul un
 * état agrégé est exposé. Le client reçoit également un identifiant
 * de corrélation via `x-request-id` (voir middlewares/errorMiddleware).
 */

const REQUIRED_TABLES = [
  "User",
  "CreatorProfile",
  "CompanyProfile",
  "Campaign",
];

/**
 * @param {{ $queryRaw: Function }} client — instance Prisma (peut être un mock en test)
 * @returns {Promise<{reachable: boolean, schemaReady: boolean, errorName?: string}>}
 */
async function checkDatabaseHealth(client) {
  try {
    // Sélection bornée sur une table critique du schéma applicatif.
    // Utiliser une seule requête pour limiter la latence serverless.
    await client.$queryRaw`SELECT 1 FROM "User" LIMIT 1;`;

    // Vérifier également l'existence des tables pivots (best effort).
    // Si l'une manque, on renvoie schemaReady=false.
    for (const table of REQUIRED_TABLES) {
      if (table === "User") {
        continue; // déjà vérifié
      }

      // Identifiant filtré pour éviter les injections (table donnée, pas d'entrée utilisateur).
      await client.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
    }

    return { reachable: true, schemaReady: true };
  } catch (error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");

    // Codes Prisma / PostgreSQL strictement liés à l'absence d'une relation (table).
    // Ne pas confondre avec undefined_column (42703) ou autres erreurs.
    const isSchemaMissing =
      code === "P2021" || // Prisma: table does not exist
      code === "42P01";   // undefined_table SQLSTATE

    if (isSchemaMissing) {
      return { reachable: true, schemaReady: false };
    }

    // Vérification texte précise : uniquement "relation \"<name>\" does not exist".
    // Ne couvre jamais "column <x> does not exist" (42883 / undefined_function ou 42703).
    const relationMissing = /\brelation\s+"[^"]+"\s+does not exist/i.test(message);

    if (relationMissing) {
      return { reachable: true, schemaReady: false };
    }

    return { reachable: false, schemaReady: false, errorName: error?.name || "Unknown" };
  }
}

module.exports = {
  checkDatabaseHealth,
};
