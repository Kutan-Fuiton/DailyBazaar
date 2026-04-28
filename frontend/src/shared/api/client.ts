const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Lightweight fetch wrapper with JSON defaults.
 *
 * Usage:
 *   const items = await client<Item[]>("/items");
 *   await client("/items", { method: "POST", body: { name: "Rice" } });
 */
export async function client<T = unknown>(
  endpoint: string,
  { body, headers, ...rest }: RequestOptions = {}
): Promise<T> {
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? "Something went wrong");
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export default client;
