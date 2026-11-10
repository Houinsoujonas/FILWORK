import { useState } from "react";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

const EMPTY_COLLABORATIONS = { collaborations: [], pagination: null };

const STATUSES = [
  ["", "Tous les statuts"],
  ["ACTIVE", "Actives"],
  ["COMPLETED", "Terminées"],
  ["CANCELLED", "Annulées"],
];

const ORIGINS = [
  ["", "Toutes les origines"],
  ["APPLICATION", "Candidature"],
  ["INVITATION", "Invitation"],
];

export default function AdminCollaborations() {
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [page, setPage] = useState(1);

<<<<<<< HEAD
  const { data, loading, error } = useApiQuery(
    () =>
      api.get("/admin/collaborations", {
        status: status || undefined,
        origin: origin || undefined,
        page,
        limit: 20,
      }),
    [status, origin, page],
    EMPTY_COLLABORATIONS,
  );
=======
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.get("/admin/collaborations", {
          status: status || undefined,
          origin: origin || undefined,
          page,
          limit: 20,
        });

        if (active) {
          setCollaborations(data.collaborations || []);
          setPagination(data.pagination || null);
        }
      } catch (requestError) {
        if (active) {
          setError(errorMessage(requestError));
          setCollaborations([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

  const collaborations = data.collaborations;
  const pagination = data.pagination;

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Collaborations"
      description="Suivez les collaborations entre entreprises et créateurs."
    >
      <Alert type="error">{error}</Alert>

      <Panel>
        <div className="ui-inline-form">
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

          <label className="ui-field">
            <span>Origine</span>
            <select
              value={origin}
              onChange={(event) => {
                setPage(1);
                setOrigin(event.target.value);
              }}
            >
              {ORIGINS.map(([value, text]) => (
                <option key={value || "all"} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {loading ? (
        <Loading label="Chargement des collaborations…" />
      ) : collaborations.length === 0 ? (
        <Panel title="Aucune collaboration">
          <p className="ui-muted ui-small">
            Aucune collaboration ne correspond à ces critères.
          </p>
        </Panel>
      ) : (
        <Panel title="Résultats">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Créateur</th>
                  <th>Entreprise</th>
                  <th>Statut</th>
                  <th>Montant</th>
                  <th>Activité</th>
                  <th>Créée le</th>
                </tr>
              </thead>
              <tbody>
                {collaborations.map((collaboration) => {
                  const source =
                    collaboration.application || collaboration.invitation;
                  const creator = source?.creatorProfile;
                  const campaign = source?.campaign;
                  const amount =
                    collaboration.agreedAmount ??
                    collaboration.invitation?.proposedAmount;

                  return (
                    <tr key={collaboration.id}>
                      <td>{campaign?.title || "-"}</td>
                      <td>{creator?.displayName || "-"}</td>
                      <td>
                        {campaign?.companyProfile?.companyName || "-"}
                      </td>
                      <td>
                        <Badge value={collaboration.status} />
                      </td>
                      <td>
                        {formatMoney(amount, collaboration.currency)}
                      </td>
                      <td className="ui-small">
                        {collaboration._count?.deliverables ?? 0} livrable(s)
                        <br />
                        {collaboration._count?.payments ?? 0} paiement(s)
                      </td>
                      <td className="ui-small">
                        {formatDate(collaboration.createdAt)}
                        <br />
                        {collaboration.applicationId
                          ? "Candidature"
                          : "Invitation"}
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
