import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiMenu, FiX, FiArrowUpRight } from "react-icons/fi";

import "./Navbar.css";

const navLinks = [
  { label: "Accueil", path: "/" },
  { label: "À propos", path: "/a-propos" },
  { label: "Campagnes", path: "/campagnes" },
  { label: "Créateurs", path: "/createurs" },
];

function FilworkLogo() {
  return (
    <Link to="/" className="filwork-logo" aria-label="Filwork — Accueil">
      <svg
        className="filwork-logo__symbol"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M9 14.5L24 6L39 14.5V31.5L24 40L9 31.5V14.5Z"
          className="filwork-logo__frame"
        />

        <path d="M17 18H31" className="filwork-logo__line" />

        <path d="M17 18V30" className="filwork-logo__line" />

        <path d="M17 30H29" className="filwork-logo__line" />

        <path d="M24 18V30" className="filwork-logo__line-accent" />

        <circle cx="31" cy="18" r="3" className="filwork-logo__node" />

        <circle cx="29" cy="30" r="3" className="filwork-logo__node" />
      </svg>

      <span className="filwork-logo__word">
        fil<span>work</span>
      </span>
    </Link>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar__container">
        <FilworkLogo />

        <button
          type="button"
          className="navbar__menu-toggle"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          aria-controls="filwork-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>

        <nav
          id="filwork-navigation"
          className={`navbar__navigation ${
            menuOpen ? "navbar__navigation--open" : ""
          }`}
          aria-label="Navigation principale"
        >
          <div className="navbar__links">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? "navbar__link--active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar__actions">
            <Link
              to="/connexion"
              className="navbar__action navbar__login"
              onClick={closeMenu}
            >
              Connexion
            </Link>

            <Link
              to="/inscription"
              className="navbar__action navbar__signup"
              onClick={closeMenu}
            >
              <span>S'inscrire</span>
              <FiArrowUpRight
                className="navbar__signup-icon"
                aria-hidden="true"
              />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
