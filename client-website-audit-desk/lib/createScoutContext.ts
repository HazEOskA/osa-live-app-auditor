import type { PageSignals } from "./cleanHtml";
import { detectBusinessType } from "./detectBusinessContext";
import { detectLanguage } from "./detectLanguage";
import { detectOfferClarity } from "./detectOfferClarity";
import { detectTrustSignals } from "./detectTrustSignals";
import { describeFirstImpression, detectContact, detectCtas, extractObviousProblems } from "./extractFirstImpression";
import { MESSAGES } from "./messages";
import type { ReportLanguage, ScoutContext } from "./schemas";

export interface CreateScoutInput {
  url: string;
  signals: PageSignals;
  language: ReportLanguage;
  industry?: string;
  fetchMode: "fetched" | "manual";
  truncated?: boolean;
}

const THIN_TEXT_THRESHOLD = 300;

export function createScoutContext(input: CreateScoutInput): ScoutContext {
  const { signals: s, language } = input;
  const m = MESSAGES[language];

  const clarity = detectOfferClarity(s);
  const ctas = detectCtas(s);
  const contact = detectContact(s);
  const trust = detectTrustSignals(s, language);
  const problems = extractObviousProblems(s, { clarity, ctas, contact, trust }, language);

  const thin = s.text.length < THIN_TEXT_THRESHOLD && s.scriptCount >= 3;
  const limitations = [m.limitations.homepageOnly];
  if (input.fetchMode === "manual") limitations.push(m.limitations.manual);
  if (thin) limitations.push(m.limitations.thin);
  if (input.truncated) limitations.push(m.limitations.truncated);

  const focus: string[] = [];
  if (clarity !== "high") focus.push(m.focus.offer);
  if (ctas.length === 0 || clarity === "low") focus.push(m.focus.conversion);
  if (trust.length === 0) focus.push(m.focus.trust);
  if (!s.metaDescription || s.h1.length === 0) focus.push(m.focus.seo);
  if (!contact) focus.push(m.focus.contact);
  if (!s.hasViewport) focus.push(m.focus.mobile);
  focus.push(m.focus.message);

  const claim = s.h1[0] || s.title;
  const detail = s.metaDescription;
  const whatThisSiteDoes = claim
    ? `${m.doesPrefix} "${claim}"${detail ? ` — ${detail}` : ""}`.slice(0, 600)
    : m.doesUnknown;

  const businessKey = input.industry?.trim() ? null : detectBusinessType(s);

  return {
    url: input.url,
    fetchStatus: input.fetchMode === "manual" ? "manual" : thin ? "thin" : "ok",
    detectedLanguage: detectLanguage(s.htmlLang, s.text),
    businessType: input.industry?.trim() || m.businessTypes[businessKey ?? "unknown"],
    whatThisSiteDoes,
    offerClarity: clarity,
    firstImpression: describeFirstImpression(clarity, language),
    visibleCTA: ctas,
    contactFound: contact,
    trustSignals: trust,
    obviousProblems: problems,
    recommendedAuditFocus: focus,
    limitations,
    page: {
      title: s.title.slice(0, 300),
      metaDescription: s.metaDescription.slice(0, 500),
      h1: s.h1.map((x) => x.slice(0, 300)),
      headings: s.headings.map((x) => x.slice(0, 300)),
      textLength: s.text.length,
      textExcerpt: s.text.slice(0, 6000),
      hasStructuredData: s.hasStructuredData,
      hasViewport: s.hasViewport,
    },
  };
}
