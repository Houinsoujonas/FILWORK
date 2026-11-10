import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

async function fetchReceivedInvitations() {
  const data = await api.get("/invitations/received");
  return data.invitations || [];
}

export default function CreatorInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");
  const [createdCollaboration, setCreatedCollaboration] = useState(null);

  const load = async () => {
    try {
      setInvitations(await fetchReceivedInvitations());
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  useEffect(() => {
    let active = true;

    fetchReceivedInvitations()
      .then((items) => {
        if (active) {
          setInvitations(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError));
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
  }, []);

  const respond = async (invitation, status) => {
    if (
      status === "REJECTED" &&
      !window.confirm(
        `Refuser l’invitation pour « ${invitation.campaign?.title} » ?`,
      )
    ) {
      return;
    }

    setBusyId(invitation.id);
    setError("");
    setSuccess("");
    setCreatedCollaboration(null);

    try {
      const data = await api.patch(
        `/invitations/${invitation.id}/respond`,
        { status },
      );

      setSuccess(data.message || "Votre réponse a été enregistrée.");
      setCreatedCollaboration(data.collaboration || null);
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  return (
    <Page
      eyebrow="ESPACE CRÉATEUR"
      title="Invitations reçues"
      description="Les entreprises peuvent vous inviter directement sur leurs campagnes."
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">
        {success}{" "}
        {createdCollaboration && (
          <Link
            className="ui-link"
            to={`/espace/createur/collaborations/${createdCollaboration.id}`}
          >
            Ouvrir la collaboration
          </Link>
        )}
      </Alert>

      {loading ? (
        <Loading />
      ) : invitations.length === 0 ? (
        <Panel title="Aucune invitation">
          <p className="ui-muted ui-small">
            Complétez votre profil et ajoutez vos réseaux pour être plus
            visible auprès des entreprises.
          </p>
        </Panel>
      ) : (
        <div className="ui-list">
          {invitations.map((invitation) => {
            const amount = Number(invitation.proposedAmount);
            const canAccept =
              invitation.status === "PENDING" &&
              invitation.proposedAmount !== null &&
              invitation.proposedAmount !== undefined &&
              Number.isFinite(amount) &&
              amount > 0;

            return (
              <article className="ui-panel" key={invitation.id}>
                <div className="ui-panel__head">
                  <div>
                    <h2>{invitation.campaign?.title || "Campagne"}</h2>
                    <p>
                      {invitation.campaign?.companyProfile?.companyName ||
                        "Entreprise"}{" "}
                      · reçue le {formatDate(invitation.createdAt)}
                    </p>
                  </div>
                  <div className="ui-panel__actions">
                    <Badge value={invitation.status} />
                  </div>
                </div>

                <p className="ui-small">
                  Montant proposé :{" "}
                  <strong>
                    {formatMoney(
                      invitation.proposedAmount,
                      invitation.currency,
                    )}
                  </strong>
                </p>

                {invitation.message && (
                  <p className="ui-small ui-muted">{invitation.message}</p>
                )}

                {invitation.status === "PENDING" && (
                  <div className="ui-row" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="ui-button"
                      onClick={() => respond(invitation, "ACCEPTED")}
                      disabled={busyId === invitation.id || !canAccept}
                      title={
                        canAccept
                          ? undefined
                          : "Le montant proposé doit être renseigné avant acceptation."
                      }
                    >
                      {busyId === invitation.id ? "Traitement…" : "Accepter"}
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--danger"
                      onClick={() => respond(invitation, "REJECTED")}
                      disabled={busyId === invitation.id}
                    >
                      Refuser
                    </button>
                    {!canAccept && (
                      <span className="ui-muted ui-small">
                        Le montant proposé doit être renseigné avant
                        acceptation.
                      </span>
                    )}
                  </div>
                )}

                {invitation.status === "ACCEPTED" && (
                  <p className="ui-small">
                    <Link to="/espace/createur/collaborations">
                      Retrouver la collaboration dans votre espace
                    </Link>
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
