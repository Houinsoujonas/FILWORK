import { useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  FiArrowUpRight,
  FiCheckCircle,
  FiFolder,
  FiTarget,
} from "react-icons/fi";

import creator from "../assets/creator.jpg";
import creat2 from "../assets/creat2.jpg";
import creat3 from "../assets/creat3.jpg";

import Button from "./Button";
import "./CreatorSection.css";

gsap.registerPlugin(ScrollTrigger);

const creatorImages = [
  {
    id: 1,
    src: creator,
    alt: "Créateur de contenu présentant son univers créatif",
    title: "Exprimez votre créativité",
    description:
      "Présentez votre univers, vos réalisations et les compétences qui rendent votre profil unique.",
    number: "01",
  },
  {
    id: 2,
    src: creat2,
    alt: "Production visuelle et création de contenu",
    title: "Trouvez des opportunités",
    description:
      "Découvrez des campagnes et des projets professionnels qui correspondent à votre talent.",
    number: "02",
  },
  {
    id: 3,
    src: creat3,
    alt: "Collaboration autour d'un projet créatif",
    title: "Collaborez avec des marques",
    description:
      "Mettez votre créativité au service des entreprises et donnez vie à des projets concrets.",
    number: "03",
  },
  {
    id: 4,
    src: creator,
    alt: "Créateur développant son activité professionnelle",
    title: "Développez votre réseau",
    description:
      "Construisez des relations professionnelles et multipliez vos possibilités de collaboration.",
    number: "04",
  },
];

const benefits = [
  {
    number: "01",
    icon: FiFolder,
    title: "Présentez votre univers",
    description:
      "Construisez votre portfolio et mettez en valeur vos créations, votre style et vos compétences.",
  },
  {
    number: "02",
    icon: FiTarget,
    title: "Trouvez des collaborations",
    description:
      "Découvrez les campagnes des entreprises et proposez votre profil aux projets qui vous correspondent.",
  },
  {
    number: "03",
    icon: FiCheckCircle,
    title: "Suivez vos projets",
    description:
      "Retrouvez vos candidatures, vos livrables et les informations essentielles au suivi de vos collaborations.",
  },
];

function CreatorSection() {
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const context = gsap.context(() => {
      const introItems = gsap.utils.toArray(".creator-section__intro > *");

      const benefitItems = gsap.utils.toArray(".creator-section__benefit");

      const imageCards = gsap.utils.toArray(".creator-section__image-card");

      const action = section.querySelector(".creator-section__action");

      if (reduceMotion) {
        gsap.set(
          [...introItems, ...benefitItems, ...imageCards, action].filter(
            Boolean,
          ),
          {
            clearProps: "all",
          },
        );

        return;
      }

      gsap.set(introItems, {
        autoAlpha: 0,
        y: 22,
      });

      gsap.set(benefitItems, {
        autoAlpha: 0,
        y: 20,
      });

      gsap.set(imageCards, {
        autoAlpha: 0,
        y: 35,
        scale: 0.97,
      });

      if (action) {
        gsap.set(action, {
          autoAlpha: 0,
          y: 20,
        });
      }

      gsap.to(introItems, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section.querySelector(".creator-section__intro"),
          start: "top 84%",
          once: true,
        },
      });

      gsap.to(benefitItems, {
        autoAlpha: 1,
        y: 0,
        duration: 0.65,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section.querySelector(".creator-section__benefits"),
          start: "top 86%",
          once: true,
        },
      });

      gsap.to(imageCards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.85,
        stagger: 0.13,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section.querySelector(".creator-section__visuals"),
          start: "top 82%",
          once: true,
        },
      });

      if (action) {
        gsap.to(action, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          delay: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: action,
            start: "top 96%",
            once: true,
          },
        });
      }
    }, section);

    return () => {
      context.revert();
    };
  }, []);

  return (
    <section
      className="creator-section"
      ref={sectionRef}
      aria-labelledby="creator-section-title"
    >
      {" "}
      <div className="creator-section__container">
        {/* INTRODUCTION */}{" "}
        <div className="creator-section__intro">
          {" "}
          <div className="creator-section__eyebrow">
            {" "}
            <span
              className="creator-section__eyebrow-line"
              aria-hidden="true"
            />{" "}
            <span>L'espace des créateurs</span>{" "}
          </div>
          <h2 className="creator-section__title" id="creator-section-title">
            Votre créativité mérite <span>de belles opportunités.</span>
          </h2>
          <p className="creator-section__description">
            Filwork vous aide à valoriser votre talent, à découvrir des
            opportunités professionnelles et à construire des collaborations
            avec des entreprises.
          </p>
        </div>
        {/* TROIS AVANTAGES DÉTAILLÉS */}
        <div className="creator-section__benefits">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                className="creator-section__benefit"
                key={benefit.number}
              >
                <div className="creator-section__benefit-top">
                  <div className="creator-section__benefit-icon">
                    <Icon aria-hidden="true" />
                  </div>

                  <span className="creator-section__benefit-number">
                    {benefit.number}
                  </span>
                </div>

                <h3>{benefit.title}</h3>

                <p>{benefit.description}</p>

                <span
                  className="creator-section__benefit-line"
                  aria-hidden="true"
                />
              </article>
            );
          })}
        </div>
        {/* GALERIE INTERACTIVE */}
        <div
          className="creator-section__visuals"
          aria-label="Découvrez les possibilités offertes aux créateurs"
        >
          {creatorImages.map((image) => (
            <article
              className="creator-section__image-card"
              key={image.id}
              tabIndex={0}
              aria-labelledby={`creator-card-title-${image.id}`}
              aria-describedby={`creator-card-description-${image.id}`}
            >
              <div className="creator-section__image-frame">
                <img src={image.src} alt={image.alt} loading="lazy" />

                <span className="creator-section__image-number">
                  {image.number}
                </span>

                <span
                  className="creator-section__image-overlay"
                  aria-hidden="true"
                />

                <span className="creator-section__image-indicator">
                  Explorer
                  <FiArrowUpRight aria-hidden="true" />
                </span>
              </div>

              <div className="creator-section__image-details">
                <span
                  className="creator-section__caption-dot"
                  aria-hidden="true"
                />

                <h3 id={`creator-card-title-${image.id}`}>{image.title}</h3>

                <p id={`creator-card-description-${image.id}`}>
                  {image.description}
                </p>
              </div>
            </article>
          ))}
        </div>
        {/* BOUTON CENTRÉ SOUS LES IMAGES */}
        <div className="creator-section__action">
          <Button onClick={() => navigate("/inscription")}>
            Rejoindre Filwork
            <FiArrowUpRight aria-hidden="true" />
          </Button>

          <p className="creator-section__action-note">
            Créez votre profil et explorez de nouvelles possibilités.
          </p>
        </div>
      </div>
    </section>
  );
}

export default CreatorSection;
