import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guardRequest, resetRateLimit } from "@/lib/guard";
import { renderPrintHtml } from "@/lib/pdfExport";
import { runAuditEngine } from "@/lib/auditEngine";
import { clearHistory, deleteAudit, HISTORY_KEY, loadHistory, MAX_HISTORY, saveAudit, type KeyValueStore } from "@/lib/storage";
import type { AuditReport } from "@/lib/schemas";
import { scoutFrom } from "./helpers";

const mem = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

const makeReport = async (id: string, extra: Partial<AuditReport> = {}): Promise<AuditReport> => ({
  ...(await runAuditEngine({ scout: scoutFrom("pl-service.html"), language: "pl" }, { client: null, makeId: () => id })),
  ...extra,
});

describe("storage", () => {
  it("saves newest first, dedupes by id, caps the size and deletes", async () => {
    const store = mem();
    expect(saveAudit(store, await makeReport("a"))).toBe(true);
    saveAudit(store, await makeReport("b"));
    saveAudit(store, await makeReport("a"));
    expect(loadHistory(store).map((r) => r.id)).toEqual(["a", "b"]);
    deleteAudit(store, "a");
    expect(loadHistory(store).map((r) => r.id)).toEqual(["b"]);
    for (let i = 0; i < MAX_HISTORY + 5; i++) saveAudit(store, await makeReport("r" + i));
    expect(loadHistory(store)).toHaveLength(MAX_HISTORY);
    clearHistory(store);
    expect(loadHistory(store)).toEqual([]);
  });

  it("survives corrupt data, missing storage and write failures", async () => {
    const store = mem();
    store.setItem(HISTORY_KEY, "{not json");
    expect(loadHistory(store)).toEqual([]);
    store.setItem(HISTORY_KEY, JSON.stringify([{ id: "x" }, await makeReport("ok")]));
    expect(loadHistory(store).map((r) => r.id)).toEqual(["ok"]);
    expect(loadHistory(null)).toEqual([]);
    expect(saveAudit(null, await makeReport("n"))).toBe(false);
    const full: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => {} };
    expect(saveAudit(full, await makeReport("q"))).toBe(false);
  });
});

describe("pdf export", () => {
  it("escapes every dynamic field", async () => {
    const evil = '<script>alert(1)</script>"\'&';
    const r = await makeReport("p", { companyName: evil, clientMessage: evil, executiveSummary: evil, url: evil });
    const html = renderPrintHtml(r);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain(`${r.score}/100`);
  });

  it("only auto-prints when asked", async () => {
    const r = await makeReport("p");
    expect(renderPrintHtml(r)).not.toContain("<script>");
    expect(renderPrintHtml(r, { autoPrint: true })).toContain("window.print()");
  });
});

describe("guard", () => {
  const env = { ...process.env };
  beforeEach(() => { resetRateLimit(); delete process.env.ACCESS_PASSWORD; delete process.env.ALLOW_OPEN_ACCESS; });
  afterEach(() => { process.env = { ...env }; });
  const req = (headers: Record<string, string> = {}) => new Request("http://x/api", { method: "POST", headers });

  it("fails closed when no password is configured", async () => {
    const res = guardRequest(req());
    expect(res?.status).toBe(503);
  });

  it("allows open access only when explicitly enabled", () => {
    process.env.ALLOW_OPEN_ACCESS = "true";
    expect(guardRequest(req())).toBeNull();
  });

  it("checks the password", () => {
    process.env.ACCESS_PASSWORD = "s3cret";
    expect(guardRequest(req())?.status).toBe(401);
    expect(guardRequest(req({ "x-access-password": "nope" }))?.status).toBe(401);
    expect(guardRequest(req({ "x-access-password": "s3cret" }))).toBeNull();
  });

  it("rate limits per ip, including failed attempts", () => {
    process.env.ACCESS_PASSWORD = "s3cret";
    const h = { "x-forwarded-for": "1.2.3.4" };
    let last: Response | null = null;
    for (let i = 0; i < 31; i++) last = guardRequest(req(h), 1_000 + i);
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBeTruthy();
    expect(guardRequest(req({ "x-forwarded-for": "5.6.7.8", "x-access-password": "s3cret" }), 1_000)).toBeNull();
  });

  it("rejects oversized bodies", () => {
    process.env.ALLOW_OPEN_ACCESS = "true";
    expect(guardRequest(req({ "content-length": "9999999" }))?.status).toBe(413);
  });
});
