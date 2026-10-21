import { useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FiArrowUpRight } from "react-icons/fi";

import Button from "./Button";
import "./CreateurCTA.css";

gsap.registerPlugin(ScrollTrigger);

function CreateurCTA() {
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const context = gsap.context(() => {
      gsap.from(".createur-cta__box", {
        autoAlpha: 0,
        y: 28,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".createur-cta__box",
          start: "top 90%",
          once: true,
        },
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section className="createur-cta" ref={sectionRef}>
      <div className="createur-cta__container">
        <div className="createur-cta__box">
          <h2>Prêt à montrer ce que vous savez faire&nbsp;?</h2>
          <p>Votre profil est visible par les entreprises dès sa création.</p>
          <Button onClick={() => navigate("/inscription")}>
            Rejoindre Filwork
            <FiArrowUpRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default CreateurCTA;