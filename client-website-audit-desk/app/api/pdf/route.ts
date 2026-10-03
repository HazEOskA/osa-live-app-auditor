import { guardRequest, readJson } from "@/lib/guard";
import { renderPrintHtml } from "@/lib/pdfExport";
import { AuditReportSchema } from "@/lib/schemas";

export const runtime = "nodejs";

/** Print-ready HTML: the operator saves it as PDF with the browser's print dialog (works on phones too). */
export async function POST(req: Request) {
  const blocked = guardRequest(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (!body.ok) return body.response;

  const parsed = AuditReportSchema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "invalid_input", message: "Invalid report" }, { status: 400 });

  return new Response(renderPrintHtml(parsed.data), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      "cache-control": "no-store",
    },
  });
}
