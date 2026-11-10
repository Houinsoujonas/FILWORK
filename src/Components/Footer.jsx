<<<<<<< HEAD
import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FiInstagram,
  FiLinkedin,
} from "react-icons/fi";
import { FaWhatsapp, FaFacebookF } from "react-icons/fa";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
=======
import { Link } from "react-router-dom";
import { FiArrowUpRight, FiInstagram, FiLinkedin } from "react-icons/fi";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

const COLUMNS = [
  {
    title: "Plateforme",
    links: [
      ["Campagnes", "/campagnes"],
      ["Annuaire des créateurs", "/annuaire-createurs"],
      ["Espace créateurs", "/createurs"],
      ["À propos", "/a-propos"],
    ],
  },
  {
    title: "Commencer",
    links: [
      ["Créer un compte", "/inscription"],
      ["Se connecter", "/connexion"],
      ["Mot de passe oublié", "/mot-de-passe-oublie"],
    ],
  },
  {
    title: "Informations",
    links: [
      ["Contact", "/contact"],
      ["Conditions d’utilisation", "/conditions"],
      ["Confidentialité", "/confidentialite"],
    ],
  },
];

const SOCIALS = [
  ["Instagram", "https://www.instagram.com/", FiInstagram],
  ["LinkedIn", "https://www.linkedin.com/", FiLinkedin],
  ["WhatsApp", "https://www.whatsapp.com/", FaWhatsapp],
  ["Facebook", "https://www.facebook.com/", FaFacebookF],
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
<<<<<<< HEAD
    <footer className="footer" ref={footerRef}>
      {" "}
      <div className="footer__container">
        {" "}
        <div className="footer__main">
          {" "}
          <div className="footer__brand">
            {" "}
            <Link to="/" className="footer__logo" aria-label="Filwork, accueil">
              <img src="/filwork-logo.svg" alt="" width={254} height={56} />
            </Link>
            <p className="footer__signature">IMAGINER. CONNECTER. RÉALISER.</p>
            <p className="footer__description">
              La plateforme qui rapproche les créateurs de contenu et les
              entreprises pour donner vie à de nouvelles collaborations.
            </p>
            <div className="footer__socials" aria-label="Réseaux sociaux">
              <span
                className="footer__social"
                aria-label="Instagram, compte officiel à confirmer"
                title="Compte officiel à confirmer"
              >
                <FiInstagram aria-hidden="true" />
              </span>
              <span
                className="footer__social"
                aria-label="LinkedIn, compte officiel à confirmer"
                title="Compte officiel à confirmer"
              >
                <FiLinkedin aria-hidden="true" />
              </span>
              <span
                className="footer__social"
                aria-label="WhatsApp, compte officiel à confirmer"
                title="Compte officiel à confirmer"
              >
                <FaWhatsapp aria-hidden="true" />
              </span>
              <span
                className="footer__social"
                aria-label="Facebook, compte officiel à confirmer"
                title="Compte officiel à confirmer"
              >
                <FaFacebookF aria-hidden="true" />
              </span>
            </div>
            <p className="footer__social-note">
              Comptes officiels à confirmer.
            </p>
          </div>
          <div className="footer__column">
            <h3>Navigation</h3>
            <ul>
              <li>
                <Link to="/">Accueil</Link>
              </li>
              <li>
                <Link to="/a-propos">À propos</Link>
              </li>
              <li>
                <Link to="/campagnes">Campagnes</Link>
              </li>
              <li>
                <Link to="/annuaire-createurs">Annuaire des créateurs</Link>
              </li>
              <li>
                <Link to="/inscription">Créer un compte</Link>
              </li>
              <li>
                <Link to="/connexion">Connexion</Link>
              </li>
            </ul>
          </div>
          <div className="footer__column">
            <h3>Pour vous</h3>
            <ul>
              <li>
                <Link to="/inscription">Je suis créateur</Link>
              </li>
              <li>
                <Link to="/inscription">Je suis une entreprise</Link>
              </li>
              <li>
                <Link to="/campagnes">Découvrir les opportunités</Link>
              </li>
            </ul>
          </div>
          <div className="footer__column">
            <h3>Informations</h3>
            <ul>
              <li>
                <Link to="/confidentialite">Confidentialité</Link>
              </li>
              <li>
                <Link to="/conditions">Conditions d'utilisation</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <p>© {currentYear} Filwork. Tous droits réservés.</p>
=======
    <footer className="site-footer">
      <div className="site-footer__container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo" aria-label="FILWORK, accueil">
              <img src="/filwork-logo-light.svg" alt="" />
            </Link>
            <p className="site-footer__signature">Imaginer. Connecter. Réaliser.</p>
            <p className="site-footer__description">
              La plateforme qui rapproche les créateurs de contenu et les
              entreprises pour donner vie à de nouvelles collaborations.
            </p>
            <Link className="site-footer__cta" to="/inscription">
              Rejoindre FILWORK <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

          <nav className="site-footer__columns" aria-label="Liens du pied de page">
            {COLUMNS.map((column) => (
              <div className="site-footer__column" key={column.title}>
                <h2>{column.title}</h2>
                <ul>
                  {column.links.map(([text, to]) => (
                    <li key={to}>
                      <Link to={to}>{text}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p>© {currentYear} FILWORK. Tous droits réservés.</p>
          <div className="site-footer__socials" aria-label="Réseaux sociaux">
            {SOCIALS.map(([name, href, Icon]) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name}>
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
