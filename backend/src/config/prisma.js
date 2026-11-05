// Crée une instance de Prisma Client réutilisable dans les contrôleurs
// et les services de FILWORK, sans recréer une connexion à chaque requête.
//
// La sélection de la base est volontairement stricte :
//   - NODE_ENV=test  -> TEST_DATABASE_URL uniquement ;
//   - sinon          -> DATABASE_URL uniquement.
// Aucun repli silencieux n'est autorisé.

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const {
  assertApplicationDatabase,
  assertTestDatabase,
} = require("./databaseTarget");

const isTest = process.env.NODE_ENV === "test";
const connectionString = isTest
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isTest
      ? "La variable TEST_DATABASE_URL est introuvable."
      : "La variable DATABASE_URL est introuvable.",
  );
}

// Refuser toute configuration croisée avant même d'ouvrir une connexion.
if (isTest) {
  assertTestDatabase({
    testUrl: connectionString,
    productionUrls: [
      process.env.DATABASE_URL,
      process.env.DATABASE_URL_UNPOOLED,
    ],
    allowNonTestName: process.env.TEST_ALLOW_NON_TEST_NAMED_DB === "true",
  });
} else {
  assertApplicationDatabase({
    applicationUrl: connectionString,
    testUrl: process.env.TEST_DATABASE_URL,
  });
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
