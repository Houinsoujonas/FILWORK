import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import CampaignCard from "../Components/CampaignCard";
import EmptyState from "../Components/EmptyState";
import { api, errorMessage } from "../lib/api";

const PLATFORMS = [
  ["", "Toutes les plateformes"],
  ["INSTAGRAM", "Instagram"],
  ["TIKTOK", "TikTok"],
  ["YOUTUBE", "YouTube"],
  ["LINKEDIN", "LinkedIn"],
  ["FACEBOOK", "Facebook"],
  ["TWITCH", "Twitch"],
];

export default function Campagnes() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [page, setPage] = useState(1);
  const [campaigns, setCampaigns] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.get("/campaigns", {
          search: search || undefined,
          platform: platform || undefined,
          page,
          limit: 9,
        });

        if (!active) {
          return;
        }

        setCampaigns(data.campaigns || []);
        setMeta({
          total: data.total ?? data.count ?? 0,
          totalPages: data.totalPages ?? 1,
        });
      } catch (requestError) {
        if (active) {
          setError(errorMessage(requestError));
          setCampaigns([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [search, platform, page]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

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

      <form
        className="listing-controls"
        aria-label="Rechercher des campagnes"
        onSubmit={handleSearch}
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

        <select
          className="listing-select"
          value={platform}
          onChange={(event) => {
            setPlatform(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par plateforme"
        >
          {PLATFORMS.map(([value, text]) => (
            <option key={value || "all"} value={value}>
              {text}
            </option>
          ))}
        </select>

        <button type="submit" className="filter-button">
          Rechercher
        </button>
      </form>

      {error && (
        <p className="form-notice form-notice--error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="public-search-status" role="status">
          Chargement des campagnes…
        </p>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title={
            search || platform
              ? "Aucun résultat pour ces critères"
              : "Les campagnes arrivent ici"
          }
          description={
            search || platform
              ? "Essayez un autre terme ou retirez le filtre de plateforme."
              : "Les campagnes vérifiées et publiées par les entreprises apparaîtront ici dès leur publication."
          }
        />
      ) : (
        <section className="public-results" aria-live="polite">
          <p className="public-results__count">
            {meta.total} campagne{meta.total > 1 ? "s" : ""} publiée
            {meta.total > 1 ? "s" : ""}
          </p>

          <div className="public-card-grid public-card-grid--campaigns">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination des campagnes">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Précédent
              </button>
              <span>
                Page {page} sur {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(meta.totalPages, current + 1))
                }
                disabled={page >= meta.totalPages}
              >
                Suivant
              </button>
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
