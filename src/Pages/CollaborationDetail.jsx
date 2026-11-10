import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheck,
  FiCreditCard,
  FiExternalLink,
  FiPlus,
  FiSend,
  FiStar,
} from "react-icons/fi";

import {
  Alert,
  Badge,
  Field,
  Loading,
  Page,
  Panel,
  Stat,
} from "../Components/AppUI";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../lib/api";
import {
  collaborationAmount,
  collaborationCampaign,
  collaborationCreator,
  formatDate,
  formatDateTime,
  formatMoney,
  label,
} from "../lib/format";

const PAYMENT_TRANSITIONS = {
  PLANNED: ["PENDING", "CANCELLED"],
  PENDING: ["PAID", "FAILED", "CANCELLED"],
  FAILED: ["PENDING", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function Stars({ rating }) {
  return (
    <span className="ui-stars" aria-label={`${rating} sur 5`}>
      {"★".repeat(Number(rating) || 0)}
      {"☆".repeat(5 - (Number(rating) || 0))}
    </span>
  );
}

async function fetchCollaborationBundle(collaborationId) {
  const data = await api.get(`/collaborations/${collaborationId}`);
  let reviews;

  try {
    const reviewData = await api.get(
      "/reviews",
      { collaborationId, limit: 10 },
      { auth: false },
    );
    reviews = reviewData.reviews || [];
  } catch {
    reviews = [];
  }

  return { collaboration: data.collaboration, reviews };
}

export default function CollaborationDetail() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const basePath = pathname.replace(/\/collaborations\/[^/]+\/?$/, "/collaborations");

  const [collaboration, setCollaboration] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadedId, setLoadedId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [busy, setBusy] = useState("");

  const loading = loadedId !== id;

  const [deliverableForm, setDeliverableForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [submissionUrls, setSubmissionUrls] = useState({});
  const [reviewFeedback, setReviewFeedback] = useState({});
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    currency: "XOF",
    dueDate: "",
    notes: "",
  });
  const [paymentReferences, setPaymentReferences] = useState({});
  const [cancelReason, setCancelReason] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "" });
  const [responseContent, setResponseContent] = useState("");
  const [editingResponse, setEditingResponse] = useState(false);

  const notify = (type, message) => {
    setFeedbackType(type);
    setFeedback(message);
  };

  const load = useCallback(async () => {
    try {
      const bundle = await fetchCollaborationBundle(id);
      setCollaboration(bundle.collaboration);
      setReviews(bundle.reviews);
      setLoadedId(id);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setCollaboration(null);
      setLoadedId(id);
    }
  }, [id]);

  useEffect(() => {
<<<<<<< HEAD
    let active = true;

    fetchCollaborationBundle(id)
      .then((bundle) => {
        if (active) {
          setCollaboration(bundle.collaboration);
          setReviews(bundle.reviews);
          setLoadedId(id);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError));
          setCollaboration(null);
          setLoadedId(id);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);
=======
    (async () => {
      await load();
    })();
  }, [load]);
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

  const run = async (key, action, successMessage) => {
    setBusy(key);
    setFeedback("");

    try {
      const result = await action();

      notify("success", result?.message || successMessage);
      await load();
      return result;
    } catch (requestError) {
      notify("error", errorMessage(requestError));
      return null;
    } finally {
      setBusy("");
    }
  };

  if (loading && !collaboration) {
    return (
      <Page eyebrow="COLLABORATION" title="Chargement…">
        <Loading />
      </Page>
    );
  }

  if (error || !collaboration) {
    return (
      <Page
        eyebrow="COLLABORATION"
        title="Collaboration indisponible"
        actions={
          <Link className="ui-button ui-button--ghost" to={basePath}>
            Retour aux collaborations
          </Link>
        }
      >
        <Alert type="error">
          {error || "Cette collaboration n’existe pas ou ne vous est pas accessible."}
        </Alert>
      </Page>
    );
  }

  const creator = collaborationCreator(collaboration);
  const campaign = collaborationCampaign(collaboration);
  const isCompany = user?.role === "COMPANY";
  const isCreator = user?.role === "CREATOR";
  const isActive = collaboration.status === "ACTIVE";
  const isCompleted = collaboration.status === "COMPLETED";
  const amount = collaborationAmount(collaboration);
  const deliverables = collaboration.deliverables || [];
  const payments = collaboration.payments || [];
  const totalPaid = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const review = reviews[0] || null;

  const createDeliverable = async (event) => {
    event.preventDefault();

    const body = {
      title: deliverableForm.title.trim(),
      description: deliverableForm.description.trim(),
    };

    if (deliverableForm.dueDate) {
      body.dueDate = deliverableForm.dueDate;
    }

    const result = await run(
      "deliverable-create",
      () => api.post(`/deliverables/collaborations/${id}`, body),
      "Livrable créé.",
    );

    if (result) {
      setDeliverableForm({ title: "", description: "", dueDate: "" });
    }
  };

  const submitDeliverable = async (deliverable) => {
    const assetUrl = (submissionUrls[deliverable.id] || "").trim();

    if (!assetUrl) {
      notify("error", "Renseignez le lien de votre livrable.");
      return;
    }

    const result = await run(
      `submit-${deliverable.id}`,
      () => api.patch(`/deliverables/${deliverable.id}/submit`, { assetUrl }),
      "Livrable soumis.",
    );

    if (result) {
      setSubmissionUrls((current) => ({ ...current, [deliverable.id]: "" }));
    }
  };

  const reviewDeliverable = async (deliverable, status) => {
    const comment = (reviewFeedback[deliverable.id] || "").trim();

    if (status === "REVISION_REQUESTED" && !comment) {
      notify("error", "Précisez les corrections attendues.");
      return;
    }

    const body = { status };

    if (comment) {
      body.feedback = comment;
    }

    const result = await run(
      `review-${deliverable.id}`,
      () => api.patch(`/deliverables/${deliverable.id}/review`, body),
      "Décision enregistrée.",
    );

    if (result) {
      setReviewFeedback((current) => ({ ...current, [deliverable.id]: "" }));
    }
  };

  const createPayment = async (event) => {
    event.preventDefault();

    const body = {
      amount: paymentForm.amount,
      currency: paymentForm.currency,
      notes: paymentForm.notes.trim(),
    };

    if (paymentForm.dueDate) {
      body.dueDate = paymentForm.dueDate;
    }

    const result = await run(
      "payment-create",
      () => api.post(`/payments/collaborations/${id}`, body),
      "Paiement enregistré.",
    );

    if (result) {
      setPaymentForm({ amount: "", currency: "XOF", dueDate: "", notes: "" });
    }
  };

  const changePaymentStatus = async (payment, status) => {
    const body = { status };

    if (status === "PAID") {
      const reference = (paymentReferences[payment.id] || "").trim();

      if (!reference) {
        notify("error", "La référence du paiement est obligatoire.");
        return;
      }

      body.reference = reference;
    }

    const result = await run(
      `payment-${payment.id}-${status}`,
      () => api.patch(`/payments/${payment.id}/status`, body),
      "Statut du paiement mis à jour.",
    );

    if (result) {
      setPaymentReferences((current) => ({ ...current, [payment.id]: "" }));
    }
  };

  const complete = () =>
    run(
      "complete",
      () => api.patch(`/collaborations/${id}/complete`, {}),
      "Collaboration clôturée.",
    );

  const cancel = () =>
    run(
      "cancel",
      () =>
        api.patch(`/collaborations/${id}/cancel`, {
          reason: cancelReason.trim(),
        }),
      "Collaboration annulée.",
    );

  const publishReview = async (event) => {
    event.preventDefault();

    const result = await run(
      "review-create",
      () =>
        api.post("/reviews", {
          collaborationId: id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim(),
        }),
      "Avis publié.",
    );

    if (result) {
      setReviewForm({ rating: "5", comment: "" });
    }
  };

  const sendResponse = async (event) => {
    event.preventDefault();

    const content = responseContent.trim();

    if (!content) {
      notify("error", "Renseignez votre réponse.");
      return;
    }

    const result = await run(
      "review-response",
      () =>
        editingResponse
          ? api.patch(`/reviews/${review.id}/response`, { content })
          : api.post(`/reviews/${review.id}/response`, { content }),
      "Réponse enregistrée.",
    );

    if (result) {
      setResponseContent("");
      setEditingResponse(false);
    }
  };

  return (
    <Page
      eyebrow="COLLABORATION"
      title={campaign?.title || "Collaboration"}
      description={`${creator?.displayName || "Créateur"} · ${
        campaign?.companyProfile?.companyName || "Entreprise"
      }`}
      actions={
        <Link className="ui-button ui-button--ghost" to={basePath}>
          Retour aux collaborations
        </Link>
      }
    >
      <Alert type="error">{feedbackType === "error" ? feedback : ""}</Alert>
      <Alert type="success">{feedbackType === "success" ? feedback : ""}</Alert>

      <div className="ui-grid ui-grid--4">
        <Stat label="Statut" value={<Badge value={collaboration.status} />} />
        <Stat
          label="Montant convenu"
          value={formatMoney(amount, collaboration.currency)}
        />
        <Stat
          label="Total payé"
          value={formatMoney(totalPaid, collaboration.currency)}
        />
        <Stat label="Livrables" value={deliverables.length} hint={`${deliverables.filter((item) => item.status === "APPROVED").length} approuvé(s)`} />
      </div>

      <div className="ui-grid ui-grid--2" style={{ marginTop: 18 }}>
        <Panel title="Informations du projet">
          <dl className="ui-kv">
            <div>
              <dt>Entreprise</dt>
              <dd>{campaign?.companyProfile?.companyName || "-"}</dd>
            </div>
            <div>
              <dt>Créateur</dt>
              <dd>{creator?.displayName || "-"}</dd>
            </div>
            <div>
              <dt>Début</dt>
              <dd>{formatDate(collaboration.startDate)}</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{formatDate(collaboration.endDate)}</dd>
            </div>
            <div>
              <dt>Origine</dt>
              <dd>
                {collaboration.application
                  ? "Candidature acceptée"
                  : "Invitation acceptée"}
              </dd>
            </div>
            <div>
              <dt>Dernière mise à jour</dt>
              <dd>{formatDateTime(collaboration.updatedAt)}</dd>
            </div>
          </dl>

          {campaign && (
            <p className="ui-small" style={{ marginTop: 14 }}>
              <Link
                className="ui-link"
                to={`/campagnes/${campaign.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Voir la campagne publiée <FiExternalLink aria-hidden="true" />
              </Link>
            </p>
          )}

          {(creator?.bio || campaign?.description) && (
            <>
              <hr className="ui-divider" />
              <h3>Contexte</h3>
              <p className="ui-small">
                {campaign?.description || creator?.bio}
              </p>
            </>
          )}
        </Panel>

        <Panel title="Cycle de vie">
          {isActive && isCompany && (
            <>
              <p className="ui-small">
                Clôturez la collaboration lorsque tous les livrables sont
                approuvés et les paiements réglés.
              </p>
              <button
                type="button"
                className="ui-button"
                onClick={complete}
                disabled={busy === "complete"}
              >
                <FiCheck aria-hidden="true" />{" "}
                {busy === "complete" ? "Clôture…" : "Clôturer la collaboration"}
              </button>
            </>
          )}

          {isActive && (
            <>
              <hr className="ui-divider" />
              <Field
                label="Motif d’annulation"
                hint={
                  isCreator
                    ? "Un créateur ne peut annuler que s’il n’a encore rien produit."
                    : "Le motif est obligatoire pour une entreprise."
                }
              >
                <textarea
                  rows="3"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  maxLength={2000}
                />
              </Field>
              <button
                type="button"
                className="ui-button ui-button--danger"
                onClick={cancel}
                disabled={busy === "cancel" || (isCompany && !cancelReason.trim())}
                title={
                  isCompany && !cancelReason.trim()
                    ? "Renseignez un motif d’annulation."
                    : undefined
                }
              >
                <FiAlertCircle aria-hidden="true" />{" "}
                {busy === "cancel" ? "Annulation…" : "Annuler la collaboration"}
              </button>
            </>
          )}

          {isCompleted && (
            <p className="ui-small">
              Cette collaboration est terminée. Les deux parties peuvent
              consulter son historique.
            </p>
          )}

          {collaboration.status === "CANCELLED" && (
            <p className="ui-small">
              Cette collaboration a été annulée.
              {collaboration.cancellationReason
                ? ` Motif : ${collaboration.cancellationReason}`
                : ""}
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Livrables"
        description="L’entreprise définit les livrables, le créateur dépose son travail, l’entreprise valide ou demande une révision."
      >
        {deliverables.length === 0 ? (
          <p className="ui-muted ui-small">Aucun livrable pour le moment.</p>
        ) : (
          <div className="ui-list">
            {deliverables.map((deliverable) => (
              <article className="ui-subpanel" key={deliverable.id}>
                <div className="ui-row" style={{ justifyContent: "space-between" }}>
                  <strong>{deliverable.title}</strong>
                  <Badge value={deliverable.status} />
                </div>

                {deliverable.description && (
                  <p className="ui-small ui-muted">{deliverable.description}</p>
                )}

                <p className="ui-small ui-muted">
                  {deliverable.dueDate
                    ? `Échéance : ${formatDate(deliverable.dueDate)}`
                    : "Sans échéance"}
                  {deliverable.submittedAt
                    ? ` · Soumis le ${formatDateTime(deliverable.submittedAt)}`
                    : ""}
                </p>

                {deliverable.assetUrl && (
                  <p className="ui-small">
                    <a
                      className="ui-link"
                      href={deliverable.assetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FiExternalLink aria-hidden="true" /> Voir le travail soumis
                    </a>
                  </p>
                )}

                {deliverable.feedback && (
                  <p className="ui-small">
                    <strong>Retour :</strong> {deliverable.feedback}
                  </p>
                )}

                {isCreator &&
                  isActive &&
                  ["PENDING", "REVISION_REQUESTED"].includes(
                    deliverable.status,
                  ) && (
                    <div className="ui-inline-form" style={{ marginTop: 12 }}>
                      <Field label="Lien du livrable">
                        <input
                          type="url"
                          value={submissionUrls[deliverable.id] || ""}
                          onChange={(event) =>
                            setSubmissionUrls((current) => ({
                              ...current,
                              [deliverable.id]: event.target.value,
                            }))
                          }
                          placeholder="https://…"
                        />
                      </Field>
                      <button
                        type="button"
                        className="ui-button"
                        onClick={() => submitDeliverable(deliverable)}
                        disabled={busy === `submit-${deliverable.id}`}
                      >
                        <FiSend aria-hidden="true" />{" "}
                        {busy === `submit-${deliverable.id}`
                          ? "Envoi…"
                          : "Soumettre"}
                      </button>
                    </div>
                  )}

                {isCompany &&
                  isActive &&
                  deliverable.status === "SUBMITTED" && (
                    <div style={{ marginTop: 12 }}>
                      <Field label="Retour au créateur">
                        <textarea
                          rows="3"
                          value={reviewFeedback[deliverable.id] || ""}
                          onChange={(event) =>
                            setReviewFeedback((current) => ({
                              ...current,
                              [deliverable.id]: event.target.value,
                            }))
                          }
                          placeholder="Obligatoire en cas de demande de révision."
                        />
                      </Field>
                      <div className="ui-actions-inline" style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="ui-button"
                          onClick={() =>
                            reviewDeliverable(deliverable, "APPROVED")
                          }
                          disabled={busy === `review-${deliverable.id}`}
                        >
                          <FiCheck aria-hidden="true" /> Approuver
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--ghost"
                          onClick={() =>
                            reviewDeliverable(
                              deliverable,
                              "REVISION_REQUESTED",
                            )
                          }
                          disabled={busy === `review-${deliverable.id}`}
                        >
                          Demander une révision
                        </button>
                      </div>
                    </div>
                  )}
              </article>
            ))}
          </div>
        )}

        {isCompany && isActive && (
          <>
            <hr className="ui-divider" />
            <h3>Ajouter un livrable</h3>
            <form className="ui-form" onSubmit={createDeliverable}>
              <div className="ui-form-grid">
                <Field label="Titre">
                  <input
                    value={deliverableForm.title}
                    onChange={(event) =>
                      setDeliverableForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    maxLength={200}
                    required
                  />
                </Field>
                <Field label="Échéance">
                  <input
                    type="date"
                    min={todayInput()}
                    value={deliverableForm.dueDate}
                    onChange={(event) =>
                      setDeliverableForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Description" wide>
                  <textarea
                    rows="3"
                    value={deliverableForm.description}
                    onChange={(event) =>
                      setDeliverableForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    maxLength={5000}
                  />
                </Field>
              </div>
              <div className="ui-form__actions">
                <button
                  className="ui-button"
                  type="submit"
                  disabled={busy === "deliverable-create"}
                >
                  <FiPlus aria-hidden="true" />{" "}
                  {busy === "deliverable-create"
                    ? "Création…"
                    : "Créer le livrable"}
                </button>
              </div>
            </form>
          </>
        )}
      </Panel>

      <Panel
        title="Paiements"
        description="L’entreprise planifie les paiements puis suit leur statut."
      >
        {payments.length === 0 ? (
          <p className="ui-muted ui-small">Aucun paiement enregistré.</p>
        ) : (
          <div className="ui-list">
            {payments.map((payment) => (
              <article className="ui-subpanel" key={payment.id}>
                <div className="ui-row" style={{ justifyContent: "space-between" }}>
                  <strong>
                    {formatMoney(payment.amount, payment.currency)}
                  </strong>
                  <Badge value={payment.status} />
                </div>

                <p className="ui-small ui-muted">
                  {payment.dueDate
                    ? `Échéance : ${formatDate(payment.dueDate)}`
                    : "Sans échéance"}
                  {payment.paidAt
                    ? ` · Payé le ${formatDateTime(payment.paidAt)}`
                    : ""}
                  {payment.reference ? ` · Réf. ${payment.reference}` : ""}
                </p>

                {payment.notes && (
                  <p className="ui-small ui-muted">{payment.notes}</p>
                )}

                {isCompany &&
                  PAYMENT_TRANSITIONS[payment.status]?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      {PAYMENT_TRANSITIONS[payment.status].includes("PAID") && (
                        <Field
                          label="Référence du paiement"
                          hint="Obligatoire pour marquer un paiement comme payé."
                        >
                          <input
                            value={paymentReferences[payment.id] || ""}
                            onChange={(event) =>
                              setPaymentReferences((current) => ({
                                ...current,
                                [payment.id]: event.target.value,
                              }))
                            }
                            maxLength={200}
                          />
                        </Field>
                      )}

                      <div className="ui-actions-inline" style={{ marginTop: 10 }}>
                        {PAYMENT_TRANSITIONS[payment.status].map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={
                              status === "CANCELLED" || status === "FAILED"
                                ? "ui-button ui-button--danger ui-button--small"
                                : "ui-button ui-button--small"
                            }
                            onClick={() => changePaymentStatus(payment, status)}
                            disabled={busy === `payment-${payment.id}-${status}`}
                          >
                            {busy === `payment-${payment.id}-${status}`
                              ? "Mise à jour…"
                              : `Marquer : ${label(status)}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </article>
            ))}
          </div>
        )}

        {isCompany && isActive && (
          <>
            <hr className="ui-divider" />
            <h3>Enregistrer un paiement</h3>
            <form className="ui-form" onSubmit={createPayment}>
              <div className="ui-form-grid">
                <Field label="Montant">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="Devise">
                  <input
                    value={paymentForm.currency}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    maxLength={3}
                    required
                  />
                </Field>
                <Field label="Échéance">
                  <input
                    type="date"
                    value={paymentForm.dueDate}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Notes" wide>
                  <textarea
                    rows="2"
                    value={paymentForm.notes}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    maxLength={2000}
                  />
                </Field>
              </div>
              <div className="ui-form__actions">
                <button
                  className="ui-button"
                  type="submit"
                  disabled={busy === "payment-create"}
                >
                  <FiCreditCard aria-hidden="true" />{" "}
                  {busy === "payment-create"
                    ? "Enregistrement…"
                    : "Enregistrer le paiement"}
                </button>
              </div>
            </form>
          </>
        )}
      </Panel>

      <Panel
        title="Avis"
        description="Un avis peut être publié par l’entreprise lorsque la collaboration est terminée."
      >
        {review ? (
          <div className="ui-review-card">
            <div className="ui-row" style={{ justifyContent: "space-between" }}>
              <strong>{review.companyProfile?.companyName || "Entreprise"}</strong>
              <Stars rating={review.rating} />
            </div>
            <p className="ui-small" style={{ marginTop: 10 }}>
              {review.comment}
            </p>
            <p className="ui-small ui-muted">
              Publié le {formatDate(review.createdAt)}
            </p>

            {review.response ? (
              <div className="ui-subpanel" style={{ marginTop: 12 }}>
                <strong>Réponse du créateur</strong>
                <p className="ui-small">{review.response.content}</p>
                {isCreator && (
                  <button
                    type="button"
                    className="ui-button ui-button--ghost ui-button--small"
                    onClick={() => {
                      setResponseContent(review.response.content);
                      setEditingResponse(true);
                    }}
                  >
                    Modifier ma réponse
                  </button>
                )}
              </div>
            ) : (
              isCreator && (
                <form className="ui-form" onSubmit={sendResponse} style={{ marginTop: 12 }}>
                  <Field label="Votre réponse">
                    <textarea
                      rows="3"
                      value={responseContent}
                      onChange={(event) => setResponseContent(event.target.value)}
                      maxLength={5000}
                      required
                    />
                  </Field>
                  <div className="ui-form__actions">
                    <button
                      className="ui-button"
                      type="submit"
                      disabled={busy === "review-response"}
                    >
                      Publier ma réponse
                    </button>
                  </div>
                </form>
              )
            )}

            {isCreator && editingResponse && (
              <form className="ui-form" onSubmit={sendResponse} style={{ marginTop: 12 }}>
                <Field label="Modifier ma réponse">
                  <textarea
                    rows="3"
                    value={responseContent}
                    onChange={(event) => setResponseContent(event.target.value)}
                    maxLength={5000}
                    required
                  />
                </Field>
                <div className="ui-form__actions">
                  <button
                    className="ui-button"
                    type="submit"
                    disabled={busy === "review-response"}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button--ghost"
                    onClick={() => {
                      setEditingResponse(false);
                      setResponseContent("");
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : isCompany && isCompleted ? (
          <form className="ui-form" onSubmit={publishReview}>
            <div className="ui-form-grid">
              <Field label="Note">
                <select
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      rating: event.target.value,
                    }))
                  }
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Commentaire" wide>
                <textarea
                  rows="4"
                  maxLength={5000}
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  required
                  placeholder="Décrivez votre expérience de collaboration."
                />
              </Field>
            </div>
            <div className="ui-form__actions">
              <button
                className="ui-button"
                type="submit"
                disabled={busy === "review-create"}
              >
                <FiStar aria-hidden="true" />{" "}
                {busy === "review-create" ? "Publication…" : "Publier l’avis"}
              </button>
            </div>
          </form>
        ) : (
          <p className="ui-muted ui-small">
            {isCompleted
              ? "Aucun avis n’a encore été publié."
              : "Les avis seront disponibles une fois la collaboration terminée."}
          </p>
        )}
      </Panel>
    </Page>
  );
}
