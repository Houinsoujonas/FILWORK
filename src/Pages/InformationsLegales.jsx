import { useLocation } from "react-router-dom";
import "./FrontendPages.css";

export default function InformationsLegales({ type }) {
  const isPrivacy = type === "confidentialite";
  const { pathname } = useLocation();
  return <main className="public-page legal-page"><span className="section-label">INFORMATIONS LÉGALES</span><h1>{isPrivacy ? "Politique de confidentialité" : "Conditions d’utilisation"}</h1><p>Ce document doit être fourni et validé par l’équipe FILWORK avant la mise en production. Aucun engagement juridique n’est inventé dans cette version de l’interface.</p><div className="legal-notice" role="status">Contenu en attente de validation officielle · {pathname}</div></main>;
}
