import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiInbox,
  FiLayers,
  FiSend,
} from "react-icons/fi";


import { Alert, Loading, Page, Panel } from "../Components/AppUI";
import { useAuth } from "../context/useAuth";

<<<<<<< HEAD
import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { useAuth } from "../context/useAuth";
=======
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b
import { api, errorMessage } from "../lib/api";
import { formatDateTime } from "../lib/format";

function iconFor(type = "") {
  if (type.startsWith("INVITATION")) return FiInbox;
  if (type.startsWith("APPLICATION")) return FiSend;
  if (type.startsWith("DELIVERABLE")) return FiFileText;
  if (type.startsWith("PAYMENT")) return FiCreditCard;
  if (type.startsWith("COLLABORATION")) return FiLayers;
  return FiBell;
}

// « il y a 3 h », puis la date complète au-delà d’une semaine.
function relativeTime(value) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);

  if (!Number.isFinite(seconds)) {
    return "-";
  }

  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  const abs = Math.abs(seconds);

  if (abs < 60) return "à l’instant";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDateTime(value);
}

const TYPE_LABELS = {
  APPLICATION_ACCEPTED: "Candidature acceptée",
  APPLICATION_REJECTED: "Candidature refusée",
  INVITATION_RECEIVED: "Invitation reçue",
  INVITATION_ACCEPTED: "Invitation acceptée",
  INVITATION_REJECTED: "Invitation refusée",
  INVITATION_WITHDRAWN: "Invitation retirée",
  COLLABORATION_PROPOSED: "Proposition de collaboration",
  DELIVERABLE_SUBMITTED: "Livrable soumis",
  DELIVERABLE_APPROVED: "Livrable approuvé",
  DELIVERABLE_REVISION_REQUESTED: "Révision demandée",
  PAYMENT_STATUS_UPDATED: "Paiement mis à jour",
  COLLABORATION_COMPLETED: "Collaboration terminée",
  COLLABORATION_CANCELLED: "Collaboration annulée",
  ANNOUNCEMENT: "Annonce",
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

<<<<<<< HEAD
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
=======
    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await api.get("/notifications");

        if (!active) {
          return;
        }

        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(errorMessage(requestError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b

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
    const announcementId =
      notification.announcementId || notification.announcement?.id;
    const collaborationId =
      notification.collaborationId || notification.collaboration?.id;
    const invitationId =
      notification.invitationId || notification.invitation?.id;
    const applicationId =
      notification.applicationId || notification.application?.id;
    const campaignId =
      notification.application?.campaign?.id ||
      notification.invitation?.campaign?.id;

    if (announcementId) {
      return `${roleBase}/annonces`;
    }

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
      eyebrow="Notifications"
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
        <ul className="notif-list">
          {notifications.map((notification) => {
            const target = linkFor(notification);
            const Icon = iconFor(notification.type);

            return (
              <li
                className={`notif${notification.isRead ? "" : " notif--unread"}`}
                key={notification.id}
              >
                <span className="notif__icon" aria-hidden="true">
                  <Icon />
                </span>

                <div className="notif__body">
                  <div className="notif__top">
                    <strong>{notification.title}</strong>
                    {!notification.isRead && (
                      <span className="notif__dot" aria-label="Non lue" />
                    )}
                  </div>
                  <p>{notification.message}</p>
                  <small>
                    {TYPE_LABELS[notification.type] || "Notification"} ·{" "}
                    <time dateTime={notification.createdAt}>
                      {relativeTime(notification.createdAt)}
                    </time>
                  </small>
                </div>

                <div className="notif__actions">
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
                      className="ui-button ui-button--ghost ui-button--small"
                      onClick={() => markRead(notification)}
                      disabled={busy === notification.id}
                      aria-label={`Marquer « ${notification.title} » comme lue`}
                    >
                      <FiCheck aria-hidden="true" /> Lue
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
