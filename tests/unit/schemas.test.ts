import { describe, expect, it } from "vitest";
import { findingSchema, proofBundleSchema } from "@/proof/schemas";
import type { Finding } from "@/shared/types";

const validFinding: Finding = {
  id: "run-1-f001",
  category: "dead-control",
  severity: "medium",
  title: "Interactive control produced no observable effect",
  description: "Clicked but nothing happened.",
  pageUrl: "http://example.com",
  selector: "#dead-button",
  reproductionSteps: ["Open the page", "Click #dead-button"],
  evidenceRefs: ["screenshots/action-1-before.png"],
  timestamp: new Date().toISOString(),
  confidence: 0.85,
  checkId: "dead-control-check",
};

describe("findingSchema", () => {
  it("accepts a well-formed finding", () => {
    expect(findingSchema.safeParse(validFinding).success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = findingSchema.safeParse({ ...validFinding, category: "made-up-category" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown severity", () => {
    const result = findingSchema.safeParse({ ...validFinding, severity: "catastrophic" });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside [0,1]", () => {
    expect(findingSchema.safeParse({ ...validFinding, confidence: 1.5 }).success).toBe(false);
    expect(findingSchema.safeParse({ ...validFinding, confidence: -0.1 }).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const withoutTitle: Record<string, unknown> = { ...validFinding };
    delete withoutTitle.title;
    expect(findingSchema.safeParse(withoutTitle).success).toBe(false);
  });
});

describe("proofBundleSchema", () => {
  it("rejects a bundle with a malformed hash", () => {
    const bundle = {
      schemaVersion: "1.0.0",
      runId: "run-1",
      target: { requestedUrl: "http://x", normalizedUrl: "http://x", host: "x", protocol: "http:" },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: "COMPLETED",
      environment: { node: "v22", playwright: "1.56.1", os: "linux", arch: "x64", mode: "demo" },
      executedChecks: [],
      eventCount: 0,
      findingCount: 0,
      evidence: [],
      eventStreamHash: "not-a-hash",
      rootHash: "not-a-hash",
      verification: { instructions: "x", command: "npm run verify -- x" },
    };
    expect(proofBundleSchema.safeParse(bundle).success).toBe(false);
  });
});
