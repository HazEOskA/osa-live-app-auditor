import { runAuditEngine } from "@/lib/auditEngine";
import { guardRequest, readJson } from "@/lib/guard";
import { AuditRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guardRequest(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return body.response;

  const parsed = AuditRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const report = await runAuditEngine(parsed.data);
    return Response.json({ report });
  } catch {
    return Response.json({ error: "internal", message: "Audit generation failed" }, { status: 500 });
  }
}
