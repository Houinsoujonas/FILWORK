import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiBriefcase } from "react-icons/fi";

import Button from "./Button";
import campImage from "../assets/camp.jpg";

import "./FeaturedCampaigns.css";

function FeaturedCampaigns() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  const fadeUp = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.7,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const fadeLeft = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : -45,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.85,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const fadeRight = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : 45,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.85,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.14,
      },
    },
  };

  return (
    <section className="featured-campaigns" id="campagnes">
      <div className="featured-campaigns__container">
        <motion.header
          className="featured-campaigns__header"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className="featured-campaigns__intro"
            variants={fadeUp}
          >
            <motion.span
              className="featured-campaigns__eyebrow"
              variants={fadeUp}
            >
              <span className="featured-campaigns__eyebrow-line" />
              LES OPPORTUNITÉS
            </motion.span>

            <motion.h2
              className="featured-campaigns__title"
              variants={fadeUp}
            >
              Des projets qui donnent
              <span> vie aux idées.</span>
            </motion.h2>

            <motion.p
              className="featured-campaigns__description"
              variants={fadeUp}
            >
              Découvrez les campagnes des entreprises et trouvez les
              collaborations qui correspondent à votre créativité.
            </motion.p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Button
              variant="outline"
              icon={<FiArrowRight />}
              onClick={() => {
                window.location.href = "/campagnes";
              }}
            >
              Voir les campagnes
            </Button>
          </motion.div>
        </motion.header>

        <div className="featured-campaigns__showcase">
          <motion.div
            className="featured-campaigns__visual"
            variants={fadeLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.img
              className="featured-campaigns__image"
              src={campImage}
              alt="Univers créatif et collaborations professionnelles"
              loading="lazy"
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      scale: 1.08,
                    }
              }
              whileInView={{
                scale: 1,
              }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 1.2,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            <div
              className="featured-campaigns__image-overlay"
              aria-hidden="true"
            />

            <motion.div
              className="featured-campaigns__visual-content"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.span
                className="featured-campaigns__visual-label"
                variants={fadeUp}
              >
                L'UNIVERS FILWORK
              </motion.span>

              <motion.p variants={fadeUp}>
                La prochaine grande collaboration
                <span> commence ici.</span>
              </motion.p>
            </motion.div>

            <motion.span
              className="featured-campaigns__visual-index"
              initial={{
                opacity: 0,
              }}
              whileInView={{
                opacity: 1,
              }}
              viewport={{ once: true }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.8,
                delay: shouldReduceMotion ? 0 : 0.35,
              }}
            >
              FILWORK / OPPORTUNITÉS
            </motion.span>
          </motion.div>

          <motion.div
            className="featured-campaigns__empty"
            variants={fadeRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div
              className="featured-campaigns__empty-top"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.span
                className="featured-campaigns__empty-icon"
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 1.08,
                        rotate: -4,
                      }
                }
                transition={{ duration: 0.25 }}
              >
                <FiBriefcase aria-hidden="true" />
              </motion.span>

              <motion.span
                className="featured-campaigns__empty-label"
                variants={fadeUp}
              >
                ESPACE EN CONSTRUCTION
              </motion.span>
            </motion.div>

            <motion.h3 variants={fadeUp}>
              Les opportunités arrivent bientôt.
            </motion.h3>

            <motion.p variants={fadeUp}>
              Filwork prépare un espace où les créateurs pourront découvrir des
              projets, proposer leurs idées et collaborer avec des entreprises.
              Les campagnes publiées seront affichées ici.
            </motion.p>

            <motion.div variants={fadeUp}>
              <Button
                variant="primary"
                icon={<FiArrowRight />}
                onClick={() => {
                  window.location.href = "/inscription";
                }}
              >
                Rejoindre Filwork
              </Button>
            </motion.div>

            <motion.div
              className="featured-campaigns__empty-footer"
              variants={fadeUp}
            >
              <span />
              <p>CRÉATIVITÉ · CONNEXION · COLLABORATION</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedCampaigns;