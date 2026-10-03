import type { ReportLanguage, ScoutContext } from "./schemas";

export interface ScoreItem {
  key: string;
  label: string;
  points: number;
  max: number;
}

const LABELS: Record<ReportLanguage, Record<string, string>> = {
  pl: { offer: "Czytelność oferty", cta: "Wezwania do działania", contact: "Kontakt", trust: "Zaufanie", seo: "Podstawy SEO", mobile: "Telefon (viewport)", depth: "Ilość treści" },
  en: { offer: "Offer clarity", cta: "Calls to action", contact: "Contact", trust: "Trust", seo: "SEO basics", mobile: "Mobile (viewport)", depth: "Content depth" },
  nl: { offer: "Duidelijkheid aanbod", cta: "Calls-to-action", contact: "Contact", trust: "Vertrouwen", seo: "SEO-basis", mobile: "Mobiel (viewport)", depth: "Hoeveelheid inhoud" },
};

/**
 * Deterministic 0-100 rubric computed ONLY from the Scout Context.
 * Same context => same score. The AI writes the narrative, it never changes the number.
 */
export function computeScore(scout: ScoutContext, lang: ReportLanguage): { score: number; breakdown: ScoreItem[] } {
  const L = LABELS[lang];
  const p = scout.page;

  const offer = { low: 6, medium: 15, high: 25 }[scout.offerClarity];
  const cta = scout.visibleCTA.length === 0 ? 0 : scout.visibleCTA.length === 1 ? 12 : 20;
  const contact = scout.contactFound ? 15 : 0;
  const trust = scout.trustSignals.length === 0 ? 0 : scout.trustSignals.length === 1 ? 8 : scout.trustSignals.length === 2 ? 14 : 20;
  const seo =
    (p.title.length >= 10 ? 3 : 0) +
    (p.metaDescription.length >= 50 ? 3 : 0) +
    (p.h1.length > 0 ? 3 : 0) +
    (p.headings.length >= 3 ? 2 : 0) +
    (p.hasStructuredData ? 1 : 0);

  const items: ScoreItem[] = [
    { key: "offer", label: L.offer, points: offer, max: 25 },
    { key: "cta", label: L.cta, points: cta, max: 20 },
    { key: "contact", label: L.contact, points: contact, max: 15 },
    { key: "trust", label: L.trust, points: trust, max: 20 },
    { key: "seo", label: L.seo, points: seo, max: 12 },
    { key: "mobile", label: L.mobile, points: p.hasViewport ? 4 : 0, max: 4 },
    { key: "depth", label: L.depth, points: p.textLength >= 800 ? 4 : p.textLength >= 400 ? 2 : 0, max: 4 },
  ];
  const score = Math.max(0, Math.min(100, items.reduce((a, i) => a + i.points, 0)));
  return { score, breakdown: items };
}
