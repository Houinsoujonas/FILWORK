import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import Button from "./Button";
import "./Hero.css";

import creat4Image from "../assets/creat4.jpg";

function Hero() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.16,
        delayChildren: shouldReduceMotion ? 0 : 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : -35,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.75,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const imageVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      scale: shouldReduceMotion ? 1 : 1.08,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 1.4,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section className="hero">
      {/* Image principale */}
      <motion.div
        className={`hero__background ${imageLoaded ? "is-loaded" : ""}`}
        variants={imageVariants}
        initial="hidden"
        animate="visible"
      >
        <img
          src={creat4Image}
          alt="Créativité et collaboration professionnelle"
          className="hero__image"
          onLoad={() => setImageLoaded(true)}
        />
      </motion.div>

      {/* Superpositions */}
      <div className="hero__overlay" />
      <div className="hero__vignette" />

      {/* Contenu animé */}
      <div className="hero__container">
        <motion.div
          className="hero__content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Surtitre */}
          <motion.div
            className="hero__eyebrow"
            variants={itemVariants}
          >
            <span className="hero__eyebrow-line" />

            <span>LA CRÉATIVITÉ RENCONTRE L'OPPORTUNITÉ</span>

            <span className="hero__eyebrow-line" />
          </motion.div>

          {/* Titre */}
          <motion.h1
            className="hero__title"
            variants={itemVariants}
          >
            Vos idées méritent
            <br />
            <span>de devenir grandes.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="hero__description"
            variants={itemVariants}
          >
            Filwork connecte les créateurs de contenu et les entreprises pour
            transformer les idées en collaborations qui comptent.
          </motion.p>

          {/* Boutons */}
          <motion.div
            className="hero__actions"
            variants={itemVariants}
          >
            <Button
              variant="primary"
              size="large"
              to="/campagnes"
            >
              Explorer les campagnes
            </Button>

            <Button
              variant="outline"
              size="large"
              to="/inscription"
            >
              Rejoindre Filwork
            </Button>
          </motion.div>

          {/* Signature */}
          <motion.div
            className="hero__signature"
            variants={itemVariants}
          >
            <span className="hero__signature-line" />

            <span>IMAGINER. CONNECTER. RÉALISER.</span>

            <span className="hero__signature-line" />
          </motion.div>
        </motion.div>
      </div>

      {/* Indication de défilement */}
      <motion.div
        className="hero__scroll"
        initial={{
          opacity: 0,
          y: shouldReduceMotion ? 0 : 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.7,
          delay: shouldReduceMotion ? 0 : 1.2,
        }}
      >
        <span className="hero__scroll-line" />
        <span>DÉFILER POUR DÉCOUVRIR</span>
      </motion.div>
    </section>
  );
}

export default Hero;
