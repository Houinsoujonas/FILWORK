// Point d'entrée serverless pour Vercel Functions.
// L'application Express est exportée telle quelle : Vercel l'invoque comme handler.
// Aucune écoute réseau n'est ouverte ici — contrairement à src/server.js (npm start).
const { validateProductionEnvironment } = require("../src/config/productionEnv");

// Refuser de démarrer avec une configuration de production invalide.
validateProductionEnvironment();

const app = require("../src/app");

module.exports = app;
