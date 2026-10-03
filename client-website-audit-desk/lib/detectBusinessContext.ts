import { BUSINESS_RULES } from "./keywords";
import type { PageSignals } from "./cleanHtml";

/** Returns a business-type key (see MESSAGES.businessTypes). Operator-provided industry always wins upstream. */
export function detectBusinessType(s: PageSignals): string {
  const hay = `${s.title} ${s.metaDescription} ${s.h1.join(" ")} ${s.headings.join(" ")} ${s.text.slice(0, 3000)}`;
  let best: { key: string; hits: number } | null = null;
  for (const rule of BUSINESS_RULES) {
    const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g";
    const hits = (hay.match(new RegExp(rule.pattern.source, flags)) ?? []).length;
    if (hits > (best?.hits ?? 0)) best = { key: rule.key, hits };
  }
  return best && best.hits >= 2 ? best.key : "unknown";
}
