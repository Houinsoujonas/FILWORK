const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ROLES = ["CREATOR", "COMPANY"];

/**
 * Génère un jeton JWT pour l'utilisateur.
 */
function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET n'est pas configuré.");
  }

  return jwt.sign(
    {
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      algorithm: "HS256",
    },
  );
}

/**
 * Retourne les informations publiques d'un utilisateur.
 */
function getPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Inscription d'un nouvel utilisateur.
 */
async function register(req, res) {
  try {
    const body = req.body || {};

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    const role =
      typeof body.role === "string" ? body.role.trim().toUpperCase() : "";

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir une adresse e-mail valide.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe est trop long.",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Le type de compte doit être CREATOR ou COMPANY.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est déjà utilisée.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Votre compte a été créé avec succès.",
      user: getPublicUser(user),
      token,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est déjà utilisée.",
      });
    }

    console.error("Erreur lors de l'inscription :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la création du compte.",
    });
  }
}

/**
 * Connexion d'un utilisateur existant.
 */
async function login(req, res) {
  try {
    const body = req.body || {};

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "L'adresse e-mail et le mot de passe sont obligatoires.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      user: getPublicUser(user),
      token,
    });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion.",
    });
  }
}

module.exports = {
  register,
  login,
};
