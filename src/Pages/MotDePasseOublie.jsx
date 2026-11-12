import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";

import { api, errorMessage } from "../lib/api";

export default function MotDePasseOublie() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const emailValue = String(email || "").trim();

    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError("Veuillez fournir une adresse e-mail valide.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post(
        "/auth/forgot-password",
        { email: emailValue },
        { auth: false },
      );

      setMessage(
        data.message ||
          "Si un compte correspond à cette adresse, un code de vérification a été envoyé par e-mail.",
      );

      navigate(`/reset-password?email=${encodeURIComponent(emailValue)}`);
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
        <h1>Mot de passe oublié ?</h1>
        <p>
          Indiquez votre adresse e-mail. Vous recevrez un code de vérification
          à 6 chiffres pour définir un nouveau mot de passe.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="recovery-email">Adresse e-mail</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="vous@exemple.com"
          />
          <button className="public-button" type="submit" disabled={submitting}>
            {submitting ? "Envoi…" : "Envoyer le code"}
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
      </div>
    </main>
  );
}
