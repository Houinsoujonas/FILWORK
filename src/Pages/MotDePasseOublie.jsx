import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";

import { api, errorMessage } from "../lib/api";

export default function MotDePasseOublie() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    setSubmitting(true);

    try {
      const data = await api.post(
        "/auth/forgot-password",
        { email },
        { auth: false },
      );

      setMessage(
        data.message ||
          "Si un compte correspond à cette adresse, un e-mail de réinitialisation sera envoyé.",
      );
      setSubmitted(true);
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
          <FiMail aria-hidden="true" />
        </span>
        <span className="section-label">RÉCUPÉRATION DU COMPTE</span>
        <h1>Mot de passe oublié&nbsp;?</h1>
        <p>
          Indiquez l’adresse e-mail associée à votre compte. Vous recevrez un
          lien pour définir un nouveau mot de passe.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="recovery-email">Adresse e-mail</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vous@exemple.com"
          />
          <button className="public-button" type="submit" disabled={submitting}>
            {submitting ? "Envoi…" : "Continuer"}
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
        {submitted && (
          <p className="public-empty-hint">
            Pensez à vérifier vos courriers indésirables. Le lien reste valable
            15 minutes.
          </p>
        )}
      </div>
    </main>
  );
}
