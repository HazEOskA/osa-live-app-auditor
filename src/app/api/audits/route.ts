import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { runAudit } from "@/audit/orchestrator";
import { generateRunId } from "@/audit/run-id";
import { AuditError } from "@/shared/errors";
import type { RunSummary } from "@/shared/types";
import { ARTIFACTS_ROOT, listLiveRuns, setLiveRunState } from "../_lib/run-registry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const targetUrl = (body as { targetUrl?: unknown })?.targetUrl;
  if (typeof targetUrl !== "string" || targetUrl.trim().length === 0) {
    return NextResponse.json({ error: "targetUrl is required." }, { status: 400 });
  }

  const maxActionsRaw = (body as { maxActions?: unknown })?.maxActions;
  const maxActions = typeof maxActionsRaw === "number" && Number.isFinite(maxActionsRaw) ? maxActionsRaw : undefined;

  const runId = generateRunId();
  const startedAt = new Date().toISOString();
  setLiveRunState({ runId, status: "IDLE", targetUrl, startedAt });

  runAudit({
    targetUrl,
    runId,
    maxActions,
    artifactsRoot: ARTIFACTS_ROOT,
    onStatusChange: (status) => {
      setLiveRunState({ runId, status, targetUrl, startedAt });
    },
  }).catch((err) => {
    const message = err instanceof AuditError ? err.message : "Audit crashed unexpectedly.";
    setLiveRunState({ runId, status: "FAILED", targetUrl, startedAt });
    console.error(`[audit ${runId}] crashed:`, message, err);
  });

  return NextResponse.json({ runId }, { status: 202 });
}

export async function GET() {
  const summaries: RunSummary[] = [];
  const seen = new Set<string>();

  if (existsSync(ARTIFACTS_ROOT)) {
    for (const entry of readdirSync(ARTIFACTS_ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const reportPath = path.join(ARTIFACTS_ROOT, entry.name, "audit-report.json");
      if (!existsSync(reportPath)) continue;
      try {
        const report = JSON.parse(readFileSync(reportPath, "utf-8"));
        summaries.push({
          runId: report.runId,
          target: report.target,
          status: report.status,
          startedAt: report.startedAt,
          completedAt: report.completedAt,
          findingCount: report.findingCount ?? 0,
          error: report.error,
        });
        seen.add(report.runId);
      } catch {
        /* skip unreadable report */
      }
    }
  }

  for (const live of listLiveRuns()) {
    if (seen.has(live.runId)) continue;
    summaries.push({
      runId: live.runId,
      target: { requestedUrl: live.targetUrl, normalizedUrl: live.targetUrl, host: "", protocol: "" },
      status: live.status,
      startedAt: live.startedAt,
      findingCount: 0,
    });
  }

  summaries.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return NextResponse.json({ runs: summaries });
}
