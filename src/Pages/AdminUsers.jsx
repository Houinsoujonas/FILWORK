import { useState } from "react";
import { FiSearch } from "react-icons/fi";

import { Alert, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";
import { formatDate, label } from "../lib/format";
import { useApiQuery } from "../lib/useApiQuery";

const EMPTY_USERS = { users: [], pagination: null };

const ROLES = [
  ["", "Tous les rôles"],
  ["CREATOR", "Créateur"],
  ["COMPANY", "Entreprise"],
  ["ADMIN", "Administrateur"],
];

export default function AdminUsers() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [roleChanges, setRoleChanges] = useState({});
  const [busyUserId, setBusyUserId] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const { user: currentUser } = useAuth();

  const { data, loading, error } = useApiQuery(
    () =>
      api.get("/admin/users", {
        search: search || undefined,
        role: role || undefined,
        page,
        limit: 20,
      }),
    [search, role, page, reloadVersion],
    EMPTY_USERS,
  );

  const users = data.users;
  const pagination = data.pagination;

  const updateRole = async (account) => {
    const nextRole = roleChanges[account.id] || account.role;
    if (nextRole === account.role) return;

    setBusyUserId(account.id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await api.patch(`/admin/users/${account.id}`, {
        role: nextRole,
      });
      setActionSuccess(response.message || "Rôle du compte mis à jour.");
      setRoleChanges((current) => {
        const next = { ...current };
        delete next[account.id];
        return next;
      });
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.message || "Impossible de modifier ce compte.");
    } finally {
      setBusyUserId("");
    }
  };

  const changeAccountStatus = async (account) => {
    const nextAction = account.isActive ? "désactiver" : "réactiver";
    if (account.id === currentUser?.id || !window.confirm(`Confirmer : ${nextAction} ${account.email} ?`)) {
      return;
    }

    setBusyUserId(account.id);
    setActionError("");
    setActionSuccess("");

    try {
      const endpoint = account.isActive ? "deactivate" : "reactivate";
      const response = await api.patch(`/admin/users/${account.id}/${endpoint}`, {});
      setActionSuccess(response.message || `Compte ${account.isActive ? "désactivé" : "réactivé"}.`);
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.message || "Impossible de modifier ce compte.");
    } finally {
      setBusyUserId("");
    }
  };

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Comptes"
      description="Recherchez les comptes de la plateforme et consultez leur rôle et leur profil."
    >
      <Alert type="error">{error}</Alert>
      <Alert type="error">{actionError}</Alert>
      <Alert type="success">{actionSuccess}</Alert>

      <Panel>
        <form
          className="ui-inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(query.trim());
          }}
        >
          <label className="ui-field">
            <span>Recherche par e-mail</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="exemple@filwork.local"
            />
          </label>

          <label className="ui-field">
            <span>Rôle</span>
            <select
              value={role}
              onChange={(event) => {
                setPage(1);
                setRole(event.target.value);
              }}
            >
              {ROLES.map(([value, text]) => (
                <option key={value || "all"} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>

          <button className="ui-button" type="submit">
            <FiSearch aria-hidden="true" /> Rechercher
          </button>
        </form>
      </Panel>

      {loading ? (
        <Loading label="Chargement des comptes…" />
      ) : error ? null : users.length === 0 ? (
        <Panel title="Aucun compte">
          <p className="ui-muted ui-small">
            Aucun compte ne correspond à ces critères.
          </p>
        </Panel>
      ) : (
        <Panel title="Résultats">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Rôle</th>
                  <th>Profil</th>
                  <th>Localisation</th>
                  <th>Créé le</th>
                  <th>État</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const profile =
                    user.creatorProfile || user.companyProfile || null;
                  const profileName =
                    user.companyProfile?.companyName ||
                    user.creatorProfile?.displayName ||
                    "-";

                  return (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{label(user.role)}</td>
                      <td>
                        {profileName}
                        {profile?.niche || profile?.industry
                          ? ` · ${profile.niche || profile.industry}`
                          : ""}
                      </td>
                      <td>
                        {[profile?.city, profile?.country]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{user.isActive ? "Actif" : "Désactivé"}</td>
                      <td>
                        <div className="ui-inline-form">
                          <select
                            aria-label={`Rôle de ${user.email}`}
                            value={roleChanges[user.id] ?? user.role}
                            disabled={user.id === currentUser?.id || busyUserId === user.id}
                            onChange={(event) =>
                              setRoleChanges((current) => ({
                                ...current,
                                [user.id]: event.target.value,
                              }))
                            }
                          >
                            {ROLES.filter(([value]) => value).map(([value, text]) => (
                              <option key={value} value={value}>{text}</option>
                            ))}
                          </select>
                          <button
                            className="ui-button ui-button--small"
                            type="button"
                            disabled={user.id === currentUser?.id || busyUserId === user.id || (roleChanges[user.id] ?? user.role) === user.role}
                            onClick={() => updateRole(user)}
                          >
                            Enregistrer
                          </button>
                          <button
                            className="ui-button ui-button--ghost ui-button--small"
                            type="button"
                            disabled={user.id === currentUser?.id || busyUserId === user.id}
                            onClick={() => changeAccountStatus(user)}
                          >
                            {busyUserId === user.id
                              ? "En cours…"
                              : user.isActive ? "Désactiver" : "Réactiver"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination?.page || page}
            totalPages={pagination?.totalPages}
            total={pagination?.total}
            onChange={setPage}
          />
        </Panel>
      )}
    </Page>
  );
}
