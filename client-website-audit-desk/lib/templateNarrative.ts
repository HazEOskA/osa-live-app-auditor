import type { Narrative, OperatorInput, ReportLanguage, ScoutContext } from "./schemas";

/** Manual input has no real URL; do not print the placeholder in a client-facing message. */
const urlPart = (url: string) => (/^https?:\/\//.test(url) ? ` (${url})` : "");

interface Ctx {
  scout: ScoutContext;
  score: number;
  who: string;
}

const T: Record<
  ReportLanguage,
  {
    summary: (c: Ctx) => string;
    offers: (c: Ctx) => string;
    blockers: { noCta: string; vague: string; noContact: string; generic: string };
    seo: { noMeta: string; noH1: string; noTitle: string; thin: string; alt: string };
    trust: { none: string; some: (s: string) => string };
    wins: string[];
    plan: { step: string; why: string }[];
    message: (c: Ctx) => string;
  }
> = {
  pl: {
    summary: ({ scout, score, who }) =>
      `${who}: strona uzyskała ${score}/100 w naszej rubryce (oferta, CTA, kontakt, zaufanie, podstawy SEO). ${scout.firstImpression} Największy potencjał leży w: ${scout.recommendedAuditFocus.slice(0, 3).join(", ")}.`,
    offers: ({ scout }) => scout.whatThisSiteDoes,
    blockers: {
      noCta: "Brak wyraźnego wezwania do działania — odwiedzający nie wie, jaki jest następny krok.",
      vague: "Nagłówki i opisy nie mówią konkretnie, co klient dostaje i dlaczego warto wybrać tę firmę.",
      noContact: "Trudno znaleźć sposób kontaktu (telefon, e-mail, formularz).",
      generic: "Na stronie głównej nie wykryto elementów, które wyraźnie blokują konwersję — warto potwierdzić to testem na prawdziwych użytkownikach.",
    },
    seo: {
      noMeta: "Brak meta description — warto dodać zwięzły opis oferty (ok. 140–160 znaków).",
      noH1: "Brak nagłówka H1 opisującego główną ofertę.",
      noTitle: "Tytuł strony jest pusty lub zbyt krótki.",
      thin: "Mało treści tekstowej na stronie głównej — wyszukiwarki i klienci dostają mało informacji.",
      alt: "Wiele obrazów nie ma opisu alternatywnego (alt).",
    },
    trust: {
      none: "Nie wykryto opinii klientów, realizacji ani certyfikatów — to najprostsza luka do uzupełnienia.",
      some: (s) => `Wykryte sygnały zaufania: ${s}. Warto wyeksponować je wyżej na stronie i dodać konkretne liczby lub nazwy.`,
    },
    wins: [
      "Napisać nagłówek H1 w formule: co oferujemy + dla kogo + główna korzyść.",
      "Dodać jeden wyróżniony przycisk CTA (np. „Poproś o wycenę”) widoczny bez przewijania.",
      "Umieścić telefon i e-mail w nagłówku oraz w stopce.",
      "Dodać 3 krótkie opinie klientów lub zdjęcia realizacji z opisem.",
    ],
    plan: [
      { step: "Doprecyzować ofertę w nagłówku i pierwszym ekranie", why: "Odwiedzający decyduje w kilka sekund, czy jest we właściwym miejscu." },
      { step: "Ujednolicić CTA i ułatwić kontakt", why: "Każda strona powinna prowadzić do jednego, jasnego następnego kroku." },
      { step: "Dodać dowody zaufania (opinie, realizacje, liczby)", why: "Nowy klient potrzebuje potwierdzenia, że firma dowozi obietnice." },
      { step: "Uzupełnić podstawy SEO (title, meta description, H1, alt)", why: "To tani sposób na lepszą widoczność i lepsze fragmenty w wyszukiwarce." },
    ],
    message: ({ scout, who }) =>
      `Dzień dobry,\n\nprzejrzałem(-am) stronę ${who}${urlPart(scout.url)} i zauważyłem(-am) kilka konkretnych rzeczy, które mogą pomóc w pozyskiwaniu zapytań: ${scout.obviousProblems.slice(0, 3).join("; ") || "szczegóły w raporcie"}.\n\nPrzygotowałem(-am) krótki raport z rekomendacjami (oparty wyłącznie na publicznie widocznej stronie głównej). Chętnie omówię go w 15-minutowej rozmowie — kiedy byłoby wygodnie?\n\nPozdrawiam,\n[Imię i nazwisko]`,
  },
  en: {
    summary: ({ scout, score, who }) =>
      `${who}: the site scored ${score}/100 on our rubric (offer, CTAs, contact, trust, SEO basics). ${scout.firstImpression} The biggest potential is in: ${scout.recommendedAuditFocus.slice(0, 3).join(", ")}.`,
    offers: ({ scout }) => scout.whatThisSiteDoes,
    blockers: {
      noCta: "No clear call to action — a visitor does not know the next step.",
      vague: "Headings and descriptions do not say what the customer gets and why to choose this company.",
      noContact: "It is hard to find a way to get in touch (phone, email, form).",
      generic: "No elements that clearly block conversion were detected on the homepage — worth confirming with real-user testing.",
    },
    seo: {
      noMeta: "Missing meta description — add a concise summary of the offer (about 140–160 characters).",
      noH1: "No H1 headline describing the main offer.",
      noTitle: "The page title is empty or too short.",
      thin: "Little text content on the homepage — search engines and customers get little information.",
      alt: "Many images have no alternative text (alt).",
    },
    trust: {
      none: "No customer reviews, case studies or certificates were detected — the easiest gap to close.",
      some: (s) => `Trust signals detected: ${s}. Make them more prominent and add concrete numbers or names.`,
    },
    wins: [
      "Write an H1 in the formula: what we offer + for whom + main benefit.",
      "Add one highlighted CTA button (e.g. “Request a quote”) visible without scrolling.",
      "Put phone and email in the header and the footer.",
      "Add 3 short customer reviews or captioned project photos.",
    ],
    plan: [
      { step: "Sharpen the offer in the headline and first screen", why: "Visitors decide within seconds whether they are in the right place." },
      { step: "Unify CTAs and make contact easy", why: "Every page should lead to one clear next step." },
      { step: "Add proof of trust (reviews, projects, numbers)", why: "New customers need evidence that the company delivers." },
      { step: "Complete the SEO basics (title, meta description, H1, alt)", why: "A cheap way to improve visibility and search snippets." },
    ],
    message: ({ scout, who }) =>
      `Hello,\n\nI reviewed ${who}'s website${urlPart(scout.url)} and noticed a few concrete things that could help generate more enquiries: ${scout.obviousProblems.slice(0, 3).join("; ") || "details in the report"}.\n\nI prepared a short report with recommendations (based only on the publicly visible homepage). I would be glad to walk you through it in a 15-minute call — when would suit you?\n\nBest regards,\n[Your name]`,
  },
  nl: {
    summary: ({ scout, score, who }) =>
      `${who}: de site scoort ${score}/100 op onze rubriek (aanbod, CTA's, contact, vertrouwen, SEO-basis). ${scout.firstImpression} Het meeste potentieel zit in: ${scout.recommendedAuditFocus.slice(0, 3).join(", ")}.`,
    offers: ({ scout }) => scout.whatThisSiteDoes,
    blockers: {
      noCta: "Geen duidelijke call-to-action — de bezoeker weet niet wat de volgende stap is.",
      vague: "Koppen en beschrijvingen zeggen niet concreet wat de klant krijgt en waarom hij dit bedrijf moet kiezen.",
      noContact: "Het is moeilijk om contact op te nemen (telefoon, e-mail, formulier).",
      generic: "Er zijn op de homepage geen elementen gevonden die conversie duidelijk blokkeren — bevestig dit met gebruikerstests.",
    },
    seo: {
      noMeta: "Geen meta description — voeg een korte samenvatting van het aanbod toe (circa 140–160 tekens).",
      noH1: "Geen H1-kop die het hoofdaanbod beschrijft.",
      noTitle: "De paginatitel is leeg of te kort.",
      thin: "Weinig tekst op de homepage — zoekmachines en klanten krijgen weinig informatie.",
      alt: "Veel afbeeldingen hebben geen alternatieve tekst (alt).",
    },
    trust: {
      none: "Geen klantreviews, referenties of certificaten gevonden — de makkelijkste lacune om te dichten.",
      some: (s) => `Gevonden vertrouwenssignalen: ${s}. Maak ze zichtbaarder en voeg concrete cijfers of namen toe.`,
    },
    wins: [
      "Schrijf een H1 volgens de formule: wat we bieden + voor wie + belangrijkste voordeel.",
      "Voeg één opvallende CTA-knop toe (bijv. “Offerte aanvragen”) zonder scrollen zichtbaar.",
      "Zet telefoon en e-mail in de header en de footer.",
      "Voeg 3 korte klantreviews of projectfoto's met bijschrift toe.",
    ],
    plan: [
      { step: "Het aanbod scherper maken in de kop en het eerste scherm", why: "Bezoekers beslissen binnen seconden of ze op de juiste plek zijn." },
      { step: "CTA's uniform maken en contact makkelijk maken", why: "Elke pagina moet naar één duidelijke volgende stap leiden." },
      { step: "Bewijs van vertrouwen toevoegen (reviews, projecten, cijfers)", why: "Nieuwe klanten willen zien dat het bedrijf levert." },
      { step: "SEO-basis aanvullen (title, meta description, H1, alt)", why: "Een goedkope manier om zichtbaarheid en zoekresultaten te verbeteren." },
    ],
    message: ({ scout, who }) =>
      `Goedendag,\n\nik heb de website van ${who}${urlPart(scout.url)} bekeken en een paar concrete punten gezien die kunnen helpen om meer aanvragen te krijgen: ${scout.obviousProblems.slice(0, 3).join("; ") || "details in het rapport"}.\n\nIk heb een kort rapport met aanbevelingen gemaakt (alleen gebaseerd op de openbaar zichtbare homepage). Ik loop het graag door in een gesprek van 15 minuten — wanneer komt het u uit?\n\nMet vriendelijke groet,\n[Uw naam]`,
  },
};

/** Deterministic narrative used when no API key is configured or the AI call fails. */
export function buildTemplateNarrative(
  scout: ScoutContext,
  score: number,
  input: Pick<OperatorInput, "companyName" | "language">,
): Narrative {
  const lang = input.language ?? "pl";
  const t = T[lang];
  const who = input.companyName?.trim() || scout.page.title || scout.url;
  const c: Ctx = { scout, score, who };

  const blockers: string[] = [];
  if (scout.visibleCTA.length === 0) blockers.push(t.blockers.noCta);
  if (scout.offerClarity === "low") blockers.push(t.blockers.vague);
  if (!scout.contactFound) blockers.push(t.blockers.noContact);
  if (blockers.length === 0) blockers.push(t.blockers.generic);

  const seo: string[] = [];
  if (!scout.page.metaDescription) seo.push(t.seo.noMeta);
  if (scout.page.h1.length === 0) seo.push(t.seo.noH1);
  if (scout.page.title.length < 10) seo.push(t.seo.noTitle);
  if (scout.page.textLength < 400) seo.push(t.seo.thin);

  return {
    executiveSummary: t.summary(c),
    whatCompanyOffers: t.offers(c),
    conversionBlockers: blockers,
    seoContentIssues: seo,
    trustGaps: [scout.trustSignals.length === 0 ? t.trust.none : t.trust.some(scout.trustSignals.join(", "))],
    quickWins: t.wins,
    improvementPlan: t.plan,
    clientMessage: t.message(c),
  };
}
