import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBell,
  FiBriefcase,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiInbox,
  FiLayers,
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
      ["Opportunités", "/espace/createur/campagnes", FiBriefcase],
      ["Candidatures", "/espace/createur/candidatures", FiSend],
      ["Invitations", "/espace/createur/invitations", FiInbox],
      ["Collaborations", "/espace/createur/collaborations", FiLayers],
      ["Notifications", "/espace/createur/notifications", FiBell],
      ["Mon profil", "/espace/createur/profil", FiUser],
    ],
  },
  business: {
    name: "Espace entreprise",
    home: "/espace/entreprise",
    links: [
      ["Vue d’ensemble", "/espace/entreprise", FiGrid],
      ["Mes campagnes", "/espace/entreprise/campagnes", FiBriefcase],
      ["Créateurs", "/espace/entreprise/createurs", FiUsers],
      ["Invitations", "/espace/entreprise/invitations", FiSend],
      ["Collaborations", "/espace/entreprise/collaborations", FiLayers],
      ["Notifications", "/espace/entreprise/notifications", FiBell],
      ["Mon organisation", "/espace/entreprise/organisation", FiUser],
    ],
  },
  admin: {
    name: "Administration",
    home: "/administration",
    links: [
      ["Vue d’ensemble", "/administration", FiGrid],
      ["Comptes", "/administration/comptes", FiUsers],
      ["Campagnes", "/administration/campagnes", FiBriefcase],
      ["Collaborations", "/administration/collaborations", FiLayers],
      ["Livrables", "/administration/livrables", FiFileText],
      ["Paiements", "/administration/paiements", FiCreditCard],
    ],
  },
};

// Titre de la page courante : lien dont le chemin est le plus long préfixe.
function currentSection(config, pathname) {
  return config.links
    .filter(([, to]) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b[1].length - a[1].length)[0];
}

export default function DashboardLayout({ role }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, profile, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const config = navigation[role];
  const section = currentSection(config, pathname);
  const notificationsPath = `${config.home}/notifications`;

  const displayName =
    profile?.displayName || profile?.companyName || (role === "admin" ? "Administrateur" : "");
  const avatarUrl = profile?.profileImageUrl || profile?.logoUrl || "";

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

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/connexion", { replace: true });
  };

  const badge = unreadCount > 9 ? "9+" : unreadCount;

  return (
    <div className="workspace">
      <aside
        id="workspace-sidebar"
        className={`workspace__sidebar ${
          menuOpen ? "workspace__sidebar--open" : ""
        }`}
      >
        <Link
          className="workspace__brand"
          to={config.home}
          aria-label="FILWORK, retour à la vue d’ensemble"
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
              {to === notificationsPath && unreadCount > 0 && (
                <span className="workspace__count" aria-label={`${unreadCount} non lues`}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="workspace__account-card">
          <div className="workspace__identity">
            <span className="workspace__account-avatar" aria-hidden="true">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                initials(displayName || user?.email)
              )}
            </span>
            <span className="workspace__identity-text">
              <strong>{displayName || "Mon compte"}</strong>
              <span className="workspace__email">{user?.email}</span>
            </span>
          </div>

          <button
            type="button"
            className="workspace__logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <FiLogOut aria-hidden="true" />
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
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
            aria-controls="workspace-sidebar"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            type="button"
          >
            {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>

          <div className="workspace__crumbs">
            <span>{config.name}</span>
            {section && (
              <>
                <FiChevronRight aria-hidden="true" />
                <strong>{section[0]}</strong>
              </>
            )}
          </div>

          <div className="workspace__topbar-right">
            <Link className="workspace__site-link" to="/">
              <FiArrowUpRight aria-hidden="true" />
              <span>Voir le site</span>
            </Link>

            <NavLink
              to={notificationsPath}
              className="workspace__bell"
              aria-label={`Notifications${
                unreadCount ? `, ${unreadCount} non lues` : ""
              }`}
            >
              <FiBell aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="workspace__bell-badge" aria-hidden="true">
                  {badge}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        <main className="workspace__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
