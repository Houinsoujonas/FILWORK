import { Link } from "react-router-dom";
import { FiArrowUpRight, FiInstagram, FiLinkedin } from "react-icons/fi";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";

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
