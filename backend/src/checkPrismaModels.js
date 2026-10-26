require("dotenv").config();

const prisma = require("./config/prisma");

async function main() {
  console.log("User :", Boolean(prisma.user));
  console.log("CreatorProfile :", Boolean(prisma.creatorProfile));
  console.log("CompanyProfile :", Boolean(prisma.companyProfile));
}

main()
  .catch((error) => {
    console.error("Erreur :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });