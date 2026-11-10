import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Alert, Loading, Page, Panel, Field } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";

const AUDIENCES = [
  { value: "ALL", label: "Tous les utilisateurs" },
  { value: "CREATORS", label: "Créateurs uniquement" },
  { value: "COMPANIES", label: "Entreprises uniquement" },
];

const EMPTY_FORM = {
  title: "",
  body: "",
  audience: "ALL",
  linkUrl: "",
  expiresAt: "",
};

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminAnnouncementCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    let cancelled = false;

    const loadAnnouncement = async () => {
      setLoading(true);

      try {
        const data = await api.get(`/admin/announcements/${id}`);
        const announcement = data.announcement;

        if (cancelled || !announcement) {
          return;
        }

        setForm({
          title: announcement.title || "",
          body: announcement.body || "",
          audience: announcement.audience || "ALL",
          linkUrl: announcement.linkUrl || "",
          expiresAt: toDateTimeLocal(announcement.expiresAt),
        });
        setStatus(announcement.status || "DRAFT");
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(
            errorMessage(err) || "Impossible de charger cette annonce.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAnnouncement();

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    if (!form.body.trim()) {
      setError("Le contenu est obligatoire.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      linkUrl: form.linkUrl.trim() || (isEditing ? null : undefined),
      expiresAt: form.expiresAt || (isEditing ? null : undefined),
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await api.patch(`/admin/announcements/${id}`, payload);
      } else {
        await api.post("/admin/announcements", payload);
      }

      navigate("/administration/annonces");
    } catch (err) {
      setError(
        errorMessage(err) ||
          (isEditing
            ? "Impossible de modifier l'annonce."
            : "Impossible de créer l'annonce."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading>Chargement de l'annonce…</Loading>;
  }

  const isDraft = status === "DRAFT";

  return (
    <Page
      title={isEditing ? "Modifier l'annonce" : "Nouvelle annonce"}
      description={
        isEditing
          ? "Mettez à jour une annonce encore en brouillon."
          : "Rédigez une annonce qui sera affichée aux utilisateurs ciblés."
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {isEditing && !isDraft && (
        <Alert type="error">
          Cette annonce n'est plus en brouillon et ne peut plus être modifiée.
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Panel>
          <Field
            label="Titre de l'annonce"
            name="title"
            type="text"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Exemple : Maintenance prévue le week-end prochain"
            required
          />
        </Panel>

        <Panel>
          <Field
            label="Contenu"
            name="body"
            type="textarea"
            value={form.body}
            onChange={(e) => handleChange("body", e.target.value)}
            placeholder="Décrivez l'annonce de manière claire et concise."
            required
          />
        </Panel>

        <Panel>
          <Field
            label="Audience cible"
            name="audience"
            type="select"
            value={form.audience}
            onChange={(e) => handleChange("audience", e.target.value)}
          >
            {AUDIENCES.map((audience) => (
              <option key={audience.value} value={audience.value}>
                {audience.label}
              </option>
            ))}
          </Field>
        </Panel>

        <Panel>
          <Field
            label="Lien optionnel"
            name="linkUrl"
            type="url"
            value={form.linkUrl}
            onChange={(e) => handleChange("linkUrl", e.target.value)}
            placeholder="https://filwork.example.com/page"
            info="Lien vers une page interne ou externe associée à cette annonce."
          />
          <Field
            label="Date d'expiration optionnelle"
            name="expiresAt"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => handleChange("expiresAt", e.target.value)}
            info="Après cette date, l'annonce ne sera plus affichée."
          />
        </Panel>

        <button
          type="submit"
          disabled={submitting || (isEditing && !isDraft)}
          style={{
            padding: "10px 20px",
            backgroundColor: submitting ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor:
              submitting || (isEditing && !isDraft)
                ? "not-allowed"
                : "pointer",
            fontWeight: 600,
          }}
        >
          {submitting
            ? "Enregistrement…"
            : isEditing
              ? "Enregistrer les modifications"
              : "Créer l'annonce (brouillon)"}
        </button>

        {!isEditing && (
          <p style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
            L'annonce sera créée en statut brouillon. Elle devra être publiée
            depuis la liste des annonces pour être visible.
          </p>
        )}

        <Link
          to="/administration/annonces"
          style={{ marginTop: 8, fontSize: 13, color: "#2563eb", textDecoration: "none" }}
        >
          ← Retour à la liste
        </Link>
      </form>
    </Page>
  );
}
