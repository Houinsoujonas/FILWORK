import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiUser } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";

export default function CreateurProfil() {
  const { creatorId } = useParams();
  return <main className="public-page detail-page"><Link to="/annuaire-createurs" className="back-link"><FiArrowLeft aria-hidden="true" /> Annuaire des créateurs</Link><div className="detail-page__intro"><span className="detail-page__icon"><FiUser aria-hidden="true" /></span><span className="section-label">PROFIL CRÉATEUR</span></div><EmptyState title="Ce profil n’est pas disponible" description={`Aucune information vérifiée n’est disponible pour la référence ${creatorId}. Les profils visibles seront publiés avec l’accord de leurs titulaires.`} action={<a className="public-button" href="/annuaire-createurs">Voir l’annuaire</a>} /></main>;
}
