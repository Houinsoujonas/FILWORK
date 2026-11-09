import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit, FiEye, FiPause, FiPlay, FiPlus, FiTrash2, FiX } from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

export default function CompanyCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.get("/campaigns/my-campaigns");
      setCampaigns(data.campaigns || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (campaign, action, confirmation) => {
    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    setBusy(`${campaign.id}-${action}`);
    setError("");
    setSuccess("");

    try {
      const data = await api.patch(`/campaigns/${campaign.id}/${action}`, {});
      setSuccess(data.message || "Campagne mise à jour.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const remove = async (campaign) => {
    if (
      !window.confirm(
        `Supprimer définitivement le brouillon « ${campaign.title} » ?`,
      )
    ) {
      return;
    }

    setBusy(`${campaign.id}-delete`);
    setError("");
    setSuccess("");

    try {
      const data = await api.delete(`/campaigns/${campaign.id}`);
      setSuccess(data.message || "Campagne supprimée.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title="Mes campagnes"
      description="Créez, publiez et suivez vos campagnes."
      actions={
        <Link className="ui-button" to="/espace/entreprise/campagnes/nouvelle">
          <FiPlus aria-hidden="true" /> Nouvelle campagne
        </Link>
      }
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {loading ? (
        <Loading />
      ) : campaigns.length === 0 ? (
        <Panel title="Aucune campagne">
          <p className="ui-muted ui-small">
            Créez votre première campagne pour commencer à recevoir des
            candidatures et à inviter des créateurs.
          </p>
        </Panel>
      ) : (
        <div className="ui-list">
          {campaigns.map((campaign) => (
            <article className="ui-panel" key={campaign.id}>
              <div className="ui-panel__head">
                <div>
                  <h2>{campaign.title}</h2>
                  <p>
                    {formatMoney(campaign.budget, campaign.currency)} · créée le{" "}
                    {formatDate(campaign.createdAt)}
                  </p>
                </div>
                <div className="ui-panel__actions">
                  <Badge value={campaign.status} />
                </div>
              </div>

              <p className="ui-small ui-muted">
                {campaign.description?.slice(0, 220)}
                {campaign.description?.length > 220 ? "…" : ""}
              </p>

              <div className="ui-actions-inline" style={{ marginTop: 14 }}>
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`/espace/entreprise/campagnes/${campaign.id}`}
                >
                  <FiEye aria-hidden="true" /> Ouvrir
                </Link>

                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`/espace/entreprise/campagnes/${campaign.id}/modifier`}
                >
                  <FiEdit aria-hidden="true" /> Modifier
                </Link>

                {campaign.status === "DRAFT" && (
                  <button
                    type="button"
                    className="ui-button ui-button--small"
                    onClick={() => act(campaign, "publish")}
                    disabled={busy === `${campaign.id}-publish`}
                  >
                    <FiPlay aria-hidden="true" /> Publier
                  </button>
                )}

                {campaign.status === "PUBLISHED" && (
                  <button
                    type="button"
                    className="ui-button ui-button--ghost ui-button--small"
                    onClick={() =>
                      act(
                        campaign,
                        "pause",
                        "Suspendre cette campagne ? Elle ne recevra plus de candidatures.",
                      )
                    }
                    disabled={busy === `${campaign.id}-pause`}
                  >
                    <FiPause aria-hidden="true" /> Suspendre
                  </button>
                )}

                {campaign.status === "PAUSED" && (
                  <button
                    type="button"
                    className="ui-button ui-button--small"
                    onClick={() =>
                      act(
                        campaign,
                        "publish",
                        "Réactiver cette campagne ? Elle redeviendra visible et ouverte aux candidatures.",
                      )
                    }
                    disabled={busy === `${campaign.id}-publish`}
                  >
                    <FiPlay aria-hidden="true" /> Réactiver
                  </button>
                )}

                {["DRAFT", "PUBLISHED", "PAUSED"].includes(
                  campaign.status,
                ) && (
                  <button
                    type="button"
                    className="ui-button ui-button--danger ui-button--small"
                    onClick={() =>
                      act(
                        campaign,
                        "close",
                        "Clôturer définitivement cette campagne ? Elle ne sera plus visible publiquement.",
                      )
                    }
                    disabled={busy === `${campaign.id}-close`}
                  >
                    <FiX aria-hidden="true" /> Clôturer
                  </button>
                )}

                {campaign.status === "DRAFT" && (
                  <button
                    type="button"
                    className="ui-button ui-button--danger ui-button--small"
                    onClick={() => remove(campaign)}
                    disabled={busy === `${campaign.id}-delete`}
                  >
                    <FiTrash2 aria-hidden="true" /> Supprimer
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
