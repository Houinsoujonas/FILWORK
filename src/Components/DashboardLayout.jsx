import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiBriefcase,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiInbox,
  FiLogOut,
  FiMenu,
  FiSend,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { initials } from "../lib/format";

const navigation = {
  creator: {
    name: "Espace créateur",
    home: "/espace/createur",
    links: [
      ["Vue d’ensemble", "/espace/createur", FiGrid],
      ["Mon profil", "/espace/createur/profil", FiUser],
      ["Opportunités", "/espace/createur/campagnes", FiBriefcase],
      ["Candidatures", "/espace/createur/candidatures", FiSend],
      ["Invitations", "/espace/createur/invitations", FiInbox],
      ["Collaborations", "/espace/createur/collaborations", FiUsers],
      ["Notifications", "/espace/createur/notifications", FiBell],
    ],
  },
  business: {
    name: "Espace entreprise",
    home: "/espace/entreprise",
    links: [
      ["Vue d’ensemble", "/espace/entreprise", FiGrid],
      ["Mon organisation", "/espace/entreprise/organisation", FiUser],
      ["Mes campagnes", "/espace/entreprise/campagnes", FiBriefcase],
      ["Créateurs", "/espace/entreprise/createurs", FiUsers],
      ["Invitations", "/espace/entreprise/invitations", FiSend],
      ["Collaborations", "/espace/entreprise/collaborations", FiUsers],
      ["Notifications", "/espace/entreprise/notifications", FiBell],
    ],
  },
  admin: {
    name: "Administration",
    home: "/administration",
    links: [
      ["Vue d’ensemble", "/administration", FiGrid],
      ["Comptes", "/administration/comptes", FiUsers],
      ["Campagnes", "/administration/campagnes", FiBriefcase],
      ["Collaborations", "/administration/collaborations", FiUsers],
      ["Livrables", "/administration/livrables", FiFileText],
      ["Paiements", "/administration/paiements", FiCreditCard],
    ],
  },
};

export default function DashboardLayout({ role }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const config = navigation[role];

  useEffect(() => {
    let active = true;

    api
      .get("/notifications")
      .then((data) => {
        if (active) {
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {
        if (active) {
          setUnreadCount(0);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname, user?.id]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/connexion", { replace: true });
  };

  return (
    <div className="workspace">
      <aside
        className={`workspace__sidebar ${
          menuOpen ? "workspace__sidebar--open" : ""
        }`}
      >
        <Link
          className="workspace__brand"
          to={config.home}
          aria-label="FILWORK, espace de travail"
        >
          <img src="/filwork-logo.svg" alt="" />
        </Link>
        <p className="workspace__role">{config.name}</p>
        <nav className="workspace__nav" aria-label="Navigation de l’espace">
          {config.links.map(([linkLabel, to, Icon]) => (
            <NavLink
              key={to}
              end={to === config.home}
              to={to}
              onClick={() => setMenuOpen(false)}
            >
              <Icon aria-hidden="true" />
              <span>{linkLabel}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="workspace__back" to="/">
          <FiLogOut aria-hidden="true" />
          Retour au site
        </Link>
      </aside>

      {menuOpen && (
        <button
          className="workspace__scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Fermer le menu"
          type="button"
        />
      )}

      <div className="workspace__main">
        <header className="workspace__topbar">
          <button
            className="workspace__menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            type="button"
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>

          <span>{config.name}</span>

          <div className="workspace__topbar-right">
            <Link
              to={`${config.home}/notifications`}
              className="workspace__bell"
              aria-label={`Notifications${
                unreadCount ? `, ${unreadCount} non lues` : ""
              }`}
            >
              <FiBell aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="workspace__bell-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <span className="workspace__identity">
              <span className="workspace__account-avatar">
                {initials(user?.email)}
              </span>
              <span className="workspace__email">{user?.email}</span>
            </span>

            <button
              type="button"
              className="workspace__logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <FiLogOut aria-hidden="true" />
              {loggingOut ? "Déconnexion…" : "Déconnexion"}
            </button>
          </div>
        </header>

        <main className="workspace__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
