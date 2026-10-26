const fs = require("node:fs");
const path = require("node:path");

// Charger .env uniquement s'il existe.
// Sur Render, les variables seront fournies par l'environnement.
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  require("node:process").loadEnvFile(envPath);
}

const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/**
 * Créer le premier compte administrateur de FILWORK.
 *
 * Les identifiants sont fournis temporairement par l'environnement.
 * Un compte existant ne sera jamais modifié automatiquement.
 */
async function main() {
  const email =
    typeof process.env.FILWORK_ADMIN_EMAIL === "string"
      ? process.env.FILWORK_ADMIN_EMAIL.trim().toLowerCase()
      : "";

  const password = process.env.FILWORK_ADMIN_PASSWORD;

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("L'adresse e-mail fournie est invalide.");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new Error(
      "Le mot de passe doit contenir au moins 8 caractères."
    );
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(
      "Le mot de passe ne doit pas dépasser 72 octets."
    );
  }

  // Ne jamais transformer automatiquement un compte existant en ADMIN.
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new Error(
      "Un compte utilise déjà cette adresse. Aucun compte n'a été modifié."
    );
  }

  // Utiliser le même algorithme que le contrôleur d'inscription.
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
    },
  });

  console.log("Compte administrateur créé avec succès.");
  console.log("Rôle :", admin.role);
  console.log("Identifiant du compte :", admin.id);
  console.log("Date de création :", admin.createdAt.toISOString());
}

main()
  .catch((error) => {
    console.error(
      "Création du compte administrateur impossible :",
      error.message
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });