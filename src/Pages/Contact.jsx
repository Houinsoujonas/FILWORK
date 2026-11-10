import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBriefcase,
  FiClock,
  FiHelpCircle,
  FiUser,
} from "react-icons/fi";

const ROUTES = [
  {
    icon: FiUser,
    title: "Vous êtes créateur",
    text: "Créez votre profil, présentez vos réseaux et candidatez aux campagnes publiées par les entreprises.",
    cta: "Créer mon profil créateur",
    to: "/inscription",
  },
  {
    icon: FiBriefcase,
    title: "Vous êtes une entreprise",
    text: "Publiez une campagne, parcourez l’annuaire et invitez les créateurs qui correspondent à votre marque.",
    cta: "Ouvrir un espace entreprise",
    to: "/inscription",
  },
  {
    icon: FiHelpCircle,
    title: "Une question sur FILWORK",
    text: "Fonctionnement, candidatures, livrables, paiements : les réponses les plus fréquentes sont regroupées sur l’accueil.",
    cta: "Lire les questions fréquentes",
    to: "/#faq",
  },
];

const pendingDetails = [
  "adresse e-mail officielle de contact",
  "numéro de téléphone",
  "adresse postale du siège",
];

export default function Contact() {
  return (
    <main className="public-page contact-page">
      <header className="page-intro">
        <span className="section-label">Contact</span>
        <h1>Parlons de votre projet.</h1>
        <p>
<<<<<<< HEAD
          Les coordonnées officielles de FILWORK seront publiées ici dès
          qu’elles auront été confirmées par l’équipe. Aucune adresse n’est
          affichée tant qu’elle n’a pas été validée.
=======
          Choisissez le chemin qui correspond à votre besoin : la plupart des
          démarches se font directement depuis votre espace FILWORK.
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b
        </p>
      </header>

      <section className="contact-routes" aria-label="Par où commencer">
        {ROUTES.map(({ icon: Icon, title, text, cta, to }) => (
          <article className="contact-route" key={title}>
            <span className="contact-route__icon" aria-hidden="true">
              <Icon />
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link className="contact-route__link" to={to}>
              {cta} <FiArrowRight aria-hidden="true" />
            </Link>
          </article>
        ))}
      </section>

<<<<<<< HEAD
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
=======
      <aside className="contact-note">
        <span className="contact-note__icon" aria-hidden="true">
          <FiClock />
        </span>
        <div>
          <h2>Coordonnées officielles</h2>
          <p>
            L’adresse e-mail et le numéro de l’équipe FILWORK seront publiés
            ici dès qu’ils auront été confirmés. En attendant, les échanges
            entre créateurs et entreprises passent par les invitations, les
            candidatures et les collaborations de la plateforme.
          </p>
        </div>
      </aside>
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b
    </main>
  );
}
