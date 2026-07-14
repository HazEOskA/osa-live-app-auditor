import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getLiveRunState, resolveRunDir } from "../../_lib/run-registry";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const runDir = resolveRunDir(runId);
  if (!runDir) {
    return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  }

  const reportPath = path.join(runDir, "audit-report.json");
  const bundlePath = path.join(runDir, "proof-bundle.json");

  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf-8"));
    const proofBundle = existsSync(bundlePath) ? JSON.parse(readFileSync(bundlePath, "utf-8")) : undefined;
    return NextResponse.json({ ...report, proofBundle, hasProofBundle: Boolean(proofBundle) });
  }

  const live = getLiveRunState(runId);
  if (live) {
    return NextResponse.json({
      runId: live.runId,
      target: { requestedUrl: live.targetUrl, normalizedUrl: live.targetUrl },
      status: live.status,
      startedAt: live.startedAt,
      findingCount: 0,
      findings: [],
      hasProofBundle: false,
    });
  }

  return NextResponse.json({ error: "Run not found." }, { status: 404 });
}
