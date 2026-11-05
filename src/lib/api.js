// Client HTTP unique pour l'API FILWORK.
//
// - utilise le proxy Vite en développement (/api) ;
// - conserve le jeton en localStorage ou sessionStorage selon "Se souvenir" ;
// - normalise les erreurs backend en ApiError.

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");

const TOKEN_KEY = "filwork.token";

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

export function setToken(token, remember = true) {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);

    if (!token) {
      return;
    }

    const storage = remember ? window.localStorage : window.sessionStorage;
    storage.setItem(TOKEN_KEY, token);
  } catch {
    // Le stockage peut être désactivé (navigation privée stricte).
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
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

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    params,
    auth = true,
    signal,
  } = options;

  const headers = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = auth ? getToken() : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Impossible de contacter le serveur FILWORK. Vérifiez votre connexion.",
      0,
    );
  }

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event("filwork:unauthorized"));
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
  get: (path, params, options) =>
    request(path, { ...options, params, method: "GET" }),
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
