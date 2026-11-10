import { useEffect, useState } from "react";

import { Alert, Field, Loading, Page, Panel } from "../Components/AppUI";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../lib/api";
import { isPlaceholderName } from "../lib/profileIdentity";

const EMPTY = {
  companyName: "",
  industry: "",
  description: "",
  websiteUrl: "",
  logoUrl: "",
  location: "",
  contactEmail: "",
  contactPhone: "",
  country: "",
  city: "",
};

export default function CompanyProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      if (profile) {
        setForm({
          ...EMPTY,
          ...Object.fromEntries(
            Object.keys(EMPTY).map((key) => [key, profile[key] ?? ""]),
          ),
        });
      }

      setLoading(false);
    })();
  }, [profile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await api.put("/profile/me", form);
      await refreshProfile();
      setSuccess("Votre profil d’entreprise a été enregistré.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title="Mon organisation"
      description="Ces informations sont visibles par les créateurs sur vos campagnes publiées."
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {profile && isPlaceholderName(profile.companyName) && (
        <Alert>
          Le nom enregistré ressemble à un nom de démonstration. Remplacez-le
          par le nom réel de votre entreprise avant d’enregistrer.
        </Alert>
      )}

      {loading ? (
        <Loading />
      ) : (
        <Panel title="Fiche de l’entreprise">
          <form className="ui-form" onSubmit={handleSubmit}>
            <div className="ui-form-grid">
              <Field label="Nom de l’entreprise">
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  maxLength={150}
                  required
                />
              </Field>

              <Field label="Secteur d’activité">
                <input
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="Mode, agroalimentaire, technologie…"
                />
              </Field>

              <Field label="Site web" hint="URL complète en http:// ou https://">
                <input
                  name="websiteUrl"
                  type="url"
                  value={form.websiteUrl}
                  onChange={handleChange}
                  placeholder="https://exemple.com"
                />
              </Field>

              <Field label="Logo" hint="URL complète d’une image">
                <input
                  name="logoUrl"
                  type="url"
                  value={form.logoUrl}
                  onChange={handleChange}
                  placeholder="https://exemple.com/logo.png"
                />
              </Field>

              <Field label="Localisation">
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="Abidjan, Côte d’Ivoire"
                />
              </Field>

              <Field label="Pays">
                <input
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  maxLength={100}
                />
              </Field>

              <Field label="Ville">
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  maxLength={100}
                />
              </Field>

              <Field label="E-mail de contact">
                <input
                  name="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={handleChange}
                  maxLength={254}
                />
              </Field>

              <Field label="Téléphone">
                <input
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  maxLength={30}
                />
              </Field>

              <Field label="Présentation" wide>
                <textarea
                  name="description"
                  rows="5"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={3000}
                  placeholder="Présentez votre entreprise, vos valeurs et vos projets."
                />
              </Field>
            </div>

            <div className="ui-form__actions">
              <button className="ui-button" type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Panel>
      )}
    </Page>
  );
}
