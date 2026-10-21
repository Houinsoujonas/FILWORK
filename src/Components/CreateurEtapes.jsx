import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./CreateurEtapes.css";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    title: "Créez votre profil",
    description:
      "Présentez votre style, vos compétences et vos meilleures réalisations en quelques minutes.",
  },
  {
    title: "Repérez les campagnes",
    description:
      "Parcourez les projets publiés par les entreprises et candidatez à ceux qui vous correspondent.",
  },
  {
    title: "Collaborez et suivez",
    description:
      "Échangez avec la marque, déposez vos livrables et gardez un œil sur l'avancement de chaque projet.",
  },
];

function CreateurEtapes() {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const context = gsap.context(() => {
      gsap.from(".createur-etapes__step", {
        autoAlpha: 0,
        y: 28,
        duration: 0.75,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".createur-etapes__list",
          start: "top 86%",
          once: true,
        },
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section
      className="createur-etapes"
      ref={sectionRef}
      aria-labelledby="createur-etapes-title"
    >
      <div className="createur-etapes__container">
        <h2 className="createur-etapes__title" id="createur-etapes-title">
          Comment ça marche
        </h2>

        <ol className="createur-etapes__list">
          {steps.map((step, index) => (
            <li className="createur-etapes__step" key={step.title}>
              <span className="createur-etapes__number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default CreateurEtapes;