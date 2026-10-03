import { GENERIC_H1, OFFER_WORDS } from "./keywords";
import type { PageSignals } from "./cleanHtml";

export type OfferClarity = "low" | "medium" | "high";

/** Heuristic 0..6 point rubric; deliberately simple and explainable. */
export function detectOfferClarity(s: PageSignals): OfferClarity {
  let points = 0;
  const h1 = s.h1[0] ?? "";
  if (h1.length >= 15 && h1.length <= 120 && !GENERIC_H1.test(h1)) points += 2;
  else if (h1.length > 0) points += 1;
  if (s.metaDescription.length >= 50) points += 1;
  if (s.headings.length >= 3) points += 1;
  if (OFFER_WORDS.test(`${s.h1.join(" ")} ${s.headings.join(" ")} ${s.metaDescription}`)) points += 1;
  if (s.text.length >= 800) points += 1;
  return points >= 5 ? "high" : points >= 3 ? "medium" : "low";
}
