import { Link } from "react-router-dom";
import { FiArrowLeft, FiBriefcase, FiUsers } from "react-icons/fi";

export default function NotFound() {
  return (
    <main className="public-page not-found-page">
      <p className="not-found-page__code" aria-hidden="true">
        404
      </p>
      <span className="section-label">Page introuvable</span>
      <h1>Cette page n’existe pas ou a été déplacée.</h1>
      <p>
        Vérifiez l’adresse saisie, ou reprenez depuis l’une des pages
        principales de FILWORK.
      </p>
      <div className="not-found-page__actions">
        <Link className="public-button" to="/">
          <FiArrowLeft aria-hidden="true" /> Retour à l’accueil
        </Link>
        <Link className="public-button public-button--outline" to="/campagnes">
          <FiBriefcase aria-hidden="true" /> Voir les campagnes
        </Link>
        <Link
          className="public-button public-button--outline"
          to="/annuaire-createurs"
        >
          <FiUsers aria-hidden="true" /> Annuaire des créateurs
        </Link>
      </div>
    </main>
  );
}
