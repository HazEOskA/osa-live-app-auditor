import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import playwrightPackageJson from "playwright/package.json" with { type: "json" };
import { validateTarget } from "./target-validator";
import { runBrowserSession } from "./browser-worker";
import { buildFindings, ALL_CHECK_IDS } from "./findings/build-findings";
import { EventLog } from "./event-log";
import { generateRunId } from "./run-id";
import { buildProofBundle } from "@/proof/bundle-builder";
import { verifyProofBundle, type VerificationReport } from "@/proof/validator";
import { AuditError } from "@/shared/errors";
import type {
  AuditStatus,
  BrowserSessionResult,
  EnvironmentInfo,
  Finding,
  ProofBundle,
  TargetInfo,
} from "@/shared/types";

export interface AuditRunOptions {
  targetUrl: string;
  /** Supply to let a caller (e.g. the API layer) know the run ID before the run finishes. */
  runId?: string;
  maxActions?: number;
  maxDeadLinkChecks?: number;
  perActionTimeoutMs?: number;
  navigationTimeoutMs?: number;
  totalRunTimeoutMs?: number;
  artifactsRoot?: string;
  onStatusChange?: (status: AuditStatus, runId: string) => void;
}

export interface AuditRunResult {
  runId: string;
  runDir: string;
  status: AuditStatus;
  target?: TargetInfo;
  startedAt: string;
  completedAt: string;
  findings: Finding[];
  proofBundle?: ProofBundle;
  verification?: VerificationReport;
  error?: string;
}

const DEFAULTS = {
  maxActions: 12,
  maxDeadLinkChecks: 10,
  perActionTimeoutMs: 8000,
  navigationTimeoutMs: 20000,
  totalRunTimeoutMs: 90000,
};

function getEnvironmentInfo(): EnvironmentInfo {
  return {
    node: process.version,
    playwright: playwrightPackageJson.version,
    os: process.platform,
    arch: process.arch,
    mode: "demo",
  };
}

