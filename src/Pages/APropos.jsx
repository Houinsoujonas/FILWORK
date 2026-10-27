import { FiArrowRight, FiBriefcase, FiCheckCircle, FiUsers } from "react-icons/fi";

import teamImage from "../assets/hero1.jpg";
import studioImage from "../assets/entr.jpg";
import alexandreImage from "../assets/equipe/alexandre-gosso.jpg";
import jonasImage from "../assets/equipe/jonas-houinsou.jpg";
import maurelImage from "../assets/equipe/maurel-togbadja.jpg";
import clemizLogo from "../assets/equipe/logo-clemiz-agency.png";
import "./APropos.css";

const developers = [
  { name: "Comlan Alexandre Gosso", image: alexandreImage },
  { name: "Jonas Houinsou", image: jonasImage },
  { name: "Kouassi Maurel Togbadja", image: maurelImage },
];

const principles = [
  {
    icon: FiUsers,
    number: "01",
    title: "Les bons profils, au bon projet",
    text: "FILWORK veut aider les entreprises à découvrir des créateurs dont l’univers, les compétences et la manière de raconter peuvent correspondre à leur marque.",
  },
  {
    icon: FiBriefcase,
    number: "02",
    title: "Une visibilité qui se construit ensemble",
    text: "En partageant son univers avec une communauté, un créateur peut aider une marque à faire connaître son activité d’une façon plus incarnée.",
  },
  {
    icon: FiCheckCircle,
    number: "03",
    title: "Le dialogue avant la collaboration",
    text: "Un échange clair aide l’entreprise et le créateur à s’accorder sur l’objectif, les attentes et la contribution de chacun.",
  },
];

const journey = [
  ["Découvrir", "Repérez les univers créatifs et les projets qui font écho à votre besoin."],
  ["Échanger", "Parlez de l’objectif, des idées et des attentes avant de vous engager."],
  ["Collaborer", "Mettez en commun vos compétences pour donner vie au projet et faire rayonner la marque."],
];

