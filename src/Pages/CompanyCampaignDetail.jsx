import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiEdit,
  FiMail,
  FiPause,
  FiPlay,
  FiSend,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  Alert,
  Avatar,
  Badge,
  Field,
  Loading,
  Page,
  Panel,
  Stat,
} from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatMoney, label } from "../lib/format";

async function fetchCampaignBundle(campaignId) {
  const [campaignData, applicationsData, invitationsData] = await Promise.all([
    api.get("/campaigns/my-campaigns"),
    api.get(`/applications/campaigns/${campaignId}`).catch((requestError) => {
      if (requestError?.status === 404) {
        return { applications: [] };
      }
      throw requestError;
    }),
    api.get("/invitations/sent").catch(() => ({ invitations: [] })),
  ]);

  const campaign = (campaignData.campaigns || []).find(
    (item) => item.id === campaignId,
  );

  if (!campaign) {
    throw new Error("Campagne introuvable ou accès non autorisé.");
  }

  const defaults = {};

  for (const application of applicationsData.applications || []) {
    if (application.status === "PENDING") {
      defaults[application.id] =
        campaign.budget !== null && campaign.budget !== undefined
          ? String(campaign.budget)
          : "";
    }
  }

  return {
    campaign,
    applications: applicationsData.applications || [],
    invitations: (invitationsData.invitations || []).filter(
      (invitation) => invitation.campaign?.id === campaignId,
    ),
    defaults,
  };
}

export default function CompanyCampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [applications, setApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loadedId, setLoadedId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [busy, setBusy] = useState("");

  const loading = loadedId !== id;

  const applyBundle = useCallback((bundle) => {
    setCampaign(bundle.campaign);
    setApplications(bundle.applications);
    setInvitations(bundle.invitations);
    setAmounts((current) => ({ ...bundle.defaults, ...current }));
  }, []);

  const load = useCallback(async () => {
    try {
      applyBundle(await fetchCampaignBundle(id));
      setLoadedId(id);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setLoadedId(id);
    }
  }, [applyBundle, id]);

  useEffect(() => {
<<<<<<< HEAD
    let active = true;

    fetchCampaignBundle(id)
      .then((bundle) => {
        if (active) {
          applyBundle(bundle);
          setLoadedId(id);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError));
          setLoadedId(id);
        }
      });

    return () => {
      active = false;
    };
  }, [applyBundle, id]);
