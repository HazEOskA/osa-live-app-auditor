import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { verifyProofBundle } from "@/proof/validator";
import { resolveRunDir } from "../../../_lib/run-registry";

export const runtime = "nodejs";

/**
 * Re-runs the independent validator on demand. This intentionally calls the
 * same standalone verifyProofBundle used by `npm run verify` -- it does not
 * reuse any in-memory result from the audit run itself.
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const runDir = resolveRunDir(runId);
  if (!runDir) {
    return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  }

  const bundlePath = path.join(runDir, "proof-bundle.json");
  if (!existsSync(bundlePath)) {
    return NextResponse.json({ error: "Proof bundle not generated yet for this run." }, { status: 404 });
  }

  const report = await verifyProofBundle(bundlePath);
  return NextResponse.json(report);
}
