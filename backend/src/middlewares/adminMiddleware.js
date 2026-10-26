/**
 * Vérifie que l'utilisateur connecté est un administrateur.
 *
 * Ce middleware doit être utilisé après authenticateToken.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentification requise.",
    });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Accès réservé aux administrateurs.",
    });
  }

  next();
}

module.exports = {
  requireAdmin,
};