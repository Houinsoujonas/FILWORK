const crypto = require("node:crypto");
const prisma = require("../config/prisma");

async function logout(req, res) {
  const token = req.authToken;
  const expiresAt = req.authTokenExpiresAt;

  if (
    typeof token !== "string" ||
    !(expiresAt instanceof Date) ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return res.status(401).json({
      success: false,
      message: "Session invalide. Veuillez vous reconnecter.",
    });
  }

  try {
    // Calculer le hash SHA-256 du JWT.
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Enregistrer le hash du jeton révoqué.
    // L'upsert évite de créer plusieurs enregistrements
    // si plusieurs demandes de déconnexion arrivent simultanément.
    await prisma.revokedToken.upsert({
      where: {
        tokenHash,
      },
      update: {},
      create: {
        tokenHash,
        expiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Déconnexion réussie.",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la déconnexion :",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la déconnexion.",
    });
  }
}

module.exports = {
  logout,
};