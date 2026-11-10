import { FiMail } from "react-icons/fi";

const pendingDetails = [
  "adresse e-mail officielle de contact",
  "numéro de téléphone",
  "adresse postale du siège",
];

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
          qu’elles auront été confirmées par l’équipe. Aucune adresse n’est
          affichée tant qu’elle n’a pas été validée.
        </p>
      </section>

      <section className="public-panel" aria-labelledby="contact-pending-title">
        <h2 id="contact-pending-title">Informations à fournir</h2>
        <p>
          L’équipe doit communiquer les éléments suivants avant la mise en
          production :
        </p>
        <ul>
          {pendingDetails.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
