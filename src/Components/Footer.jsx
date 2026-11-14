import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./Footer.css";

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
            <Link to="/" className="footer__logo" aria-label="Filwork, accueil">
              <img src="/filwork-logo-light.svg" alt="" width={254} height={56} />
            </Link>
            <p className="footer__description">
              Filwork met en relation les créateurs de contenu et les
              entreprises autour de campagnes et de projets communs.
            </p>
          </div>
          <div className="footer__column">
            <h3>Navigation</h3>
            <ul>
              <li>
                <Link to="/">Accueil</Link>
              </li>
              <li>
                <Link to="/a-propos">À propos</Link>
              </li>
              <li>
                <Link to="/campagnes">Campagnes</Link>
              </li>
              <li>
                <Link to="/annuaire-createurs">Annuaire des créateurs</Link>
              </li>
              <li>
                <Link to="/inscription">Créer un compte</Link>
              </li>
              <li>
                <Link to="/connexion">Connexion</Link>
              </li>
            </ul>
          </div>
          <div className="footer__column">
            <h3>Pour vous</h3>
            <ul>
              <li>
                <Link to="/inscription">Je suis créateur</Link>
              </li>
              <li>
                <Link to="/inscription">Je suis une entreprise</Link>
              </li>
              <li>
                <Link to="/campagnes">Découvrir les opportunités</Link>
              </li>
            </ul>
          </div>
          <div className="footer__column">
            <h3>Informations</h3>
            <ul>
              <li>
                <Link to="/confidentialite">Confidentialité</Link>
              </li>
              <li>
                <Link to="/conditions">Conditions d'utilisation</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
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
