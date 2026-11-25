import { useCallback, useEffect, useMemo, useState } from "react";

import {
  api,
  clearTokens,
  errorMessage,
  getRefreshToken,
  getToken,
  setTokens,
} from "../lib/api";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.get("/profile/me");
      setProfileError("");
      setProfile(data.profile ?? null);
      return data.profile ?? null;
    } catch (requestError) {
      setProfile(null);
      setProfileError(errorMessage(requestError));
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
        setSessionError("");
        await loadProfile();

        if (active) {
          setLoading(false);
        }
      } catch (requestError) {
        const sessionWasRejected =
          requestError?.status === 401 || requestError?.status === 403;

        if (sessionWasRejected) {
          clearTokens();
        }

        if (active) {
          if (sessionWasRejected) {
            setUser(null);
            setProfile(null);
            setProfileError("");
          } else {
            setSessionError(errorMessage(requestError));
          }
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
      clearTokens();
      setUser(null);
      setProfile(null);
      setProfileError("");
      setSessionError("");
    };

    const handleSessionRefreshed = (event) => {
      if (event.detail) {
        setUser(event.detail);
      }
    };

    window.addEventListener("filwork:unauthorized", handleUnauthorized);
    window.addEventListener("filwork:session-refreshed", handleSessionRefreshed);

    return () => {
      window.removeEventListener("filwork:unauthorized", handleUnauthorized);
      window.removeEventListener("filwork:session-refreshed", handleSessionRefreshed);
    };
  }, []);

  const login = useCallback(
    async (email, password, remember = true) => {
      const data = await api.post(
        "/auth/login",
        { email, password },
        { auth: false },
      );

      setTokens(data.token, data.refreshToken, remember);
      setUser(data.user);
      setSessionError("");
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

      setTokens(data.token, data.refreshToken, true);
      setUser(data.user);
      setSessionError("");

      let savedProfile = null;

      if (profileData && Object.keys(profileData).length > 0) {
        try {
          const result = await api.put("/profile/me", profileData);
          savedProfile = result.profile ?? null;
          setProfile(savedProfile);
          setProfileError("");
        } catch (requestError) {
          setProfileError(errorMessage(requestError));
        }
      }

      return { user: data.user, profile: savedProfile };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", { refreshToken: getRefreshToken() });
    } catch {
      // Le jeton peut déjà être expiré : la session locale doit
      // malgré tout être effacée.
    }

    clearTokens();
    setUser(null);
    setProfile(null);
    setProfileError("");
    setSessionError("");
  }, []);

  const refreshProfile = useCallback(() => loadProfile(), [loadProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      profileError,
      sessionError,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      setProfile,
    }),
    [user, profile, profileError, sessionError, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
