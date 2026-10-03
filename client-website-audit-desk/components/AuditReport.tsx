import type { AuditReport as Report } from "@/lib/schemas";

const List = ({ items }: { items: string[] }) =>
  items.length ? <ul>{items.map((i, n) => <li key={n}>{i}</li>)}</ul> : <p className="muted">—</p>;

export function AuditReport({ report }: { report: Report }) {
  return (
    <section className="card report" aria-label="Raport audytu">
      <h2>Raport audytu</h2>
      {report.warnings.map((w) => (
        <p key={w} className="notice" role="note">{w}</p>
      ))}
      <h3>Podsumowanie</h3><p>{report.executiveSummary}</p>
      <h3>Co firma oferuje</h3><p>{report.whatCompanyOffers}</p>
      <h3>Bariery konwersji</h3><List items={report.conversionBlockers} />
      <h3>SEO i treść</h3><List items={report.seoContentIssues} />
      <h3>Zaufanie</h3><List items={report.trustGaps} />
      <h3>Szybkie poprawki</h3><List items={report.quickWins} />
      <h3>Plan poprawy</h3>
      <ol>{report.improvementPlan.map((p, n) => <li key={n}><b>{p.step}</b> — {p.why}</li>)}</ol>
      <h3>Ograniczenia analizy</h3><List items={report.limitations} />
    </section>
  );
}
