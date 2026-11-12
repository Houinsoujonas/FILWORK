import { lazy, Suspense, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import Button from "./Button";
const HeroScene = lazy(() => import("./HeroScene"));

function Hero() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [sceneEnabled, setSceneEnabled] = useState(false);
  const entrance = shouldReduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 18 };

  useEffect(() => {
    const sceneQuery = window.matchMedia(
      "(min-width: 761px) and (prefers-reduced-motion: no-preference)",
    );
    const updateSceneAvailability = () => setSceneEnabled(sceneQuery.matches);

    updateSceneAvailability();
    sceneQuery.addEventListener("change", updateSceneAvailability);

    return () => {
      sceneQuery.removeEventListener("change", updateSceneAvailability);
    };
  }, []);

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

          <div className="hero__actions">
            <Button
              variant="primary"
              to="/inscription"
              icon={<FiArrowRight />}
            >
              Créer mon compte
            </Button>
            <Button variant="outline" to="/campagnes">
              Voir les campagnes
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
            {sceneEnabled ? (
              <HeroScene />
            ) : (
              <div className="hero-scene hero-scene--fallback" />
            )}
          </Suspense>
          <span className="hero__visual-caption">Les idées prennent forme</span>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
