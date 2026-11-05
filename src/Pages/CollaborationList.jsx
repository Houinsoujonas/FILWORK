import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import {
  collaborationAmount,
  collaborationCampaign,
  collaborationCreator,
  formatDate,
  formatMoney,
} from "../lib/format";

export default function CollaborationList() {
  const { pathname } = useLocation();
  const basePath = pathname.replace(/\/collaborations\/?$/, "/collaborations");
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api
      .get("/collaborations")
      .then((data) => {
        if (active) {
          setCollaborations(data.collaborations || []);
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
      eyebrow="COLLABORATIONS"
      title="Mes collaborations"
      description="Retrouvez le suivi des projets, les livrables et les paiements."
    >
      <Alert type="error">{error}</Alert>

      {loading ? (
        <Loading />
      ) : collaborations.length === 0 ? (
        <Panel title="Aucune collaboration">
          <p className="ui-muted ui-small">
            Les collaborations apparaissent dès qu’une candidature ou une
            invitation est acceptée.
          </p>
        </Panel>
      ) : (
        <div className="ui-list">
          {collaborations.map((collaboration) => {
            const creator = collaborationCreator(collaboration);
            const campaign = collaborationCampaign(collaboration);
            const amount = collaborationAmount(collaboration);

            return (
              <article className="ui-panel" key={collaboration.id}>
                <div className="ui-panel__head">
                  <div>
                    <h2>{campaign?.title || "Collaboration"}</h2>
                    <p>
                      {creator?.displayName || "Créateur"} ·{" "}
                      {campaign?.companyProfile?.companyName || "Entreprise"}
                    </p>
                  </div>
                  <div className="ui-panel__actions">
                    <Badge value={collaboration.status} />
                    <Link
                      className="ui-button ui-button--ghost ui-button--small"
                      to={`${basePath}/${collaboration.id}`}
                    >
                      Ouvrir
                    </Link>
                  </div>
                </div>

                <div className="ui-row ui-muted ui-small">
                  <span>
                    Montant convenu :{" "}
                    {formatMoney(amount, collaboration.currency)}
                  </span>
                  <span>Début : {formatDate(collaboration.startDate)}</span>
                  {collaboration.endDate && (
                    <span>Fin : {formatDate(collaboration.endDate)}</span>
                  )}
                  <span>
                    {collaboration.deliverables?.length || 0} livrable(s) ·{" "}
                    {collaboration.payments?.length || 0} paiement(s)
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
