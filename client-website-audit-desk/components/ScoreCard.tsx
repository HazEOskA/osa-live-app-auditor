import type { AuditReport } from "@/lib/schemas";

export function ScoreCard({ report }: { report: AuditReport }) {
  const tone = report.score >= 70 ? "good" : report.score >= 40 ? "mid" : "bad";
  return (
    <section className="card score" aria-label="Wynik strony">
      <div className={`score-num ${tone}`} data-testid="score">{report.score}<span>/100</span></div>
      <ul className="bars">
        {report.scoreBreakdown.map((b) => (
          <li key={b.key}>
            <span>{b.label}</span>
            <progress max={b.max} value={b.points} aria-label={b.label} />
            <b>{b.points}/{b.max}</b>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Źródło treści: {report.source === "ai" ? `AI (${report.model})` : "szablon (bez AI)"} · wynik liczony deterministycznie z Scout Context
      </p>
    </section>
  );
}
