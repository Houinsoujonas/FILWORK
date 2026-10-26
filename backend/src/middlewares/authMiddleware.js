const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const prisma = require("../config/prisma");

async function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentification requise.",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Jeton d'authentification manquant.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!decoded.sub || !decoded.exp) {
      return res.status(401).json({
        success: false,
        message: "Jeton d'authentification invalide.",
      });
    }

    const tokenVersion = decoded.tokenVersion ?? 0;

    if (!Number.isInteger(tokenVersion) || tokenVersion < 0) {
      return res.status(401).json({
        success: false,
        message: "Jeton d'authentification invalide.",
      });
    }

    // Calculer le hash du jeton reçu.
    // Le jeton original ne sera pas enregistré en base de données.
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Vérifier si le jeton a été révoqué lors d'une déconnexion.
    const revokedToken = await prisma.revokedToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
      },
    });

    if (revokedToken) {
      return res.status(401).json({
        success: false,
        message: "Cette session a été révoquée. Veuillez vous reconnecter.",
      });
    }

    // Récupérer l'utilisateur directement depuis la base de données.
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub,
      },
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Le compte associé à cette session n'existe plus.",
      });
    }

    if (tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Cette session n'est plus valide. Veuillez vous reconnecter.",
      });
    }

    // Conserver les informations nécessaires pour la déconnexion.
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    req.authToken = token;
    req.authTokenExpiresAt = new Date(decoded.exp * 1000);

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Jeton invalide ou expiré. Veuillez vous reconnecter.",
      });
    }

    console.error("Erreur du middleware d'authentification :", error.message);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification de l'authentification.",
    });
  }
}

module.exports = {
  authenticateToken,
};
