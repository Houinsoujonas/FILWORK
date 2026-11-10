import { useEffect, useState } from "react";
import {
  FiBell,
  FiBriefcase,
  FiCreditCard,
  FiFileText,
  FiInbox,
  FiLayers,
  FiSend,
  FiUsers,
} from "react-icons/fi";

import { Alert, Loading, Page, Panel, Shortcut, Stat } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";

const SECTIONS = [
  {
    key: "users",
    title: "Comptes",
    description: "Créateurs, entreprises et administrateurs",
    to: "/administration/comptes",
    icon: FiUsers,
  },
  {
    key: "campaigns",
    title: "Campagnes",
    description: "Publiées, brouillons et clôturées",
    to: "/administration/campagnes",
    icon: FiBriefcase,
  },
  {
    key: "collaborations",
    title: "Collaborations",
    description: "Projets en cours et terminés",
    to: "/administration/collaborations",
    icon: FiLayers,
  },
  {
    key: "deliverables",
    title: "Livrables",
    description: "Suivi des contenus remis",
    to: "/administration/livrables",
    icon: FiFileText,
  },
  {
    key: "payments",
    title: "Paiements",
    description: "Échéances et règlements",
    to: "/administration/paiements",
    icon: FiCreditCard,
  },
];

export default function DashboardAdmin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get("/admin/dashboard")
      .then((data) => {
        if (active) {
          setStats(data.stats || null);
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

  return (
    <Page
      eyebrow="Administration"
      title="Vue d’ensemble"
      description="Suivi de l’activité de la plateforme : comptes, campagnes, collaborations, livrables et paiements."
    >
      <Alert type="error">{error}</Alert>

      {loading ? (
        <Loading label="Chargement des statistiques…" />
      ) : !stats ? (
        <Panel title="Statistiques indisponibles">
          <p className="ui-muted ui-small">
            Les statistiques n’ont pas pu être chargées.
          </p>
        </Panel>
      ) : (
        <>
          <div className="ui-grid ui-grid--4">
            <Stat
              icon={FiUsers}
              label="Comptes"
              value={stats.users?.total ?? "-"}
              hint={`${stats.users?.creators ?? 0} créateurs · ${
                stats.users?.companies ?? 0
              } entreprises`}
              to="/administration/comptes"
            />
            <Stat
              icon={FiBriefcase}
              label="Campagnes"
              value={stats.campaigns?.total ?? "-"}
              hint={`${stats.campaigns?.published ?? 0} publiées · ${
                stats.campaigns?.drafts ?? 0
              } brouillons`}
              to="/administration/campagnes"
            />
            <Stat
              icon={FiSend}
              label="Candidatures"
              value={stats.applications?.total ?? "-"}
              hint={`${stats.applications?.pending ?? 0} en attente`}
            />
            <Stat
              icon={FiInbox}
              label="Invitations"
              value={stats.invitations?.total ?? "-"}
              hint={`${stats.invitations?.pending ?? 0} en attente`}
            />
            <Stat
              icon={FiLayers}
              label="Collaborations"
              value={stats.collaborations?.total ?? "-"}
              hint={`${stats.collaborations?.active ?? 0} actives`}
              to="/administration/collaborations"
            />
            <Stat
              icon={FiFileText}
              label="Livrables"
              value={stats.deliverables?.total ?? "-"}
              hint={`${stats.deliverables?.pending ?? 0} à produire · ${
                stats.deliverables?.submitted ?? 0
              } à valider`}
              to="/administration/livrables"
              attention={(stats.deliverables?.submitted ?? 0) > 0}
            />
            <Stat
              icon={FiCreditCard}
              label="Paiements"
              value={stats.payments?.total ?? "-"}
              hint={`${stats.payments?.paid ?? 0} payés`}
              to="/administration/paiements"
            />
            <Stat
              icon={FiBell}
              label="Notifications non lues"
              value={stats.notifications?.unread ?? "-"}
              hint="Tous comptes confondus"
            />
          </div>

          <h2 className="ui-section-title">Accès rapides</h2>
          <div className="ui-grid ui-grid--3">
            {SECTIONS.map((section) => (
              <Shortcut
                key={section.key}
                to={section.to}
                icon={section.icon}
                title={section.title}
                description={section.description}
              />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
