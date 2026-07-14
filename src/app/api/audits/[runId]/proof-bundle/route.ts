import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveRunDir } from "../../../_lib/run-registry";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const runDir = resolveRunDir(runId);
  if (!runDir) {
    return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  }

  const bundlePath = path.join(runDir, "proof-bundle.json");
  if (!existsSync(bundlePath)) {
    return NextResponse.json({ error: "Proof bundle not available yet." }, { status: 404 });
  }

  const contents = readFileSync(bundlePath, "utf-8");
  return new NextResponse(contents, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${runId}-proof-bundle.json"`,
    },
  });
}
