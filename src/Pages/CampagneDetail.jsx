import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiBriefcase } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";

export default function CampagneDetail() {
  const { campaignId } = useParams();

  return (
    <main className="public-page detail-page">
      <Link to="/campagnes" className="back-link">
        <FiArrowLeft aria-hidden="true" /> Toutes les campagnes
      </Link>

      <div className="detail-page__intro">
        <span className="detail-page__icon">
          <FiBriefcase aria-hidden="true" />
        </span>
        <span className="section-label">DÉTAIL DE CAMPAGNE</span>
      </div>

      <EmptyState
        title="Cette campagne n’est pas disponible"
        description={`Aucune information vérifiée n’est disponible pour la référence ${campaignId}. Revenez à la liste des campagnes.`}
        action={
          <a className="public-button" href="/campagnes">
            Voir les campagnes
          </a>
        }
      />
    </main>
  );
}
