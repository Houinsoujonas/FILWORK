import { useLocation } from "react-router-dom";

const pendingDetails = {
  confidentialite: [
    "identité du responsable de traitement",
    "finalités et bases légales des traitements",
    "durées de conservation",
    "procédure d’exercice des droits",
    "coordonnées du délégué à la protection des données, le cas échéant",
  ],
  conditions: [
    "identité de l’éditeur et hébergeur",
    "conditions d’accès et d’utilisation du service",
    "responsabilités des créateurs et des entreprises",
    "règles de suspension et de résiliation",
    "droit applicable et juridiction compétente",
  ],
};

export default function InformationsLegales({ type }) {
  const isPrivacy = type === "confidentialite";
  const { pathname } = useLocation();
  const details = pendingDetails[type] || pendingDetails.conditions;

  return (
    <main className="public-page legal-page">
      <span className="section-label">INFORMATIONS LÉGALES</span>
      <h1>
        {isPrivacy
          ? "Politique de confidentialité"
          : "Conditions d’utilisation"}
      </h1>
      <p>
        Ce document doit être fourni et validé par l’équipe FILWORK avant la
        mise en production. Aucun engagement juridique n’est inventé dans cette
        version de l’interface.
      </p>

      <section aria-labelledby="legal-pending-title">
        <h2 id="legal-pending-title">Éléments à valider</h2>
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </section>

      <div className="legal-notice" role="status">
        Contenu en attente de validation officielle · {pathname}
      </div>
    </main>
  );
}
