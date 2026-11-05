import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import { Alert, Loading, Page, Panel } from "../Components/AppUI";
import Pagination from "../Components/Pagination";
import { api, errorMessage } from "../lib/api";
import { formatDate, label } from "../lib/format";

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
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api
      .get("/admin/users", {
        search: search || undefined,
        role: role || undefined,
        page,
        limit: 20,
      })
      .then((data) => {
        if (active) {
          setUsers(data.users || []);
          setPagination(data.pagination || null);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError));
          setUsers([]);
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
  }, [search, role, page]);

  return (
    <Page
      eyebrow="ADMINISTRATION"
      title="Comptes"
      description="Recherchez les comptes de la plateforme et consultez leur rôle et leur profil."
    >
      <Alert type="error">{error}</Alert>

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
      ) : users.length === 0 ? (
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
