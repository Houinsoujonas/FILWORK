import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSend, FiX } from "react-icons/fi";

import { Alert, Avatar, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

const STATUSES = [
  ["", "Tous les statuts"],
  ["PENDING", "En attente"],
  ["ACCEPTED", "Acceptées"],
  ["REJECTED", "Refusées"],
  ["WITHDRAWN", "Retirées"],
];

export default function CompanyInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.get("/invitations/sent");
      setInvitations(data.invitations || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const withdraw = async (invitation) => {
    if (
      !window.confirm(
        `Retirer l’invitation de ${invitation.creatorProfile?.displayName} pour « ${invitation.campaign?.title} » ?`,
      )
    ) {
      return;
    }

    setBusyId(invitation.id);
    setError("");
    setSuccess("");

    try {
      const data = await api.patch(
        `/invitations/${invitation.id}/withdraw`,
        {},
      );
      setSuccess(data.message || "Invitation retirée.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  const filtered = useMemo(() => {
    if (!status) {
      return invitations;
    }

    return invitations.filter((invitation) => invitation.status === status);
  }, [invitations, status]);

  const pendingCount = invitations.filter(
    (invitation) => invitation.status === "PENDING",
  ).length;

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title="Invitations envoyées"
      description="Suivez les invitations adressées aux créateurs et retirez celles encore en attente."
      actions={
        <Link className="ui-button" to="/espace/entreprise/createurs">
          <FiSend aria-hidden="true" /> Inviter un créateur
        </Link>
      }
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <Panel title={`${invitations.length} invitation(s)`} description={`${pendingCount} en attente de réponse.`}>
        <label className="ui-field" style={{ maxWidth: 280 }}>
          <span>Filtrer par statut</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUSES.map(([value, text]) => (
              <option key={value || "all"} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </Panel>

      {loading ? (
        <Loading label="Chargement des invitations…" />
      ) : filtered.length === 0 ? (
        <Panel title="Aucune invitation">
          <p className="ui-muted ui-small">
            Aucune invitation ne correspond à ce filtre.
          </p>
        </Panel>
      ) : (
        <div className="ui-list">
          {filtered.map((invitation) => (
            <article className="ui-panel" key={invitation.id}>
              <div className="ui-panel__head">
                <div className="ui-row">
                  <Avatar
                    name={invitation.creatorProfile?.displayName}
                    src={invitation.creatorProfile?.profileImageUrl}
                  />
                  <div>
                    <h2>{invitation.creatorProfile?.displayName || "Créateur"}</h2>
                    <p>
                      {invitation.creatorProfile?.niche || "Créateur"} ·{" "}
                      {invitation.campaign?.title || "Campagne"}
                    </p>
                  </div>
                </div>
                <div className="ui-panel__actions">
                  <Badge value={invitation.status} />
                </div>
              </div>

              <div className="ui-row ui-muted ui-small" style={{ marginTop: 10 }}>
                <span>
                  Montant proposé :{" "}
                  {formatMoney(invitation.proposedAmount, invitation.currency)}
                </span>
                <span>Envoyée le {formatDate(invitation.createdAt)}</span>
                {invitation.respondedAt && (
                  <span>Réponse le {formatDate(invitation.respondedAt)}</span>
                )}
              </div>

              {invitation.message && (
                <p className="ui-small ui-muted">{invitation.message}</p>
              )}

              <div className="ui-actions-inline" style={{ marginTop: 12 }}>
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`/annuaire-createurs/${invitation.creatorProfile?.id}`}
                >
                  Voir le profil
                </Link>

                {invitation.campaign?.id && (
                  <Link
                    className="ui-button ui-button--ghost ui-button--small"
                    to={`/espace/entreprise/campagnes/${invitation.campaign.id}`}
                  >
                    Ouvrir la campagne
                  </Link>
                )}

                {invitation.status === "PENDING" && (
                  <button
                    type="button"
                    className="ui-button ui-button--danger ui-button--small"
                    onClick={() => withdraw(invitation)}
                    disabled={busyId === invitation.id}
                  >
                    <FiX aria-hidden="true" />{" "}
                    {busyId === invitation.id ? "Retrait…" : "Retirer"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
