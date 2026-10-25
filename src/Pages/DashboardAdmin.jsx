import { useLocation } from "react-router-dom";
import { FiShield } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";

const titles = { "/administration/comptes": "Comptes", "/administration/campagnes": "Campagnes", "/administration/signalements": "Signalements" };
export default function DashboardAdmin() {
  const { pathname } = useLocation();
  const pageTitle = titles[pathname] ?? "Administration";
  return <div className="dashboard-page"><header className="dashboard-heading"><span className="section-label">ESPACE ADMINISTRATEUR</span><h1>{pageTitle}</h1><p>Outils de suivi et de modération de la plateforme.</p></header><div className="dashboard-notice" role="status"><FiShield aria-hidden="true" /> Les données et actions d’administration seront disponibles après authentification et connexion aux services autorisés.</div><EmptyState title="Aucune donnée à afficher" description="Les comptes, campagnes et signalements transmis par le service apparaîtront dans cet espace." /></div>;
}
