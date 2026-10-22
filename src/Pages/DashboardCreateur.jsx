import { Link, useLocation } from "react-router-dom";
import { FiArrowUpRight, FiBriefcase, FiUser, FiUsers } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";
import "./DashboardPages.css";

const actions = [["Compléter mon profil", "Présentez votre activité et vos compétences.", "/espace/createur/profil", FiUser], ["Parcourir les campagnes", "Consultez les opportunités publiées.", "/campagnes", FiBriefcase], ["Suivre mes collaborations", "Retrouvez les informations de vos projets.", "/espace/createur/collaborations", FiUsers]];
export default function DashboardCreateur() {
  const { pathname } = useLocation();
  const titles = { "/espace/createur/profil": "Mon profil", "/espace/createur/campagnes": "Mes campagnes", "/espace/createur/collaborations": "Mes collaborations" };
  const pageTitle = titles[pathname] ?? "Votre espace créateur";
  return <div className="dashboard-page"><header className="dashboard-heading"><span className="section-label">ESPACE CRÉATEUR</span><h1>{pageTitle}</h1><p>Retrouvez vos informations et vos opportunités de collaboration.</p></header>
    {pathname === "/espace/createur" ? <><div className="dashboard-notice" role="status">Les informations de votre compte s’afficheront ici après la connexion au service.</div><div className="dashboard-actions">{actions.map(([title, text, to, Icon]) => <Link className="dashboard-action" to={to} key={title}><span className="dashboard-action__icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{text}</small></span><FiArrowUpRight aria-hidden="true" /></Link>)}</div><EmptyState title="Votre activité apparaîtra ici" description="Les candidatures, campagnes et collaborations de votre compte seront affichées une fois les données disponibles." /></> : <EmptyState title="Aucune information à afficher" description="Les informations réelles de votre compte s’afficheront ici après la connexion au service." action={<Link className="dashboard-link" to="/connexion">Se connecter <FiArrowUpRight aria-hidden="true" /></Link>} />}
  </div>;
}