=======
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

  const notify = (type, message) => {
    setFeedbackType(type);
    setFeedback(message);
  };

  const act = async (action, confirmation, successMessage) => {
    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    setBusy(action);
    setFeedback("");

    try {
      const data = await api.patch(`/campaigns/${id}/${action}`, {});
      notify("success", data.message || successMessage);
      await load();
    } catch (requestError) {
      notify("error", errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const decide = async (application, status) => {
    if (
      status === "REJECTED" &&
      !window.confirm(
        `Refuser la candidature de ${application.creatorProfile?.displayName} ?`,
      )
    ) {
      return;
    }

    const key = `${application.id}-${status}`;
    setBusy(key);
    setFeedback("");

    const body = { status };

    if (status === "ACCEPTED") {
      const amount = String(amounts[application.id] || "").trim();

      if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
        notify("error", "Renseignez un montant convenu strictement positif.");
        setBusy("");
        return;
      }

      body.amount = amount;
    }

    try {
      const data = await api.patch(
        `/applications/${application.id}/status`,
        body,
      );
      notify("success", data.message || "Candidature traitée.");
      await load();
    } catch (requestError) {
      notify("error", errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const withdraw = async (invitation) => {
    if (
      !window.confirm(
        `Retirer l’invitation de ${invitation.creatorProfile?.displayName} ?`,
      )
    ) {
      return;
    }

    setBusy(`invitation-${invitation.id}`);
    setFeedback("");

    try {
      const data = await api.patch(
        `/invitations/${invitation.id}/withdraw`,
        {},
      );
      notify("success", data.message || "Invitation retirée.");
      await load();
    } catch (requestError) {
      notify("error", errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  if (loading && !campaign) {
    return (
      <Page eyebrow="ESPACE ENTREPRISE" title="Campagne">
        <Loading />
      </Page>
    );
  }

  if (error || !campaign) {
    return (
      <Page
        eyebrow="ESPACE ENTREPRISE"
        title="Campagne indisponible"
        actions={
          <Link
            className="ui-button ui-button--ghost"
            to="/espace/entreprise/campagnes"
          >
            Mes campagnes
          </Link>
        }
      >
        <Alert type="error">
          {error || "Cette campagne n’existe pas ou ne vous appartient pas."}
        </Alert>
      </Page>
    );
  }

  const pending = applications.filter((item) => item.status === "PENDING");
  const accepted = applications.filter((item) => item.status === "ACCEPTED");

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title={campaign.title}
      description={
        campaign.publishedAt
          ? `Publiée le ${formatDate(campaign.publishedAt)}`
          : "Campagne non publiée"
      }
      actions={
        <>
          <Link
            className="ui-button ui-button--ghost"
            to="/espace/entreprise/campagnes"
          >
            Mes campagnes
          </Link>
          <Link
            className="ui-button ui-button--ghost"
            to={`/espace/entreprise/campagnes/${campaign.id}/modifier`}
          >
            <FiEdit aria-hidden="true" /> Modifier
          </Link>
          <Link
            className="ui-button"
            to="/espace/entreprise/createurs"
          >
            <FiUsers aria-hidden="true" /> Inviter des créateurs
          </Link>
        </>
      }
    >
      <Alert type="error">{feedbackType === "error" ? feedback : ""}</Alert>
      <Alert type="success">
        {feedbackType === "success" ? feedback : ""}
      </Alert>

      <div className="ui-grid ui-grid--4">
        <Stat label="Statut" value={<Badge value={campaign.status} />} />
        <Stat label="Candidatures" value={applications.length} />
        <Stat label="En attente" value={pending.length} />
        <Stat label="Acceptées" value={accepted.length} />
      </div>

      <div className="ui-grid ui-grid--2" style={{ marginTop: 18 }}>
        <Panel title="Détails de la campagne">
          <dl className="ui-kv">
            <div>
              <dt>Budget</dt>
              <dd>{formatMoney(campaign.budget, campaign.currency)}</dd>
            </div>
            <div>
              <dt>Localisation</dt>
              <dd>{campaign.location || "Non précisée"}</dd>
            </div>
            <div>
              <dt>Début</dt>
              <dd>{formatDate(campaign.startDate)}</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{formatDate(campaign.endDate)}</dd>
            </div>
          </dl>

          <hr className="ui-divider" />
          <p className="ui-small">{campaign.description}</p>

          {campaign.objectives && (
            <>
              <h3>Objectifs</h3>
              <p className="ui-small">{campaign.objectives}</p>
            </>
          )}

          {campaign.deliverables && (
            <>
              <h3>Livrables attendus</h3>
              <p className="ui-small">{campaign.deliverables}</p>
            </>
          )}

          {campaign.platforms?.length > 0 && (
            <>
              <h3>Plateformes</h3>
              <div className="ui-actions-inline">
                {campaign.platforms.map((platform) => (
                  <span className="ui-badge" key={platform}>
                    {label(platform)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title="Actions">
          <div className="ui-stack ui-stack--buttons">
          {campaign.status === "DRAFT" && (
            <button
              type="button"
              className="ui-button"
              onClick={() => act("publish", null, "Campagne publiée.")}
              disabled={busy === "publish"}
            >
              <FiPlay aria-hidden="true" /> Publier la campagne
            </button>
          )}

          {campaign.status === "PUBLISHED" && (
            <button
              type="button"
              className="ui-button ui-button--ghost"
              onClick={() =>
                act(
                  "pause",
                  "Suspendre cette campagne ? Elle ne sera plus visible publiquement.",
                  "Campagne suspendue.",
                )
              }
              disabled={busy === "pause"}
            >
              <FiPause aria-hidden="true" /> Suspendre
            </button>
          )}

          {campaign.status === "PAUSED" && (
            <button
              type="button"
              className="ui-button"
              onClick={() =>
                act(
                  "publish",
                  "Réactiver cette campagne ? Elle redeviendra visible et ouverte aux candidatures.",
                  "Campagne réactivée.",
                )
              }
              disabled={busy === "publish"}
            >
              <FiPlay aria-hidden="true" /> Réactiver la campagne
            </button>
          )}

          {["DRAFT", "PUBLISHED", "PAUSED"].includes(campaign.status) && (
            <button
              type="button"
              className="ui-button ui-button--danger"
              onClick={() =>
                act(
                  "close",
                  "Clôturer définitivement cette campagne ?",
                  "Campagne clôturée.",
                )
              }
              disabled={busy === "close"}
            >
              <FiX aria-hidden="true" /> Clôturer
            </button>
          )}
          </div>

          <hr className="ui-divider" />
          <p className="ui-small ui-muted">
            Les livrables et paiements se gèrent depuis la collaboration créée
            après acceptation d’une candidature ou d’une invitation.
          </p>
          <Link
            className="ui-button ui-button--ghost"
            to="/espace/entreprise/collaborations"
          >
            Voir les collaborations
          </Link>
        </Panel>
      </div>

      <Panel
        title="Candidatures reçues"
        description="Acceptez une candidature en précisant le montant convenu."
      >
        {applications.length === 0 ? (
          <p className="ui-muted ui-small">
            Aucune candidature pour cette campagne.
          </p>
        ) : (
          <div className="ui-list">
            {applications.map((application) => (
              <article className="ui-subpanel" key={application.id}>
                <div className="ui-panel__head">
                  <div className="ui-row">
                    <Avatar
                      name={application.creatorProfile?.displayName}
                      src={application.creatorProfile?.profileImageUrl}
                    />
                    <div>
                      <h2>{application.creatorProfile?.displayName}</h2>
                      <p>
                        {application.creatorProfile?.niche || "Créateur"} ·{" "}
                        {application.creatorProfile?.location || "Localisation non précisée"}
                      </p>
                    </div>
                  </div>
                  <Badge value={application.status} />
                </div>

                {application.message && (
                  <p className="ui-small ui-muted">{application.message}</p>
                )}

                {application.creatorProfile?.bio && (
                  <p className="ui-small">{application.creatorProfile.bio}</p>
                )}

                <div className="ui-actions-inline" style={{ marginTop: 12 }}>
                  <Link
                    className="ui-button ui-button--ghost ui-button--small"
                    to={`/annuaire-createurs/${application.creatorProfile?.id}`}
                  >
                    Voir le profil
                  </Link>
                </div>

                {application.status === "PENDING" && (
                  <div className="ui-inline-form" style={{ marginTop: 12 }}>
                    <Field label="Montant convenu">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amounts[application.id] ?? ""}
                        onChange={(event) =>
                          setAmounts((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <button
                      type="button"
                      className="ui-button"
                      onClick={() => decide(application, "ACCEPTED")}
                      disabled={busy === `${application.id}-ACCEPTED`}
                    >
                      {busy === `${application.id}-ACCEPTED`
                        ? "Acceptation…"
                        : "Accepter"}
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--danger"
                      onClick={() => decide(application, "REJECTED")}
                      disabled={busy === `${application.id}-REJECTED`}
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Invitations envoyées"
        description="Les invitations encore en attente peuvent être retirées."
      >
        {invitations.length === 0 ? (
          <p className="ui-muted ui-small">
            Aucune invitation envoyée pour cette campagne.
          </p>
        ) : (
          <div className="ui-list">
            {invitations.map((invitation) => (
              <article className="ui-subpanel" key={invitation.id}>
                <div className="ui-row" style={{ justifyContent: "space-between" }}>
                  <div className="ui-row">
                    <Avatar
                      name={invitation.creatorProfile?.displayName}
                      src={invitation.creatorProfile?.profileImageUrl}
                    />
                    <div>
                      <strong>{invitation.creatorProfile?.displayName}</strong>
                      <p className="ui-small ui-muted">
                        {formatMoney(
                          invitation.proposedAmount,
                          invitation.currency,
                        )}{" "}
                        · {formatDate(invitation.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge value={invitation.status} />
                </div>

                {invitation.message && (
                  <p className="ui-small ui-muted">{invitation.message}</p>
                )}

                <div className="ui-actions-inline" style={{ marginTop: 10 }}>
                  <Link
                    className="ui-button ui-button--ghost ui-button--small"
                    to={`/annuaire-createurs/${invitation.creatorProfile?.id}`}
                  >
                    <FiMail aria-hidden="true" /> Profil
                  </Link>
                  {invitation.status === "PENDING" && (
                    <button
                      type="button"
                      className="ui-button ui-button--danger ui-button--small"
                      onClick={() => withdraw(invitation)}
                      disabled={busy === `invitation-${invitation.id}`}
                    >
                      <FiSend aria-hidden="true" /> Retirer
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </Page>
  );
}
