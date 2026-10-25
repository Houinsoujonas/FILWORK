import { FiArrowRight, FiBriefcase, FiCheckCircle, FiUsers } from "react-icons/fi";
import teamImage from "../assets/hero1.jpg";
import studioImage from "../assets/entr.jpg";
import creatorImage from "../assets/creator.jpg";

const principles = [
  { icon: FiUsers, number: "01", title: "Des profils qui racontent leur savoir-faire", text: "Les créateurs présentent leurs compétences, leur univers et leurs réalisations dans un espace professionnel." },
  { icon: FiBriefcase, number: "02", title: "Des campagnes compréhensibles", text: "Les entreprises décrivent leurs objectifs, leur public et leurs attentes pour trouver les bons partenaires." },
  { icon: FiCheckCircle, number: "03", title: "Des collaborations mieux suivies", text: "Les échanges, les échéances et les livrables restent rassemblés tout au long du projet." },
];

const journey = [
  ["Découvrir", "Explorez les profils et les campagnes à partir de votre besoin."],
  ["Se rencontrer", "Présentez votre projet et échangez sur les attentes de chacun."],
  ["Collaborer", "Faites avancer les étapes et suivez les livrables dans un cadre clair."],
];

export default function APropos() {
  return (
    <main className="public-page about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero__copy">
          <span className="section-label">À PROPOS DE FILWORK</span>
          <h1 id="about-title">Les bonnes idées avancent <span>ensemble.</span></h1>
          <p>FILWORK rapproche les créateurs et les entreprises pour transformer les talents, les besoins et les idées en collaborations concrètes.</p>
          <a className="public-button" href="/inscription">Découvrir FILWORK <FiArrowRight aria-hidden="true" /></a>
        </div>
        <figure className="about-hero__visual">
          <img src={teamImage} alt="Une équipe créative échange autour d’un projet" fetchPriority="high" />
          <figcaption><span className="about-hero__dot" />Des talents qui font avancer les projets</figcaption>
        </figure>
      </section>

      <section className="about-section" aria-labelledby="about-mission-title">
        <div className="about-section__heading">
          <span className="section-label">NOTRE MISSION</span>
          <h2 id="about-mission-title">Rendre la collaboration plus simple, à chaque étape.</h2>
          <p>La plateforme aide chacun à comprendre le projet, son rôle et la prochaine action à mener.</p>
        </div>
        <div className="about-principles">
          {principles.map(({ icon: Icon, number, title, text }) => (
            <article className="about-principle" key={number}>
              <div className="about-principle__meta"><span className="about-principle__icon"><Icon aria-hidden="true" /></span><span>{number}</span></div>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-story" aria-labelledby="about-story-title">
        <figure className="about-story__visual"><img src={studioImage} alt="Une équipe prépare une production de contenu" loading="lazy" /><figcaption>CRÉATION · ÉQUIPE · PROJET</figcaption></figure>
        <div className="about-story__copy">
          <span className="section-label">UN ESPACE POUR CRÉER ENSEMBLE</span>
          <h2 id="about-story-title">Le talent rencontre le bon contexte.</h2>
          <p>Une collaboration démarre mieux lorsque les attentes sont claires et que chacun peut présenter sa valeur. FILWORK réunit ces repères dans un même parcours.</p>
          <ul>
            <li><FiCheckCircle aria-hidden="true" /> Des créateurs visibles pour leur savoir-faire.</li>
            <li><FiCheckCircle aria-hidden="true" /> Des campagnes présentées avec leurs objectifs.</li>
            <li><FiCheckCircle aria-hidden="true" /> Des étapes et des livrables plus faciles à suivre.</li>
          </ul>
        </div>
      </section>

      <section className="about-journey" aria-labelledby="about-journey-title">
        <div className="about-section__heading"><span className="section-label">LE PARCOURS</span><h2 id="about-journey-title">De la première idée au projet livré.</h2></div>
        <ol className="about-journey__list">
          {journey.map(([title, text], index) => <li className="about-journey__step" key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></li>)}
        </ol>
        <img className="about-journey__image" src={creatorImage} alt="Une créatrice présente son travail" loading="lazy" />
      </section>

      <section className="about-callout">
        <div><span className="section-label">IMAGINER · CONNECTER · RÉALISER</span><h2>Un projet commence par une rencontre.</h2><p>Créez votre espace et commencez votre parcours sur FILWORK.</p></div>
        <a className="public-button" href="/inscription">Créer un compte <FiArrowRight aria-hidden="true" /></a>
      </section>
    </main>
  );
}
