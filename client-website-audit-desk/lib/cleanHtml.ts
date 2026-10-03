import * as cheerio from "cheerio";

export interface PageSignals {
  title: string;
  metaDescription: string;
  htmlLang: string;
  h1: string[];
  headings: string[];
  text: string;
  actionLabels: string[];
  hasForm: boolean;
  hasTel: boolean;
  hasMailto: boolean;
  hasContactLink: boolean;
  imageCount: number;
  imagesWithoutAlt: number;
  hasViewport: boolean;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  scriptCount: number;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Extracts the facts ScoutBot needs from untrusted HTML. Never executes anything; output is plain strings. */
export function cleanHtml(html: string): PageSignals {
  const $ = cheerio.load(html);

  const scriptCount = $("script").length;
  const structuredDataTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    for (const m of raw.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) structuredDataTypes.push(m[1]);
  });

  $("script, style, noscript, template, svg, iframe").remove();

  const title = clean($("title").first().text());
  const metaDescription = clean($('meta[name="description"]').attr("content") ?? "");
  const htmlLang = ($("html").attr("lang") ?? "").trim().toLowerCase();

  const h1 = $("h1")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 5);
  const headings = $("h2, h3")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((t) => t && t.length <= 200)
    .slice(0, 20);

  const actionLabels = $("a, button, input[type=submit], input[type=button]")
    .map((_, el) => {
      const t = clean($(el).text() || $(el).attr("value") || $(el).attr("aria-label") || "");
      return t;
    })
    .get()
    .filter((t) => t.length > 0 && t.length <= 60);

  const hrefs = $("a[href]")
    .map((_, el) => ($(el).attr("href") ?? "").toLowerCase())
    .get();
  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => !($(el).attr("alt") ?? "").trim()).length;

  const text = clean($("body").text() || $.root().text());

  return {
    title,
    metaDescription,
    htmlLang,
    h1,
    headings,
    text,
    actionLabels: [...new Set(actionLabels)].slice(0, 80),
    hasForm: $("form").length > 0,
    hasTel: hrefs.some((h) => h.startsWith("tel:")) || /(\+\d{2}[\s-]?)?(\d[\s-]?){9,}/.test(text),
    hasMailto: hrefs.some((h) => h.startsWith("mailto:")) || /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text),
    hasContactLink: hrefs.some((h) => /kontakt|contact/.test(h)),
    imageCount: images.length,
    imagesWithoutAlt,
    hasViewport: $('meta[name="viewport"]').length > 0,
    hasStructuredData: structuredDataTypes.length > 0,
    structuredDataTypes: [...new Set(structuredDataTypes)],
    scriptCount,
  };
}

/** Converts a manually pasted text/HTML blob into signals (fallback when automatic fetch fails). */
export function signalsFromManualInput(input: { html?: string; text?: string }): PageSignals {
  if (input.html && /<[a-z][\s\S]*>/i.test(input.html)) return cleanHtml(input.html);
  return cleanHtml(`<html><body><p>${escapeHtml(input.text ?? input.html ?? "")}</p></body></html>`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
