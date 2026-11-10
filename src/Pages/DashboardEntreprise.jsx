import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBell,
  FiBriefcase,
  FiCheckCircle,
  FiCircle,
  FiLayers,
  FiPlus,
  FiSend,
  FiUser,
  FiUsers,
} from "react-icons/fi";


import {
  Alert,
  Badge,
  Loading,
  Page,
  Panel,
  Progress,
  Shortcut,
  Stat,
} from "../Components/AppUI";
import { useAuth } from "../context/useAuth";

import { api } from "../lib/api";
import {
  collaborationCampaign,
  collaborationCreator,
  formatDate,
  formatMoney,
} from "../lib/format";
import { getCompanyIdentity } from "../lib/profileIdentity";

const BASE = "/espace/entreprise";

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
          setError("Certaines données n’ont pas pu être chargées. Rechargez la page pour réessayer.");
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

  const campaigns = data?.campaigns ?? [];
  const published = campaigns.filter((campaign) => campaign.status === "PUBLISHED").length;
  const drafts = campaigns.filter((campaign) => campaign.status === "DRAFT").length;
  const activeCollaborations =
    data?.collaborations.filter((item) => item.status === "ACTIVE").length ?? 0;
  const pendingInvitations =
    data?.invitations.filter((item) => item.status === "PENDING").length ?? 0;

  // Parcours de démarrage : affiché tant qu’une étape reste à faire.
  const steps = [
    ["Compléter la fiche de l’organisation", !identity.isPlaceholder && !identity.isIncomplete, `${BASE}/organisation`],
    ["Créer une première campagne", campaigns.length > 0, `${BASE}/campagnes/nouvelle`],
    ["Publier une campagne", published > 0 || campaigns.some((c) => c.publishedAt), `${BASE}/campagnes`],
    ["Inviter un créateur", (data?.invitations.length ?? 0) > 0, `${BASE}/createurs`],
  ];
  const done = steps.filter(([, ok]) => ok).length;
  const showOnboarding = !loading && done < steps.length;

  return (
    <Page
      eyebrow="Espace entreprise"
      title={identity.isPlaceholder ? "Bienvenue sur FILWORK" : identity.name}
      description="Préparez vos campagnes, trouvez des créateurs et suivez vos collaborations."
      actions={
        <>
          <Link className="ui-button ui-button--ghost" to={`${BASE}/createurs`}>
            <FiUsers aria-hidden="true" /> Trouver des créateurs
          </Link>
          <Link className="ui-button" to={`${BASE}/campagnes/nouvelle`}>
            <FiPlus aria-hidden="true" /> Créer une campagne
          </Link>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      {!showOnboarding && (identity.isPlaceholder || identity.isIncomplete) && (
        <Alert>
          {identity.isPlaceholder
            ? "Indiquez le nom réel de votre entreprise pour être reconnu par les créateurs."
            : "Ajoutez votre secteur et une présentation pour rassurer les créateurs."}{" "}
          <Link className="ui-link" to={`${BASE}/organisation`}>
            Compléter la fiche <FiArrowUpRight aria-hidden="true" />
          </Link>
        </Alert>
      )}

      {loading ? (
        <Loading label="Chargement de votre tableau de bord…" />
      ) : (
        <>
          {showOnboarding && (
            <Panel
              title="Bien démarrer"
              description="Quatre étapes pour lancer votre première collaboration."
            >
              <Progress label={`${done} étape(s) sur ${steps.length}`} value={done} max={steps.length} />
              <ul className="ui-checklist ui-checklist--links">
                {steps.map(([stepLabel, ok, to]) => (
                  <li key={stepLabel} className={ok ? "is-done" : ""}>
                    {ok ? <FiCheckCircle aria-hidden="true" /> : <FiCircle aria-hidden="true" />}
                    {ok ? (
                      <span>
                        {stepLabel}
                        <span className="sr-only"> (fait)</span>
                      </span>
                    ) : (
                      <Link to={to}>{stepLabel}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="ui-grid ui-grid--4">
            <Stat
              icon={FiBriefcase}
              label="Campagnes publiées"
              value={published}
              hint={`${campaigns.length} au total · ${drafts} brouillon(s)`}
              to={`${BASE}/campagnes`}
            />
            <Stat
              icon={FiLayers}
              label="Collaborations actives"
              value={activeCollaborations}
              to={`${BASE}/collaborations`}
            />
            <Stat
              icon={FiSend}
              label="Invitations en attente"
              value={pendingInvitations}
              hint="Sans réponse des créateurs"
              to={`${BASE}/invitations`}
            />
            <Stat
              icon={FiBell}
              label="Notifications non lues"
              value={data?.notifications?.unreadCount ?? 0}
              to={`${BASE}/notifications`}
              attention={(data?.notifications?.unreadCount ?? 0) > 0}
            />
          </div>

          <div className="ui-grid ui-grid--2">
            <Panel
              title="Mes campagnes"
              actions={
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`${BASE}/campagnes`}
                >
                  Tout voir
                </Link>
              }
            >
              {campaigns.length === 0 ? (
                <div className="ui-empty">
                  <strong>Aucune campagne</strong>
                  <Link className="ui-link" to={`${BASE}/campagnes/nouvelle`}>
                    Créer votre première campagne
                  </Link>
                </div>
              ) : (
                <ul className="ui-list">
                  {campaigns.slice(0, 4).map((campaign) => (
                    <li key={campaign.id}>
                      <Link
                        className="ui-list-item"
                        to={`${BASE}/campagnes/${campaign.id}`}
                      >
                        <span className="ui-list-item__main">
                          <strong>{campaign.title}</strong>
                          <span>
                            {formatMoney(campaign.budget, campaign.currency)} · créée le{" "}
                            {formatDate(campaign.createdAt)}
                          </span>
                        </span>
                        <span className="ui-list-item__side">
                          <Badge value={campaign.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Collaborations récentes"
              actions={
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`${BASE}/collaborations`}
                >
                  Tout voir
                </Link>
              }
            >
              {data?.collaborations.length === 0 ? (
                <div className="ui-empty">
                  <strong>Pas encore de collaboration</strong>
                  Acceptez une candidature ou invitez un créateur pour démarrer
                  un projet.
                </div>
              ) : (
                <ul className="ui-list">
                  {data.collaborations.slice(0, 4).map((collaboration) => {
                    const creator = collaborationCreator(collaboration);
                    const campaign = collaborationCampaign(collaboration);

                    return (
                      <li key={collaboration.id}>
                        <Link
                          className="ui-list-item"
                          to={`${BASE}/collaborations/${collaboration.id}`}
                        >
                          <span className="ui-list-item__main">
                            <strong>{creator?.displayName || "Créateur"}</strong>
                            <span>{campaign?.title}</span>
                          </span>
                          <span className="ui-list-item__side">
                            <Badge value={collaboration.status} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className="ui-grid ui-grid--3">
            <Shortcut
              to={`${BASE}/createurs`}
              icon={FiUsers}
              title="Annuaire des créateurs"
              description="Filtrer par plateforme et disponibilité"
            />
            <Shortcut
              to={`${BASE}/invitations`}
              icon={FiSend}
              title="Invitations envoyées"
              description="Suivre les réponses des créateurs"
            />
            <Shortcut
              to={`${BASE}/organisation`}
              icon={FiUser}
              title="Fiche de l’organisation"
              description="Ce que voient les créateurs"
            />
          </div>
        </>
      )}
    </Page>
  );
}
