import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Alert, Field, Loading, Page, Panel } from "../Components/AppUI";
import PlatformIcon from "../Components/PlatformIcon";
import { api, errorMessage } from "../lib/api";
import { label } from "../lib/format";

const PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "LINKEDIN",
  "FACEBOOK",
  "TWITCH",
];

const EMPTY = {
  title: "",
  description: "",
  objectives: "",
  deliverables: "",
  location: "",
  platforms: [],
  budget: "",
  currency: "XOF",
  startDate: "",
  endDate: "",
};

function toDateInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default function CampaignEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    let active = true;

    api
      .get("/campaigns/my-campaigns")
      .then((data) => {
        if (!active) {
          return;
        }

        const campaign = (data.campaigns || []).find(
          (item) => item.id === id,
        );

        if (!campaign) {
          setError("Campagne introuvable ou accès non autorisé.");
          return;
        }

        setForm({
          title: campaign.title || "",
          description: campaign.description || "",
          objectives: campaign.objectives || "",
          deliverables: campaign.deliverables || "",
          location: campaign.location || "",
          platforms: campaign.platforms || [],
          budget:
            campaign.budget === null || campaign.budget === undefined
              ? ""
              : String(campaign.budget),
          currency: campaign.currency || "XOF",
          startDate: toDateInput(campaign.startDate),
          endDate: toDateInput(campaign.endDate),
        });
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
  }, [id, isEdit]);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const togglePlatform = (platform) => {
    setForm((current) => ({
      ...current,
      platforms: current.platforms.includes(platform)
        ? current.platforms.filter((item) => item !== platform)
        : [...current.platforms, platform],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      objectives: form.objectives.trim(),
      deliverables: form.deliverables.trim(),
      location: form.location.trim(),
      platforms: form.platforms,
      currency: form.currency.trim().toUpperCase(),
    };

    if (form.budget !== "") {
      body.budget = form.budget;
    }

    if (form.startDate) {
      body.startDate = form.startDate;
    }

    if (form.endDate) {
      body.endDate = form.endDate;
    }

    try {
      const data = isEdit
        ? await api.put(`/campaigns/${id}`, body)
        : await api.post("/campaigns", body);

      setSuccess(
        isEdit
          ? "Campagne mise à jour."
          : "Campagne créée en brouillon. Publiez-la lorsque vous êtes prêt.",
      );

      if (!isEdit) {
        setForm(EMPTY);
        navigate(`/espace/entreprise/campagnes/${data.campaign.id}`);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page eyebrow="ESPACE ENTREPRISE" title="Campagne">
        <Loading />
      </Page>
    );
  }

  return (
    <Page
      eyebrow="ESPACE ENTREPRISE"
      title={isEdit ? "Modifier la campagne" : "Créer une campagne"}
      description="Décrivez votre besoin, votre budget et les livrables attendus."
      actions={
        <Link
          className="ui-button ui-button--ghost"
          to="/espace/entreprise/campagnes"
        >
          Mes campagnes
        </Link>
      }
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <Panel>
        <form className="ui-form" onSubmit={submit}>
          <div className="ui-form-grid">
            <Field label="Titre" wide>
              <input
                name="title"
                value={form.title}
                onChange={change}
                maxLength={200}
                required
              />
            </Field>

            <Field label="Description" wide>
              <textarea
                name="description"
                rows="6"
                value={form.description}
                onChange={change}
                maxLength={10000}
                required
              />
            </Field>

            <Field label="Objectifs">
              <textarea
                name="objectives"
                rows="4"
                value={form.objectives}
                onChange={change}
                maxLength={3000}
              />
            </Field>

            <Field label="Livrables attendus">
              <textarea
                name="deliverables"
                rows="4"
                value={form.deliverables}
                onChange={change}
                maxLength={3000}
              />
            </Field>

            <Field label="Localisation">
              <input
                name="location"
                value={form.location}
                onChange={change}
                maxLength={200}
              />
            </Field>

            <Field label="Budget">
              <input
                name="budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={change}
              />
            </Field>

            <Field label="Devise">
              <input
                name="currency"
                value={form.currency}
                onChange={change}
                maxLength={3}
                required
              />
            </Field>

            <Field label="Date de début">
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={change}
              />
            </Field>

            <Field label="Date de fin">
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={change}
              />
            </Field>

            <fieldset className="ui-field ui-field--wide ui-fieldset">
              <legend>Plateformes ciblées</legend>
              <div className="ui-chips">
                {PLATFORMS.map((platform) => (
                  <label key={platform} className="ui-chip">
                    <input
                      type="checkbox"
                      checked={form.platforms.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                    />
                    <PlatformIcon platform={platform} />
                    {label(platform)}
                  </label>
                ))}
              </div>
              <small>Sélectionnez une ou plusieurs plateformes.</small>
            </fieldset>
          </div>

          <div className="ui-form__actions">
            <button className="ui-button" type="submit" disabled={saving}>
              {saving
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer les modifications"
                  : "Créer la campagne"}
            </button>
          </div>
        </form>
      </Panel>
    </Page>
  );
}
