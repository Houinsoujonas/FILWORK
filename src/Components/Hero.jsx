import { motion, useReducedMotion } from "framer-motion";
import {
  FiArrowRight,
  FiBell,
  FiBriefcase,
  FiCheck,
  FiCreditCard,
  FiGrid,
  FiInstagram,
  FiLayers,
  FiSend,
  FiUsers,
  FiYoutube,
} from "react-icons/fi";
import { FaTiktok } from "react-icons/fa";

import { Link } from "react-router-dom";

// Données d’illustration : profils décrits par leur spécialité, sans nom
// de personne ni de marque réelle (voir docs/IDENTITE_VISUELLE.md).
const APPLICANTS = [
  { initials: "BL", tint: "#e4ecff", niche: "Profil beauté & lifestyle", reach: "48 k", icon: FiInstagram, status: ["Acceptée", "green"] },
  { initials: "CU", tint: "#fde7dc", niche: "Profil cuisine locale", reach: "23 k", icon: FaTiktok, status: ["En attente", "gold"] },
  { initials: "TG", tint: "#ece6ff", niche: "Profil tech & gaming", reach: "86 k", icon: FiYoutube, status: ["Nouvelle", "blue"] },
];

const NAV = [FiGrid, FiBriefcase, FiUsers, FiSend, FiLayers];

// Fenêtre d’application stylisée : elle reprend les composants réels
// de l’espace entreprise (statut, chiffres clés, candidatures).
function HeroPreview() {
  return (
    <div className="hero-app">
      <div className="hero-app__window">
        <div className="hero-app__bar">
          <span className="hero-app__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="hero-app__url">filwork · espace entreprise</span>
        </div>

        <div className="hero-app__body">
          <nav className="hero-app__rail">
            <span className="hero-app__mark">F</span>
            {NAV.map((Icon, index) => (
              <span
                key={index}
                className={`hero-app__nav${index === 1 ? " is-active" : ""}`}
              >
                <Icon />
              </span>
            ))}
          </nav>

          <div className="hero-app__main">
            <div className="hero-app__head">
              <div>
                <span className="hero-app__crumb">Mes campagnes</span>
                <strong className="hero-app__title">Lancement gamme soins</strong>
              </div>
              <span className="hero-app__badge hero-app__badge--green">Publiée</span>
            </div>

            <div className="hero-app__kpis">
              <div>
                <small>Budget</small>
                <strong>450 000 F</strong>
              </div>
              <div>
                <small>Candidatures</small>
                <strong>12</strong>
              </div>
              <div>
                <small>Livrables</small>
                <strong>3 / 5</strong>
                <span className="hero-app__meter">
                  <span style={{ width: "60%" }} />
                </span>
              </div>
            </div>

            <div className="hero-app__list">
              <div className="hero-app__list-head">
                <span>Candidatures récentes</span>
                <span>Audience</span>
              </div>
              {APPLICANTS.map(({ initials, tint, niche, reach, icon: Icon, status }) => (
                <div className="hero-app__row" key={initials}>
                  <span className="hero-app__avatar" style={{ background: tint }}>
                    {initials}
                  </span>
                  <span className="hero-app__who">{niche}</span>
                  <span className="hero-app__reach">
                    <Icon /> {reach}
                  </span>
                  <span className={`hero-app__badge hero-app__badge--${status[1]}`}>
                    {status[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hero-app__toast hero-app__toast--top">
        <span className="hero-app__toast-icon">
          <FiBell />
        </span>
        <span>
          <strong>Invitation acceptée</strong>
          <small>Une créatrice rejoint votre campagne</small>
        </span>
      </div>

      <div className="hero-app__toast hero-app__toast--bottom">
        <span className="hero-app__toast-icon hero-app__toast-icon--lime">
          <FiCreditCard />
        </span>
        <span>
          <strong>Paiement planifié</strong>
          <small>150 000 F CFA · échéance le 18</small>
        </span>
        <FiCheck className="hero-app__toast-check" />
      </div>
    </div>
  );
}

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

          <div className="hero-actions">
            <Link className="hero-actions__primary" to="/inscription">
              Créer mon compte
              <FiArrowRight aria-hidden="true" />
            </Link>
            <Link className="hero-actions__secondary" to="/campagnes">
              Voir les campagnes
            </Link>
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
          className="hero__preview"
          aria-hidden="true"
          initial={entrance}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: shouldReduceMotion ? 0 : 0.12 }}
        >
          <HeroPreview />
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
