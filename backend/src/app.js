const adminRoutes = require("./routes/adminRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const helmet = require("helmet");
const paymentRoutes = require("./routes/paymentRoutes");
const deliverableRoutes = require("./routes/deliverableRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const profileRoutes = require("./routes/profileRoutes");
const express = require("express");
const cors = require("cors");
const prisma = require("./config/prisma");
const authRoutes = require("./routes/authRoutes");

const app = express();

// En-têtes HTTP de sécurité.
app.use(helmet());
// Conserve ensuite tes middlewares CORS et JSON,
// puis toutes les routes déjà configurées.

// Configuration du serveur
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Autoriser les requêtes sans en-tête Origin,
      // par exemple celles envoyées depuis PowerShell.
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

app.use(express.json({ limit: "100kb" }));

// Routes d'authentification
app.use("/api/auth", authRoutes);

// Routes des profils
app.use("/api/profile", profileRoutes);

// Routes des invitations et de leur gestion.
app.use("/api", invitationRoutes);

// Routes des campaigns
app.use("/api/campaigns", campaignRoutes);

// Routes des applications
app.use("/api/applications", applicationRoutes);

// Routes des notifications
app.use("/api/notifications", notificationRoutes);

// Routes d'administration
app.use("/api/admin", adminRoutes);

// Routes des collaborations
app.use("/api/collaborations", collaborationRoutes);

// Routes des deliverables
app.use("/api/deliverables", deliverableRoutes);

// Routes des suivi de paiements
app.use("/api/payments", paymentRoutes);

// Routes sur les informations personnelles des createurs
app.use("/api/creators", creatorRoutes);

// Vérification du serveur
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Le serveur FILWORK fonctionne correctement.",
    timestamp: new Date().toISOString(),
  });
});

// Vérification de la connexion à PostgreSQL
app.get("/api/health/database", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Le backend communique correctement avec PostgreSQL.",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Erreur de connexion à PostgreSQL :",
      error.message,
    );

    res.status(503).json({
      success: false,
      message: "La base de données est temporairement indisponible.",
    });
  }
});

module.exports = app;
