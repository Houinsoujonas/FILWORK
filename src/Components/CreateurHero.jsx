import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";

import Button from "./Button";
import creatorVisual from "../assets/creator.jpg";

function CreateurHero() {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const context = gsap.context(() => {
      gsap.from(".createur-hero__content > *", {
        autoAlpha: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section className="createur-hero" ref={sectionRef}>
      <div className="createur-hero__container">
        <div className="createur-hero__content">
          <div className="createur-hero__eyebrow">
            <span className="createur-hero__eyebrow-line" aria-hidden="true" />
            <span>Espace créateurs</span>
          </div>

          <h1 className="createur-hero__title">
            Faites de votre talent <span>un vrai métier.</span>
          </h1>

          <p className="createur-hero__lead">
            Filwork vous met en relation avec des entreprises qui cherchent
            exactement votre style. Créez votre profil, candidatez aux
            campagnes et gérez vos collaborations au même endroit.
          </p>

          <div className="createur-hero__actions">
            <Button to="/inscription">Créer mon profil</Button>
          </div>
        </div>
        <figure className="createur-hero__visual">
          <img
            src={creatorVisual}
            alt="Une créatrice prépare du contenu pour une marque"
            fetchPriority="high"
          />
          <figcaption>
            <span aria-hidden="true" />
            Un espace pour faire grandir votre activité
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export default CreateurHero;
