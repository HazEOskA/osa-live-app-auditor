import type { ScoutContext } from "@/lib/schemas";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="kv">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const Tags = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="tags">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  ) : (
    <span className="muted">brak</span>
  );

export function ScoutContextCard({ scout }: { scout: ScoutContext }) {
  return (
    <section className="card" aria-label="Scout Context">
      <h2>Scout Context</h2>
      <dl>
        <Row label="Adres">{scout.url}</Row>
        <Row label="Status pobrania">{scout.fetchStatus}</Row>
        <Row label="Język strony">{scout.detectedLanguage}</Row>
        <Row label="Typ firmy">{scout.businessType}</Row>
        <Row label="Co robi strona">{scout.whatThisSiteDoes}</Row>
        <Row label="Czytelność oferty">{scout.offerClarity}</Row>
        <Row label="Pierwsze wrażenie">{scout.firstImpression}</Row>
        <Row label="CTA"><Tags items={scout.visibleCTA} /></Row>
        <Row label="Kontakt">{scout.contactFound ? "tak" : "nie wykryto"}</Row>
        <Row label="Sygnały zaufania"><Tags items={scout.trustSignals} /></Row>
        <Row label="Oczywiste problemy"><Tags items={scout.obviousProblems} /></Row>
        <Row label="Fokus audytu"><Tags items={scout.recommendedAuditFocus} /></Row>
      </dl>
      <p className="muted small">Ograniczenia: {scout.limitations.join(" ")}</p>
    </section>
  );
}
