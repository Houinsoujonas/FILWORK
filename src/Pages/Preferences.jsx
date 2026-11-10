import { useState, useEffect } from "react";

import { Alert, Loading, Page, Panel, Field } from "../Components/AppUI";
import { api, errorMessage } from "../lib/api";

export default function Preferences() {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const data = await api.get("/preferences");

        if (!active) {
          return;
        }

        setPreferences(data.preferences || data);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(errorMessage(err) || "Impossible de charger les préférences.");
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

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!preferences) {
      return;
    }

    const updates = {
      collaborationEmails: event.target.elements["collaborationEmails"].checked,
      announcementEmails: event.target.elements["announcementEmails"].checked,
      notificationEmails: event.target.elements["notificationEmails"].checked,
    };

    setSaving(true);
    try {
      const data = await api.patch("/preferences", updates);
      setPreferences(data.preferences || updates);
      setMessage("Préférences enregistrées avec succès.");
    } catch (err) {
      setError(errorMessage(err) || "Impossible d'enregistrer les préférences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading>Chargement des préférences…</Loading>;
  }

  if (!preferences) {
    return (
      <Page title="Préférences de communication">
        <Alert type="error">{error || "Impossible de charger les préférences."}</Alert>
      </Page>
    );
  }

  return (
    <Page title="Préférences de communication" description="Choisissez quelles notifications vous souhaitez recevoir par e-mail.">
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Panel>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Emails de collaboration</h3>
          <p style={{ marginBottom: 12, fontSize: 14, color: "#555" }}>
            Recevez un e-mail lorsqu'une entreprise vous adresse une invitation
            ou une proposition de collaboration.
          </p>
          <Field
            label="Emails de collaboration"
            name="collaborationEmails"
            type="checkbox"
            checked={preferences.collaborationEmails !== false}
            info="Recommandé pour ne manquer aucune opportunité."
          />
        </Panel>

        <Panel>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Annonces administratives</h3>
          <p style={{ marginBottom: 12, fontSize: 14, color: "#555" }}>
            Recevez un e-mail lorsqu'un administrateur publie une annonce
            concernant votre rôle.
          </p>
          <Field
            label="Annonces générales"
            name="announcementEmails"
            type="checkbox"
            checked={preferences.announcementEmails !== false}
            info="Annonces ciblées par l'équipe FILWORK."
          />
        </Panel>

        <Panel>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Notifications internes</h3>
          <p style={{ marginBottom: 12, fontSize: 14, color: "#555" }}>
            Recevez un e-mail récapitulatif des nouvelles notifications dans
            votre espace FILWORK.
          </p>
          <Field
            label="Notifications internes"
            name="notificationEmails"
            type="checkbox"
            checked={preferences.notificationEmails !== false}
            info="Résumé des activités de votre espace."
          />
        </Panel>

        <p style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>
          Les emails de sécurité (réinitialisation du mot de passe) sont toujours envoyés et ne peuvent pas être désactivés.
        </p>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {saving ? "Enregistrement…" : "Enregistrer les préférences"}
        </button>
      </form>
    </Page>
  );
}
