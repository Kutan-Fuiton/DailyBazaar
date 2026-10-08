/**
 * shared/api/client.ts
 * Lightweight fetch wrapper with:
 *   - Auto JSON serialisation
 *   - JWT token (stored in localStorage)
 *   - Multipart / file upload support
 *   - Typed ApiError for consumers
 */

const rawBase = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1").trim().replace(/\/+$/, "");
const BASE_URL = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;

// ── Auth token helpers ────────────────────────────────────────────────────────
const TOKEN_KEY = "spendly_token";
const REFRESH_TOKEN_KEY = "vaniq_refresh_token";

export const authToken = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefresh: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// ── Error type ────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// ── Core request types ────────────────────────────────────────────────────────
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authToken.getRefresh();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      authToken.clear();
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      authToken.set(data.access_token);
      if (data.refresh_token) {
        authToken.setRefresh(data.refresh_token);
      }
      return data.access_token;
    }
    return null;
  } catch {
    authToken.clear();
    return null;
  }
}

// ── JSON client ───────────────────────────────────────────────────────────────
/**
 * Usage:
 *   const items = await client<Item[]>('/items');
 *   await client('/items', { method: 'POST', body: { name: 'Rice' } });
 */
export async function client<T = unknown>(
  endpoint: string,
  { body, headers, ...rest }: RequestOptions = {}
): Promise<T> {
  let token = authToken.get();

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Silent refresh on 401 Unauthorized for non-auth requests
  if (response.status === 401 && !endpoint.startsWith("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      const retryConfig: RequestInit = {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        },
      };
      response = await fetch(`${BASE_URL}${endpoint}`, retryConfig);
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: response.statusText }));
    const message = errBody.detail ?? errBody.message ?? "Something went wrong";
    throw new ApiError(response.status, message);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ── File / multipart upload ───────────────────────────────────────────────────
/**
 * Upload a file using multipart/form-data.
 * Automatically attaches JWT token.
 *
 * Usage:
 *   const result = await uploadFile<ScanResponse>("/scan", file);
 */
export async function uploadFile<T = unknown>(
  endpoint: string,
  file: File,
  extraFields?: Record<string, string>
): Promise<T> {
  const token = authToken.get();
  const form = new FormData();
  form.append("file", file);

  if (extraFields) {
    Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Note: do NOT set Content-Type for FormData — browser sets boundary automatically
    },
    body: form,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: response.statusText }));
    const message = errBody.detail ?? errBody.message ?? "Upload failed";
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export default client;
