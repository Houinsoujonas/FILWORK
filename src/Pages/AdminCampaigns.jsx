import { useState } from "react";
import { FiSearch } from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

const EMPTY_CAMPAIGNS = { campaigns: [], pagination: null };

const STATUSES = [
  ["", "Tous les statuts"],
  ["DRAFT", "Brouillons"],
  ["PUBLISHED", "Publiées"],
  ["PAUSED", "Suspendues"],
  ["CLOSED", "Clôturées"],
];

export default function AdminCampaigns() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error } = useApiQuery(
    () =>
      api.get("/admin/campaigns", {
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [search, status, page],
    EMPTY_CAMPAIGNS,
  );

  const campaigns = data.campaigns;
  const pagination = data.pagination;

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Campagnes"
      description="Consultez toutes les campagnes, leur statut et leur activité."
    >
      <Alert type="error">{error}</Alert>

      <Panel>
        <form
          className="ui-inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(query.trim());
          }}
        >
          <label className="ui-field">
            <span>Recherche</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Titre ou description…"
            />
          </label>

          <label className="ui-field">
            <span>Statut</span>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              {STATUSES.map(([value, text]) => (
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
      </Panel>

      {loading ? (
        <Loading label="Chargement des campagnes…" />
      ) : campaigns.length === 0 ? (
        <Panel title="Aucune campagne">
          <p className="ui-muted ui-small">
            Aucune campagne ne correspond à ces critères.
          </p>
        </Panel>
      ) : (
        <Panel title="Résultats">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Entreprise</th>
                  <th>Statut</th>
                  <th>Budget</th>
                  <th>Activité</th>
                  <th>Dates</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.title}</strong>
                      {campaign.location && (
                        <div className="ui-small ui-muted">
                          {campaign.location}
                        </div>
                      )}
                    </td>
                    <td>{campaign.companyProfile?.companyName || "-"}</td>
                    <td>
                      <Badge value={campaign.status} />
                    </td>
                    <td>{formatMoney(campaign.budget, campaign.currency)}</td>
                    <td className="ui-small">
                      {campaign._count?.applications ?? 0} candidature(s)
                      <br />
                      {campaign._count?.invitations ?? 0} invitation(s)
                    </td>
                    <td className="ui-small">
                      {formatDate(campaign.createdAt)}
                      {campaign.publishedAt && (
                        <>
                          <br />
                          Publiée le {formatDate(campaign.publishedAt)}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination?.page || page}
            totalPages={pagination?.totalPages}
            total={pagination?.total}
            onChange={setPage}
          />
        </Panel>
      )}
    </Page>
  );
}
