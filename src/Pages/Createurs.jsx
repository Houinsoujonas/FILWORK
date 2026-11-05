import CreateurHero from "../Components/CreateurHero";
import CreateurEtapes from "../Components/CreateurEtapes";
import CreateurDomaines from "../Components/CreateurDomaines";
import CreateurCTA from "../Components/CreateurCTA";
import creatorStudio from "../assets/creat2.jpg";
import creatorTeam from "../assets/creat3.jpg";
import creatorDesk from "../assets/creat4.jpg";

const creatorTopics = [
  {
    number: "01",
    title: "Un portfolio clair",
    text: "Montrez vos formats, votre style, vos résultats et les projets dont vous êtes fier.",
  },
  {
    number: "02",
    title: "Des campagnes adaptées",
    text: "Repérez les briefs qui correspondent à vos compétences, à vos valeurs et à votre disponibilité.",
  },
  {
    number: "03",
    title: "Des règles comprises",
    text: "Clarifiez les livrables, les échéances, la rémunération et les droits d’utilisation avant de commencer.",
  },
];

const creatorGallery = [
  {
    src: creatorDesk,
    alt: "Outils et espace de travail d’une créatrice de contenu",
    label: "Développer son univers",
  },
  {
    src: creatorStudio,
    alt: "Mise en place d'une production créative",
    label: "Production visuelle",
  },
  {
    src: creatorTeam,
    alt: "Équipe créative travaillant sur une campagne",
    label: "Collaboration de marque",
  },
];

function Createur() {
  return (
    <main className="createur-page">
      <CreateurHero />
      <CreateurEtapes />
      <CreateurDomaines />
      <section className="creator-guide" aria-labelledby="creator-guide-title">
        <div className="creator-guide__heading">
          <span className="section-label">
            VOTRE ACTIVITÉ, EN MIEUX STRUCTURÉE
          </span>
          <h2 id="creator-guide-title">
            Les bons repères pour développer votre activité.
          </h2>
          <p>
            Présentez votre travail, choisissez les projets qui vous ressemblent
            et posez un cadre clair pour chaque collaboration.
          </p>
        </div>
        <div className="creator-guide__topics">
          {creatorTopics.map(({ number, title, text }) => (
            <article className="creator-guide__topic" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="creator-guide__gallery">
          {creatorGallery.map(({ src, alt, label }) => (
            <figure className="creator-guide__photo" key={label}>
              <img src={src} alt={alt} loading="lazy" />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <CreateurCTA />
    </main>
  );
}

export default Createur;