export default function APropos() {
  return (
    <main className="public-page about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero__copy">
          <span className="section-label">À PROPOS DE FILWORK</span>
          <h1 id="about-title">
            Des marques à faire rayonner. <span>Des créateurs pour les révéler.</span>
          </h1>
          <p>
            Imaginée par Clemiz Agency, FILWORK met en relation les entreprises
            et les créateurs de contenu, facilite leurs échanges et a pour
            ambition de faire émerger des collaborations qui donnent plus de
            visibilité aux marques.
          </p>
          <a className="public-button" href="/inscription">
            Rejoindre FILWORK <FiArrowRight aria-hidden="true" />
          </a>
        </div>

        <figure className="about-hero__visual">
          <img
            src={teamImage}
            alt="Une équipe créative échange autour d’un projet"
            fetchPriority="high"
          />
          <figcaption>
            <span className="about-hero__dot" />
            Quand les marques rencontrent les bons créateurs
          </figcaption>
        </figure>
      </section>

      <section className="about-origin" aria-labelledby="about-origin-title">
        <div className="about-origin__mark">
          <span className="section-label">NOTRE ORIGINE</span>
          <span className="about-origin__year">2026</span>
        </div>
        <div className="about-origin__copy">
          <h2 id="about-origin-title">Une idée née de l’expertise de Clemiz Agency.</h2>
          <p>
            Agence de communication, de services numériques et d’événementiel,
            Clemiz Agency a imaginé FILWORK pour rapprocher deux forces
            complémentaires : les entreprises qui veulent faire connaître leur
            activité et les créateurs qui savent donner vie aux idées.
          </p>
          <p>
            Lancée en 2026, la plateforme a une ambition précise : simplifier la
            rencontre, ouvrir le dialogue et aider chaque collaboration à partir
            d’un objectif compris par tous.
          </p>
          <a
            className="about-origin__agency-link"
            href="https://clemiz-agency.vercel.app"
            target="_blank"
            rel="noreferrer"
            aria-label="Découvrir Clemiz Agency (nouvel onglet)"
          >
            <img src={clemizLogo} alt="Clemiz Agency" loading="lazy" />
            <span>Découvrir Clemiz Agency <FiArrowRight aria-hidden="true" /></span>
          </a>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-mission-title">
        <div className="about-section__heading">
          <span className="section-label">NOTRE MISSION</span>
          <h2 id="about-mission-title">
            Créer le lien entre les marques et les créateurs de contenu.
          </h2>
          <p>
            Une entreprise apporte une histoire, une vision et un besoin de
            visibilité. Un créateur apporte son regard, son savoir-faire et sa
            relation avec son audience. FILWORK veut faire de cette rencontre le
            point de départ d’une collaboration utile aux deux parties.
          </p>
        </div>

        <div className="about-principles">
          {principles.map(({ icon: Icon, number, title, text }) => (
            <article className="about-principle" key={number}>
              <div className="about-principle__meta">
                <span className="about-principle__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-story" aria-labelledby="about-story-title">
        <figure className="about-story__visual">
          <img
            src={studioImage}
            alt="Une équipe prépare une production de contenu"
            loading="lazy"
          />
          <figcaption>UN BESOIN · DES TALENTS · UN PROJET</figcaption>
        </figure>

        <div className="about-story__copy">
          <span className="section-label">LE PARTI PRIS FILWORK</span>
          <h2 id="about-story-title">La bonne collaboration commence par une vraie conversation.</h2>
          <p>
            FILWORK ne veut pas s’arrêter à la rencontre. La plateforme est
            pensée pour rapprocher un besoin concret d’un univers créatif, puis
            faciliter les échanges qui permettent de transformer une première
            prise de contact en projet partagé.
          </p>
          <ul>
            <li>
              <FiCheckCircle aria-hidden="true" />
              Les créateurs mettent en avant leur univers et leur savoir-faire.
            </li>
            <li>
              <FiCheckCircle aria-hidden="true" />
              Les entreprises expriment leur besoin et l’objectif de leur campagne.
            </li>
            <li>
              <FiCheckCircle aria-hidden="true" />
              Les deux parties échangent avant de définir les contours du projet.
            </li>
          </ul>
        </div>
      </section>

      <section className="about-audiences" aria-labelledby="about-audiences-title">
        <div className="about-section__heading">
          <span className="section-label">UNE PLATEFORME, DEUX PARCOURS</span>
          <h2 id="about-audiences-title">
            Le bon point de départ dépend de votre rôle.
          </h2>
          <p>
            Créateurs et entreprises n’arrivent pas avec la même question. FILWORK
            veut donner à chacun un point de départ clair, puis les réunir autour
            d’un projet partagé.
          </p>
        </div>

        <div className="about-audiences__grid">
          <article className="about-audience about-audience--creator">
            <span className="about-audience__icon"><FiUsers aria-hidden="true" /></span>
            <span className="about-audience__label">POUR LES CRÉATEURS</span>
            <h3>Montrez ce que votre regard peut apporter.</h3>
            <p>
              Vous créez du contenu et souhaitez collaborer avec des marques ?
              Présentez votre univers et votre savoir-faire, puis repérez les
              projets où votre regard peut faire la différence.
            </p>
          </article>

          <article className="about-audience about-audience--business">
            <span className="about-audience__icon"><FiBriefcase aria-hidden="true" /></span>
            <span className="about-audience__label">POUR LES ENTREPRISES</span>
            <h3>Donnez à votre besoin un cadre concret.</h3>
            <p>
              Vous voulez faire connaître votre entreprise, un service ou un
              événement ? Précisez votre objectif et votre public pour trouver
              des créateurs capables de porter votre message avec leur propre
              regard.
            </p>
          </article>
        </div>
      </section>

      <section className="about-team" aria-labelledby="about-team-title">
        <div className="about-section__heading">
          <span className="section-label">L’ÉQUIPE DE DÉVELOPPEMENT</span>
          <h2 id="about-team-title">Les personnes qui donnent forme à FILWORK.</h2>
          <p>
            FILWORK est développée par une équipe réunie autour d’une même
            ambition : faciliter les rencontres entre créateurs et marques.
          </p>
        </div>
        <div className="about-team__grid">
          {developers.map(({ name, image }) => (
            <article className="about-team__member" key={name}>
              <img src={image} alt={`Portrait de ${name}`} loading="lazy" />
              <div className="about-team__member-copy">
                <h3>{name}</h3>
                <p>Développement de FILWORK</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-journey" aria-labelledby="about-journey-title">
        <div className="about-section__heading">
          <span className="section-label">LE PARCOURS ENVISAGÉ</span>
          <h2 id="about-journey-title">Du premier besoin aux prochaines étapes.</h2>
        </div>
        <ol className="about-journey__list">
          {journey.map(([title, text], index) => (
            <li className="about-journey__step" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-status" aria-labelledby="about-status-title">
        <span className="section-label">OÙ EN EST FILWORK ?</span>
        <div>
          <h2 id="about-status-title">Les parcours sont présentés. Les services doivent encore être raccordés.</h2>
          <p>
            Vous pouvez parcourir l’interface, choisir un type de compte et
            préparer un brief de campagne. Aujourd’hui, ces formulaires ne
            créent pas encore de compte et ne publient pas de campagne ; les
            profils et les espaces personnels ne sont pas alimentés. Leur
            activation dépend du raccordement des services de compte et de
            données.
          </p>
        </div>
      </section>

      <section className="about-callout">
        <div>
          <span className="section-label">
            CRÉATEURS · ENTREPRISES · PROJETS
          </span>
          <h2>Vous avez une idée à faire grandir&nbsp;?</h2>
          <p>
            Présentez votre univers ou votre projet, puis trouvez les bonnes
            personnes pour lui donner forme.
          </p>
        </div>
        <a className="public-button" href="/inscription">
          Créer mon espace <FiArrowRight aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}
