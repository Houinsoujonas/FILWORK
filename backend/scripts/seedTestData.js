// Crée ou met à jour les comptes, profils et campagnes nécessaires aux
// tests d'intégration FILWORK.
//
// Sécurité :
//   - charge exclusivement .env.test via testDatabaseGuard ;
//   - refuse toute cible identique à la production ;
//   - idempotent : relançable sans dupliquer les données ;
//   - n'écrit les identifiants que dans .env.test (fichier ignoré par Git).

const crypto = require("node:crypto");
const fs = require("node:fs");

const bcrypt = require("bcryptjs");

const { loadTestEnv, TEST_ENV_FILE, maskTarget } = require("./testDatabaseGuard");

const { testTarget } = loadTestEnv({ requireEnvFile: true });

const prisma = require("../src/config/prisma");

const PASSWORD_ROUNDS = 10;

// Identifiants stables et purement locaux.
const ACCOUNTS = {
  creator: {
    emailKey: "TEST_CREATOR_EMAIL",
    passwordKey: "TEST_CREATOR_PASSWORD",
    defaultEmail: "createur.test@filwork.local",
    role: "CREATOR",
    profile: {
      displayName: "Créatrice Test FILWORK",
      bio: "Profil créé automatiquement pour les tests d'intégration.",
      niche: "Lifestyle",
      location: "Abidjan, Côte d'Ivoire",
      country: "Côte d'Ivoire",
      city: "Abidjan",
      startingRate: "150000",
      rateCurrency: "XOF",
    },
  },
  company: {
    emailKey: "TEST_COMPANY_EMAIL",
    passwordKey: "TEST_COMPANY_PASSWORD",
    defaultEmail: "entreprise.test@filwork.local",
    role: "COMPANY",
    profile: {
      companyName: "Entreprise Test FILWORK",
      industry: "Technologie",
      description: "Entreprise créée automatiquement pour les tests.",
      location: "Abidjan, Côte d'Ivoire",
      country: "Côte d'Ivoire",
      city: "Abidjan",
      contactEmail: "contact.entreprise.test@filwork.local",
    },
  },
  otherCompany: {
    emailKey: "TEST_OTHER_COMPANY_EMAIL",
    passwordKey: "TEST_OTHER_COMPANY_PASSWORD",
    defaultEmail: "autre.entreprise.test@filwork.local",
    role: "COMPANY",
    profile: {
      companyName: "Entreprise Concurrente Test",
      industry: "Commerce",
      description: "Second compte entreprise pour les contrôles d'accès.",
      country: "Côte d'Ivoire",
      city: "Abidjan",
    },
  },
  otherCreator: {
    emailKey: "TEST_OTHER_CREATOR_EMAIL",
    passwordKey: "TEST_OTHER_CREATOR_PASSWORD",
    defaultEmail: "autre.createur.test@filwork.local",
    role: "CREATOR",
    profile: {
      displayName: "Créateur Secondaire Test",
      bio: "Second compte créateur pour les contrôles d'accès.",
      niche: "Technologie",
      country: "Côte d'Ivoire",
      city: "Abidjan",
    },
  },
  admin: {
    emailKey: "TEST_ADMIN_EMAIL",
    passwordKey: "TEST_ADMIN_PASSWORD",
    defaultEmail: "admin.test@filwork.local",
    role: "ADMIN",
    profile: null,
  },
};

function readTestEnv() {
  return fs.existsSync(TEST_ENV_FILE)
    ? fs.readFileSync(TEST_ENV_FILE, "utf8")
    : "";
}

/**
 * Remplace (ou ajoute) une clé dans .env.test sans toucher aux autres lignes.
 * Les lignes commentées du modèle (# TEST_X=) sont réactivées.
 */
function setEnvValue(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(`^[ \\t]*#?[ \\t]*${escapedKey}[ \\t]*=.*$`, "m");

  if (linePattern.test(content)) {
    return content.replace(linePattern, `${key}=${value}`);
  }

  const separator = content.endsWith("\n") ? "" : "\r\n";

  return `${content}${separator}${key}=${value}\r\n`;
}

