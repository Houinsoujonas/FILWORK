import { FiMail } from "react-icons/fi";

export default function Contact() {
  return (
    <main className="public-page">
      <section className="public-hero">
        <span className="detail-page__icon">
          <FiMail aria-hidden="true" />
        </span>
        <span className="section-label">CONTACT</span>
        <h1>Parlons de votre projet.</h1>
        <p>
          Les coordonnées officielles de FILWORK seront publiées ici dès
          qu’elles auront été confirmées par l’équipe.
        </p>
      </section>
    </main>
  );
}
