const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

function resolveApiBaseUrl() {
  if (import.meta.env.DEV) {
    return "/api";
  }

  if (!configuredApiUrl) {
    return "";
  }

  const normalizedUrl = configuredApiUrl.replace(/\/+$/, "");
  return normalizedUrl.endsWith("/api") ? normalizedUrl : `${normalizedUrl}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

const TOKEN_KEY = "filwork.token";
const REFRESH_TOKEN_KEY = "filwork.refresh-token";
const REQUEST_TIMEOUT_MS = 15000;

let refreshRequest = null;
const pendingGetRequests = new Map();

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function readStorage(key) {
  try {
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken() {
  return readStorage(TOKEN_KEY);
}

export function getRefreshToken() {
  return readStorage(REFRESH_TOKEN_KEY);
}

export function setTokens(token, refreshToken, remember = true) {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);

    if (!token) {
      return;
    }

    const storage = remember ? window.localStorage : window.sessionStorage;
    storage.setItem(TOKEN_KEY, token);

    if (refreshToken) {
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    // Le stockage peut être désactivé par les paramètres du navigateur.
  }
}

export function clearTokens() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Le nettoyage est sans effet si le stockage est inaccessible.
  }
}

function buildQuery(params) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(response) {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: "Le serveur a renvoyé une réponse illisible." };
  }
}

function notifyUnauthorized() {
  window.dispatchEvent(new Event("filwork:unauthorized"));
}

async function refreshSession() {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    notifyUnauthorized();
    throw new ApiError("Votre session a expiré. Reconnectez-vous.", 401);
  }

  refreshRequest = (async () => {
    let response;
    let data;
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        signal: timeoutSignal,
      });
      data = await parseResponse(response);
    } catch (error) {
      if (timeoutSignal.aborted || error?.name === "TimeoutError") {
        throw new ApiError("Le serveur met trop de temps à répondre.", 0);
      }

      throw new ApiError(
        "Impossible de renouveler votre session. Reconnectez-vous.",
        0,
      );
    }

    if (!response.ok || !data?.token || !data?.refreshToken) {
      if (response.status === 401 || response.status === 403) {
        clearTokens();
        notifyUnauthorized();
      }
      throw new ApiError(
        data?.message || "Votre session a expiré. Reconnectez-vous.",
        response.status,
        data,
      );
    }

    let remember = false;
    try {
      remember = Boolean(window.localStorage.getItem(TOKEN_KEY));
    } catch {
      // Le jeton est conservé dans sessionStorage si localStorage est bloqué.
    }
    setTokens(data.token, data.refreshToken, remember);
    window.dispatchEvent(
      new CustomEvent("filwork:session-refreshed", { detail: data.user }),
    );
    return data.token;
  })().finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
}

async function request(path, options = {}, allowRefresh = true) {
  const { method = "GET", body, params, auth = true, signal } = options;

  if (!API_BASE_URL) {
    throw new ApiError("L’adresse de l’API FILWORK n’est pas configurée.", 0);
  }

  if (import.meta.env.PROD && configuredApiUrl) {
    try {
      if (new URL(configuredApiUrl).protocol !== "https:") {
        throw new ApiError("L’API de production doit utiliser HTTPS.", 0);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError("L’adresse de l’API FILWORK est invalide.", 0);
    }
  }

  const headers = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = auth ? getToken() : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const timeoutController = new AbortController();
  const abortFromCaller = () => timeoutController.abort(signal.reason);

  if (signal?.aborted) {
    abortFromCaller();
  } else {
    signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = window.setTimeout(
    () => timeoutController.abort(new DOMException("Timeout", "TimeoutError")),
    REQUEST_TIMEOUT_MS,
  );

  let response;
  let data;

  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutController.signal,
    });
    data = await parseResponse(response);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    if (timeoutController.signal.aborted) {
      throw new ApiError("Le serveur met trop de temps à répondre.", 0);
    }

    throw new ApiError(
      "Impossible de contacter le serveur FILWORK. Vérifiez votre connexion.",
      0,
    );
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    if (response.status === 401 && auth && allowRefresh) {
      await refreshSession();
      const retryOptions =
        path === "/auth/logout"
          ? { ...options, body: { ...body, refreshToken: getRefreshToken() } }
          : options;
      return request(path, retryOptions, false);
    }

    if (response.status === 401 && auth) {
      clearTokens();
      notifyUnauthorized();
    }

    throw new ApiError(
      data?.message || `La requête a échoué (${response.status}).`,
      response.status,
      data,
    );
  }

  return data;
}

export const api = {
  get: (path, params, options) => {
    const requestOptions = { ...options, params, method: "GET" };

    if (options?.signal) {
      return request(path, requestOptions);
    }

    const authToken = requestOptions.auth === false ? "public" : getToken() || "anonymous";
    const requestKey = `${authToken}:${API_BASE_URL}${path}${buildQuery(params)}`;
    const existingRequest = pendingGetRequests.get(requestKey);

    if (existingRequest) {
      return existingRequest;
    }

    const pendingRequest = request(path, requestOptions);
    pendingGetRequests.set(requestKey, pendingRequest);
    const removePendingRequest = () => {
      if (pendingGetRequests.get(requestKey) === pendingRequest) {
        pendingGetRequests.delete(requestKey);
      }
    };
    pendingRequest.then(removePendingRequest, removePendingRequest);

    return pendingRequest;
  },
  post: (path, body, options) =>
    request(path, { ...options, body, method: "POST" }),
  put: (path, body, options) =>
    request(path, { ...options, body, method: "PUT" }),
  patch: (path, body, options) =>
    request(path, { ...options, body, method: "PATCH" }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};

export function errorMessage(error) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return error?.message || "Une erreur inattendue est survenue.";
}
