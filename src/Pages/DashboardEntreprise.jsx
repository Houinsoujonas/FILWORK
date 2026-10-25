import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiArrowUpRight, FiBriefcase, FiUsers, FiPlusCircle } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";

const actions = [["Créer une campagne", "Décrivez un besoin et les livrables attendus.", "/espace/entreprise/campagnes/nouvelle", FiPlusCircle], ["Découvrir les créateurs", "Parcourez les profils publiés.", "/annuaire-createurs", FiUsers], ["Suivre mes collaborations", "Retrouvez le suivi de vos projets.", "/espace/entreprise/collaborations", FiBriefcase]];
export default function DashboardEntreprise() {
  const { pathname } = useLocation();
  const titles = { "/espace/entreprise/organisation": "Mon organisation", "/espace/entreprise/campagnes": "Mes campagnes", "/espace/entreprise/campagnes/nouvelle": "Créer une campagne", "/espace/entreprise/createurs": "Créateurs", "/espace/entreprise/collaborations": "Mes collaborations" };
  const pageTitle = titles[pathname] ?? "Votre espace entreprise";
  const [notice, setNotice] = useState("");
  return <div className="dashboard-page"><header className="dashboard-heading"><span className="section-label">ESPACE ENTREPRISE</span><h1>{pageTitle}</h1><p>Préparez vos campagnes et suivez vos collaborations avec les créateurs.</p></header>
    {pathname === "/espace/entreprise" ? <><div className="dashboard-notice" role="status">Les informations de votre organisation s’afficheront ici après la connexion au service.</div><div className="dashboard-actions">{actions.map(([title, text, to, Icon]) => <Link className="dashboard-action" to={to} key={title}><span className="dashboard-action__icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{text}</small></span><FiArrowUpRight aria-hidden="true" /></Link>)}</div><EmptyState title="Votre activité apparaîtra ici" description="Les campagnes, candidatures et collaborations de votre organisation seront affichées une fois les données disponibles." /></> : pathname.endsWith("/campagnes/nouvelle") ? <form className="campaign-form" onSubmit={(event) => { event.preventDefault(); setNotice("Aucune campagne n’a été publiée ni enregistrée. Le formulaire sera relié au service de campagnes."); }}>
      <div className="campaign-form__grid"><label>Nom de la campagne<input name="title" required maxLength={120} /></label><label>Secteur ou catégorie<input name="category" /></label><label>Localisation<input name="location" /></label><label>Budget indicatif<input name="budget" type="number" min="0" inputMode="decimal" /></label><label className="campaign-form__wide">Description du projet<textarea name="description" rows="5" required /></label><label className="campaign-form__wide">Livrables attendus<textarea name="deliverables" rows="3" /></label></div>
      <p className="campaign-form__note">Ce formulaire ne publie rien tant que le service de campagnes n’est pas connecté.</p><button className="campaign-form__submit" type="submit">Préparer la campagne</button>{notice && <p className="dashboard-notice" role="status">{notice}</p>}
    </form> : <EmptyState title="Aucune information à afficher" description="Les informations réelles de votre organisation s’afficheront ici après la connexion au service." action={<Link className="dashboard-link" to="/connexion">Se connecter <FiArrowUpRight aria-hidden="true" /></Link>} />}
  </div>;
}
