import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { resolveWithinRoot, UnsafePathError } from "@/proof/safe-path";
import { resolveRunDir } from "../../../../_lib/run-registry";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ runId: string; file: string[] }> },
) {
  const { runId, file } = await context.params;
  const runDir = resolveRunDir(runId);
  if (!runDir) {
    return NextResponse.json({ error: "Invalid run ID." }, { status: 400 });
  }

  const relativePath = ["screenshots", ...file].join("/");
  let absolutePath: string;
  try {
    absolutePath = resolveWithinRoot(runDir, relativePath);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return NextResponse.json({ error: "Invalid screenshot path." }, { status: 400 });
    }
    throw err;
  }

  if (!existsSync(absolutePath)) {
    return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });
  }

  const data = readFileSync(absolutePath);
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
