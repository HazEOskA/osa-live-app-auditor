import type { AuditReport, ReportLanguage } from "./schemas";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const H: Record<ReportLanguage, Record<string, string>> = {
  pl: { title: "Audyt strony", score: "Wynik", summary: "Podsumowanie", offers: "Co firma oferuje", blockers: "Bariery konwersji", seo: "SEO i treść", trust: "Zaufanie", wins: "Szybkie poprawki", plan: "Plan poprawy", message: "Wiadomość do klienta", limits: "Ograniczenia analizy", breakdown: "Składowe wyniku", print: "Drukuj / zapisz jako PDF" },
  en: { title: "Website audit", score: "Score", summary: "Executive summary", offers: "What the company offers", blockers: "Conversion blockers", seo: "SEO and content", trust: "Trust", wins: "Quick wins", plan: "Improvement plan", message: "Client message", limits: "Limits of this analysis", breakdown: "Score breakdown", print: "Print / save as PDF" },
  nl: { title: "Website-audit", score: "Score", summary: "Samenvatting", offers: "Wat het bedrijf biedt", blockers: "Conversieknelpunten", seo: "SEO en inhoud", trust: "Vertrouwen", wins: "Quick wins", plan: "Verbeterplan", message: "Bericht aan klant", limits: "Beperkingen van deze analyse", breakdown: "Opbouw van de score", print: "Afdrukken / opslaan als PDF" },
};

const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "");

/** Standalone, print-optimised HTML. All dynamic text is escaped; page-derived content never becomes markup. */
export function renderPrintHtml(r: AuditReport, opts: { autoPrint?: boolean } = {}): string {
  const h = H[r.language];
  const name = r.companyName || r.scout.page.title || r.url;
  return `<!doctype html>
<html lang="${r.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(h.title)} — ${esc(name)}</title>
<style>
  body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:22px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
  .meta{color:#555;font-size:12px} .score{font-size:44px;font-weight:700;margin:8px 0}
  table{border-collapse:collapse;width:100%} td{padding:3px 6px;border-bottom:1px solid #eee}
  pre{white-space:pre-wrap;font:inherit;background:#f6f6f6;padding:10px;border-radius:6px}
  button{padding:8px 14px;font-size:14px;margin-bottom:12px} @media print{button{display:none} body{margin:0}}
</style></head><body>
<button onclick="window.print()">${esc(h.print)}</button>
<h1>${esc(h.title)}: ${esc(name)}</h1>
<div class="meta">${esc(r.url)} · ${esc(r.createdAt.slice(0, 10))}</div>
<div class="score">${r.score}/100</div>
<h2>${esc(h.summary)}</h2><p>${esc(r.executiveSummary)}</p>
<h2>${esc(h.offers)}</h2><p>${esc(r.whatCompanyOffers)}</p>
<h2>${esc(h.blockers)}</h2>${list(r.conversionBlockers)}
<h2>${esc(h.seo)}</h2>${list(r.seoContentIssues)}
<h2>${esc(h.trust)}</h2>${list(r.trustGaps)}
<h2>${esc(h.wins)}</h2>${list(r.quickWins)}
<h2>${esc(h.plan)}</h2><ol>${r.improvementPlan.map((p) => `<li><strong>${esc(p.step)}</strong> — ${esc(p.why)}</li>`).join("")}</ol>
<h2>${esc(h.breakdown)}</h2><table>${r.scoreBreakdown.map((b) => `<tr><td>${esc(b.label)}</td><td>${b.points}/${b.max}</td></tr>`).join("")}</table>
<h2>${esc(h.message)}</h2><pre>${esc(r.clientMessage)}</pre>
<h2>${esc(h.limits)}</h2>${list(r.limitations)}
${opts.autoPrint ? "<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)})</script>" : ""}
</body></html>`;
}
