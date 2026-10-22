import { Link } from "react-router-dom";
import { FiBriefcase, FiCamera, FiCheckCircle } from "react-icons/fi";
import "./FrontendPages.css";

const roles = [
  { icon: FiCamera, title: "Pour les créateurs", text: "Présentez votre activité, votre portfolio et vos compétences. Repérez les projets qui correspondent à votre univers et suivez vos candidatures." },
  { icon: FiBriefcase, title: "Pour les entreprises", text: "Décrivez vos besoins, découvrez des profils pertinents et organisez vos campagnes et collaborations au même endroit." },
  { icon: FiCheckCircle, title: "Des collaborations suivies", text: "Gardez une vision claire des échanges, des échéances et des livrables tout au long du projet." },
];

export default function APropos() {
  return <main className="public-page about-page"><section className="public-hero"><span className="section-label">À PROPOS DE FILWORK</span><h1>Les bonnes idées avancent <span>ensemble.</span></h1><p>FILWORK rapproche les créateurs de contenu et les entreprises pour faciliter la rencontre, la collaboration et le suivi des projets.</p><Link className="public-button" to="/inscription">Rejoindre FILWORK</Link></section>
    <section className="public-section"><div className="public-section__heading"><span className="section-label">NOTRE MISSION</span><h2>Rendre la collaboration plus simple.</h2><p>De la découverte d’un profil ou d’une campagne au suivi des livrables, FILWORK organise les étapes essentielles d’un partenariat professionnel.</p></div><div className="public-card-grid">{roles.map(({ icon: Icon, title, text }) => <article className="public-card" key={title}><span className="public-card__icon"><Icon aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="public-callout"><div><span className="section-label">IMAGINER. CONNECTER. RÉALISER.</span><h2>Un projet commence par une rencontre.</h2><p>Créez votre espace pour préparer votre parcours sur FILWORK.</p></div><Link className="public-button public-button--outline" to="/inscription">Créer un compte</Link></section>
  </main>;
}
