//Il crée une instance de Prisma Client que nous pourrons réutiliser dans les
// contrôleurs et les services de FILWORK, sans recréer une connexion à chaque requête.//
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("La variable DATABASE_URL est introuvable.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
