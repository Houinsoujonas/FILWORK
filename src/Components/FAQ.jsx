import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiMinus } from "react-icons/fi";
import "./FAQ.css";

const questions = [
  {
    question: "Qu’est-ce que FILWORK ?",
    answer:
      "FILWORK facilite la mise en relation entre les créateurs de contenu et les entreprises. Les entreprises peuvent proposer des campagnes et les créateurs présenter leurs compétences.",
  },
  {
    question: "Comment fonctionne FILWORK ?",
    answer:
      "Les entreprises publient leurs campagnes. Les créateurs découvrent les opportunités, consultent les informations et peuvent candidater aux campagnes qui correspondent à leur profil.",
  },
  {
    question: "Comment un créateur peut-il rejoindre la plateforme ?",
    answer:
      "Le créateur crée son compte, complète son profil et présente son portfolio ou son média kit. Il peut ensuite explorer les campagnes et postuler aux opportunités adaptées à ses compétences.",
  },
  {
    question: "Comment une entreprise peut-elle lancer une campagne ?",
    answer:
      "L’entreprise crée son compte, décrit ses objectifs et publie sa campagne. Elle peut ensuite consulter les candidatures et choisir les créateurs correspondant à ses besoins.",
  },
  {
    question: "L’inscription sur FILWORK est-elle gratuite ?",
    answer:
      "Les conditions d’inscription et les éventuels frais doivent être confirmés selon les modalités officielles de FILWORK.",
  },
  {
    question: "Comment suivre une collaboration ?",
    answer:
      "FILWORK a vocation à faciliter le suivi des candidatures et des collaborations, notamment les livrables et les paiements selon les fonctionnalités disponibles.",
  },
];

const sectionVariants = {
  hidden: {
    opacity: 0,
    y: 35,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
    },
  },
};

function FAQ() {
  const [activeIndex, setActiveIndex] = useState(0);

  const toggleQuestion = (index) => {
    setActiveIndex((currentIndex) => (currentIndex === index ? null : index));
  };

  return (
    <motion.section
      className="faq-section"
      id="faq"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      {" "}
      <div className="faq-container">
        <motion.div className="faq-heading" variants={itemVariants}>
          {" "}
          <span className="faq-eyebrow">FAQ</span>
          
          <h2>
            Des questions ?
            <br />
            <span>Nous avons les réponses.</span>
          </h2>
          <p>
            Tout ce que tu dois savoir pour mieux comprendre FILWORK et profiter
            de la plateforme.
          </p>
        </motion.div>

        <motion.div className="faq-list" variants={itemVariants}>
          {questions.map((item, index) => {
            const isOpen = activeIndex === index;
            const answerId = `faq-answer-${index}`;

            return (
              <motion.article
                className={`faq-item ${isOpen ? "is-open" : ""}`}
                key={item.question}
                variants={itemVariants}
                layout
              >
                <button
                  className="faq-question"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => toggleQuestion(index)}
                >
                  <span className="faq-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="faq-question-text">{item.question}</span>

                  <motion.span
                    className="faq-toggle"
                    aria-hidden="true"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {isOpen ? <FiMinus /> : <FiPlus />}
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="faq-answer"
                      id={answerId}
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      <p>{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div className="faq-bottom" variants={itemVariants}>
          <span>Tu as encore des questions ?</span>
          <a href="#contact">Contacte-nous</a>
        </motion.div>
      </div>
    </motion.section>
  );
}

export default FAQ;
