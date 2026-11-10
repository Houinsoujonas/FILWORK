import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

async function fetchMyApplications() {
  const data = await api.get("/applications/my-applications");
  return data.applications || [];
}

export default function CreatorApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    try {
      setApplications(await fetchMyApplications());
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    let active = true;

    fetchMyApplications()
      .then((items) => {
        if (active) {
          setApplications(items);
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
=======
    (async () => {
      await load();
    })();
>>>>>>> 79d98d87328d46967b35c400b98945f8bc408d3b
  }, []);

  const withdraw = async (application) => {
    if (
      !window.confirm(
        `Retirer votre candidature pour « ${application.campaign?.title} » ?`,
      )
    ) {
      return;
    }

    setBusyId(application.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/applications/${application.id}/withdraw`, {});
      setSuccess("Votre candidature a été retirée.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  return (
    <Page
      eyebrow="ESPACE CRÉATEUR"
      title="Mes candidatures"
      description="Suivez les candidatures envoyées et leur décision."
      actions={
        <Link className="ui-button" to="/espace/createur/campagnes">
          Trouver une campagne
        </Link>
      }
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {loading ? (
        <Loading />
      ) : applications.length === 0 ? (
        <Panel title="Aucune candidature">
          <p className="ui-muted ui-small">
            Vous n’avez pas encore candidaté.{" "}
            <Link to="/espace/createur/campagnes">
              Parcourez les opportunités
            </Link>{" "}
            pour commencer.
          </p>
        </Panel>
      ) : (
        <div className="ui-list">
          {applications.map((application) => (
            <article className="ui-panel" key={application.id}>
              <div className="ui-panel__head">
                <div>
                  <h2>{application.campaign?.title || "Campagne"}</h2>
                  <p>
                    {application.campaign?.companyProfile?.companyName ||
                      "Entreprise"}{" "}
                    · envoyée le {formatDate(application.createdAt)}
                  </p>
                </div>
                <div className="ui-panel__actions">
                  <Badge value={application.status} />
                  <Link
                    className="ui-button ui-button--ghost ui-button--small"
                    to={`/campagnes/${application.campaign?.id}`}
                  >
                    Ouvrir
                  </Link>
                  {application.status === "PENDING" && (
                    <button
                      type="button"
                      className="ui-button ui-button--danger ui-button--small"
                      onClick={() => withdraw(application)}
                      disabled={busyId === application.id}
                    >
                      {busyId === application.id
                        ? "Retrait…"
                        : "Retirer"}
                    </button>
                  )}
                </div>
              </div>

              {application.campaign?.budget !== null &&
                application.campaign?.budget !== undefined && (
                  <p className="ui-small">
                    Budget indicatif :{" "}
                    {formatMoney(
                      application.campaign.budget,
                      application.campaign.currency,
                    )}
                  </p>
                )}

              {application.message && (
                <p className="ui-small ui-muted">{application.message}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
