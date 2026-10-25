import { useLayoutEffect, useRef } from "react";
import {
  FiInstagram,
  FiLinkedin,
} from "react-icons/fi";
import { FaWhatsapp, FaFacebookF } from "react-icons/fa";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef(null);

  useLayoutEffect(() => {
    const footer = footerRef.current;

    if (
      !footer ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const brand = footer.querySelector(".footer__brand");
      const columns = footer.querySelectorAll(".footer__column");
      const bottom = footer.querySelector(".footer__bottom");

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: footer,
          start: "top 90%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      timeline
        .from(brand, {
          x: -35,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power3.out",
        })
        .from(
          columns,
          {
            y: 25,
            autoAlpha: 0,
            duration: 0.6,
            stagger: 0.12,
            ease: "power2.out",
          },
          "-=0.35",
        )
        .from(
          bottom,
          {
            y: 20,
            autoAlpha: 0,
            duration: 0.6,
            ease: "power2.out",
          },
          "-=0.2",
        );
    }, footer);

    return () => ctx.revert();
  }, []);

  return (
    <footer className="footer" ref={footerRef}>
      {" "}
      <div className="footer__container">
        {" "}
        <div className="footer__main">
          {" "}
          <div className="footer__brand">
            {" "}
            <a href="/" className="footer__logo" aria-label="Filwork, accueil">
              <img src="/filwork-logo.svg" alt="" />
            </a>
            <p className="footer__signature">IMAGINER. CONNECTER. RÉALISER.</p>
            <p className="footer__description">
              La plateforme qui rapproche les créateurs de contenu et les
              entreprises pour donner vie à de nouvelles collaborations.
            </p>
            <div className="footer__socials" aria-label="Réseaux sociaux">
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><FiInstagram aria-hidden="true" /></a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><FiLinkedin aria-hidden="true" /></a>
              <a href="https://www.whatsapp.com/" target="_blank" rel="noreferrer" aria-label="WhatsApp"><FaWhatsapp aria-hidden="true" /></a>
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF aria-hidden="true" /></a>
            </div>
          </div>
          <div className="footer__column">
            <h3>Navigation</h3>
            <ul>
              <li>
                <a href="/">Accueil</a>
              </li>
              <li>
                <a href="/a-propos">À propos</a>
              </li>
              <li>
                <a href="/campagnes">Campagnes</a>
              </li>
              <li>
                <a href="/annuaire-createurs">Annuaire des créateurs</a>
              </li>
              <li>
                <a href="/inscription">Créer un compte</a>
              </li>
              <li>
                <a href="/connexion">Connexion</a>
              </li>
            </ul>
          </div>
          <div className="footer__column">
            <h3>Pour vous</h3>
            <ul>
              <li>
                <a href="/inscription">Je suis créateur</a>
              </li>
              <li>
                <a href="/inscription">Je suis une entreprise</a>
              </li>
              <li>
                <a href="/campagnes">Découvrir les opportunités</a>
              </li>
            </ul>
          </div>
          <div className="footer__column">
            <h3>Informations</h3>
            <ul>
              <li>
                <a href="/confidentialite">Confidentialité</a>
              </li>
              <li>
                <a href="/conditions">Conditions d'utilisation</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <p>© {currentYear} Filwork. Tous droits réservés.</p>

        </div>
      </div>
    </footer>
  );
}

export default Footer;
