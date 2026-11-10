import { useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";

import { Alert, Loading, Page } from "../Components/AppUI";
import { api } from "../lib/api";
import { formatDate, formatMoney, label } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

const PLATFORMS = [
  ["", "Toutes les plateformes"],
  ["INSTAGRAM", "Instagram"],
  ["TIKTOK", "TikTok"],
  ["YOUTUBE", "YouTube"],
  ["LINKEDIN", "LinkedIn"],
  ["FACEBOOK", "Facebook"],
  ["TWITCH", "Twitch"],
];

export default function CreatorOpportunities() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");

<<<<<<< HEAD
  const { data: campaigns, loading, error } = useApiQuery(
    () =>
      api
        .get("/campaigns", {
          search: search || undefined,
          platform: platform || undefined,
          limit: 50,
        })
        .then((response) => response.campaigns || []),
    [search, platform],
    [],
  );
=======
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.get("/campaigns", {
          search: search || undefined,
          platform: platform || undefined,
          limit: 50,
        });

        if (active) {
          setCampaigns(data.campaigns || []);
        }
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
  }, [search, platform]);
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

  return (
    <Page
      eyebrow="ESPACE CRÉATEUR"
      title="Opportunités"
      description="Parcourez les campagnes publiées et candidatez à celles qui correspondent à votre univers."
    >
      <Alert type="error">{error}</Alert>

      <form
        className="ui-inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <label className="ui-field">
          <span>Recherche</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titre, entreprise, mot-clé…"
          />
        </label>

        <label className="ui-field">
          <span>Plateforme</span>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            {PLATFORMS.map(([value, text]) => (
              <option key={value || "all"} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>

        <button className="ui-button" type="submit">
          <FiSearch aria-hidden="true" /> Rechercher
        </button>
      </form>

      <div className="ui-list" style={{ marginTop: 18 }}>
        {loading ? (
          <Loading label="Chargement des campagnes…" />
        ) : campaigns.length === 0 ? (
          <p className="ui-muted ui-small">
            Aucune campagne ne correspond à ces critères pour le moment.
          </p>
        ) : (
          campaigns.map((campaign) => (
            <article className="ui-panel" key={campaign.id}>
              <div className="ui-panel__head">
                <div>
                  <h2>{campaign.title}</h2>
                  <p>
                    {campaign.companyProfile?.companyName || "Entreprise"} ·{" "}
                    {formatMoney(campaign.budget, campaign.currency)}
                  </p>
                </div>
                <div className="ui-panel__actions">
                  <Link
                    className="ui-button ui-button--ghost ui-button--small"
                    to={`/campagnes/${campaign.id}`}
                  >
                    Voir la campagne
                  </Link>
                </div>
              </div>

              <p className="ui-small">{campaign.description}</p>

              <div className="ui-row ui-muted ui-small" style={{ marginTop: 12 }}>
                {campaign.location && <span>{campaign.location}</span>}
                {campaign.platforms?.length > 0 && (
                  <span>
                    {campaign.platforms.map((item) => label(item)).join(" · ")}
                  </span>
                )}
                {campaign.publishedAt && (
                  <span>Publiée le {formatDate(campaign.publishedAt)}</span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </Page>
  );
}
