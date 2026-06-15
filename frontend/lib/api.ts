import { logger } from "./logger";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { token, ...fetchOptions } = options;

  logger.debug("API", `→ ${fetchOptions.method ?? "GET"} ${path}`);

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    logger.error("API", `← ${res.status} ${path}`, { error: data.error });
    throw new APIError(res.status, data.error?.code, data.error?.message, data.error?.details);
  }

  logger.debug("API", `← ${res.status} ${path}`, { meta: data.meta });
  return data;
}

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: object
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function buildQueryString(filters: Record<string, unknown>, page: number, perPage: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(perPage));

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (typeof value === "boolean") {
      if (value) params.set(key, "true");
    } else {
      params.set(key, String(value));
    }
  });

  return params.toString();
}