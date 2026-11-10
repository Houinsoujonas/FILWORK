import { useState } from "react";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

const EMPTY_PAYMENTS = { payments: [], pagination: null };

const STATUSES = [
  ["", "Tous les statuts"],
  ["PLANNED", "Planifiés"],
  ["PENDING", "En attente"],
  ["PAID", "Payés"],
  ["FAILED", "Échoués"],
  ["CANCELLED", "Annulés"],
];

const ORIGINS = [
  ["", "Toutes les origines"],
  ["APPLICATION", "Candidature"],
  ["INVITATION", "Invitation"],
];

export default function AdminPayments() {
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [page, setPage] = useState(1);

<<<<<<< HEAD
  const { data, loading, error } = useApiQuery(
    () =>
      api.get("/admin/payments", {
        status: status || undefined,
        origin: origin || undefined,
        page,
        limit: 20,
      }),
    [status, origin, page],
    EMPTY_PAYMENTS,
  );
=======
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.get("/admin/payments", {
          status: status || undefined,
          origin: origin || undefined,
          page,
          limit: 20,
        });

        if (active) {
          setPayments(data.payments || []);
          setPagination(data.pagination || null);
        }
      } catch (requestError) {
        if (active) {
          setError(errorMessage(requestError));
          setPayments([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

  const payments = data.payments;
  const pagination = data.pagination;

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Paiements"
      description="Consultez les paiements enregistrés. Cette page ne réalise aucun transfert d’argent."
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
        <Loading label="Chargement des paiements…" />
      ) : payments.length === 0 ? (
        <Panel title="Aucun paiement">
          <p className="ui-muted ui-small">
            Aucun paiement ne correspond à ces critères.
          </p>
        </Panel>
      ) : (
        <Panel title="Résultats">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Campagne</th>
                  <th>Créateur</th>
                  <th>Entreprise</th>
                  <th>Échéance / Paiement</th>
                  <th>Référence</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const collaboration = payment.collaboration;
                  const source =
                    collaboration?.application || collaboration?.invitation;
                  const creator = source?.creatorProfile;
                  const campaign = source?.campaign;

                  return (
                    <tr key={payment.id}>
                      <td>
                        {formatMoney(payment.amount, payment.currency)}
                      </td>
                      <td>
                        <Badge value={payment.status} />
                      </td>
                      <td>{campaign?.title || "-"}</td>
                      <td>{creator?.displayName || "-"}</td>
                      <td>
                        {campaign?.companyProfile?.companyName || "-"}
                      </td>
                      <td className="ui-small">
                        {payment.dueDate
                          ? `Échéance : ${formatDate(payment.dueDate)}`
                          : "Sans échéance"}
                        {payment.paidAt && (
                          <>
                            <br />
                            Payé le {formatDate(payment.paidAt)}
                          </>
                        )}
                      </td>
                      <td className="ui-small">
                        {payment.reference || "-"}
                        <br />
                        {collaboration?.applicationId
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
