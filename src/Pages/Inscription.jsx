import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCamera,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

function Inscription() {
  const [accountType, setAccountType] = useState("creator");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    
const formData = new FormData(event.currentTarget);
const password = formData.get("password");
const confirmPassword = formData.get("confirmPassword");

if (password !== confirmPassword) {
  setSubmitMessage("Les mots de passe ne correspondent pas.");
  return;
}

  const visibleFormData = Object.fromEntries(formData.entries());
  delete visibleFormData.password;
  delete visibleFormData.confirmPassword;
  console.info("Type de compte :", accountType);
  console.info("Données du formulaire (hors mots de passe) :", visibleFormData);
  setSubmitMessage("La création de compte sera activée dès que le service sera relié à FILWORK.");
;
  };

  return (
    <main className="register-page">
      {" "}
      <div className="register-container">
        {" "}
        <Link to="/" className="register-brand" aria-label="FILWORK, accueil">
          <img src="/filwork-logo.svg" alt="" />
        </Link>
        
        <div className="register-heading">
          <span className="register-eyebrow">REJOIGNEZ FILWORK</span>

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
          {submitMessage && <p className="form-notice" role="status">{submitMessage}</p>}
          {accountType === "creator" ? (
            <>
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

              <div className="register-field">
                <label htmlFor="creator-username">Nom d'utilisateur</label>
                <input
                  id="creator-username"
                  name="username"
                  type="text"
                  placeholder="Ex. : maurel_creative"
                  autoComplete="username"
                  required
                />
              </div>
            </>
          ) : (
            <>
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

              <div className="register-field">
                <label htmlFor="business-contact">Nom du responsable</label>
                <input
                  id="business-contact"
                  name="contactName"
                  type="text"
                  placeholder="Nom et prénom du responsable"
                  autoComplete="name"
                  required
                />
              </div>
            </>
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

          <button type="submit" className="register-submit">
            Créer mon compte
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
    </main>
  );
}

export default Inscription;
