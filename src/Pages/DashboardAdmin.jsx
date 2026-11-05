import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";

import { Alert, Loading, Page, Panel, Stat } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";

const SECTIONS = [
  { key: "users", title: "Comptes", to: "/administration/comptes" },
  { key: "campaigns", title: "Campagnes", to: "/administration/campagnes" },
  {
    key: "collaborations",
    title: "Collaborations",
    to: "/administration/collaborations",
  },
  {
    key: "deliverables",
    title: "Livrables",
    to: "/administration/livrables",
  },
  { key: "payments", title: "Paiements", to: "/administration/paiements" },
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
      eyebrow="ESPACE ADMINISTRATEUR"
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
              label="Comptes"
              value={stats.users?.total ?? "-"}
              hint={`${stats.users?.creators ?? 0} créateurs · ${
                stats.users?.companies ?? 0
              } entreprises`}
            />
            <Stat
              label="Campagnes"
              value={stats.campaigns?.total ?? "-"}
              hint={`${stats.campaigns?.published ?? 0} publiées · ${
                stats.campaigns?.drafts ?? 0
              } brouillons`}
            />
            <Stat
              label="Candidatures"
              value={stats.applications?.total ?? "-"}
              hint={`${stats.applications?.pending ?? 0} en attente`}
            />
            <Stat
              label="Invitations"
              value={stats.invitations?.total ?? "-"}
              hint={`${stats.invitations?.pending ?? 0} en attente`}
            />
          </div>

          <div className="ui-grid ui-grid--4" style={{ marginTop: 18 }}>
            <Stat
              label="Collaborations"
              value={stats.collaborations?.total ?? "-"}
              hint={`${stats.collaborations?.active ?? 0} actives`}
            />
            <Stat
              label="Livrables"
              value={stats.deliverables?.total ?? "-"}
              hint={`${stats.deliverables?.pending ?? 0} à produire · ${
                stats.deliverables?.submitted ?? 0
              } soumis`}
            />
            <Stat
              label="Paiements"
              value={stats.payments?.total ?? "-"}
              hint={`${stats.payments?.paid ?? 0} payés`}
            />
            <Stat
              label="Notifications non lues"
              value={stats.notifications?.unread ?? "-"}
            />
          </div>

          <div className="ui-grid ui-grid--2" style={{ marginTop: 18 }}>
            {SECTIONS.map((section) => {
              const values = Object.entries(stats[section.key] || {}).filter(
                ([key]) => key !== "total",
              );

              return (
                <Panel
                  key={section.key}
                  title={section.title}
                  actions={
                    <Link
                      className="ui-button ui-button--ghost ui-button--small"
                      to={section.to}
                    >
                      Ouvrir <FiArrowUpRight aria-hidden="true" />
                    </Link>
                  }
                >
                  <p className="ui-small">
                    <strong>{stats[section.key]?.total ?? "-"}</strong>{" "}
                    enregistrement(s) au total.
                  </p>
                  {values.length > 0 && (
                    <p className="ui-small ui-muted">
                      {values
                        .map(([key, value]) => `${key} : ${value}`)
                        .join(" · ")}
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </Page>
  );
}
