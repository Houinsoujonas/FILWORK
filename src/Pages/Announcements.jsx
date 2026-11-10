import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDateTime } from "../lib/format";

const AUDIENCE_LABELS = {
  ALL: "Tous",
  CREATORS: "Créateurs",
  COMPANIES: "Entreprises",
};

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url);
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchAnnouncements = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const data = await api.get("/announcements", {
        params: { page: pageNumber, limit: 10 },
      });

      setAnnouncements(data.announcements || []);
      setTotalPages(data.pagination?.totalPages || 0);
      setPage(pageNumber);
      setError("");
    } catch (err) {
      setError(errorMessage(err) || "Impossible de charger les annonces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const data = await api.get("/announcements", {
          params: { page: 1, limit: 10 },
        });

        if (!active) {
          return;
        }

        setAnnouncements(data.announcements || []);
        setTotalPages(data.pagination?.totalPages || 0);
        setPage(1);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }

        setError(errorMessage(err) || "Impossible de charger les annonces.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <Loading>Chargement des annonces…</Loading>;
  }

  if (error) {
    return (
      <Page title="Annonces">
        <Alert type="error">{error}</Alert>
      </Page>
    );
  }

  return (
    <Page title="Annonces" description="Tenez-vous informé des actualités de FILWORK.">
      {announcements.length === 0 ? (
        <Panel>
          Aucune annonce publiée pour le moment.
        </Panel>
      ) : (
        announcements.map((announcement) => (
          <Panel key={announcement.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{announcement.title}</h3>
              <Badge value={AUDIENCE_LABELS[announcement.audience] || announcement.audience} />
            </div>
            <div style={{ whiteSpace: "pre-line", marginBottom: 8 }}>{announcement.body}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
              <span>Publié le {formatDateTime(announcement.publishedAt)}</span>
              {announcement.linkUrl &&
                (isExternalUrl(announcement.linkUrl) ? (
                  <a
                    href={announcement.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", textDecoration: "none" }}
                  >
                    Voir la source
                  </a>
                ) : (
                  <Link
                    to={announcement.linkUrl}
                    style={{ color: "#2563eb", textDecoration: "none" }}
                  >
                    Voir la source
                  </Link>
                ))}
            </div>
          </Panel>
        ))
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button
            onClick={() => page > 1 && fetchAnnouncements(page - 1)}
            disabled={page <= 1}
            style={{ padding: "6px 12px", border: "1px solid #ccc", background: "#fff", borderRadius: 6, cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            Précédent
          </button>
          <span style={{ fontSize: 14, color: "#666" }}>Page {page} sur {totalPages}</span>
          <button
            onClick={() => page < totalPages && fetchAnnouncements(page + 1)}
            disabled={page >= totalPages}
            style={{ padding: "6px 12px", border: "1px solid #ccc", background: "#fff", borderRadius: 6, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
          >
            Suivant
          </button>
        </div>
      )}
    </Page>
  );
}
