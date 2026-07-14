import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { verifyProofBundle } from "@/proof/validator";
import { cleanupRun, cloneRun, createSampleRun, type SampleRun } from "./helpers";

let baseline: SampleRun;
const clones: SampleRun[] = [];

beforeAll(async () => {
  baseline = await createSampleRun();
});

afterEach(() => {
  for (const clone of clones.splice(0)) cleanupRun(clone);
});

afterAll(() => {
  cleanupRun(baseline);
});

function freshClone(): SampleRun {
  const clone = cloneRun(baseline);
  clones.push(clone);
  return clone;
}

describe("proof bundle tamper detection", () => {
  it("verifies a freshly generated bundle as valid (control case)", async () => {
    const report = await verifyProofBundle(baseline.bundlePath);
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("detects a modified screenshot", async () => {
    const run = freshClone();
    appendFileSync(path.join(run.runDir, "screenshots", "initial.png"), Buffer.from("tampered"));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("modified") && e.includes("initial.png"))).toBe(true);
  });

  it("detects a modified event in events.jsonl", async () => {
    const run = freshClone();
    const eventsPath = path.join(run.runDir, "events.jsonl");
    const original = readFileSync(eventsPath, "utf-8");
    writeFileSync(eventsPath, original.replace("run-completed", "run-completed-TAMPERED"));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("Event stream hash mismatch"))).toBe(true);
  });

  it("detects a modified finding", async () => {
    const run = freshClone();
    const findingsPath = path.join(run.runDir, "findings", "findings.json");
    const findings = JSON.parse(readFileSync(findingsPath, "utf-8"));
    findings[0].severity = "critical";
    writeFileSync(findingsPath, JSON.stringify(findings, null, 2));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("modified") && e.includes("findings.json"))).toBe(true);
  });

  it("detects a missing evidence file", async () => {
    const run = freshClone();
    rmSync(path.join(run.runDir, "screenshots", "initial.png"));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("missing") && e.includes("initial.png"))).toBe(true);
  });

  it("detects changed metadata", async () => {
    const run = freshClone();
    const metaPath = path.join(run.runDir, "metadata", "target.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    meta.host = "attacker-controlled.example";
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("modified") && e.includes("target.json"))).toBe(true);
  });

  it("detects a path-traversal reference injected into the manifest", async () => {
    const run = freshClone();
    const bundle = JSON.parse(readFileSync(run.bundlePath, "utf-8"));
    bundle.evidence.push({
      path: "../../etc/passwd",
      sha256: "a".repeat(64),
      bytes: 0,
      contentType: "text/plain",
    });
    writeFileSync(run.bundlePath, JSON.stringify(bundle, null, 2));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.toLowerCase().includes("unsafe"))).toBe(true);
  });

  it("detects evidence added on disk but absent from the manifest", async () => {
    const run = freshClone();
    writeFileSync(path.join(run.runDir, "screenshots", "smuggled.png"), Buffer.from("extra"));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("not declared in manifest"))).toBe(true);
  });

  it("rejects a malformed bundle (invalid JSON)", async () => {
    const run = freshClone();
    writeFileSync(run.bundlePath, "{ this is not valid json");
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("not valid JSON"))).toBe(true);
  });

  it("rejects a bundle that fails schema validation", async () => {
    const run = freshClone();
    const bundle = JSON.parse(readFileSync(run.bundlePath, "utf-8"));
    delete bundle.rootHash;
    writeFileSync(run.bundlePath, JSON.stringify(bundle, null, 2));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("schema validation"))).toBe(true);
  });

  it("detects an incorrect final root hash", async () => {
    const run = freshClone();
    const bundle = JSON.parse(readFileSync(run.bundlePath, "utf-8"));
    bundle.rootHash = "0".repeat(64);
    writeFileSync(run.bundlePath, JSON.stringify(bundle, null, 2));
    const report = await verifyProofBundle(run.bundlePath);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("Root hash mismatch"))).toBe(true);
  });

  it("reports the bundle as missing entirely when the file does not exist", async () => {
    const report = await verifyProofBundle("/nonexistent/proof-bundle.json");
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.includes("not found"))).toBe(true);
  });
});
