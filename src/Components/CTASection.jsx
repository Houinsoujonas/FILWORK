import { motion, useReducedMotion } from "framer-motion";
import { FiUsers, FiBriefcase } from "react-icons/fi";

import Button from "./Button";

import video from "../assets/video.mp4";

function CTASection() {
  const shouldReduceMotion = useReducedMotion();

  const contentVariants = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : -70,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.9,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : -25,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section className="cta-section">
      <video
        className="cta-section__video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={video} type="video/mp4" />
      </video>

      <div className="cta-section__overlay" />

      <div className="cta-section__container">
        <div
          className="cta-section__decoration cta-section__decoration--one"
          aria-hidden="true"
        />

        <motion.div
          className="cta-section__content"
          variants={contentVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <motion.span className="cta-section__eyebrow" variants={itemVariants}>
            L'AVENIR DE LA COLLABORATION
          </motion.span>

          <motion.h2 variants={itemVariants}>
            La prochaine grande idée
            <span> pourrait commencer ici.</span>
          </motion.h2>

          <motion.p variants={itemVariants}>
            Créateurs et entreprises, rapprochez vos ambitions. Filwork est
            pensé pour transformer les idées en projets et les rencontres en
            collaborations.
          </motion.p>

          <motion.div className="cta-section__actions" variants={itemVariants}>
            <Button
              variant="primary"
              size="large"
              to="/inscription"
            >
              Rejoindre Filwork
            </Button>

            <Button
              variant="outline"
              size="large"
              to="/connexion"
            >
              Se connecter
            </Button>
          </motion.div>

          <motion.div
            className="cta-section__audiences"
            variants={itemVariants}
          >
            <div className="cta-section__audience">
              <span className="cta-section__audience-icon">
                <FiUsers aria-hidden="true" />
              </span>

              <span>Pour les créateurs</span>
            </div>

            <span
              className="cta-section__audience-divider"
              aria-hidden="true"
            />

            <div className="cta-section__audience">
              <span className="cta-section__audience-icon">
                <FiBriefcase aria-hidden="true" />
              </span>

              <span>Pour les entreprises</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default CTASection;
