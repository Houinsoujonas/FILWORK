require("dotenv").config();

const prisma = require("./config/prisma");

async function main() {
  const companies = await prisma.user.findMany({
    where: {
      role: "COMPANY",
      email: {
        startsWith: "security.company.",
      },
    },
    select: {
      email: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (companies.length === 0) {
    console.log("Aucune entreprise de test trouvée.");
    return;
  }

  console.log("Comptes entreprise de test :");
  console.table(companies);
}

main()
  .catch((error) => {
    console.error("Erreur :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });