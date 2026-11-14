const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const prisma = require("./config/prisma");

const {
  requestIdMiddleware,
  notFoundHandler,
  errorHandler,
} = require("./middlewares/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const preferencesRoutes = require("./routes/preferencesRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const deliverableRoutes = require("./routes/deliverableRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminAnnouncementRoutes = require("./routes/adminAnnouncementRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const sasPayRoutes = require("./routes/sasPayRoutes");
const internalRoutes = require("./routes/internalRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const sasPayWebhookRoutes = require("./routes/sasPayWebhookRoutes");

const { generalLimiter } = require("./middlewares/rateLimiters");
const { checkDatabaseHealth } = require("./services/healthCheck");

const app = express();

// La plateforme (Vercel) termine TLS sur son proxy edge et transmet l'IP du client via
// X-Forwarded-For. Un seul saut de proxy est déclaré ici, afin que
// express-rate-limit et req.ip lisent l'adresse réelle du client.
app.set("trust proxy", 1);

// Identifier chaque requête pour la journalisation et le support.
app.use(requestIdMiddleware);

// En-têtes HTTP de sécurité.
app.use(helmet());

// Limiteur générique : protection de base contre les abus sur toutes les routes API.
app.use("/api", generalLimiter);

// Configuration des origines autorisées.
const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Configuration CORS.
app.use(
  cors({
    origin(origin, callback) {
      // Autoriser les requêtes sans en-tête Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Ne pas autoriser les origines inconnues dans le navigateur.
      return callback(null, false);
    },

    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],

    allowedHeaders: ["Content-Type", "Authorization"],

    maxAge: 86400,
  }),
);

// Routes d'upload montées AVANT le parser JSON global de 100 Ko afin que le
// handler puisse utiliser la limite plus large déclarée ci-dessous sans être rejeté trop tôt.
// Limite globale API (100 Ko) reste en place pour toutes les autres routes.
app.use("/api/uploads", express.json({ limit: "8mb" }), uploadRoutes);

// Le webhook SasPay reçoit un corps BRUT (signature vérifiée sur les octets reçus).
// Ce montage doit précéder express.json().
app.use(
  "/api/webhooks/saspay",
  express.raw({ type: "*/*", limit: "512kb" }),
  sasPayWebhookRoutes,
);

// Limiter la taille des corps JSON reçus.
app.use(express.json({ limit: "100kb" }));

// Routes d'authentification.
app.use("/api/auth", authRoutes);

// Routes des profils.
app.use("/api/profile", profileRoutes);

// Routes des invitations.
app.use("/api", invitationRoutes);

// Routes des campagnes.
app.use("/api/campaigns", campaignRoutes);

// Routes des candidatures.
app.use("/api/applications", applicationRoutes);

// Routes des notifications.
app.use("/api/notifications", notificationRoutes);

// Routes des préférences de communication.
app.use("/api", preferencesRoutes);

// Routes des annonces (utilisateurs connectés).
app.use("/api/announcements", announcementRoutes);

// Routes d'administration.
app.use("/api/admin", adminRoutes);

// Routes d'administration des annonces.
app.use("/api/admin", adminAnnouncementRoutes);

// Routes des collaborations.
app.use("/api/collaborations", collaborationRoutes);

// Routes des livrables.
app.use("/api/deliverables", deliverableRoutes);

// Routes de suivi des paiements.
app.use("/api/payments", paymentRoutes);

// Routes de consultation des créateurs.
app.use("/api/creators", creatorRoutes);

// Routes des avis et réponses.
app.use("/api/reviews", reviewRoutes);

// Route d'upload d'images (authentifié, stockage paramétrable, 503 si non configuré).
// Montée avant l'express.json global ; voir montage plus haut dans ce fichier.

// Routes SasPay (paiement entreprise → FILWORK → créateur).
app.use("/api", sasPayRoutes);

// Routes internes réservées aux tâches planifiées (Bearer CRON_SECRET).
app.use("/api/internal", internalRoutes);

// Vérification de la disponibilité du serveur.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Le serveur FILWORK fonctionne correctement.",
    timestamp: new Date().toISOString(),
  });
});

// Vérification de la connexion à PostgreSQL et du schéma applicatif.
app.get("/api/health/database", async (req, res) => {
  const result = await checkDatabaseHealth(prisma);

  if (result.schemaReady) {
    return res.status(200).json({
      success: true,
      message: "Le backend communique correctement avec PostgreSQL et le schéma est initialisé.",
      database: "connected",
      schema: "ready",
    });
  }

  if (result.reachable) {
    return res.status(503).json({
      success: false,
      message: "Le schéma de la base n'est pas encore initialisé.",
      database: "connected",
      schema: "not_ready",
      code: "SCHEMA_MISSING",
    });
  }

  return res.status(503).json({
    success: false,
    message: "La base de données est temporairement indisponible.",
    database: "unavailable",
    schema: "unknown",
    code: "DATABASE_UNAVAILABLE",
  });
});

// Routes inconnues : réponse JSON cohérente avec le reste de l'API.
app.use(notFoundHandler);

// Gestionnaire d'erreurs global : JSON malformé, corps trop volumineux,
// erreurs Prisma connues et erreurs inattendues.
app.use(errorHandler);

module.exports = app;
