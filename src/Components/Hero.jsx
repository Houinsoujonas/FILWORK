import { lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import Button from "./Button";

const HeroScene = lazy(() => import("./HeroScene"));

function Hero() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const entrance = shouldReduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 18 };

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__container">
        <motion.div
          className="hero__content"
          initial={entrance}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.65 }}
        >
          <span className="hero__eyebrow">
            <span className="hero__eyebrow-dot" aria-hidden="true" />
            L’ESPACE DE COLLABORATION CRÉATIVE
          </span>

          <h1 className="hero__title" id="hero-title">
            Les talents et les marques
            <br />
            <span>créent ensemble.</span>
          </h1>

          <p className="hero__description">
            Découvrez des créateurs, explorez des campagnes et faites avancer
            vos projets dans un même espace.
          </p>

          <div className="hero__cta-panel">
            <div className="hero__cta-copy">
              <span>Votre prochaine collaboration commence ici</span>
              <small>Créateurs, entreprises et campagnes réunis.</small>
            </div>
            <Button
              variant="primary"
              size="large"
              to="/annuaire-createurs"
              icon={<FiArrowRight />}
              iconPosition="right"
            >
              Explorer l’annuaire
            </Button>
          </div>

          <ul className="hero__proof-list" aria-label="FILWORK en bref">
            <li>
              <FiCheck aria-hidden="true" /> Profils créatifs
            </li>
            <li>
              <FiCheck aria-hidden="true" /> Campagnes ciblées
            </li>
            <li>
              <FiCheck aria-hidden="true" /> Projets suivis
            </li>
          </ul>
        </motion.div>
        <motion.div
          className="hero__visual"
          aria-hidden="true"
          initial={entrance}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: shouldReduceMotion ? 0 : 0.12 }}
        >
          <Suspense fallback={<div className="hero-scene hero-scene--fallback" />}>
            <HeroScene />
          </Suspense>
          <span className="hero__visual-caption">Les idées prennent forme</span>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
