import { motion, useReducedMotion } from "framer-motion";

import CircularCarousel from "./CircularCarousel";

import cat1 from "../assets/cat1.JPG";
import cat2 from "../assets/cat2.JPG";
import cat3 from "../assets/cat3.JPG";
import cat4 from "../assets/cat4.JPG";
import cat5 from "../assets/cat5.JPG";
import cat6 from "../assets/cat6.JPG";

import "./CreatorCategories.css";

const categories = [
  {
    id: 1,
    image: cat1,
    category: "01 / TECHNOLOGIE",
    title: "Technologie",
    description: "Innovation, numérique et nouvelles tendances technologiques.",
  },
  {
    id: 2,
    image: cat2,
    category: "02 / MODE & BEAUTÉ",
    title: "Mode & beauté",
    description: "Style, beauté, cosmétiques et nouvelles collections.",
  },
  {
    id: 3,
    image: cat3,
    category: "03 / LIFESTYLE",
    title: "Lifestyle",
    description: "Quotidien, inspiration et art de vivre.",
  },
  {
    id: 4,
    image: cat4,
    category: "04 / GASTRONOMIE",
    title: "Gastronomie",
    description: "Cuisine, découvertes culinaires et expériences gourmandes.",
  },
  {
    id: 5,
    image: cat5,
    category: "05 / VOYAGE",
    title: "Voyage & tourisme",
    description: "Destinations, découvertes et nouvelles aventures.",
  },
  {
    id: 6,
    image: cat6,
    category: "06 / SPORT",
    title: "Sport & fitness",
    description: "Performance, entraînement et bien-être.",
  },
];

function CreatorCategories() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <section className="creator-categories" id="categories">
      {" "}
      <div className="creator-categories__container">
        <motion.div
          className="creator-categories__header"
          initial={
            shouldReduceMotion ? false : { opacity: 0, y: 35 }
          }
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: "easeOut" }}
        >
          {" "}
          <div className="creator-categories__eyebrow">
            {" "}
            <span className="creator-categories__eyebrow-line" />{" "}
            <span>EXPLORER LES UNIVERS</span>{" "}
          </div>
          <div className="creator-categories__heading">
            <h2>
              Des univers créatifs.
              <span>Des possibilités infinies.</span>
            </h2>

            <p className="creator-categories__description">
              De la technologie à la gastronomie, découvrez les univers dans
              lesquels créateurs et entreprises se rencontrent pour imaginer des
              collaborations qui ont du sens.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="creator-categories__carousel"
          initial={
            shouldReduceMotion ? false : { opacity: 0, y: 45 }
          }
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.9,
            delay: shouldReduceMotion ? 0 : 0.15,
            ease: "easeOut",
          }}
        >
          <CircularCarousel
            items={categories}
            cardWidth={270}
            cardHeight={370}
            gap={35}
            perspective={2400}
            speed={0.035}
            pauseOnHover
            captions
          />
        </motion.div>

        <motion.div
          className="creator-categories__footer"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.7,
            delay: shouldReduceMotion ? 0 : 0.2,
          }}
        >
          <span>
            <span className="creator-categories__status-dot" />
            06 UNIVERS À EXPLORER
          </span>

          <span>CRÉATIVITÉ · COLLABORATION · IMPACT</span>
        </motion.div>
      </div>
    </section>
  );
}

export default CreatorCategories;
