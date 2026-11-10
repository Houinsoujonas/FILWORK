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

const app = express();

// Render termine TLS sur son proxy et transmet l'IP du client via
// X-Forwarded-For. Un seul saut de proxy est déclaré ici, afin que
// express-rate-limit et req.ip lisent l'adresse réelle du client.
app.set("trust proxy", 1);

// Identifier chaque requête pour la journalisation et le support.
app.use(requestIdMiddleware);

// En-têtes HTTP de sécurité.
app.use(helmet());

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

// Vérification de la disponibilité du serveur.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Le serveur FILWORK fonctionne correctement.",
    timestamp: new Date().toISOString(),
  });
});

// Vérification de la connexion à PostgreSQL.
app.get("/api/health/database", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "Le backend communique correctement avec PostgreSQL.",
      database: "connected",
    });
  } catch (error) {
    console.error("Erreur de connexion à PostgreSQL :", error.message);

    return res.status(503).json({
      success: false,
      message: "La base de données est temporairement indisponible.",
    });
  }
});

// Routes inconnues : réponse JSON cohérente avec le reste de l'API.
app.use(notFoundHandler);

// Gestionnaire d'erreurs global : JSON malformé, corps trop volumineux,
// erreurs Prisma connues et erreurs inattendues.
app.use(errorHandler);

module.exports = app;
