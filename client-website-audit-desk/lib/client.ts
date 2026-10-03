"use client";

const PW_KEY = "cwad.pw";

export function getPassword(): string {
  try {
    return sessionStorage.getItem(PW_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPassword(v: string): void {
  try {
    sessionStorage.setItem(PW_KEY, v);
  } catch {
    /* ignore */
  }
}

export interface ApiError {
  error: string;
  message: string;
  manualFallback?: boolean;
}

export async function postJson<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-password": getPassword() },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data ?? { error: "http_" + res.status, message: `HTTP ${res.status}` } };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: { error: "network", message: "Brak połączenia z serwerem." } };
  }
}
