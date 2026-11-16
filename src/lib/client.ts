// Tiny client-side fetch helper for calling our JSON API routes.
"use client";

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

// Re-export formatting helpers so client components can import from one place.
export { currency, hhmm, shortDate, dateTime } from "./format";
