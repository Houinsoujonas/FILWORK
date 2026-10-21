import { useLayoutEffect, useRef } from "react";
import {
  FiArrowUpRight,
  FiUsers,
  FiTarget,
  FiTrendingUp,
  FiCheckCircle,
} from "react-icons/fi";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import entr from "../assets/entr.jpg";
import "./BusinessSection.css";

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  {
    icon: <FiTarget />,
    title: "Des campagnes ciblées",
    description:
      "Définissez vos objectifs et trouvez des créateurs adaptés à votre marque.",
  },
  {
    icon: <FiUsers />,
    title: "Les bons créateurs",
    description:
      "Découvrez des profils, consultez des portfolios et identifiez les talents qui vous correspondent.",
  },
  {
    icon: <FiTrendingUp />,
    title: "Un suivi simplifié",
    description:
      "Organisez vos collaborations et suivez chaque étape de vos projets.",
  },
];

function BusinessSection() {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const visualRef = useRef(null);
  const buttonRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const visual = visualRef.current;
    const button = buttonRef.current;

    if (
      !section ||
      !content ||
      !visual ||
      !button ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const benefitCards = content.querySelectorAll(".business-benefit");

      gsap.set(content, {
        x: -90,
        autoAlpha: 0,
      });

      gsap.set(visual, {
        x: 90,
        autoAlpha: 0,
      });

      gsap.set(benefitCards, {
        y: 20,
        autoAlpha: 0,
      });

      gsap.set(button, {
        y: 25,
        autoAlpha: 0,
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      timeline
        .to(
          content,
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "power3.out",
          },
          0,
        )
        .to(
          visual,
          {
            x: 0,
            autoAlpha: 1,
            duration: 1.1,
            ease: "power3.out",
          },
          0.15,
        )
        .to(
          benefitCards,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.65,
            stagger: 0.15,
            ease: "power2.out",
          },
          "-=0.4",
        )
        .to(
          button,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.2",
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="business-section" id="entreprises" ref={sectionRef}>
      {" "}
      <div className="business-container">
        {" "}
        <div className="business-layout">
          {" "}
          <div className="business-content" ref={contentRef}>
            {" "}
            <span className="business-eyebrow">
              {" "}
              <span className="business-eyebrow-line" />
              POUR LES ENTREPRISES{" "}
            </span>
            <h2 className="business-title">
              Donnez une nouvelle
              <br />
              dimension à votre
              <br />
              <span>marque.</span>
            </h2>
            <p className="business-description">
              Filwork vous aide à trouver les créateurs de contenu qui
              correspondent à votre identité. Lancez vos campagnes, développez
              votre visibilité et construisez des collaborations qui donnent vie
              à vos idées.
            </p>
            <div className="business-benefits">
              {benefits.map((benefit) => (
                <article className="business-benefit" key={benefit.title}>
                  <div className="business-benefit-icon">{benefit.icon}</div>

                  <div className="business-benefit-text">
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>

                  <FiCheckCircle
                    className="business-benefit-check"
                    aria-hidden="true"
                  />
                </article>
              ))}
            </div>
            <p className="business-note">
              Votre prochaine collaboration commence ici.
            </p>
          </div>
          <div className="business-visual" ref={visualRef}>
            <div className="business-image-frame">
              <img
                className="business-image"
                src={entr}
                alt="Une équipe professionnelle préparant une collaboration créative"
                loading="lazy"
              />

              <div className="business-image-overlay" />

              <div className="business-image-top">
                <span className="business-image-indicator" />
                <span>FILWORK BUSINESS</span>
              </div>

              <div className="business-image-caption">
                <span className="business-image-kicker">
                  ENSEMBLE, ALLONS PLUS LOIN
                </span>

                <h3>
                  CRÉEZ.
                  <br />
                  COLLABOREZ.
                  <br />
                  ÉVOLUEZ.
                </h3>

                <p>Les bonnes idées naissent ensemble.</p>
              </div>

              <div className="business-image-decoration business-image-decoration-one" />
              <div className="business-image-decoration business-image-decoration-two" />
            </div>

            <div className="business-visual-dots" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        </div>
        <div className="business-bottom-cta" ref={buttonRef}>
          <button
            className="business-cta"
            type="button"
            onClick={() => {
              window.location.href = "/inscription";
            }}
          >
            <span>Rejoindre Filwork</span>
            <FiArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default BusinessSection;
