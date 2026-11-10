import { useEffect, useState } from "react";
import { FiExternalLink, FiSearch } from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { api, errorMessage } from "../lib/api";
import { formatDate } from "../lib/format";

const STATUSES = [
  ["", "Tous les statuts"],
  ["PENDING", "À produire"],
  ["SUBMITTED", "Soumis"],
  ["REVISION_REQUESTED", "Révision demandée"],
  ["APPROVED", "Approuvés"],
];

export default function AdminDeliverables() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deliverables, setDeliverables] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.get("/admin/deliverables", {
          search: search || undefined,
          status: status || undefined,
          page,
          limit: 20,
        });

        if (active) {
          setDeliverables(data.deliverables || []);
          setPagination(data.pagination || null);
        }
      } catch (requestError) {
        if (active) {
          setError(errorMessage(requestError));
          setDeliverables([]);
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
  }, [search, status, page]);

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Livrables"
      description="Consultez les livrables déposés sur la plateforme et leur état de validation."
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
        <Loading label="Chargement des livrables…" />
      ) : deliverables.length === 0 ? (
        <Panel title="Aucun livrable">
          <p className="ui-muted ui-small">
            Aucun livrable ne correspond à ces critères.
          </p>
        </Panel>
      ) : (
        <Panel title="Résultats">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Livrable</th>
                  <th>Campagne</th>
                  <th>Créateur</th>
                  <th>Statut</th>
                  <th>Échéance</th>
                  <th>Soumission</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((deliverable) => {
                  const collaboration = deliverable.collaboration;
                  const source =
                    collaboration?.application || collaboration?.invitation;
                  const creator = source?.creatorProfile;
                  const campaign = source?.campaign;

                  return (
                    <tr key={deliverable.id}>
                      <td>
                        <strong>{deliverable.title}</strong>
                        {deliverable.description && (
                          <div className="ui-small ui-muted">
                            {deliverable.description.slice(0, 120)}
                            {deliverable.description.length > 120 ? "…" : ""}
                          </div>
                        )}
                      </td>
                      <td>{campaign?.title || "-"}</td>
                      <td>{creator?.displayName || "-"}</td>
                      <td>
                        <Badge value={deliverable.status} />
                      </td>
                      <td className="ui-small">
                        {formatDate(deliverable.dueDate)}
                      </td>
                      <td className="ui-small">
                        {deliverable.submittedAt
                          ? formatDate(deliverable.submittedAt)
                          : "-"}
                        {deliverable.assetUrl && (
                          <div>
                            <a
                              className="ui-link"
                              href={deliverable.assetUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FiExternalLink aria-hidden="true" /> Voir
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
