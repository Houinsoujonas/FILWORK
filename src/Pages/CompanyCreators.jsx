import { useState } from "react";
import { FiSearch, FiSend } from "react-icons/fi";

import { Alert, Loading, Page, Panel } from "../Components/AppUI";
import CreatorCard from "../Components/CreatorCard";
import Pagination from "../Components/Pagination";
import { api } from "../lib/api";
import { useApiQuery } from "../lib/useApiQuery";

const EMPTY_CREATORS = { creators: [], pagination: null };

const AVAILABILITY = [
  ["", "Toutes les disponibilités"],
  ["AVAILABLE", "Disponible"],
  ["LIMITED", "Disponibilité limitée"],
  ["UNAVAILABLE", "Indisponible"],
];

const PLATFORMS = [
  ["", "Toutes les plateformes"],
  ["INSTAGRAM", "Instagram"],
  ["TIKTOK", "TikTok"],
  ["YOUTUBE", "YouTube"],
  ["LINKEDIN", "LinkedIn"],
  ["FACEBOOK", "Facebook"],
  ["TWITCH", "Twitch"],
];

export default function CompanyCreators() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    niche: "",
    availabilityStatus: "",
    platform: "",
  });
  const [page, setPage] = useState(1);

  const { data, loading, error } = useApiQuery(
    () =>
      api
        .get("/creators", {
          search: filters.search || undefined,
          niche: filters.niche.trim() || undefined,
          availabilityStatus: filters.availabilityStatus || undefined,
          platform: filters.platform || undefined,
          page,
          limit: 12,
        })
        .then((response) => ({
          creators: response.creators || [],
          pagination: {
            page: response.page || page,
            totalPages: response.totalPages || 1,
            total: response.total,
          },
        })),
    [filters, page],
    EMPTY_CREATORS,
  );

  const creators = data.creators;
  const pagination = data.pagination;

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({
      ...current,
      search: query.trim(),
    }));
  };

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title="Créateurs"
      description="Recherchez des profils et invitez-les directement sur vos campagnes publiées."
    >
      <Alert type="error">{error}</Alert>

      <Panel title="Rechercher un créateur">
        <form className="ui-form" onSubmit={applyFilters}>
          <div className="ui-form-grid">
            <label className="ui-field ui-field--wide">
              <span>Recherche</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, niche, présentation…"
              />
            </label>

            <label className="ui-field">
              <span>Niche</span>
              <input
                value={filters.niche}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({
                    ...current,
                    niche: event.target.value,
                  }));
                }}
                maxLength={100}
              />
            </label>

            <label className="ui-field">
              <span>Disponibilité</span>
              <select
                value={filters.availabilityStatus}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({
                    ...current,
                    availabilityStatus: event.target.value,
                  }));
                }}
              >
                {AVAILABILITY.map(([value, text]) => (
                  <option key={value || "all"} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>

            <label className="ui-field">
              <span>Plateforme</span>
              <select
                value={filters.platform}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({
                    ...current,
                    platform: event.target.value,
                  }));
                }}
              >
                {PLATFORMS.map(([value, text]) => (
                  <option key={value || "all"} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ui-form__actions">
            <button className="ui-button" type="submit">
              <FiSearch aria-hidden="true" /> Rechercher
            </button>
          </div>
        </form>
      </Panel>

      {loading ? (
        <Loading label="Chargement des créateurs…" />
      ) : creators.length === 0 ? (
        <Panel title="Aucun créateur">
          <p className="ui-muted ui-small">
            Aucun profil ne correspond à ces critères pour le moment.
          </p>
        </Panel>
      ) : (
        <>
          <div className="ui-grid ui-grid--3" style={{ marginTop: 18 }}>
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>

          <p className="ui-small ui-muted" style={{ marginTop: 14 }}>
            <FiSend aria-hidden="true" /> Ouvrez un profil pour lui envoyer une
            invitation sur l’une de vos campagnes publiées.
          </p>

          <Pagination
            page={pagination?.page || page}
            totalPages={pagination?.totalPages}
            total={pagination?.total}
            onChange={setPage}
          />
        </>
      )}
    </Page>
  );
}
