require("dotenv").config();

const prisma = require("./config/prisma");

async function main() {
  const result = await prisma.$queryRaw`SELECT 1 AS connection_ok`;

  const userCount = await prisma.user.count();

  console.log("Connexion PostgreSQL : OK");
  console.log("Test SQL :", result[0].connection_ok);
  console.log("Nombre d'utilisateurs :", userCount);
}

main()
  .catch((error) => {
    console.error("Échec du test de connexion :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });