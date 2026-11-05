import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBriefcase,
  FiCheckCircle,
  FiSend,
  FiUsers,
} from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel, Stat } from "../Components/AppUI";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { getCreatorIdentity } from "../lib/profileIdentity";

export default function DashboardCreateur() {
  const { profile } = useAuth();
  const identity = getCreatorIdentity(profile);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      api.get("/applications/my-applications"),
      api.get("/invitations/received"),
      api.get("/collaborations"),
      api.get("/notifications"),
    ])
      .then(([applications, invitations, collaborations, notifications]) => {
        if (!active) {
          return;
        }

        const value = (result, fallback) =>
          result.status === "fulfilled" ? result.value : fallback;

        setData({
          applications: value(applications, { applications: [] }).applications || [],
          invitations: value(invitations, { invitations: [] }).invitations || [],
          collaborations:
            value(collaborations, { collaborations: [] }).collaborations || [],
          notifications: value(notifications, { notifications: [] }),
        });
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger votre tableau de bord.");
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

  const pendingApplications =
    data?.applications.filter((item) => item.status === "PENDING").length ?? 0;
  const pendingInvitations =
    data?.invitations.filter((item) => item.status === "PENDING").length ?? 0;
  const activeCollaborations =
    data?.collaborations.filter((item) => item.status === "ACTIVE").length ?? 0;

  return (
    <Page
      eyebrow="ESPACE CRÉATEUR"
      title={
        identity.isPlaceholder
          ? "Complétez votre profil créateur"
          : `Bonjour${identity.name ? `, ${identity.name}` : ""}`
      }
      description="Retrouvez vos candidatures, invitations et collaborations en cours."
      actions={
        <Link className="ui-button" to="/campagnes">
          <FiBriefcase aria-hidden="true" /> Découvrir les campagnes
        </Link>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      {(identity.isPlaceholder || identity.isIncomplete) && (
        <Alert>
          {identity.isPlaceholder
            ? profile
              ? "Le nom enregistré ressemble à un nom de démonstration. Indiquez votre vrai nom pour personnaliser votre espace."
              : "Votre profil n’est pas encore créé. Complétez-le pour pouvoir candidater et être invité."
            : "Votre profil créateur est incomplet. Ajoutez votre bio et votre niche pour rassurer les entreprises."}{" "}
          <Link className="ui-link" to="/espace/createur/profil">
            Compléter mon profil <FiArrowUpRight aria-hidden="true" />
          </Link>
        </Alert>
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="ui-grid ui-grid--4">
            <Stat label="Candidatures en attente" value={pendingApplications} />
            <Stat label="Invitations reçues" value={pendingInvitations} />
            <Stat label="Collaborations actives" value={activeCollaborations} />
            <Stat
              label="Notifications non lues"
              value={data?.notifications?.unreadCount ?? 0}
            />
          </div>

          <div className="ui-grid ui-grid--2" style={{ marginTop: 18 }}>
            <Panel
              title="Dernières candidatures"
              actions={
                <Link className="ui-button ui-button--ghost ui-button--small" to="/espace/createur/candidatures">
                  Tout voir
                </Link>
              }
            >
              {data?.applications.length === 0 ? (
                <p className="ui-muted ui-small">
                  Aucune candidature pour le moment.{" "}
                  <Link to="/campagnes">Parcourez les campagnes</Link>.
                </p>
              ) : (
                <ul className="ui-list">
                  {data.applications.slice(0, 4).map((application) => (
                    <li className="ui-list-item" key={application.id}>
                      <span className="ui-list-item__main">
                        <strong>{application.campaign?.title}</strong>
                        <span>
                          {application.campaign?.companyProfile?.companyName} ·{" "}
                          {formatDate(application.createdAt)}
                        </span>
                      </span>
                      <span className="ui-list-item__side">
                        <Badge value={application.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Invitations récentes"
              actions={
                <Link className="ui-button ui-button--ghost ui-button--small" to="/espace/createur/invitations">
                  Tout voir
                </Link>
              }
            >
              {data?.invitations.length === 0 ? (
                <p className="ui-muted ui-small">
                  Aucune invitation reçue pour le moment.
                </p>
              ) : (
                <ul className="ui-list">
                  {data.invitations.slice(0, 4).map((invitation) => (
                    <li className="ui-list-item" key={invitation.id}>
                      <span className="ui-list-item__main">
                        <strong>{invitation.campaign?.title}</strong>
                        <span>
                          {invitation.campaign?.companyProfile?.companyName} ·{" "}
                          {formatDate(invitation.createdAt)}
                        </span>
                      </span>
                      <span className="ui-list-item__side">
                        <Badge value={invitation.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="ui-grid ui-grid--3" style={{ marginTop: 18 }}>
            <Link className="ui-panel ui-link" to="/espace/createur/profil">
              <FiCheckCircle aria-hidden="true" /> Compléter mon profil
            </Link>
            <Link className="ui-panel ui-link" to="/espace/createur/candidatures">
              <FiSend aria-hidden="true" /> Suivre mes candidatures
            </Link>
            <Link className="ui-panel ui-link" to="/espace/createur/collaborations">
              <FiUsers aria-hidden="true" /> Mes collaborations
            </Link>
          </div>
        </>
      )}
    </Page>
  );
}
