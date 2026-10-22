import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiLock,
  FiMail,
  FiShield,
} from "react-icons/fi";

import connectImage from "../assets/connect.jpg";
import "./Connexion.css";

function Connexion() {
  const [accountType, setAccountType] = useState("creator");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    // L'authentification sera connectée au backend ultérieurement.
    setSubmitMessage("La connexion sera activée dès que le service de compte sera relié à FILWORK.");
  };

  return (
    <main className="login-page">
      {" "}
      <div className="login-page__ambient" aria-hidden="true" />
      <div className="login-layout">
        {/* PANNEAU VISUEL */}
        <section className="login-visual">
          <div
            className="login-visual__image"
            style={{ backgroundImage: `url(${connectImage})` }}
            aria-hidden="true"
          />

          <div className="login-visual__overlay" aria-hidden="true" />

          <Link to="/" className="login-brand" aria-label="FILWORK, accueil">
            <img src="/filwork-logo.svg" alt="" />
          </Link>

          <div className="login-visual__top-label">
            <span className="login-visual__top-line" />
            <span>UN UNIVERS DE POSSIBILITÉS</span>
          </div>

          <div className="login-visual__content">
            <span className="login-visual__eyebrow">
              CRÉATIVITÉ & COLLABORATION
            </span>

            <h1>
              Les bonnes rencontres
              <br />
              créent de <span>grandes idées.</span>
            </h1>

            <p>
              Le talent rencontre l'opportunité. Donnez vie à vos idées grâce
              aux bonnes collaborations.
            </p>

            <div className="login-visual__highlights">
              <div className="login-highlight">
                <span className="login-highlight__icon">
                  <FiCamera aria-hidden="true" />
                </span>

                <span>
                  <strong>Créateurs</strong>
                  <small>Exprimez votre talent</small>
                </span>
              </div>

              <span className="login-visual__divider" />

              <div className="login-highlight">
                <span className="login-highlight__icon">
                  <FiBriefcase aria-hidden="true" />
                </span>

                <span>
                  <strong>Entreprises</strong>
                  <small>Trouvez les bons talents</small>
                </span>
              </div>
            </div>
          </div>

          <div className="login-visual__bottom">
            <div className="login-visual__status">
              <span className="login-status__dot" />
              <span>Les collaborations commencent ici.</span>
            </div>

            <span className="login-visual__copyright">
              © {new Date().getFullYear()} FILWORK
            </span>
          </div>

          
        </section>

        {/* PANNEAU DU FORMULAIRE */}
        <section className="login-form-panel">
          <div className="login-form-panel__top">
            <Link to="/" className="login-mobile-brand" aria-label="FILWORK, accueil">
              <img src="/filwork-logo.svg" alt="" />
            </Link>

            <div className="login-form-panel__register">
              <span>Pas encore membre ?</span>

              <Link to="/inscription">
                S'inscrire
              </Link>
            </div>
          </div>

          <div className="login-form-content">
            <div className="login-heading">
              <div className="login-heading__eyebrow">
                <span className="login-heading__line" />
                <span>VOTRE ESPACE PERSONNEL</span>
              </div>

              <h2>
                Heureux de
                <br />
                <span>vous retrouver.</span>
              </h2>

              <p>
                Connectez-vous pour retrouver vos opportunités et poursuivre vos
                collaborations.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {submitMessage && <p className="form-notice" role="status">{submitMessage}</p>}
              <fieldset className="login-account">
                <legend>Vous êtes sur FILWORK en tant que...</legend>

                <div className="login-account__options">
                  <button
                    type="button"
                    className={`login-account__option ${
                      accountType === "creator"
                        ? "login-account__option--active"
                        : ""
                    }`}
                    aria-pressed={accountType === "creator"}
                    onClick={() => setAccountType("creator")}
                  >
                    <span className="login-account__icon">
                      <FiCamera aria-hidden="true" />
                    </span>

                    <span className="login-account__text">
                      <strong>Créateur</strong>
                      <small>Je crée du contenu</small>
                    </span>

                    <span className="login-account__check">
                      {accountType === "creator" && (
                        <FiCheck aria-hidden="true" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`login-account__option ${
                      accountType === "business"
                        ? "login-account__option--active"
                        : ""
                    }`}
                    aria-pressed={accountType === "business"}
                    onClick={() => setAccountType("business")}
                  >
                    <span className="login-account__icon">
                      <FiBriefcase aria-hidden="true" />
                    </span>

                    <span className="login-account__text">
                      <strong>Entreprise</strong>
                      <small>Je cherche des talents</small>
                    </span>

                    <span className="login-account__check">
                      {accountType === "business" && (
                        <FiCheck aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </div>
              </fieldset>

              <div className="login-field">
                <label htmlFor="login-email">Adresse e-mail</label>

                <div className="login-input-wrapper">
                  <FiMail className="login-input-icon" aria-hidden="true" />

                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-field__header">
                  <label htmlFor="login-password">Mot de passe</label>

                  <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
                </div>

                <div className="login-input-wrapper login-password">
                  <FiLock className="login-input-icon" aria-hidden="true" />

                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez votre mot de passe"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-password__toggle"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    aria-controls="login-password"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? (
                      <FiEyeOff aria-hidden="true" />
                    ) : (
                      <FiEye aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />

                <span className="login-remember__box">
                  <FiCheck aria-hidden="true" />
                </span>

                <span>Se souvenir de moi</span>
              </label>

              <button type="submit" className="login-submit">
                <span>Se connecter</span>

              </button>

              <div className="login-security">
                <FiShield aria-hidden="true" />

                <span>
                  Votre espace personnel mérite toute notre attention.
                </span>
              </div>
            </form>
          </div>

          <div className="login-form-panel__footer">
            <span>FILWORK — Connecter les talents.</span>

            <span className="login-footer__status">
              <span />
              Votre prochaine collaboration vous attend.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Connexion;
