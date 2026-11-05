import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiLock } from "react-icons/fi";

import { api, errorMessage } from "../lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await api.post(
        "/auth/reset-password",
        { token, password },
        { auth: false },
      );

      setMessage(
        data.message || "Votre mot de passe a été modifié avec succès.",
      );
      form.reset();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

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

        {!token ? (
          <p className="form-notice form-notice--error" role="alert">
            Le lien de réinitialisation est invalide ou incomplet. Demandez un
            nouveau lien depuis la page « Mot de passe oublié ».
          </p>
        ) : (
          <>
            <p>Choisissez un mot de passe d’au moins 8 caractères.</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="reset-password">Nouveau mot de passe</label>
              <input
                id="reset-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <label htmlFor="reset-confirm">Confirmer le mot de passe</label>
              <input
                id="reset-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
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
          </>
        )}

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
