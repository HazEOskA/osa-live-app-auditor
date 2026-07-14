import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { resolveRunDir } from "../../../_lib/run-registry";

export const runtime = "nodejs";

/**
 * Streams the full run directory (proof bundle + every evidence file) as a
 * zip, so the operator can download one artifact instead of the bare JSON
 * manifest. Shells out to the system `zip` binary with a fixed argv (no
 * shell, no interpolated paths beyond a validated run directory) rather than
 * adding a zip library dependency for one feature.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const runDir = resolveRunDir(runId);
  if (!runDir) {
    return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  }
  if (!existsSync(runDir)) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const child = spawn("zip", ["-r", "-q", "-", "."], { cwd: runDir, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.on("close", (code) => {
    if (code !== 0) console.error(`zip exited with code ${code} for run ${runId}: ${stderr}`);
  });

  const webStream = Readable.toWeb(child.stdout) as ReadableStream;
  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${runId}-evidence-bundle.zip"`,
    },
  });
}
