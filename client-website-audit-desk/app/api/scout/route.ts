import { guardRequest, readJson } from "@/lib/guard";
import { ScoutRequestSchema } from "@/lib/schemas";
import { runScoutBot, ScoutError } from "@/lib/scoutBot";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const blocked = guardRequest(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return body.response;

  const parsed = ScoutRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const scout = await runScoutBot(parsed.data);
    return Response.json({ scout });
  } catch (e) {
    if (e instanceof ScoutError) {
      return Response.json(
        { error: e.code, message: e.message, manualFallback: e.manualFallback },
        { status: e.code === "blocked" || e.code === "missing_input" ? 400 : 502 },
      );
    }
    return Response.json({ error: "internal", message: "Unexpected error" }, { status: 500 });
  }
}
