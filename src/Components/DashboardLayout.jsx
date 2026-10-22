import { NavLink, Link } from "react-router-dom";
import { FiGrid, FiUsers, FiBriefcase, FiUser, FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";
import "./DashboardLayout.css";

const navigation = {
  creator: { name: "Espace créateur", home: "/espace/createur", links: [["Vue d’ensemble", "/espace/createur", FiGrid], ["Mon profil", "/espace/createur/profil", FiUser], ["Campagnes", "/espace/createur/campagnes", FiBriefcase], ["Collaborations", "/espace/createur/collaborations", FiUsers]] },
  business: { name: "Espace entreprise", home: "/espace/entreprise", links: [["Vue d’ensemble", "/espace/entreprise", FiGrid], ["Mon organisation", "/espace/entreprise/organisation", FiUser], ["Mes campagnes", "/espace/entreprise/campagnes", FiBriefcase], ["Créateurs", "/espace/entreprise/createurs", FiUsers], ["Collaborations", "/espace/entreprise/collaborations", FiUsers]] },
  admin: { name: "Administration", home: "/administration", links: [["Vue d’ensemble", "/administration", FiGrid], ["Comptes", "/administration/comptes", FiUsers], ["Campagnes", "/administration/campagnes", FiBriefcase], ["Signalements", "/administration/signalements", FiUser]] },
};

export default function DashboardLayout({ role, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = navigation[role];

  return (
    <div className="workspace">
      <aside className={`workspace__sidebar ${menuOpen ? "workspace__sidebar--open" : ""}`}>
        <Link className="workspace__brand" to={config.home} aria-label="FILWORK, espace de travail">
          <img src="/filwork-logo.svg" alt="" />
        </Link>
        <p className="workspace__role">{config.name}</p>
        <nav className="workspace__nav" aria-label="Navigation de l’espace">
          {config.links.map(([label, to, Icon]) => (
            <NavLink key={to} end={to === config.home} to={to} onClick={() => setMenuOpen(false)}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="workspace__back" to="/"><FiLogOut aria-hidden="true" />Retour au site</Link>
      </aside>
      {menuOpen && <button className="workspace__scrim" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />}
      <div className="workspace__main">
        <header className="workspace__topbar">
          <button className="workspace__menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}>
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
          <span>{config.name}</span>
          <Link to="/connexion" className="workspace__account">Se connecter</Link>
        </header>
        <main className="workspace__content">{children}</main>
      </div>
    </div>
  );
}
