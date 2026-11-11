import { Link } from "react-router-dom";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { FiInstagram, FiLinkedin } from "react-icons/fi";

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
  ["Instagram", FiInstagram],
  ["LinkedIn", FiLinkedin],
  ["WhatsApp", FaWhatsapp],
  ["Facebook", FaFacebookF],
];

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo" aria-label="FILWORK, accueil">
              <img src="/filwork-logo-light.svg" alt="" width={254} height={56} />
            </Link>
            <p className="site-footer__signature">Imaginer. Connecter. Réaliser.</p>
            <p className="site-footer__description">
              La plateforme qui rapproche les créateurs de contenu et les
              entreprises pour donner vie à de nouvelles collaborations.
            </p>
            <Link className="site-footer__cta" to="/inscription">
              Rejoindre FILWORK <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <nav className="site-footer__columns" aria-label="Liens du pied de page">
            {COLUMNS.map((column) => (
              <div className="site-footer__column" key={column.title}>
                <h2>{column.title}</h2>
                <ul>
                  {column.links.map(([label, to]) => (
                    <li key={to}>
                      <Link to={to}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} FILWORK. Tous droits réservés.</p>
          <div className="site-footer__socials" aria-label="Réseaux sociaux">
            {SOCIALS.map(([name, Icon]) => (
              <span key={name} title={`${name} : compte officiel à confirmer`}>
                <Icon aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
