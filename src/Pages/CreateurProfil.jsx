import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiExternalLink,
  FiMapPin,
  FiSend,
  FiUser,
} from "react-icons/fi";

import EmptyState from "../Components/EmptyState";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../lib/api";
import { formatMoney, label } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

export default function CreateurProfil() {
  const { creatorId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const isCompany = user?.role === "COMPANY";
  const [form, setForm] = useState({
    campaignId: "",
    proposedAmount: "",
    message: "",
  });
  const [seededCreatorId, setSeededCreatorId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error } = useApiQuery(
    () =>
      Promise.all([
        api.get(`/creators/${creatorId}`),
        api.get("/campaigns/my-campaigns").catch(() => ({ campaigns: [] })),
      ]).then(([creatorData, campaignData]) => ({
        creator: creatorData.creator,
        campaigns: (campaignData.campaigns || []).filter(
          (campaign) => campaign.status === "PUBLISHED",
        ),
      })),
    [creatorId],
    { creator: null, campaigns: [] },
    { enabled: isCompany },
  );

  const creator = data.creator;
  const campaigns = data.campaigns;

  // Le formulaire reprend la première campagne publiée dès que la liste
  // arrive. L'ajustement est fait pendant le rendu, une seule fois par
  // créateur, pour éviter un effet de synchronisation.
  if (campaigns.length > 0 && seededCreatorId !== creatorId) {
    setSeededCreatorId(creatorId);
    setForm((current) => ({
      ...current,
      campaignId: current.campaignId || campaigns[0].id || "",
      proposedAmount:
        current.proposedAmount ||
        (campaigns[0].budget ? String(campaigns[0].budget) : ""),
    }));
  }

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === form.campaignId) || null;

  const handleInvite = async (event) => {
    event.preventDefault();
    setFeedback("");
    setSubmitting(true);

    try {
      await api.post(`/campaigns/${form.campaignId}/invitations`, {
        creatorProfileId: creator.id,
        message: form.message.trim(),
        proposedAmount: form.proposedAmount,
        currency: selectedCampaign?.currency || "XOF",
      });

      setFeedbackType("success");
      setFeedback(
        `Invitation envoyée à ${creator.displayName} pour « ${selectedCampaign?.title} ».`,
      );
      setForm((current) => ({ ...current, message: "" }));
    } catch (requestError) {
      setFeedbackType("error");
      setFeedback(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="public-page detail-page">
        <p className="public-search-status" role="status">
          Vérification de votre session…
        </p>
      </main>
    );
  }

  if (!user || !isCompany) {
    return (
      <main className="public-page detail-page">
        <Link to="/annuaire-createurs" className="back-link">
          <FiArrowLeft aria-hidden="true" /> Annuaire des créateurs
        </Link>
        <EmptyState
          title="Profil réservé aux entreprises"
          description="Connectez-vous avec un compte entreprise pour consulter le profil détaillé d’un créateur et l’inviter sur une campagne."
          action={
            <Link
              className="public-button"
              to={user ? "/espace/createur" : "/connexion"}
              state={user ? undefined : { from: `/annuaire-createurs/${creatorId}` }}
            >
              {user ? "Retour à mon espace" : "Se connecter"}
            </Link>
          }
        />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="public-page detail-page">
        <p className="public-search-status" role="status">
          Chargement du profil…
        </p>
      </main>
    );
  }

  if (error || !creator) {
    return (
      <main className="public-page detail-page">
        <Link to="/annuaire-createurs" className="back-link">
          <FiArrowLeft aria-hidden="true" /> Annuaire des créateurs
        </Link>
        <EmptyState
          title="Ce profil n’est pas disponible"
          description={
            error ||
            "Ce profil créateur n’existe pas ou n’est plus accessible depuis l’annuaire."
          }
          action={
            <Link className="public-button" to="/annuaire-createurs">
              Voir l’annuaire
            </Link>
          }
        />
      </main>
    );
  }


  return (
    <main className="public-page detail-page">
      <Link to="/annuaire-createurs" className="back-link">
        <FiArrowLeft aria-hidden="true" /> Annuaire des créateurs
      </Link>

      <section className="public-profile-head">
        {creator.profileImageUrl ? (
          <img className="ui-avatar" src={creator.profileImageUrl} alt="" />
        ) : (
          <span className="ui-avatar">{String(creator.displayName || "C")[0]}</span>
        )}
        <div>
          <h2>{creator.displayName}</h2>
          <p>{creator.niche || "Créateur"} · {label(creator.availabilityStatus)}</p>
          <div className="public-profile-head__meta">
            {creator.location && (
              <span className="ui-badge">
                <FiMapPin aria-hidden="true" /> {creator.location}
              </span>
            )}
            {creator.startingRate && (
              <span className="ui-badge ui-badge--gold">
                À partir de {formatMoney(creator.startingRate, creator.rateCurrency)}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="public-detail-grid">
        <div className="public-panel">
          <h2>Présentation</h2>
          <p>{creator.bio || "Ce créateur n’a pas encore renseigné sa présentation."}</p>

          <h3>Réseaux sociaux</h3>
          {creator.creatorSocials?.length > 0 ? (
            <ul className="ui-list">
              {creator.creatorSocials.map((social) => (
                <li className="ui-list-item social-row" key={social.id}>
                  <span className="social-row__icon">
                    <FiUser aria-hidden="true" />
                  </span>
                  <span className="ui-list-item__main">
                    <strong>{label(social.platform)}</strong>
                    <span>{String(social.profileUrl || "").replace(/^https?:\/\/(www\.)?/, "")}</span>
                  </span>
                  <span className="ui-list-item__side">
                    {social.followerCount !== null &&
                      social.followerCount !== undefined && (
                        <span className="social-row__count">
                          <strong>{Number(social.followerCount).toLocaleString("fr-FR")}</strong> abonnés
                        </span>
                      )}
                    <a
                      className="ui-button ui-button--ghost ui-button--small"
                      href={social.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FiExternalLink aria-hidden="true" /> Ouvrir
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui-small">Aucun réseau social renseigné.</p>
          )}

          <h3>Portfolio</h3>
          {creator.portfolioItems?.length > 0 ? (
            <ul className="ui-list">
              {creator.portfolioItems.map((item) => (
                <li className="ui-list-item" key={item.id}>
                  <span className="ui-list-item__main">
                    <strong>{item.title}</strong>
                    <span>
                      {label(item.type)}
                      {item.campaignName ? ` · ${item.campaignName}` : ""}
                    </span>
                    {item.description && <small>{item.description}</small>}
                  </span>
                  <a
                    className="ui-button ui-button--ghost ui-button--small"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FiExternalLink aria-hidden="true" /> Voir
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ui-small">Aucun élément de portfolio publié.</p>
          )}
        </div>

        <aside className="public-panel">
          <h2>Inviter sur une campagne</h2>

          {campaigns.length === 0 ? (
            <p className="ui-small">
              Vous n’avez aucune campagne publiée.{" "}
              <Link to="/espace/entreprise/campagnes/nouvelle">
                Créez et publiez une campagne
              </Link>{" "}
              pour pouvoir inviter ce créateur.
            </p>
          ) : (
            <form className="public-form" onSubmit={handleInvite}>
              <label htmlFor="invite-campaign">
                Campagne
                <select
                  id="invite-campaign"
                  value={form.campaignId}
                  onChange={(event) => {
                    const campaignId = event.target.value;
                    const campaign =
                      campaigns.find((item) => item.id === campaignId) || null;

                    setForm((current) => ({
                      ...current,
                      campaignId,
                      proposedAmount: campaign?.budget
                        ? String(campaign.budget)
                        : current.proposedAmount,
                    }));
                  }}
                  required
                >
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="invite-amount">
                Montant proposé ({selectedCampaign?.currency || "XOF"})
                <input
                  id="invite-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.proposedAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      proposedAmount: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label htmlFor="invite-message">
                Message
                <textarea
                  id="invite-message"
                  rows="4"
                  maxLength={5000}
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Expliquez votre projet et pourquoi ce profil vous intéresse."
                />
              </label>

              <button type="submit" disabled={submitting}>
                <FiSend aria-hidden="true" />{" "}
                {submitting ? "Envoi…" : "Envoyer l’invitation"}
              </button>
            </form>
          )}

          {feedback && (
            <p
              className={`form-notice${
                feedbackType === "error" ? " form-notice--error" : ""
              }`}
              role={feedbackType === "error" ? "alert" : "status"}
            >
              {feedback}
            </p>
          )}

          <p className="public-empty-hint">
            <FiUser aria-hidden="true" /> Seuls les profils des créateurs
            inscrits sur FILWORK sont affichés.
          </p>
        </aside>
      </div>
    </main>
  );
}
