import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runAudit } from "@/audit/orchestrator";
import { startFixtureServer, type FixtureServer } from "../fixtures/server";

describe("full audit run against the local fixture app", () => {
  let server: FixtureServer;
  let artifactsRoot: string;

  beforeAll(async () => {
    server = await startFixtureServer(0);
    artifactsRoot = mkdtempSync(path.join(tmpdir(), "audit-integration-"));
  });

  afterAll(async () => {
    await server.close();
    rmSync(artifactsRoot, { recursive: true, force: true });
  });

  it(
    "produces evidence-backed findings for every fixture defect and a valid proof bundle",
    async () => {
      const result = await runAudit({
        targetUrl: server.url,
        artifactsRoot,
        maxActions: 10,
        navigationTimeoutMs: 15000,
        totalRunTimeoutMs: 60000,
      });

      expect(result.status).toBe("COMPLETED");
      expect(result.error).toBeUndefined();
      expect(result.verification?.valid).toBe(true);
      expect(result.verification?.errors).toEqual([]);

      const categories = result.findings.map((f) => f.category);
      expect(categories).toContain("console-error");
      expect(categories).toContain("failed-request");
      expect(categories).toContain("http-error");
      expect(categories).toContain("broken-image");
      expect(categories).toContain("dead-link");
      expect(categories).toContain("dead-control");

      const deadControl = result.findings.find((f) => f.category === "dead-control");
      expect(deadControl?.selector).toBe("#dead-button");

      // The working button must NOT be flagged as dead: its click produces a real DOM effect.
      const workingButtonFlagged = result.findings.some(
        (f) => f.category === "dead-control" && f.selector === "#working-button",
      );
      expect(workingButtonFlagged).toBe(false);

      // Every finding must reference collected evidence, never be fabricated from nothing.
      for (const finding of result.findings) {
        expect(finding.evidenceRefs.length).toBeGreaterThan(0);
      }

      expect(existsSync(path.join(result.runDir, "screenshots", "initial.png"))).toBe(true);
      expect(existsSync(path.join(result.runDir, "proof-bundle.json"))).toBe(true);
      expect(existsSync(path.join(result.runDir, "findings", "findings.json"))).toBe(true);
      expect(existsSync(path.join(result.runDir, "events.jsonl"))).toBe(true);

      expect(result.proofBundle?.findingCount).toBe(result.findings.length);
      expect(result.proofBundle?.evidence.length).toBeGreaterThan(0);
    },
    30000,
  );

  it("rejects a disallowed protocol before opening a browser", async () => {
    const result = await runAudit({
      targetUrl: "file:///etc/passwd",
      artifactsRoot,
    });

    expect(result.status).toBe("FAILED");
    expect(result.findings[0]?.category).toBe("audit-system-error");
    expect(result.verification?.valid).toBe(true); // the failure bundle itself is still internally consistent
  }, 15000);
});
