import { useState } from "react";
import { FiSearch, FiSliders } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";
import "./FrontendPages.css";

export default function AnnuaireCreateurs() {
  const [query, setQuery] = useState("");
  return <main className="public-page listing-page"><header className="listing-heading"><span className="section-label">TALENTS</span><h1>Annuaire des créateurs</h1><p>Parcourez les profils et découvrez les compétences qui répondent à vos projets.</p></header>
    <section className="listing-controls" aria-label="Rechercher des créateurs"><label className="listing-search"><FiSearch aria-hidden="true" /><span className="sr-only">Rechercher un créateur</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un créateur ou une spécialité" /></label><button type="button" className="filter-button" disabled aria-label="Filtres disponibles lorsque des profils seront publiés"><FiSliders aria-hidden="true" /> Filtres</button></section>
    <EmptyState title={query ? "Recherche prête" : "Les profils arriveront ici"} description={query ? "Votre recherche sera appliquée dès que les profils autorisés seront disponibles." : "Les profils autorisés apparaîtront ici dès que les données seront accessibles."} />
  </main>;
}
