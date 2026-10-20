import { motion, useReducedMotion } from "framer-motion";
import {
  FiUserPlus,
  FiSearch,
  FiUsers,
  FiArrowUpRight,
} from "react-icons/fi";

import hero2a from "../assets/hero2a.jpg";
import hero3 from "../assets/hero3.jpg";
import hero4 from "../assets/hero4.jpg";

import "./HowItWorks.css";

const steps = [
  {
    number: "01",
    icon: FiUserPlus,
    image: hero2a,
    title: "Créez votre profil",
    description:
      "Présentez votre activité, vos compétences et vos ambitions pour permettre aux entreprises ou aux créateurs de mieux vous connaître.",
    label: "INSCRIPTION",
  },
  {
    number: "02",
    icon: FiSearch,
    image: hero3,
    title: "Trouvez la bonne opportunité",
    description:
      "Explorez les campagnes, découvrez des profils pertinents et identifiez les collaborations qui correspondent à vos objectifs.",
    label: "EXPLORATION",
  },
  {
    number: "03",
    icon: FiUsers,
    image: hero4,
    title: "Donnez vie aux projets",
    description:
      "Entrez en contact avec les bons partenaires, suivez les livrables et faites avancer vos collaborations sur Filwork.",
    label: "COLLABORATION",
  },
];

const createContainerVariants = (reducedMotion) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: reducedMotion ? 0 : 0.16,
    },
  },
});

const createItemVariants = (reducedMotion) => ({
  hidden: {
    opacity: 0,
    y: reducedMotion ? 0 : 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: reducedMotion ? 0 : 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
});

const createCardVariants = (reducedMotion) => ({
  hidden: {
    opacity: 0,
    y: reducedMotion ? 0 : 38,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: reducedMotion ? 0 : 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  },
});

function HowItWorks() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  const containerVariants = createContainerVariants(shouldReduceMotion);
  const itemVariants = createItemVariants(shouldReduceMotion);
  const cardVariants = createCardVariants(shouldReduceMotion);

  return (
    <section className="how-it-works" id="fonctionnement">
      <div className="how-it-works__container">
        <motion.header
          className="how-it-works__header"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.span
            className="how-it-works__eyebrow"
            variants={itemVariants}
          >
            <span className="how-it-works__eyebrow-line" />
            COMMENT ÇA FONCTIONNE
          </motion.span>

          <div className="how-it-works__heading-row">
            <motion.h2
              className="how-it-works__title"
              variants={itemVariants}
            >
              De la rencontre
              <br />
              <span>à la collaboration.</span>
            </motion.h2>

            <motion.p
              className="how-it-works__intro"
              variants={itemVariants}
            >
              Les bonnes idées méritent les bons partenaires. Filwork simplifie
              la rencontre entre les créateurs de contenu et les entreprises,
              de la première découverte à la réalisation des projets.
            </motion.p>
          </div>
        </motion.header>

        <motion.div
          className="how-it-works__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <motion.article
                className="how-it-works__card"
                key={step.number}
                variants={cardVariants}
              >
                <div className="how-it-works__image-wrapper">
                  <img
                    className="how-it-works__image"
                    src={step.image}
                    alt={step.title}
                    loading="lazy"
                  />

                  <div
                    className="how-it-works__image-overlay"
                    aria-hidden="true"
                  />

                  <span className="how-it-works__number">
                    {step.number}
                  </span>

                  <motion.span
                    className="how-it-works__image-icon"
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.08,
                            rotate: -5,
                          }
                    }
                    transition={{ duration: 0.25 }}
                  >
                    <Icon aria-hidden="true" />
                  </motion.span>
                </div>

                <div className="how-it-works__card-content">
                  <span className="how-it-works__label">
                    <span className="how-it-works__label-dot" />
                    {step.label}
                  </span>

                  <h3 className="how-it-works__card-title">
                    {step.title}
                  </h3>

                  <p className="how-it-works__description">
                    {step.description}
                  </p>
                </div>

                <div className="how-it-works__card-footer">
                  <span className="how-it-works__footer-text">
                    ÉTAPE {step.number}
                  </span>

                  <motion.span
                    className="how-it-works__arrow"
                    aria-hidden="true"
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            x: 3,
                            y: -3,
                          }
                    }
                    transition={{ duration: 0.2 }}
                  >
                    <FiArrowUpRight />
                  </motion.span>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div
          className="how-it-works__bottom"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
        >
          <motion.span
            className="how-it-works__bottom-line"
            variants={itemVariants}
          />

          <motion.p variants={itemVariants}>
            Une plateforme<span>.</span> Des talents<span>.</span> Des
            opportunités<span>.</span>
          </motion.p>

          <motion.span
            className="how-it-works__bottom-line"
            variants={itemVariants}
          />
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorks;