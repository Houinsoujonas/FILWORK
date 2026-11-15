import { useState } from "react";
import { FiSearch } from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

const EMPTY_APPLICATIONS = { applications: [], pagination: null };
const STATUSES = [
  ["", "Tous les statuts"],
  ["PENDING", "En attente"],
  ["ACCEPTED", "Acceptées"],
  ["REJECTED", "Refusées"],
  ["WITHDRAWN", "Retirées"],
];

export default function AdminApplications() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error } = useApiQuery(
    () => api.get("/admin/applications", {
      search: search || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [search, status, page],
    EMPTY_APPLICATIONS,
  );

  const applications = data.applications;
  const pagination = data.pagination;

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Candidatures"
      description="Consultez les candidatures reçues par les campagnes de la plateforme."
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
              placeholder="Créateur, campagne ou entreprise"
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
              {STATUSES.map(([value, label]) => (
                <option key={value || "all"} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <button className="ui-button" type="submit">
            <FiSearch aria-hidden="true" /> Rechercher
          </button>
        </form>
      </Panel>

      {loading ? (
        <Loading label="Chargement des candidatures…" />
      ) : error ? null : applications.length === 0 ? (
        <Panel title="Aucune candidature">
          <p className="ui-muted ui-small">
            Aucune candidature ne correspond à ces critères.
          </p>
        </Panel>
      ) : (
        <Panel title="Résultats">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Créateur</th>
                  <th>Campagne</th>
                  <th>Entreprise</th>
                  <th>Statut</th>
                  <th>Reçue le</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      {application.creatorProfile?.displayName || "-"}
                      {application.message && (
                        <details>
                          <summary>Lire le message</summary>
                          <p className="ui-small">{application.message}</p>
                        </details>
                      )}
                    </td>
                    <td>{application.campaign?.title || "-"}</td>
                    <td>{application.campaign?.companyProfile?.companyName || "-"}</td>
                    <td><Badge value={application.status} /></td>
                    <td>{formatDate(application.createdAt)}</td>
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
