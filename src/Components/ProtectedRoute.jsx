import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../lib/format";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="route-loading" role="status">
        Vérification de votre session…
      </main>
    );
  }

  if (!user) {
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
