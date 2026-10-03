import { AuditReportSchema, type AuditReport } from "./schemas";

export const HISTORY_KEY = "cwad.history.v1";
export const MAX_HISTORY = 50;

/** Minimal subset of the Web Storage API so the logic is testable without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Reads history; corrupt entries are dropped instead of crashing the UI. Storage may be unavailable (private mode). */
export function loadHistory(store: KeyValueStore | null): AuditReport[] {
  if (!store) return [];
  try {
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.flatMap((x) => {
      const p = AuditReportSchema.safeParse(x);
      return p.success ? [p.data] : [];
    });
  } catch {
    return [];
  }
}

const CHANGE_EVENT = "cwad:history";

function notify(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore: fires on same-tab writes and cross-tab storage events. */
export function subscribeHistory(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Raw serialized history; a stable string snapshot for useSyncExternalStore. */
export function readHistoryRaw(): string {
  try {
    return getBrowserStore()?.getItem(HISTORY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseHistory(raw: string): AuditReport[] {
  return loadHistory({ getItem: () => raw || null, setItem: () => {}, removeItem: () => {} });
}

function write(store: KeyValueStore, list: AuditReport[]): boolean {
  try {
    store.setItem(HISTORY_KEY, JSON.stringify(list));
    notify();
    return true;
  } catch {
    return false;
  }
}

export function saveAudit(store: KeyValueStore | null, report: AuditReport): boolean {
  if (!store) return false;
  const next = [report, ...loadHistory(store).filter((r) => r.id !== report.id)].slice(0, MAX_HISTORY);
  return write(store, next);
}

export function deleteAudit(store: KeyValueStore | null, id: string): boolean {
  if (!store) return false;
  return write(store, loadHistory(store).filter((r) => r.id !== id));
}

export function clearHistory(store: KeyValueStore | null): void {
  try {
    store?.removeItem(HISTORY_KEY);
    notify();
  } catch {
    /* ignore */
  }
}

export function getBrowserStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
