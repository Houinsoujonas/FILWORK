import { useCallback, useEffect, useMemo, useState } from "react";

import { api, clearToken, getToken, setToken } from "../lib/api";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.get("/profile/me");
      setProfile(data.profile ?? null);
      return data.profile ?? null;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!getToken()) {
        return;
      }

      try {
        const data = await api.get("/auth/me");

        if (!active) {
          return;
        }

        setUser(data.user);
        await loadProfile();

        if (active) {
          setLoading(false);
        }
      } catch {
        clearToken();

        if (active) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, [loadProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearToken();
      setUser(null);
      setProfile(null);
    };

    window.addEventListener("filwork:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("filwork:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = useCallback(
    async (email, password, remember = true) => {
      const data = await api.post(
        "/auth/login",
        { email, password },
        { auth: false },
      );

      setToken(data.token, remember);
      setUser(data.user);
      await loadProfile();

      return data.user;
    },
    [loadProfile],
  );

  const register = useCallback(
    async ({ email, password, role, profile: profileData }) => {
      const data = await api.post(
        "/auth/register",
        { email, password, role },
        { auth: false },
      );

      setToken(data.token, true);
      setUser(data.user);

      let savedProfile = null;

      if (profileData && Object.keys(profileData).length > 0) {
        const result = await api.put("/profile/me", profileData);
        savedProfile = result.profile ?? null;
        setProfile(savedProfile);
      }

      return { user: data.user, profile: savedProfile };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Le jeton peut déjà être expiré : la session locale doit
      // malgré tout être effacée.
    }

    clearToken();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(), [loadProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      setProfile,
    }),
    [user, profile, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
