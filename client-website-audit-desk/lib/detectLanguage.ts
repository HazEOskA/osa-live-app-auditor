import { STOPWORDS } from "./keywords";

export type DetectedLanguage = "pl" | "en" | "nl" | "unknown";

/** Uses the declared <html lang> when valid, otherwise a simple stopword vote on visible text. */
export function detectLanguage(htmlLang: string, text: string): DetectedLanguage {
  const declared = htmlLang.slice(0, 2);
  if (declared === "pl" || declared === "en" || declared === "nl") return declared;

  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  if (words.length < 20) return "unknown";
  const scores = { pl: 0, en: 0, nl: 0 };
  for (const lang of ["pl", "en", "nl"] as const) {
    const set = new Set(STOPWORDS[lang]);
    scores[lang] = words.filter((w) => set.has(w)).length;
  }
  if (/[ąćęłńóśźż]/i.test(text)) scores.pl += 5;
  const best = (Object.entries(scores) as [keyof typeof scores, number][]).sort((a, b) => b[1] - a[1]);
  return best[0][1] >= 3 && best[0][1] > best[1][1] ? best[0][0] : "unknown";
}
