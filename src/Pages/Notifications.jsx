import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiBell, FiCheck, FiCheckCircle } from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../lib/api";
import { formatDateTime } from "../lib/format";

const TYPE_LABELS = {
  APPLICATION_ACCEPTED: "Candidature acceptée",
  APPLICATION_REJECTED: "Candidature refusée",
  INVITATION_RECEIVED: "Invitation reçue",
  INVITATION_ACCEPTED: "Invitation acceptée",
  INVITATION_REJECTED: "Invitation refusée",
  INVITATION_WITHDRAWN: "Invitation retirée",
  DELIVERABLE_SUBMITTED: "Livrable soumis",
  DELIVERABLE_APPROVED: "Livrable approuvé",
  DELIVERABLE_REVISION_REQUESTED: "Révision demandée",
  PAYMENT_STATUS_UPDATED: "Paiement mis à jour",
  COLLABORATION_COMPLETED: "Collaboration terminée",
  COLLABORATION_CANCELLED: "Collaboration annulée",
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");

  const roleBase =
    user?.role === "COMPANY"
      ? "/espace/entreprise"
      : user?.role === "ADMIN"
        ? "/administration"
        : "/espace/createur";

  useEffect(() => {
    let active = true;

    api
      .get("/notifications")
      .then((data) => {
        if (active) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
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

  const markRead = async (notification) => {
    if (notification.isRead) {
      return;
    }

    setBusy(notification.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/notifications/${notification.id}/read`, {});
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const markAll = async () => {
    setBusy("all");
    setError("");
    setSuccess("");

    try {
      const data = await api.patch("/notifications/read-all", {});
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );
      setUnreadCount(0);
      setSuccess(data.message || "Toutes les notifications sont lues.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const linkFor = (notification) => {
    const collaborationId =
      notification.collaborationId || notification.collaboration?.id;
    const invitationId =
      notification.invitationId || notification.invitation?.id;
    const applicationId =
      notification.applicationId || notification.application?.id;
    const campaignId =
      notification.application?.campaign?.id ||
      notification.invitation?.campaign?.id;

    if (user?.role === "ADMIN") {
      if (collaborationId) {
        return "/administration/collaborations";
      }

      if (invitationId || applicationId) {
        return "/administration/campagnes";
      }

      return null;
    }

    if (collaborationId) {
      return `${roleBase}/collaborations/${collaborationId}`;
    }

    if (invitationId) {
      return `${roleBase}/invitations`;
    }

    if (applicationId) {
      if (user?.role === "CREATOR") {
        return `${roleBase}/candidatures`;
      }

      return campaignId
        ? `${roleBase}/campagnes/${campaignId}`
        : `${roleBase}/campagnes`;
    }

    return null;
  };

  return (
    <Page
      eyebrow="NOTIFICATIONS"
      title="Vos notifications"
      description="Suivez les décisions, livrables et paiements qui concernent vos projets."
      actions={
        <button
          type="button"
          className="ui-button ui-button--ghost"
          onClick={markAll}
          disabled={busy === "all" || unreadCount === 0}
        >
          <FiCheckCircle aria-hidden="true" />{" "}
          {busy === "all" ? "Traitement…" : "Tout marquer comme lu"}
        </button>
      }
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {loading ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <Panel title="Aucune notification">
          <p className="ui-muted ui-small">
            Vous serez informé ici des nouvelles invitations, candidatures,
            livrables et paiements.
          </p>
        </Panel>
      ) : (
        <div className="ui-list">
          {notifications.map((notification) => {
            const target = linkFor(notification);

            return (
              <article
                className="ui-panel"
                key={notification.id}
                style={{
                  opacity: notification.isRead ? 0.72 : 1,
                  borderColor: notification.isRead ? "#292c30" : "#73582f",
                }}
              >
                <div className="ui-panel__head">
                  <div>
                    <h2>
                      <FiBell aria-hidden="true" /> {notification.title}
                    </h2>
                    <p>
                      {TYPE_LABELS[notification.type] || notification.type} ·{" "}
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="ui-panel__actions">
                    {!notification.isRead && (
                      <Badge value="PENDING">Non lue</Badge>
                    )}
                  </div>
                </div>

                <p className="ui-small">{notification.message}</p>

                <div className="ui-actions-inline" style={{ marginTop: 12 }}>
                  {target && (
                    <Link
                      className="ui-button ui-button--ghost ui-button--small"
                      to={target}
                      onClick={() => markRead(notification)}
                    >
                      Ouvrir
                    </Link>
                  )}
                  {!notification.isRead && (
                    <button
                      type="button"
                      className="ui-button ui-button--small"
                      onClick={() => markRead(notification)}
                      disabled={busy === notification.id}
                    >
                      <FiCheck aria-hidden="true" /> Marquer comme lue
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
