import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiLock } from "react-icons/fi";

import { api, errorMessage } from "../lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(code)) {
      setError("Veuillez saisir le code à 6 chiffres reçu par e-mail.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await api.post(
        "/auth/reset-password",
        { email, code, password },
        { auth: false },
      );

      setMessage(
        data.message || "Votre mot de passe a été modifié avec succès.",
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!email) {
    return (
      <main className="public-page auth-page">
        <div className="auth-card">
          <Link className="back-link" to="/connexion">
            <FiArrowLeft aria-hidden="true" /> Retour à la connexion
          </Link>
          <span className="detail-page__icon">
            <FiLock aria-hidden="true" />
          </span>
          <span className="section-label">NOUVEAU MOT DE PASSE</span>
          <h1>Réinitialisation du mot de passe</h1>
          <p className="form-notice form-notice--error" role="alert">
            L'adresse e-mail est manquante. Demandez une réinitialisation depuis la page « Mot de passe oublié ».
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="public-page auth-page">
      <div className="auth-card">
        <Link className="back-link" to="/connexion">
          <FiArrowLeft aria-hidden="true" /> Retour à la connexion
        </Link>
        <span className="detail-page__icon">
          <FiLock aria-hidden="true" />
        </span>
        <span className="section-label">NOUVEAU MOT DE PASSE</span>
        <h1>Définir un nouveau mot de passe</h1>
        <p>
          Saisissez le code à 6 chiffres reçu sur {email}, puis choisissez un
          nouveau mot de passe d’au moins 8 caractères.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="reset-code">Code de vérification</label>
          <input
            id="reset-code"
            name="code"
            type="text"
            maxLength="6"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            placeholder="123456"
            inputMode="numeric"
          />
          <label htmlFor="reset-password">Nouveau mot de passe</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <label htmlFor="reset-confirm">Confirmer le mot de passe</label>
          <input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            className="public-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Modification…" : "Modifier mon mot de passe"}
          </button>
        </form>

        {(message || error) && (
          <p
            className={`form-notice${error ? " form-notice--error" : ""}`}
            role={error ? "alert" : "status"}
          >
            {error || message}
          </p>
        )}

        {message && (
          <p>
            <Link className="back-link" to="/connexion">
              Se connecter avec le nouveau mot de passe
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
