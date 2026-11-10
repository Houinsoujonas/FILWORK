import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { useAuth } from "../context/useAuth";
import { errorMessage } from "../lib/api";
import { homeForRole } from "../lib/format";

const ASIDE = {
  creator: {
    title: "Faites de votre talent un métier visible.",
    text: "Un profil clair, des campagnes adaptées et un suivi simple de vos collaborations.",
    points: [
      "Un profil public avec vos réseaux et votre portfolio",
      "Des campagnes publiées par de vraies entreprises",
      "Livrables et paiements suivis au même endroit",
    ],
  },
  business: {
    title: "Trouvez les créateurs qui parlent à votre audience.",
    text: "Publiez un brief, comparez les profils et pilotez chaque collaboration.",
    points: [
      "Un annuaire filtrable par plateforme et disponibilité",
      "Candidatures et invitations centralisées",
      "Validation des livrables et suivi des paiements",
    ],
  },
};

function Inscription() {
  const [accountType, setAccountType] = useState("creator");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const aside = ASIDE[accountType];

  if (user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const email = String(formData.get("email") || "").trim();
    const role = accountType === "creator" ? "CREATOR" : "COMPANY";

    const profile =
      role === "CREATOR"
        ? {
            displayName: String(formData.get("fullName") || "").trim(),
          }
        : {
            companyName: String(formData.get("businessName") || "").trim(),
          };

    if (!profile.displayName && !profile.companyName) {
      setError("Renseignez le nom demandé pour créer votre profil.");
      return;
    }

    setSubmitting(true);

    try {
      const { user } = await register({ email, password, role, profile });
      navigate(homeForRole(user.role), { replace: true });
    } catch (registerError) {
      setError(errorMessage(registerError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="register-page">
      <div className="register-shell">
      <aside className="register-aside" aria-label="Ce que FILWORK vous apporte">
        <span className="register-aside__eyebrow">
          {accountType === "creator" ? "Espace créateur" : "Espace entreprise"}
        </span>
        <h2>{aside.title}</h2>
        <p>{aside.text}</p>
        <ul className="register-aside__list">
          {aside.points.map((point) => (
            <li key={point}>
              <FiCheck aria-hidden="true" /> {point}
            </li>
          ))}
        </ul>
        <ol className="register-aside__steps">
          <li><b>1</b> Créez votre compte</li>
          <li><b>2</b> Complétez votre profil</li>
          <li><b>3</b> {accountType === "creator" ? "Candidatez aux campagnes" : "Publiez votre campagne"}</li>
        </ol>
      </aside>
      <div className="register-container">
<<<<<<< HEAD
        <Link to="/" className="register-brand" aria-label="FILWORK, accueil">
          <img src="/filwork-logo.svg" alt="" width={254} height={56} />
        </Link>

=======
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b
        <div className="register-heading">
          <span className="register-eyebrow">Inscription gratuite</span>

          <h1>Créez votre compte</h1>

          <p>Quelques informations suffisent pour commencer à collaborer.</p>
        </div>
        <div className="register-account">
          <button
            type="button"
            className={`register-account__option ${
              accountType === "creator"
                ? "register-account__option--active"
                : ""
            }`}
            onClick={() => setAccountType("creator")}
            aria-pressed={accountType === "creator"}
          >
            <FiCamera aria-hidden="true" />
            <span>Créateur</span>
          </button>

          <button
            type="button"
            className={`register-account__option ${
              accountType === "business"
                ? "register-account__option--active"
                : ""
            }`}
            onClick={() => setAccountType("business")}
            aria-pressed={accountType === "business"}
          >
            <FiBriefcase aria-hidden="true" />
            <span>Entreprise</span>
          </button>
        </div>
        <form className="register-form" onSubmit={handleSubmit}>
          {(error || submitMessage) && (
            <p
              className={`form-notice${error ? " form-notice--error" : ""}`}
              role={error ? "alert" : "status"}
            >
              {error || submitMessage}
            </p>
          )}

          {accountType === "creator" ? (
              <div className="register-field">
                <label htmlFor="creator-name">Nom complet</label>
                <input
                  id="creator-name"
                  name="fullName"
                  type="text"
                  placeholder="Votre nom et prénom"
                  autoComplete="name"
                  required
                />
              </div>
          ) : (
              <div className="register-field">
                <label htmlFor="business-name">Nom de l'entreprise</label>
                <input
                  id="business-name"
                  name="businessName"
                  type="text"
                  placeholder="Nom de votre entreprise"
                  autoComplete="organization"
                  required
                />
              </div>
          )}

          <div className="register-field">
            <label htmlFor="register-email">Adresse e-mail</label>
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-password">Mot de passe</label>

            <div className="register-password">
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Au moins 8 caractères"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="register-confirm-password">
              Confirmer le mot de passe
            </label>

            <div className="register-password">
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Répétez votre mot de passe"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={
                  showConfirmPassword
                    ? "Masquer la confirmation"
                    : "Afficher la confirmation"
                }
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <label className="register-terms">
            <input type="checkbox" name="acceptTerms" required />

            <span>
              J'accepte les{" "}
              <Link to="/conditions">conditions d'utilisation</Link> et la
              politique de confidentialité.
            </span>
          </label>

          <button
            type="submit"
            className="register-submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>
        <p className="register-login">
          Vous avez déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
        <Link to="/" className="register-back">
          <FiArrowLeft aria-hidden="true" />
          Retour à l'accueil
        </Link>
      </div>
      </div>
    </main>
  );
}

export default Inscription;