function getOrCreateSecret(content, key) {
  const existing = content.match(new RegExp(`^${key}=(.+)$`, "m"));

  if (existing && existing[1].trim()) {
    return existing[1].trim();
  }

  return crypto.randomBytes(24).toString("hex");
}

async function upsertAccount(account, password) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: account.defaultEmail },
    update: {
      passwordHash,
      role: account.role,
      tokenVersion: 0,
    },
    create: {
      email: account.defaultEmail,
      passwordHash,
      role: account.role,
    },
  });

  if (!account.profile) {
    return user;
  }

  if (account.role === "COMPANY") {
    await prisma.companyProfile.upsert({
      where: { userId: user.id },
      update: account.profile,
      create: { userId: user.id, ...account.profile },
    });
  } else {
    await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: account.profile,
      create: { userId: user.id, ...account.profile },
    });
  }

  return user;
}

async function ensurePublishedCampaign({
  existingId,
  companyProfileId,
  title,
  description,
}) {
  if (existingId) {
    const existing = await prisma.campaign.findUnique({
      where: { id: existingId },
    });

    if (
      existing &&
      existing.companyProfileId === companyProfileId &&
      existing.status === "PUBLISHED"
    ) {
      return existing;
    }
  }

  return prisma.campaign.create({
    data: {
      companyProfileId,
      title,
      description,
      objectives: "Vérifier les parcours métier FILWORK de bout en bout.",
      deliverables: "Publication d'un contenu et rapport de performance.",
      location: "Abidjan",
      platforms: ["INSTAGRAM", "TIKTOK"],
      budget: "250000",
      currency: "XOF",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
}

async function main() {
  console.log(`[seed-test] Cible vérifiée : ${maskTarget(testTarget)}`);

  let envContent = readTestEnv();
  const resolved = {};
  const users = {};

  for (const [name, account] of Object.entries(ACCOUNTS)) {
    const password = getOrCreateSecret(envContent, account.passwordKey);

    users[name] = await upsertAccount(account, password);

    resolved[account.emailKey] = account.defaultEmail;
    resolved[account.passwordKey] = password;

    envContent = setEnvValue(
      envContent,
      account.emailKey,
      account.defaultEmail,
    );
    envContent = setEnvValue(envContent, account.passwordKey, password);

    console.log(
      `[seed-test] ${name} : ${account.defaultEmail} (${account.role})`,
    );
  }

  const companyProfile = await prisma.companyProfile.findUniqueOrThrow({
    where: { userId: users.company.id },
  });

  const mainCampaign = await ensurePublishedCampaign({
    existingId: process.env.TEST_CAMPAIGN_ID,
    companyProfileId: companyProfile.id,
    title: "Campagne de test FILWORK",
    description:
      "Campagne publiée servant aux tests d'intégration et aux parcours frontend.",
  });

  const ownershipCampaign = await ensurePublishedCampaign({
    existingId: process.env.TEST_OWNERSHIP_CAMPAIGN_ID,
    companyProfileId: companyProfile.id,
    title: "Campagne de test - contrôle de propriété",
    description:
      "Campagne appartenant à l'entreprise principale, utilisée pour vérifier qu'une autre entreprise n'y accède pas.",
  });

  envContent = setEnvValue(envContent, "TEST_CAMPAIGN_ID", mainCampaign.id);
  envContent = setEnvValue(
    envContent,
    "TEST_OWNERSHIP_CAMPAIGN_ID",
    ownershipCampaign.id,
  );

  fs.writeFileSync(TEST_ENV_FILE, envContent, "utf8");

  console.log(`[seed-test] TEST_CAMPAIGN_ID=${mainCampaign.id}`);
  console.log(
    `[seed-test] TEST_OWNERSHIP_CAMPAIGN_ID=${ownershipCampaign.id}`,
  );
  console.log("[seed-test] .env.test mis à jour.");
}

main()
  .catch((error) => {
    console.error("[seed-test] Échec :", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
