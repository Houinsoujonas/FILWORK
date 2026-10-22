import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

import "./Navbar.css";

const navLinks = [
  { label: "Accueil", path: "/" },
  { label: "Créateur", path: "/createurs" },
  { label: "Annuaire", path: "/annuaire-createurs" },
  { label: "Campagne", path: "/campagnes" },
  { label: "À propos", path: "/a-propos" },
];

function FilworkLogo() {
  return (
    <Link to="/" className="filwork-logo" aria-label="Filwork — Accueil">
      <img src="/filwork-logo.svg" alt="" />
    </Link>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const menuToggleRef = useRef(null);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="navbar" ref={headerRef}>
      <div className="navbar__container">
        <FilworkLogo />

        <button
          type="button"
          className="navbar__menu-toggle"
          ref={menuToggleRef}
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
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
