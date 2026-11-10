import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Alert, Badge, Loading, Page, Panel } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";
import { formatDateTime } from "../lib/format";

const STATUS_LABELS = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  ARCHIVED: "Archivée",
};

const AUDIENCE_LABELS = {
  ALL: "Tous",
  CREATORS: "Créateurs",
  COMPANIES: "Entreprises",
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterStatus, setFilterStatus] = useState("");

  const fetchAnnouncements = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNumber, limit: 10 };
      if (filterStatus) {
        params.status = filterStatus;
      }

      const data = await api.get("/admin/announcements", { params });

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
        const params = { page: 1, limit: 10 };
        if (filterStatus) {
          params.status = filterStatus;
        }

        const data = await api.get("/admin/announcements", { params });

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
  }, [filterStatus]);

  const handlePublish = async (id) => {
    try {
      await api.post(`/admin/announcements/${id}/publish`);
      setMessage("Annonce publiée avec succès.");
      fetchAnnouncements(page);
    } catch (err) {
      setError(errorMessage(err) || "Impossible de publier l'annonce.");
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Archiver cette annonce ?")) {
      return;
    }
    try {
      await api.patch(`/admin/announcements/${id}/archive`);
      setMessage("Annonce archivée.");
      fetchAnnouncements(page);
    } catch (err) {
      setError(errorMessage(err) || "Impossible d'archiver l'annonce.");
    }
  };

  if (loading) {
    return <Loading>Chargement des annonces…</Loading>;
  }

  return (
    <Page title="Gestion des annonces" description="Publiez des annonces destinées aux utilisateurs de FILWORK.">
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Link to="/administration/annonces/nouvelle" style={{
          padding: "8px 16px",
          backgroundColor: "#2563eb",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 6,
          fontWeight: 600,
        }}>
          + Nouvelle annonce
        </Link>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="">Toutes les annonces</option>
          <option value="DRAFT">Brouillons</option>
          <option value="PUBLISHED">Publiées</option>
          <option value="ARCHIVED">Archivées</option>
        </select>
      </div>

      {announcements.length === 0 ? (
        <Panel>
          Aucune annonce trouvée.
        </Panel>
      ) : (
        announcements.map((announcement) => (
          <Panel key={announcement.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{announcement.title}</h3>
                <p style={{ margin: "4px 0", fontSize: 13, color: "#666", whiteSpace: "pre-line" }}>
                  {announcement.body}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <Badge value={STATUS_LABELS[announcement.status] || announcement.status} />
                <Badge value={AUDIENCE_LABELS[announcement.audience] || announcement.audience} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 8 }}>
              <span>Par {announcement.createdBy?.email || "Inconnu"}</span>
              <span>{announcement.status === "PUBLISHED" ? "Publié le " + formatDateTime(announcement.publishedAt) : "Créé le " + formatDateTime(announcement.createdAt)}</span>
              {announcement.expiresAt && <span>Expire le {formatDateTime(announcement.expiresAt)}</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {announcement.status === "DRAFT" && (
                <>
                  <Link to={`/administration/annonces/${announcement.id}/modifier`} style={{
                    padding: "6px 12px",
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: 13,
                  }}>
                    Modifier
                  </Link>
                  <button
                    onClick={() => handlePublish(announcement.id)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Publier
                  </button>
                </>
              )}
              {announcement.status === "PUBLISHED" && (
                <button
                  onClick={() => handleArchive(announcement.id)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Archiver
                </button>
              )}
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
