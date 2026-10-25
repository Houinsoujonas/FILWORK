import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";

export default function MotDePasseOublie() {
  const [submitted, setSubmitted] = useState(false);
  return <main className="public-page auth-page"><div className="auth-card"><Link className="back-link" to="/connexion"><FiArrowLeft aria-hidden="true" /> Retour à la connexion</Link><span className="detail-page__icon"><FiMail aria-hidden="true" /></span><span className="section-label">RÉCUPÉRATION DU COMPTE</span><h1>Mot de passe oublié ?</h1><p>Indiquez l’adresse e-mail associée à votre compte. La récupération sera activée lorsque le service de compte sera connecté.</p><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><label htmlFor="recovery-email">Adresse e-mail</label><input id="recovery-email" type="email" autoComplete="email" required placeholder="vous@exemple.com" /><button className="public-button" type="submit">Continuer</button></form>{submitted && <p className="form-notice" role="status">Aucun message n’a été envoyé : le service de récupération sera disponible après le raccordement du backend.</p>}</div></main>;
}
