import { TRUST_PATTERNS } from "./keywords";
import { MESSAGES } from "./messages";
import type { PageSignals } from "./cleanHtml";
import type { ReportLanguage } from "./schemas";

export function detectTrustSignals(s: PageSignals, lang: ReportLanguage): string[] {
  const hay = `${s.title} ${s.headings.join(" ")} ${s.text}`;
  const keys = TRUST_PATTERNS.filter((t) => t.pattern.test(hay)).map((t) => t.label);
  if (s.structuredDataTypes.some((t) => /Review|AggregateRating/i.test(t))) keys.push("reviewData");
  return [...new Set(keys)].map((k) => MESSAGES[lang].trustLabels[k] ?? k);
}
