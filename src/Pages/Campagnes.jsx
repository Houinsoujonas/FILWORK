import { useState } from "react";
import { FiSearch, FiSliders } from "react-icons/fi";
import EmptyState from "../Components/EmptyState";

export default function Campagnes() {
  const [query, setQuery] = useState("");

  return (
    <main className="public-page listing-page">
      <header className="listing-heading">
        <span className="section-label">OPPORTUNITÉS</span>
        <h1>Campagnes</h1>
        <p>
          Explorez les campagnes publiées par les entreprises et trouvez les
          projets qui vous correspondent.
        </p>
      </header>

      <section
        className="listing-controls"
        aria-label="Rechercher des campagnes"
      >
        <label className="listing-search">
          <FiSearch aria-hidden="true" />
          <span className="sr-only">Rechercher une campagne</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une campagne"
          />
        </label>
        <button
          type="button"
          className="filter-button"
          disabled
          aria-label="Filtres disponibles lorsque des campagnes seront publiées"
        >
          <FiSliders aria-hidden="true" /> Filtres
        </button>
      </section>

      <EmptyState
        title={query ? "Recherche prête" : "Les campagnes arrivent ici"}
        description={
          query
            ? "Votre recherche sera appliquée dès que les campagnes publiées seront disponibles."
            : "Les campagnes vérifiées et publiées par les entreprises apparaîtront ici dès que les données seront accessibles."
        }
      />
    </main>
  );
}