function ensureRunDirectories(runDir: string): { screenshotsDir: string } {
  const screenshotsDir = path.join(runDir, "screenshots");
  mkdirSync(runDir, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(path.join(runDir, "logs"), { recursive: true });
  mkdirSync(path.join(runDir, "findings"), { recursive: true });
  mkdirSync(path.join(runDir, "metadata"), { recursive: true });
  return { screenshotsDir };
}

function writeEmptyEvidence(runDir: string): void {
  writeFileSync(path.join(runDir, "logs", "console.json"), "[]\n", "utf-8");
  writeFileSync(path.join(runDir, "logs", "network.json"), JSON.stringify({ failedRequests: [], httpErrors: [], deadLinkChecks: [] }, null, 2), "utf-8");
  writeFileSync(path.join(runDir, "logs", "runtime.json"), "[]\n", "utf-8");
}

export async function runAudit(options: AuditRunOptions): Promise<AuditRunResult> {
  const config = { ...DEFAULTS, ...options };
  const runId = options.runId ?? generateRunId();
  const artifactsRoot = options.artifactsRoot ?? path.join(process.cwd(), "artifacts", "runs");
  const runDir = path.join(artifactsRoot, runId);
  const { screenshotsDir } = ensureRunDirectories(runDir);

  const eventLog = new EventLog(path.join(runDir, "events.jsonl"));
  const startedAt = new Date().toISOString();
  const environment = getEnvironmentInfo();

  // Persists to events.jsonl, which is itself hashed evidence inside the proof
  // bundle. Only used up through the point evidence/findings are written to
  // disk; anything after that would grow the file post-hash and break
  // self-verification.
  const setStatus = (next: AuditStatus) => {
    eventLog.append("status-changed", { status: next });
    options.onStatusChange?.(next, runId);
  };
  // Used once the event log is frozen ahead of proof-bundle generation: still
  // drives live UI/CLI updates, but does not touch events.jsonl.
  const setLiveStatus = (next: AuditStatus) => {
    options.onStatusChange?.(next, runId);
  };

  eventLog.append("run-started", { runId, targetUrl: options.targetUrl, startedAt });

  let target: TargetInfo | undefined;
  let session: BrowserSessionResult | undefined;
  let findings: Finding[] = [];
  let runError: string | undefined;

  setStatus("VALIDATING_TARGET");
  try {
    target = validateTarget(options.targetUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    runError = message;
    findings = [
      {
        id: `${runId}-f001`,
        category: "audit-system-error",
        severity: "critical",
        title: "Target rejected before audit could start",
        description: message,
        pageUrl: options.targetUrl,
        reproductionSteps: ["Submit the same URL to the auditor."],
        evidenceRefs: ["events.jsonl"],
        timestamp: new Date().toISOString(),
        confidence: 1,
        checkId: "target-validation-check",
      },
    ];
    writeEmptyEvidence(runDir);
    return finalizeFailedRun({
      runId,
      runDir,
      startedAt,
      environment,
      findings,
      runError,
      eventLog,
      setLiveStatus,
      target: {
        requestedUrl: options.targetUrl,
        normalizedUrl: options.targetUrl,
        host: "unknown",
        protocol: "unknown",
      },
    });
  }

  setStatus("STARTING_BROWSER");
  const runDeadlineAt = Date.now() + config.totalRunTimeoutMs;

  try {
    session = await runBrowserSession({
      targetUrl: target.normalizedUrl,
      runDir,
      screenshotsDir,
      maxActions: config.maxActions,
      maxDeadLinkChecks: config.maxDeadLinkChecks,
      perActionTimeoutMs: config.perActionTimeoutMs,
      navigationTimeoutMs: config.navigationTimeoutMs,
      runDeadlineAt,
      onEvent: (type, data) => eventLog.append(type, data),
      onStatus: (s) => setStatus(s),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    runError = message;
    const category = err instanceof AuditError && err.code === "NAVIGATION_FAILED" ? "navigation-failure" : "audit-system-error";
    findings = [
      {
        id: `${runId}-f001`,
        category,
        severity: "critical",
        title: category === "navigation-failure" ? "Target could not be opened" : "Audit run failed unexpectedly",
        description: message,
        pageUrl: target.normalizedUrl,
        reproductionSteps: [`Open ${target.normalizedUrl}`],
        evidenceRefs: ["events.jsonl"],
        timestamp: new Date().toISOString(),
        confidence: 1,
        checkId: "browser-session-check",
      },
    ];
    writeEmptyEvidence(runDir);
    return finalizeFailedRun({ runId, runDir, startedAt, environment, findings, runError, eventLog, setLiveStatus, target });
  }

  setStatus("COLLECTING_EVIDENCE");
  writeFileSync(path.join(runDir, "logs", "console.json"), JSON.stringify(session.consoleMessages, null, 2), "utf-8");
  writeFileSync(
    path.join(runDir, "logs", "network.json"),
    JSON.stringify(
      { failedRequests: session.failedRequests, httpErrors: session.httpErrors, deadLinkChecks: session.deadLinkChecks },
      null,
      2,
    ),
    "utf-8",
  );
  writeFileSync(path.join(runDir, "logs", "runtime.json"), JSON.stringify(session.pageErrors, null, 2), "utf-8");
  writeFileSync(path.join(runDir, "metadata", "target.json"), JSON.stringify(target, null, 2), "utf-8");
  writeFileSync(path.join(runDir, "metadata", "environment.json"), JSON.stringify(environment, null, 2), "utf-8");

  findings = buildFindings(runId, session);
  for (const finding of findings) {
    eventLog.append("finding-created", { id: finding.id, category: finding.category, severity: finding.severity });
  }
  writeFileSync(path.join(runDir, "findings", "findings.json"), JSON.stringify(findings, null, 2), "utf-8");

  const completedAt = new Date().toISOString();
  const executedChecks = [...ALL_CHECK_IDS, "dead-link-request-check", "broken-image-scan"];
  writeFileSync(
    path.join(runDir, "audit-report.json"),
    JSON.stringify(
      {
        runId,
        target,
        status: "COMPLETED" satisfies AuditStatus,
        startedAt,
        completedAt,
        navigation: session.navigation,
        executedChecks,
        discoveredElementCount: session.discoveredElements.length,
        actionsSummary: {
          dispatched: session.actionResults.filter((a) => a.dispatched).length,
          skipped: session.actionResults.filter((a) => !a.dispatched).length,
          truncatedByLimit: session.truncatedByLimit,
        },
        findingCount: findings.length,
        findings,
      },
      null,
      2,
    ),
    "utf-8",
  );

  // Freeze the event log before it becomes hashed evidence: this must be the
  // last write to events.jsonl for this run.
  eventLog.append("run-completed", { findingCount: findings.length });

  setLiveStatus("GENERATING_PROOF");
  const proofBundle = await buildProofBundle({
    runDir,
    runId,
    target,
    startedAt,
    completedAt,
    status: "COMPLETED",
    environment,
    executedChecks,
    findingCount: findings.length,
  });

  setLiveStatus("VERIFYING");
  const verification = await verifyProofBundle(path.join(runDir, "proof-bundle.json"));

  const finalStatus: AuditStatus = verification.valid ? "COMPLETED" : "FAILED";
  setLiveStatus(finalStatus);

  return {
    runId,
    runDir,
    status: finalStatus,
    target,
    startedAt,
    completedAt,
    findings,
    proofBundle,
    verification,
    error: verification.valid ? undefined : `Self-verification failed: ${verification.errors.join("; ")}`,
  };
}

interface FinalizeFailedRunParams {
  runId: string;
  runDir: string;
  startedAt: string;
  environment: EnvironmentInfo;
  findings: Finding[];
  runError: string;
  eventLog: EventLog;
  setLiveStatus: (status: AuditStatus) => void;
  target: TargetInfo;
}

async function finalizeFailedRun(params: FinalizeFailedRunParams): Promise<AuditRunResult> {
  const completedAt = new Date().toISOString();
  writeFileSync(path.join(params.runDir, "findings", "findings.json"), JSON.stringify(params.findings, null, 2), "utf-8");
  writeFileSync(path.join(params.runDir, "metadata", "target.json"), JSON.stringify(params.target, null, 2), "utf-8");
  writeFileSync(path.join(params.runDir, "metadata", "environment.json"), JSON.stringify(params.environment, null, 2), "utf-8");
  writeFileSync(
    path.join(params.runDir, "audit-report.json"),
    JSON.stringify(
      {
        runId: params.runId,
        target: params.target,
        status: "FAILED",
        startedAt: params.startedAt,
        completedAt,
        error: params.runError,
        findingCount: params.findings.length,
        findings: params.findings,
      },
      null,
      2,
    ),
    "utf-8",
  );

  // Freeze the event log before it becomes hashed evidence.
  params.eventLog.append("run-failed", { error: params.runError });

  const proofBundle = await buildProofBundle({
    runDir: params.runDir,
    runId: params.runId,
    target: params.target,
    startedAt: params.startedAt,
    completedAt,
    status: "FAILED",
    environment: params.environment,
    executedChecks: [],
    findingCount: params.findings.length,
  });

  const verification = await verifyProofBundle(path.join(params.runDir, "proof-bundle.json"));
  params.setLiveStatus("FAILED");

  return {
    runId: params.runId,
    runDir: params.runDir,
    status: "FAILED",
    target: params.target,
    startedAt: params.startedAt,
    completedAt,
    findings: params.findings,
    proofBundle,
    verification,
    error: params.runError,
  };
}
