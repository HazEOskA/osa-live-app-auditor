"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditStatus, Finding, ProofBundle, RunSummary } from "@/shared/types";

const TERMINAL_STATUSES: AuditStatus[] = ["COMPLETED", "FAILED"];

interface RunReport {
  runId: string;
  status: AuditStatus;
  target?: { requestedUrl: string; normalizedUrl: string; host?: string };
  startedAt: string;
  completedAt?: string;
  findingCount: number;
  findings: Finding[];
  error?: string;
  executedChecks?: string[];
  navigation?: { finalUrl: string; title: string };
  discoveredElementCount?: number;
  proofBundle?: ProofBundle;
  hasProofBundle: boolean;
}

interface VerificationReportState {
  valid: boolean;
  errors: string[];
  checkedFiles: number;
}

function statusLabel(status: AuditStatus): string {
  return status.replace(/_/g, " ");
}

function severityClass(severity: string): string {
  return `severity-chip severity-${severity}`;
}

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("");
  const [maxActions, setMaxActions] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [verification, setVerification] = useState<VerificationReportState | null>(null);
  const [verifying, setVerifying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setRuns(data.runs ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRun = useCallback(async (runId: string) => {
    const res = await fetch(`/api/audits/${runId}`);
    if (!res.ok) return;
    const data = (await res.json()) as RunReport;
    setReport(data);
    setVerification(null);
    return data;
  }, []);

  useEffect(() => {
    if (!report) return;
    if (TERMINAL_STATUSES.includes(report.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      fetch("/api/audits")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setRuns(data.runs ?? []);
        })
        .catch(() => undefined);
      return;
    }
    pollRef.current = setInterval(() => {
      loadRun(report.runId);
    }, 1200);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.status, report?.runId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          maxActions: maxActions ? Number(maxActions) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to start audit.");
        return;
      }
      await loadRun(data.runId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to start audit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runVerification() {
    if (!report) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/audits/${report.runId}/verify`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setVerification(data);
    } finally {
      setVerifying(false);
    }
  }

  const isRunning = report ? !TERMINAL_STATUSES.includes(report.status) : false;

  return (
    <div className="page">
      <header className="hero">
        <h1>Osa Live App Auditor</h1>
        <p>
          Point it at a live web application. It opens the page with a real browser, interacts with
          it, and produces a verifiable Proof Bundle of exactly what it checked.
        </p>
      </header>

      <section className="panel">
        <h2>Run an audit</h2>
        <form className="audit-form" onSubmit={handleSubmit}>
          <input
            type="url"
            required
            placeholder="https://example.com"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            disabled={submitting || isRunning}
          />
          <input
            type="number"
            min={1}
            max={50}
            placeholder="max actions"
            value={maxActions}
            onChange={(e) => setMaxActions(e.target.value)}
            disabled={submitting || isRunning}
            title="Maximum number of safe interactive elements to click (default 12)"
          />
          <button type="submit" disabled={submitting || isRunning}>
            {submitting ? "Starting..." : isRunning ? "Audit running..." : "Start audit"}
          </button>
        </form>
        {submitError && <div className="error-banner">{submitError}</div>}

        {report && (
          <div className="status-row">
            <span
              className={`status-pill ${report.status === "COMPLETED" ? "done" : report.status === "FAILED" ? "failed" : ""}`}
            >
              {statusLabel(report.status)}
            </span>
            <span className="empty-state">Run {report.runId}</span>
          </div>
        )}
        {report?.error && <div className="error-banner">{report.error}</div>}
      </section>

      {report && (
        <div className="grid-two">
          <section className="panel">
            <h2>Target &amp; run metadata</h2>
            <ul className="meta-list">
              <li>
                <span>Requested URL</span>
                <span>{report.target?.requestedUrl}</span>
              </li>
              <li>
                <span>Final page URL</span>
                <span>{report.navigation?.finalUrl ?? "-"}</span>
              </li>
              <li>
                <span>Page title</span>
                <span>{report.navigation?.title ?? "-"}</span>
              </li>
              <li>
                <span>Elements discovered</span>
                <span>{report.discoveredElementCount ?? "-"}</span>
              </li>
              <li>
                <span>Executed checks</span>
                <span>{report.executedChecks?.join(", ") ?? "-"}</span>
              </li>
              <li>
                <span>Started</span>
                <span>{report.startedAt}</span>
              </li>
              <li>
                <span>Completed</span>
                <span>{report.completedAt ?? "-"}</span>
              </li>
            </ul>

            <div className="actions-row">
              <a href={`/api/audits/${report.runId}/proof-bundle`} download>
                <button className="secondary" type="button" disabled={!report.hasProofBundle}>
                  Download proof-bundle.json
                </button>
              </a>
              <a href={`/api/audits/${report.runId}/bundle-zip`} download>
                <button className="secondary" type="button" disabled={!report.hasProofBundle}>
                  Download full evidence (.zip)
                </button>
              </a>
              <button type="button" onClick={runVerification} disabled={!report.hasProofBundle || verifying}>
                {verifying ? "Verifying..." : "Run bundle verification"}
              </button>
            </div>

            {verification && (
              <div className={`verification-report ${verification.valid ? "valid" : "invalid"}`}>
                Result: {verification.valid ? "VALID" : "INVALID"}
                {"\n"}Files checked: {verification.checkedFiles}
                {verification.errors.length > 0 && "\n\nProblems:\n" + verification.errors.map((e) => `- ${e}`).join("\n")}
              </div>
            )}

            {report.proofBundle && (
              <ul className="meta-list" style={{ marginTop: "0.75rem" }}>
                <li>
                  <span>Root hash</span>
                  <span>{report.proofBundle.rootHash}</span>
                </li>
                <li>
                  <span>Event stream hash</span>
                  <span>{report.proofBundle.eventStreamHash}</span>
                </li>
                <li>
                  <span>Event count</span>
                  <span>{report.proofBundle.eventCount}</span>
                </li>
                <li>
                  <span>Evidence files</span>
                  <span>{report.proofBundle.evidence.length}</span>
                </li>
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Screenshots</h2>
            {report.hasProofBundle && report.proofBundle ? (
              <div className="screenshot-grid">
                {report.proofBundle.evidence
                  .filter((e) => e.path.startsWith("screenshots/"))
                  .map((e) => (
                    <figure key={e.path} style={{ margin: 0 }}>
                      <a href={`/api/audits/${report.runId}/screenshots/${e.path.replace("screenshots/", "")}`} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic local evidence file, not a next/image-optimizable remote asset */}
                        <img src={`/api/audits/${report.runId}/screenshots/${e.path.replace("screenshots/", "")}`} alt={e.path} />
                      </a>
                      <figcaption>{e.path.replace("screenshots/", "")}</figcaption>
                    </figure>
                  ))}
              </div>
            ) : (
              <p className="empty-state">Screenshots will appear once evidence collection finishes.</p>
            )}
          </section>
        </div>
      )}

      {report && (
        <section className="panel">
          <h2>Findings ({report.findingCount})</h2>
          {report.findings.length === 0 ? (
            <p className="empty-state">
              {isRunning ? "Audit still running..." : "No findings were produced from observed evidence."}
            </p>
          ) : (
            report.findings.map((f) => (
              <div className="finding-card" key={f.id}>
                <div className="finding-head">
                  <span className={severityClass(f.severity)}>{f.severity}</span>
                  <span className="category-tag">{f.category}</span>
                  <strong>{f.title}</strong>
                </div>
                <p>{f.description}</p>
                <p className="empty-state">
                  Page: {f.pageUrl}
                  {f.selector ? ` · Selector: ${f.selector}` : ""}
                </p>
                <div className="repro">
                  Reproduction steps:
                  <ol>
                    {f.reproductionSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <section className="panel">
        <h2>Past runs</h2>
        {runs.length === 0 ? (
          <p className="empty-state">No audits have been run yet.</p>
        ) : (
          <ul className="run-list">
            {runs.map((r) => (
              <li key={r.runId}>
                <button type="button" onClick={() => loadRun(r.runId)}>
                  {r.target.requestedUrl}
                </button>
                <span className="empty-state">
                  {statusLabel(r.status)} · {r.findingCount} findings · {r.startedAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
