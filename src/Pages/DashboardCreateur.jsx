import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiBell,
  FiBriefcase,
  FiCheckCircle,
  FiCircle,
  FiInbox,
  FiLayers,
  FiSend,
} from "react-icons/fi";

import { Alert, Badge, Loading, Page, Panel, Progress, Stat } from "../Components/AppUI";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";
import {
  collaborationCampaign,
  formatDate,
  formatMoney,
} from "../lib/format";
import { getCreatorIdentity } from "../lib/profileIdentity";

const BASE = "/espace/createur";

function hasText(value) {
  return Boolean(String(value ?? "").trim());
}

// Étapes qui rendent un profil créateur convaincant pour une entreprise.
function profileSteps(profile) {
  return [
    ["Nom et spécialité", hasText(profile?.displayName) && hasText(profile?.niche)],
    ["Présentation", hasText(profile?.bio)],
    ["Ville ou pays", hasText(profile?.city) || hasText(profile?.country) || hasText(profile?.location)],
    ["Photo de profil", hasText(profile?.profileImageUrl)],
    ["Tarif de départ", hasText(profile?.startingRate)],
    ["Au moins un réseau social", (profile?.creatorSocials?.length ?? 0) > 0],
    ["Une réalisation au portfolio", (profile?.portfolioItems?.length ?? 0) > 0],
  ];
}

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

        const results = [applications, invitations, collaborations, notifications];

        if (results.some((result) => result.status === "rejected")) {
          setError("Certaines données n’ont pas pu être chargées. Rechargez la page pour réessayer.");
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
    data?.invitations.filter((item) => item.status === "PENDING") ?? [];
  const activeCollaborations =
    data?.collaborations.filter((item) => item.status === "ACTIVE") ?? [];
  const unread = data?.notifications?.unreadCount ?? 0;

  const steps = profileSteps(profile);
  const done = steps.filter(([, ok]) => ok).length;
  const firstName = identity.name.split(/\s+/)[0];

  return (
    <Page
      eyebrow="Espace créateur"
      title={
        identity.isPlaceholder
          ? "Bienvenue sur FILWORK"
          : `Bonjour, ${firstName}`
      }
      description={
        pendingInvitations.length > 0
          ? `Vous avez ${pendingInvitations.length} invitation${
              pendingInvitations.length > 1 ? "s" : ""
            } en attente de réponse.`
          : "Suivez vos candidatures, invitations et collaborations en un coup d’œil."
      }
      actions={
        <Link className="ui-button" to={`${BASE}/campagnes`}>
          <FiBriefcase aria-hidden="true" /> Trouver une campagne
        </Link>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      {identity.isPlaceholder && (
        <Alert>
          {profile
            ? "Le nom enregistré ressemble à un nom de démonstration. Indiquez votre vrai nom pour être reconnu par les entreprises."
            : "Votre profil n’est pas encore créé. Complétez-le pour pouvoir candidater et être invité."}{" "}
          <Link className="ui-link" to={`${BASE}/profil`}>
            Compléter mon profil <FiArrowUpRight aria-hidden="true" />
          </Link>
        </Alert>
      )}

      {loading ? (
        <Loading label="Chargement de votre tableau de bord…" />
      ) : (
        <>
          <div className="ui-grid ui-grid--4">
            <Stat
              icon={FiInbox}
              label="Invitations à traiter"
              value={pendingInvitations.length}
              to={`${BASE}/invitations`}
              attention={pendingInvitations.length > 0}
            />
            <Stat
              icon={FiSend}
              label="Candidatures en attente"
              value={pendingApplications}
              hint={`${data?.applications.length ?? 0} envoyée(s) au total`}
              to={`${BASE}/candidatures`}
            />
            <Stat
              icon={FiLayers}
              label="Collaborations actives"
              value={activeCollaborations.length}
              to={`${BASE}/collaborations`}
            />
            <Stat
              icon={FiBell}
              label="Notifications non lues"
              value={unread}
              to={`${BASE}/notifications`}
            />
          </div>

          <div className="ui-grid ui-grid--main">
            <Panel
              title="À traiter"
              description="Les entreprises attendent votre réponse."
              actions={
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`${BASE}/invitations`}
                >
                  Toutes les invitations
                </Link>
              }
            >
              {pendingInvitations.length === 0 ? (
                <div className="ui-empty">
                  <strong>Rien en attente</strong>
                  Les nouvelles invitations des entreprises apparaîtront ici.
                </div>
              ) : (
                <ul className="ui-list">
                  {pendingInvitations.slice(0, 4).map((invitation) => (
                    <li className="ui-list-item" key={invitation.id}>
                      <span className="ui-list-item__main">
                        <strong>{invitation.campaign?.title}</strong>
                        <span>
                          {invitation.campaign?.companyProfile?.companyName}
                          {invitation.proposedAmount
                            ? ` · ${formatMoney(
                                invitation.proposedAmount,
                                invitation.campaign?.currency,
                              )} proposés`
                            : ""}
                          {` · reçue le ${formatDate(invitation.createdAt)}`}
                        </span>
                      </span>
                      <span className="ui-list-item__side">
                        <Link
                          className="ui-button ui-button--small"
                          to={`${BASE}/invitations`}
                        >
                          Répondre
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Votre profil"
              description="Un profil complet inspire confiance aux entreprises."
            >
              <Progress label={`${done} étape(s) sur ${steps.length}`} value={done} max={steps.length} />
              <ul className="ui-checklist">
                {steps.map(([stepLabel, ok]) => (
                  <li key={stepLabel} className={ok ? "is-done" : ""}>
                    {ok ? <FiCheckCircle aria-hidden="true" /> : <FiCircle aria-hidden="true" />}
                    {stepLabel}
                    <span className="sr-only">{ok ? " (fait)" : " (à faire)"}</span>
                  </li>
                ))}
              </ul>
              {done < steps.length && (
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`${BASE}/profil`}
                  style={{ marginTop: 16 }}
                >
                  Compléter mon profil
                </Link>
              )}
            </Panel>
          </div>

          <div className="ui-grid ui-grid--2">
            <Panel
              title="Dernières candidatures"
              actions={
                <Link
                  className="ui-button ui-button--ghost ui-button--small"
                  to={`${BASE}/candidatures`}
                >
                  Tout voir
                </Link>
              }
            >
              {data?.applications.length === 0 ? (
                <div className="ui-empty">
                  <strong>Aucune candidature</strong>
                  <Link className="ui-link" to={`${BASE}/campagnes`}>
                    Parcourir les campagnes ouvertes
                  </Link>
                </div>
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
              title="Collaborations"
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
                  Une candidature acceptée ou une invitation acceptée démarre
                  une collaboration.
                </div>
              ) : (
                <ul className="ui-list">
                  {data.collaborations.slice(0, 4).map((collaboration) => {
                    const campaign = collaborationCampaign(collaboration);

                    return (
                      <li key={collaboration.id}>
                        <Link
                          className="ui-list-item"
                          to={`${BASE}/collaborations/${collaboration.id}`}
                        >
                          <span className="ui-list-item__main">
                            <strong>{campaign?.title || "Collaboration"}</strong>
                            <span>
                              {campaign?.companyProfile?.companyName}
                              {` · depuis le ${formatDate(collaboration.startDate)}`}
                            </span>
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
        </>
      )}
    </Page>
  );
}
