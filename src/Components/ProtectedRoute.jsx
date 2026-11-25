import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { homeForRole } from "../lib/format";
import { Alert } from "./AppUI";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="route-loading" role="status">
        Vérification de votre session…
      </main>
    );
  }

  if (!user) {
    if (sessionError) {
      return (
        <main className="route-loading">
          <Alert type="error">{sessionError}</Alert>
          <button type="button" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </main>
      );
    }

    return (
      <Navigate
        to="/connexion"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}
