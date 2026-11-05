import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBriefcase,
  FiPlusCircle,
  FiSend,
  FiUsers,
} from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel, Stat } from "../Components/AppUI";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { getCompanyIdentity } from "../lib/profileIdentity";

export default function DashboardEntreprise() {
  const { profile } = useAuth();
  const identity = getCompanyIdentity(profile);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      api.get("/campaigns/my-campaigns"),
      api.get("/invitations/sent"),
      api.get("/collaborations"),
      api.get("/notifications"),
    ])
      .then(([campaigns, invitations, collaborations, notifications]) => {
        if (!active) {
          return;
        }

        const results = [campaigns, invitations, collaborations, notifications];

        if (results.some((result) => result.status === "rejected")) {
          setError("Certaines données du tableau de bord n'ont pas pu être chargées.");
        }

        const value = (result, fallback) =>
          result.status === "fulfilled" ? result.value : fallback;

        setData({
          campaigns: value(campaigns, { campaigns: [] }).campaigns || [],
          invitations: value(invitations, { invitations: [] }).invitations || [],
          collaborations:
            value(collaborations, { collaborations: [] }).collaborations || [],
          notifications: value(notifications, { notifications: [] }),
        });
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

  const published =
    data?.campaigns.filter((campaign) => campaign.status === "PUBLISHED").length ??
    0;
  const activeCollaborations =
    data?.collaborations.filter((item) => item.status === "ACTIVE").length ?? 0;
  const pendingInvitations =
    data?.invitations.filter((item) => item.status === "PENDING").length ?? 0;

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title={
        identity.isPlaceholder
          ? "Complétez le profil de votre entreprise"
          : identity.name
      }
      description="Préparez vos campagnes et suivez vos collaborations avec les créateurs."
      actions={
        <Link className="ui-button" to="/espace/entreprise/campagnes/nouvelle">
          <FiPlusCircle aria-hidden="true" /> Créer une campagne
        </Link>
      }
    >
      {(identity.isPlaceholder || identity.isIncomplete) && (
        <Alert>
          {identity.isPlaceholder
            ? profile
              ? "Le nom enregistré ressemble à un nom de démonstration. Indiquez le nom réel de votre entreprise pour personnaliser votre espace."
              : "Votre profil n’est pas encore créé. Renseignez le nom réel de votre entreprise pour personnaliser votre espace."
            : "Votre fiche entreprise est incomplète. Ajoutez votre secteur et votre présentation pour rassurer les créateurs."}{" "}
          <Link className="ui-link" to="/espace/entreprise/organisation">
            Compléter mon profil <FiArrowUpRight aria-hidden="true" />
          </Link>
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="ui-grid ui-grid--4">
            <Stat label="Campagnes" value={data?.campaigns.length ?? 0} hint={`${published} publiée(s)`} />
            <Stat label="Collaborations actives" value={activeCollaborations} />
            <Stat label="Invitations en attente" value={pendingInvitations} />
            <Stat
              label="Notifications non lues"
              value={data?.notifications?.unreadCount ?? 0}
            />
          </div>

          <div className="ui-grid ui-grid--2" style={{ marginTop: 18 }}>
            <Panel
              title="Mes dernières campagnes"
              actions={
                <Link className="ui-button ui-button--ghost ui-button--small" to="/espace/entreprise/campagnes">
                  Tout voir
                </Link>
              }
            >
              {data?.campaigns.length === 0 ? (
                <p className="ui-muted ui-small">
                  Aucune campagne.{" "}
                  <Link to="/espace/entreprise/campagnes/nouvelle">
                    Créez votre première campagne
                  </Link>
                  .
                </p>
              ) : (
                <ul className="ui-list">
                  {data.campaigns.slice(0, 4).map((campaign) => (
                    <li className="ui-list-item" key={campaign.id}>
                      <span className="ui-list-item__main">
                        <strong>{campaign.title}</strong>
                        <span>
                          {formatMoney(campaign.budget, campaign.currency)} ·{" "}
                          {formatDate(campaign.createdAt)}
                        </span>
                      </span>
                      <span className="ui-list-item__side">
                        <Badge value={campaign.status} />
                        <Link
                          className="ui-button ui-button--ghost ui-button--small"
                          to={`/espace/entreprise/campagnes/${campaign.id}`}
                        >
                          Ouvrir
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Collaborations récentes"
              actions={
                <Link className="ui-button ui-button--ghost ui-button--small" to="/espace/entreprise/collaborations">
                  Tout voir
                </Link>
              }
            >
              {data?.collaborations.length === 0 ? (
                <p className="ui-muted ui-small">
                  Aucune collaboration. Acceptez une candidature ou une
                  invitation pour démarrer un projet.
                </p>
              ) : (
                <ul className="ui-list">
                  {data.collaborations.slice(0, 4).map((collaboration) => {
                    const origin =
                      collaboration.application || collaboration.invitation;

                    return (
                      <li className="ui-list-item" key={collaboration.id}>
                        <span className="ui-list-item__main">
                          <strong>
                            {origin?.creatorProfile?.displayName || "Créateur"}
                          </strong>
                          <span>{origin?.campaign?.title}</span>
                        </span>
                        <span className="ui-list-item__side">
                          <Badge value={collaboration.status} />
                          <Link
                            className="ui-button ui-button--ghost ui-button--small"
                            to={`/espace/entreprise/collaborations/${collaboration.id}`}
                          >
                            Ouvrir
                          </Link>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className="ui-grid ui-grid--3" style={{ marginTop: 18 }}>
            <Link className="ui-panel ui-link" to="/espace/entreprise/createurs">
              <FiUsers aria-hidden="true" /> Découvrir les créateurs
            </Link>
            <Link className="ui-panel ui-link" to="/espace/entreprise/invitations">
              <FiSend aria-hidden="true" /> Invitations envoyées
            </Link>
            <Link className="ui-panel ui-link" to="/espace/entreprise/collaborations">
              <FiBriefcase aria-hidden="true" /> Suivre mes collaborations
            </Link>
          </div>
        </>
      )}
    </Page>
  );
}
