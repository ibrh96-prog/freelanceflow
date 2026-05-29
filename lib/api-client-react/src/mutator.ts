export const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");

export type ErrorType<Error> = Error;

export const customInstance = async <T>(
  config: {
    url: string;
    method: string;
    params?: Record<string, string | number | boolean | undefined>;
    data?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
  options?: RequestInit,
): Promise<T> => {
  const url = new URL(config.url, API_BASE_URL);
  if (config.params) {
    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method: config.method,
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: config.data ? JSON.stringify(config.data) : undefined,
    signal: config.signal,
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ??
        `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export default customInstance;
