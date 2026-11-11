import { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";

import { Alert, Badge, Field, Loading, Page, Panel } from "../Components/AppUI";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../lib/api";
import { formatNumber, label } from "../lib/format";
import { isPlaceholderName } from "../lib/profileIdentity";

const EMPTY_PROFILE = {
  displayName: "",
  bio: "",
  niche: "",
  location: "",
  country: "",
  city: "",
  profileImageUrl: "",
  mediaKitUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  startingRate: "",
  rateCurrency: "XOF",
  availabilityStatus: "AVAILABLE",
};

const SOCIAL_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "LINKEDIN",
  "FACEBOOK",
  "TWITCH",
];

function formFromProfile(profile) {
  return {
    ...EMPTY_PROFILE,
    ...Object.fromEntries(
      Object.keys(EMPTY_PROFILE).map((key) => [
        key,
        profile[key] ??
          (key === "startingRate" ? "" : EMPTY_PROFILE[key]),
      ]),
    ),
  };
}

export default function CreatorProfilePage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const [form, setForm] = useState(() =>
    profile ? formFromProfile(profile) : EMPTY_PROFILE,
  );
  const [syncedProfile, setSyncedProfile] = useState(profile ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [social, setSocial] = useState({
    platform: "INSTAGRAM",
    profileUrl: "",
    followerCount: "",
  });
  const [socialBusy, setSocialBusy] = useState(false);
  const [portfolio, setPortfolio] = useState({
    type: "LINK",
    title: "",
    description: "",
    url: "",
    campaignName: "",
  });
  const [portfolioBusy, setPortfolioBusy] = useState(false);

  const loading = authLoading && !profile;

  // Le profil peut être rechargé après une sauvegarde : on recale le
  // formulaire pendant le rendu plutôt que dans un effet.
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    setForm(formFromProfile(profile));
  }

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
      setSuccess("Votre profil créateur a été enregistré.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handleAddSocial = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSocialBusy(true);

    try {
      const body = {
        platform: social.platform,
        profileUrl: social.profileUrl.trim(),
      };

      if (social.followerCount !== "") {
        body.followerCount = Number(social.followerCount);
      }

      await api.post("/profile/me/socials", body);
      await refreshProfile();
      setSocial({ platform: "INSTAGRAM", profileUrl: "", followerCount: "" });
      setSuccess("Réseau social ajouté.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSocialBusy(false);
    }
  };

  const handleDeleteSocial = async (socialId) => {
    if (!window.confirm("Supprimer ce réseau social ?")) {
      return;
    }

    setError("");

    try {
      await api.delete(`/profile/me/socials/${socialId}`);
      await refreshProfile();
      setSuccess("Réseau social supprimé.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const handleAddPortfolio = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPortfolioBusy(true);

    try {
      await api.post("/profile/me/portfolio", {
        type: portfolio.type,
        title: portfolio.title.trim(),
        description: portfolio.description.trim(),
        url: portfolio.url.trim(),
        campaignName: portfolio.campaignName.trim(),
      });
      await refreshProfile();
      setPortfolio({
        type: "LINK",
        title: "",
        description: "",
        url: "",
        campaignName: "",
      });
      setSuccess("Élément de portfolio ajouté.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setPortfolioBusy(false);
    }
  };

  const handleDeletePortfolio = async (itemId) => {
    if (!window.confirm("Supprimer cet élément de portfolio ?")) {
      return;
    }

    setError("");

    try {
      await api.delete(`/profile/me/portfolio/${itemId}`);
      await refreshProfile();
      setSuccess("Élément de portfolio supprimé.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (loading) {
    return (
      <Page eyebrow="ESPACE CRÉATEUR" title="Mon profil">
        <Loading />
      </Page>
    );
  }

  return (
    <Page
      eyebrow="ESPACE CRÉATEUR"
      title="Mon profil"
      description="Un profil complet augmente vos chances d’être invité sur les campagnes."
    >
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {profile && isPlaceholderName(profile.displayName) && (
        <Alert>
          Le nom enregistré ressemble à un nom de démonstration. Indiquez votre
          vrai nom avant d’enregistrer.
        </Alert>
      )}

      <Panel title="Informations principales">
        <form className="ui-form" onSubmit={handleSubmit}>
          <div className="ui-form-grid">
            <Field label="Nom affiché">
              <input
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
                maxLength={150}
                required
              />
            </Field>

            <Field label="Niche / spécialité">
              <input
                name="niche"
                value={form.niche}
                onChange={handleChange}
                maxLength={100}
                placeholder="Lifestyle, beauté, tech…"
              />
            </Field>

            <Field label="Localisation">
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                maxLength={150}
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

            <Field label="Disponibilité">
              <select
                name="availabilityStatus"
                value={form.availabilityStatus}
                onChange={handleChange}
              >
                <option value="AVAILABLE">Disponible</option>
                <option value="LIMITED">Disponibilité limitée</option>
                <option value="UNAVAILABLE">Indisponible</option>
              </select>
            </Field>

            <Field label="Tarif de départ">
              <input
                name="startingRate"
                type="number"
                min="0"
                step="0.01"
                value={form.startingRate}
                onChange={handleChange}
              />
            </Field>

            <Field label="Devise">
              <input
                name="rateCurrency"
                value={form.rateCurrency}
                onChange={handleChange}
                maxLength={3}
                placeholder="XOF"
              />
            </Field>

            <Field label="Photo de profil" hint="URL complète en http:// ou https://">
              <input
                name="profileImageUrl"
                type="url"
                value={form.profileImageUrl}
                onChange={handleChange}
              />
            </Field>

            <Field label="Media kit" hint="URL complète en http:// ou https://">
              <input
                name="mediaKitUrl"
                type="url"
                value={form.mediaKitUrl}
                onChange={handleChange}
              />
            </Field>

            <Field label="Présentation" wide>
              <textarea
                name="bio"
                rows="5"
                value={form.bio}
                onChange={handleChange}
                maxLength={2000}
                placeholder="Présentez votre univers, votre audience et vos formats."
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

      <Panel
        title="Réseaux sociaux"
        description="Ajoutez vos comptes pour rassurer les entreprises."
      >
        {(!profile?.creatorSocials || profile.creatorSocials.length === 0) && (
          <p className="ui-muted ui-small">Aucun réseau social enregistré.</p>
        )}

        {profile?.creatorSocials?.length > 0 && (
          <ul className="ui-list">
            {profile.creatorSocials.map((item) => (
              <li className="ui-list-item" key={item.id}>
                <span className="ui-list-item__main">
                  <strong>{label(item.platform)}</strong>
                  <span>{item.profileUrl}</span>
                  {item.followerCount !== null &&
                    item.followerCount !== undefined && (
                      <small>
                        {formatNumber(item.followerCount)} abonnés
                      </small>
                    )}
                </span>
                <span className="ui-list-item__side">
                  <button
                    type="button"
                    className="ui-button ui-button--danger ui-button--small"
                    onClick={() => handleDeleteSocial(item.id)}
                  >
                    <FiTrash2 aria-hidden="true" /> Supprimer
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <hr className="ui-divider" />

        <form className="ui-inline-form" onSubmit={handleAddSocial}>
          <Field label="Plateforme">
            <select
              value={social.platform}
              onChange={(event) =>
                setSocial((current) => ({
                  ...current,
                  platform: event.target.value,
                }))
              }
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option value={platform} key={platform}>
                  {label(platform)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="URL du profil">
            <input
              type="url"
              value={social.profileUrl}
              onChange={(event) =>
                setSocial((current) => ({
                  ...current,
                  profileUrl: event.target.value,
                }))
              }
              placeholder="https://instagram.com/mon-compte"
              required
            />
          </Field>

          <Field label="Abonnés">
            <input
              type="number"
              min="0"
              step="1"
              value={social.followerCount}
              onChange={(event) =>
                setSocial((current) => ({
                  ...current,
                  followerCount: event.target.value,
                }))
              }
            />
          </Field>

          <button className="ui-button" type="submit" disabled={socialBusy}>
            <FiPlus aria-hidden="true" /> Ajouter
          </button>
        </form>
      </Panel>

      <Panel
        title="Portfolio"
        description="Présentez vos meilleures réalisations."
      >
        {(!profile?.portfolioItems || profile.portfolioItems.length === 0) && (
          <p className="ui-muted ui-small">Aucun élément de portfolio.</p>
        )}

        {profile?.portfolioItems?.length > 0 && (
          <ul className="ui-list">
            {profile.portfolioItems.map((item) => (
              <li className="ui-list-item" key={item.id}>
                <span className="ui-list-item__main">
                  <strong>
                    {item.title} <Badge value={item.type} />
                  </strong>
                  <span>
                    {item.campaignName || "Réalisation personnelle"} · {item.url}
                  </span>
                  {item.description && <small>{item.description}</small>}
                </span>
                <span className="ui-list-item__side">
                  <button
                    type="button"
                    className="ui-button ui-button--danger ui-button--small"
                    onClick={() => handleDeletePortfolio(item.id)}
                  >
                    <FiTrash2 aria-hidden="true" /> Supprimer
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <hr className="ui-divider" />

        <form className="ui-form" onSubmit={handleAddPortfolio}>
          <div className="ui-form-grid">
            <Field label="Type">
              <select
                value={portfolio.type}
                onChange={(event) =>
                  setPortfolio((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option value="LINK">Lien</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Vidéo</option>
              </select>
            </Field>

            <Field label="Titre">
              <input
                value={portfolio.title}
                onChange={(event) =>
                  setPortfolio((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                maxLength={200}
                required
              />
            </Field>

            <Field label="URL">
              <input
                type="url"
                value={portfolio.url}
                onChange={(event) =>
                  setPortfolio((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                required
              />
            </Field>

            <Field label="Campagne associée (facultatif)">
              <input
                value={portfolio.campaignName}
                onChange={(event) =>
                  setPortfolio((current) => ({
                    ...current,
                    campaignName: event.target.value,
                  }))
                }
                maxLength={200}
              />
            </Field>

            <Field label="Description" wide>
              <textarea
                rows="3"
                value={portfolio.description}
                onChange={(event) =>
                  setPortfolio((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                maxLength={2000}
              />
            </Field>
          </div>

          <div className="ui-form__actions">
            <button
              className="ui-button"
              type="submit"
              disabled={portfolioBusy}
            >
              <FiPlus aria-hidden="true" /> Ajouter au portfolio
            </button>
          </div>
        </form>
      </Panel>
    </Page>
  );
}
