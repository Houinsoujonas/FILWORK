import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FiCamera,
  FiVideo,
  FiEdit3,
  FiPenTool,
  FiUsers,
  FiMic,
} from "react-icons/fi";

import "./CreateurDomaines.css";

gsap.registerPlugin(ScrollTrigger);

const profiles = [
  { icon: FiCamera, label: "Photographes" },
  { icon: FiVideo, label: "Vidéastes" },
  { icon: FiEdit3, label: "Rédacteurs" },
  { icon: FiPenTool, label: "Graphistes" },
  { icon: FiUsers, label: "Créateurs de contenu" },
  { icon: FiMic, label: "Podcasteurs" },
];

function CreateurDomaines() {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const context = gsap.context(() => {
      gsap.from(".createur-domaines__item", {
        autoAlpha: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".createur-domaines__list",
          start: "top 88%",
          once: true,
        },
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section
      className="createur-domaines"
      ref={sectionRef}
      aria-labelledby="createur-domaines-title"
    >
      <div className="createur-domaines__container">
        <div className="createur-domaines__intro">
          <h2 className="createur-domaines__title" id="createur-domaines-title">
            Quel que soit votre domaine
          </h2>
          <p className="createur-domaines__description">
            Les marques recherchent des profils variés. Trouvez la place qui
            vous ressemble.
          </p>
        </div>

        <ul className="createur-domaines__list">
          {profiles.map(({ icon: Icon, label }) => (
            <li className="createur-domaines__item" key={label}>
              <span className="createur-domaines__icon">
                <Icon aria-hidden="true" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default CreateurDomaines;