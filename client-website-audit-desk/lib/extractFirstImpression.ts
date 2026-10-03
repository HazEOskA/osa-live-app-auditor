import { CTA_PATTERNS } from "./keywords";
import { MESSAGES } from "./messages";
import type { PageSignals } from "./cleanHtml";
import type { OfferClarity } from "./detectOfferClarity";
import type { ReportLanguage } from "./schemas";

export function detectCtas(s: PageSignals): string[] {
  const out = s.actionLabels.filter((label) => CTA_PATTERNS.some((p) => p.test(label)));
  return [...new Set(out)].slice(0, 8);
}

export function detectContact(s: PageSignals): boolean {
  return s.hasForm || s.hasTel || s.hasMailto || s.hasContactLink;
}

export function extractObviousProblems(
  s: PageSignals,
  ctx: { clarity: OfferClarity; ctas: string[]; contact: boolean; trust: string[] },
  lang: ReportLanguage,
): string[] {
  const p = MESSAGES[lang].problems;
  const out: string[] = [];
  if (s.title.length < 10) out.push(p.noTitle);
  if (s.h1.length === 0) out.push(p.noH1);
  if (!s.metaDescription) out.push(p.noMeta);
  if (ctx.ctas.length === 0) out.push(p.noCta);
  if (!ctx.contact) out.push(p.noContact);
  if (ctx.trust.length === 0) out.push(p.noTrust);
  if (s.text.length < 400) out.push(p.thinContent);
  if (!s.hasViewport) out.push(p.noViewport);
  if (s.imageCount >= 4 && s.imagesWithoutAlt / s.imageCount > 0.5) out.push(p.imagesNoAlt);
  if (ctx.clarity === "low" && s.h1.length > 0) out.push(p.vagueOffer);
  return out;
}

export function describeFirstImpression(clarity: OfferClarity, lang: ReportLanguage): string {
  return MESSAGES[lang].impression[clarity];
}
