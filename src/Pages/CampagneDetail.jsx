import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiMapPin,
  FiSend,
} from "react-icons/fi";

import EmptyState from "../Components/EmptyState";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatMoney, label } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

export default function CampagneDetail() {
  const { campaignId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [submitting, setSubmitting] = useState(false);

  const { data: campaign, loading, error } = useApiQuery(
    () =>
      api
        .get(`/campaigns/${campaignId}`, undefined, { auth: false })
        .then((data) => data.campaign),
    [campaignId],
    null,
  );

  const handleApply = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");

    try {
      await api.post(`/applications/${campaignId}`, { message: message.trim() });
      setMessage("");
      setFeedbackType("success");
      setFeedback("Votre candidature a bien été envoyée à l’entreprise.");
    } catch (requestError) {
      setFeedbackType("error");
      setFeedback(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <main className="public-page detail-page">
        <p className="public-search-status" role="status">
          Chargement de la campagne…
        </p>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="public-page detail-page">
        <Link to="/campagnes" className="back-link">
          <FiArrowLeft aria-hidden="true" /> Toutes les campagnes
        </Link>

        <div className="detail-page__intro">
          <span className="detail-page__icon">
            <FiBriefcase aria-hidden="true" />
          </span>
          <span className="section-label">DÉTAIL DE CAMPAGNE</span>
        </div>

        <EmptyState
          title="Cette campagne n’est pas disponible"
          description={
            error ||
            "Cette campagne n’est pas publiée ou n’existe plus. Revenez à la liste des campagnes."
          }
          action={
            <Link className="public-button" to="/campagnes">
              Voir les campagnes
            </Link>
          }
        />
      </main>
    );
  }

  const loginLink = `/connexion`;

  return (
    <main className="public-page detail-page">
      <Link to="/campagnes" className="back-link">
        <FiArrowLeft aria-hidden="true" /> Toutes les campagnes
      </Link>

      <h1 className="public-detail-title">{campaign.title}</h1>

      <div className="public-detail-company">
        {campaign.companyProfile?.logoUrl ? (
          <img src={campaign.companyProfile.logoUrl} alt="" decoding="async" />
        ) : (
          <span className="ui-avatar">
            {String(campaign.companyProfile?.companyName || "F")[0]}
          </span>
        )}
        <span>
          {campaign.companyProfile?.companyName || "Entreprise FILWORK"}
          {campaign.companyProfile?.location
            ? ` · ${campaign.companyProfile.location}`
            : ""}
        </span>
      </div>

      <div className="public-detail-grid">
        <div className="public-panel">
          <h2>Le projet</h2>
          <p>{campaign.description}</p>

          {campaign.objectives && (
            <>
              <h3>Objectifs</h3>
              <p>{campaign.objectives}</p>
            </>
          )}

          {campaign.deliverables && (
            <>
              <h3>Livrables attendus</h3>
              <p>{campaign.deliverables}</p>
            </>
          )}

          {campaign.companyProfile?.description && (
            <>
              <h3>À propos de l’entreprise</h3>
              <p>{campaign.companyProfile.description}</p>
            </>
          )}
        </div>

        <aside className="public-panel">
          <h2>Informations clés</h2>
          <dl className="ui-kv">
            <div>
              <dt>Budget</dt>
              <dd>{formatMoney(campaign.budget, campaign.currency)}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{label(campaign.status)}</dd>
            </div>
            <div>
              <dt>Localisation</dt>
              <dd>{campaign.location || "Non précisée"}</dd>
            </div>
            <div>
              <dt>Publication</dt>
              <dd>{formatDate(campaign.publishedAt)}</dd>
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

          {campaign.platforms?.length > 0 && (
            <>
              <h3>Plateformes</h3>
              <div className="public-tags">
                {campaign.platforms.map((platform) => (
                  <span className="ui-badge ui-badge--gold" key={platform}>
                    {label(platform)}
                  </span>
                ))}
              </div>
            </>
          )}

          {campaign.companyProfile?.websiteUrl && (
            <p className="public-empty-hint">
              <a
                href={campaign.companyProfile.websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                Visiter le site de l’entreprise
              </a>
            </p>
          )}

          <hr className="ui-divider" />

          {!user ? (
            <>
              <p className="ui-small">
                Connectez-vous avec un compte créateur pour candidater à cette
                campagne.
              </p>
              <div className="public-actions">
                <Link
                  className="public-button"
                  to={loginLink}
                  state={{ from: `/campagnes/${campaign.id}` }}
                >
                  Se connecter pour candidater
                </Link>
              </div>
            </>
          ) : user.role === "CREATOR" ? (
            <form className="public-form" onSubmit={handleApply}>
              <h3>Postuler à cette campagne</h3>
              <label htmlFor="application-message">
                Message à l’entreprise
                <textarea
                  id="application-message"
                  rows="5"
                  maxLength={5000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Présentez votre approche et ce que vous pouvez apporter."
                />
              </label>
              <button type="submit" disabled={submitting}>
                <FiSend aria-hidden="true" />{" "}
                {submitting ? "Envoi…" : "Envoyer ma candidature"}
              </button>
            </form>
          ) : user.role === "COMPANY" ? (
            <p className="ui-small">
              Vous êtes connecté avec un compte entreprise. Seuls les comptes
              créateur peuvent candidater.
            </p>
          ) : (
            <p className="ui-small">
              Cette campagne est publique. La candidature est réservée aux
              créateurs.
            </p>
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
            <FiCalendar aria-hidden="true" /> Campagne publiée sur FILWORK
            {campaign.location ? (
              <>
                {" "}
                · <FiMapPin aria-hidden="true" /> {campaign.location}
              </>
            ) : null}
          </p>
        </aside>
      </div>
    </main>
  );
}
