/**
 * Autorisation générique par rôle.
 *
 * Ce middleware doit être utilisé après `authenticateToken` : il ne vérifie
 * pas le jeton lui-même, mais s'assure que l'utilisateur authentifié possède
 * l'un des rôles autorisés.
 *
 * Les contrôleurs conservent leurs propres vérifications de rôle en défense
 * supplémentaire.
 *
 * @param {...string} roles
 * @returns {import("express").RequestHandler}
 */
function requireRole(...roles) {
  const allowedRoles = new Set(roles);

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    if (!allowedRoles.has(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé pour ce rôle.",
      });
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
