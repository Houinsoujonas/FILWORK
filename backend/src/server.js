require("dotenv").config();

// Vérifier la configuration indispensable à l'authentification JWT.
if (
  typeof process.env.JWT_SECRET !== "string" ||
  !process.env.JWT_SECRET.trim()
) {
  console.error(
    "[FILWORK] Erreur de configuration : JWT_SECRET doit être défini dans le fichier .env.",
  );

  process.exit(1);
}

const app = require("./app");

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur FILWORK démarré sur le port ${PORT}`);
  console.log(`Vérification : http://localhost:${PORT}/api/health`);
});