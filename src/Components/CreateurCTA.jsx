import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Button from "./Button";

gsap.registerPlugin(ScrollTrigger);

function CreateurCTA() {
  const sectionRef = useRef(null);

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
          <Button to="/inscription">
            Rejoindre Filwork
          </Button>
        </div>
      </div>
    </section>
  );
}

export default CreateurCTA;
