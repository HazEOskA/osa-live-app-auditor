import { mkdirSync, mkdtempSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildProofBundle } from "@/proof/bundle-builder";
import type { EnvironmentInfo, TargetInfo } from "@/shared/types";

const TARGET: TargetInfo = {
  requestedUrl: "http://example.test",
  normalizedUrl: "http://example.test/",
  host: "example.test",
  protocol: "http:",
};

const ENVIRONMENT: EnvironmentInfo = {
  node: process.version,
  playwright: "1.56.1",
  os: process.platform,
  arch: process.arch,
  mode: "demo",
};

// A minimal, valid 1x1 PNG so evidence files are real bytes, not empty stubs.
const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

export interface SampleRun {
  runDir: string;
  bundlePath: string;
}

/**
 * Builds a small, self-consistent run directory + proof bundle directly
 * (bypassing the browser) so tamper tests can target the bundle/validator
 * contract in isolation and quickly.
 */
export async function createSampleRun(): Promise<SampleRun> {
  const runDir = mkdtempSync(path.join(tmpdir(), "tamper-run-"));
  const runId = path.basename(runDir);

  mkdirSync(path.join(runDir, "screenshots"), { recursive: true });
  mkdirSync(path.join(runDir, "logs"), { recursive: true });
  mkdirSync(path.join(runDir, "findings"), { recursive: true });
  mkdirSync(path.join(runDir, "metadata"), { recursive: true });

  writeFileSync(path.join(runDir, "screenshots", "initial.png"), SAMPLE_PNG);
  writeFileSync(path.join(runDir, "logs", "console.json"), "[]\n", "utf-8");
  writeFileSync(
    path.join(runDir, "logs", "network.json"),
    JSON.stringify({ failedRequests: [], httpErrors: [], deadLinkChecks: [] }, null, 2),
    "utf-8",
  );
  writeFileSync(path.join(runDir, "logs", "runtime.json"), "[]\n", "utf-8");
  writeFileSync(path.join(runDir, "metadata", "target.json"), JSON.stringify(TARGET, null, 2), "utf-8");
  writeFileSync(path.join(runDir, "metadata", "environment.json"), JSON.stringify(ENVIRONMENT, null, 2), "utf-8");

  const findings = [
    {
      id: `${runId}-f001`,
      category: "dead-control",
      severity: "medium",
      title: "Interactive control produced no observable effect",
      description: "Clicked but nothing happened.",
      pageUrl: TARGET.normalizedUrl,
      selector: "#dead-button",
      reproductionSteps: ["Open the page", "Click #dead-button"],
      evidenceRefs: ["screenshots/initial.png"],
      timestamp: new Date().toISOString(),
      confidence: 0.9,
      checkId: "dead-control-check",
    },
  ];
  writeFileSync(path.join(runDir, "findings", "findings.json"), JSON.stringify(findings, null, 2), "utf-8");

  const events = [
    { seq: 0, timestamp: new Date().toISOString(), type: "run-started", data: { runId } },
    { seq: 1, timestamp: new Date().toISOString(), type: "run-completed", data: { findingCount: 1 } },
  ];
  writeFileSync(path.join(runDir, "events.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf-8");

  const startedAt = new Date().toISOString();
  const completedAt = new Date().toISOString();
  writeFileSync(
    path.join(runDir, "audit-report.json"),
    JSON.stringify(
      { runId, target: TARGET, status: "COMPLETED", startedAt, completedAt, findingCount: 1, findings },
      null,
      2,
    ),
    "utf-8",
  );

  await buildProofBundle({
    runDir,
    runId,
    target: TARGET,
    startedAt,
    completedAt,
    status: "COMPLETED",
    environment: ENVIRONMENT,
    executedChecks: ["dead-control-check"],
    findingCount: 1,
  });

  return { runDir, bundlePath: path.join(runDir, "proof-bundle.json") };
}

/** Copies a sample run to a fresh temp directory so each test can tamper independently. */
export function cloneRun(sample: SampleRun): SampleRun {
  const clonedDir = mkdtempSync(path.join(tmpdir(), "tamper-run-clone-"));
  cpSync(sample.runDir, clonedDir, { recursive: true });
  return { runDir: clonedDir, bundlePath: path.join(clonedDir, "proof-bundle.json") };
}

export function cleanupRun(run: SampleRun): void {
  rmSync(run.runDir, { recursive: true, force: true });
}
