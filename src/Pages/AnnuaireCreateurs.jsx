import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";

import CreatorCard from "../Components/CreatorCard";
import EmptyState from "../Components/EmptyState";
import { useAuth } from "../context/AuthContext";
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

const AVAILABILITIES = [
  ["", "Toutes les disponibilités"],
  ["AVAILABLE", "Disponible"],
  ["LIMITED", "Disponibilité limitée"],
  ["UNAVAILABLE", "Indisponible"],
];

export default function AnnuaireCreateurs() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creators, setCreators] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCompany = user?.role === "COMPANY";

  useEffect(() => {
    if (!isCompany) {
      return undefined;
    }

    let active = true;

    setLoading(true);
    setError("");

    api
      .get("/creators", {
        search: search || undefined,
        platform: platform || undefined,
        availabilityStatus: availabilityStatus || undefined,
        page,
        limit: 12,
      })
      .then((data) => {
        if (!active) {
          return;
        }

        setCreators(data.creators || []);
        setMeta({
          total: data.total ?? data.count ?? 0,
          totalPages: data.totalPages ?? 1,
        });
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError));
          setCreators([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isCompany, search, platform, availabilityStatus, page]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

  return (
    <main className="public-page listing-page">
      <header className="listing-heading">
        <span className="section-label">TALENTS</span>
        <h1>Annuaire des créateurs</h1>
        <p>
          Parcourez les profils et découvrez les compétences qui répondent à vos
          projets.
        </p>
      </header>

      {authLoading ? (
        <p className="public-search-status" role="status">
          Vérification de votre session…
        </p>
      ) : !user ? (
        <EmptyState
          title="Connexion requise"
          description="L’annuaire des créateurs est réservé aux entreprises partenaires. Connectez-vous avec un compte entreprise pour consulter les profils."
          action={
            <Link
              className="public-button"
              to="/connexion"
              state={{ from: "/annuaire-createurs" }}
            >
              Se connecter
            </Link>
          }
        />
      ) : !isCompany ? (
        <EmptyState
          title="Accès réservé aux entreprises"
          description="Seul un compte entreprise peut consulter l’annuaire et inviter des créateurs. Votre espace créateur reste accessible depuis votre tableau de bord."
          action={
            <Link className="public-button" to="/espace/createur">
              Retour à mon espace
            </Link>
          }
        />
      ) : (
        <>
          <form
            className="listing-controls"
            aria-label="Rechercher des créateurs"
            onSubmit={handleSearch}
          >
            <label className="listing-search">
              <FiSearch aria-hidden="true" />
              <span className="sr-only">Rechercher un créateur</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un créateur ou une spécialité"
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

            <select
              className="listing-select"
              value={availabilityStatus}
              onChange={(event) => {
                setAvailabilityStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrer par disponibilité"
            >
              {AVAILABILITIES.map(([value, text]) => (
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
              Chargement des profils…
            </p>
          ) : creators.length === 0 ? (
            <EmptyState
              title={
                search || platform || availabilityStatus
                  ? "Aucun résultat pour ces critères"
                  : "Les profils arriveront ici"
              }
              description={
                search || platform || availabilityStatus
                  ? "Essayez un autre terme ou retirez un filtre."
                  : "Les profils créateurs apparaîtront ici dès qu’ils seront disponibles."
              }
            />
          ) : (
            <section className="public-results" aria-live="polite">
              <p className="public-results__count">
                {meta.total} profil{meta.total > 1 ? "s" : ""} disponible
                {meta.total > 1 ? "s" : ""}
              </p>

              <div className="public-card-grid">
                {creators.map((creator) => (
                  <CreatorCard key={creator.id} creator={creator} />
                ))}
              </div>

              {meta.totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination des profils">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
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
                      setPage((current) =>
                        Math.min(meta.totalPages, current + 1),
                      )
                    }
                    disabled={page >= meta.totalPages}
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
