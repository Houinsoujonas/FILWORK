import { Link } from "react-router-dom";
import {
  FiInstagram,
  FiLinkedin,
} from "react-icons/fi";
import { FaWhatsapp, FaFacebookF } from "react-icons/fa";
import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
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
            <div className="footer__socials">
              <a
                className="footer__social"
                href="https://www.instagram.com/"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiInstagram aria-hidden="true" />
              </a>
              <a
                className="footer__social"
                href="https://www.linkedin.com/"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FiLinkedin aria-hidden="true" />
              </a>
              <a
                className="footer__social"
                href="https://www.whatsapp.com/"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp aria-hidden="true" />
              </a>
              <a
                className="footer__social"
                href="https://www.facebook.com/"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebookF aria-hidden="true" />
              </a>
            </div>
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
        </div>
      </div>
    </footer>
  );
}

export default Footer;
