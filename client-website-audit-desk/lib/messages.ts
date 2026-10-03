import type { ReportLanguage } from "./schemas";

/** Fixed, deterministic strings used by ScoutBot and the template fallback. */
export interface Messages {
  problems: {
    noH1: string;
    noMeta: string;
    noCta: string;
    noContact: string;
    noTrust: string;
    thinContent: string;
    noViewport: string;
    imagesNoAlt: string;
    noTitle: string;
    vagueOffer: string;
  };
  focus: {
    offer: string;
    conversion: string;
    trust: string;
    seo: string;
    contact: string;
    mobile: string;
    message: string;
  };
  impression: { high: string; medium: string; low: string };
  doesPrefix: string;
  doesUnknown: string;
  limitations: {
    homepageOnly: string;
    manual: string;
    thin: string;
    truncated: string;
    fetchFailed: string;
  };
  businessTypes: Record<string, string>;
  trustLabels: Record<string, string>;
}

export const MESSAGES: Record<ReportLanguage, Messages> = {
  pl: {
    problems: {
      noH1: "Brak wyraźnego nagłówka H1 opisującego ofertę",
      noMeta: "Brak meta description (opis w wynikach wyszukiwania)",
      noCta: "Nie wykryto czytelnego wezwania do działania (CTA)",
      noContact: "Nie wykryto danych kontaktowych (telefon, e-mail, formularz)",
      noTrust: "Nie wykryto sygnałów zaufania (opinie, realizacje, certyfikaty)",
      thinContent: "Bardzo mało treści tekstowej na stronie głównej",
      noViewport: "Brak meta viewport — strona może źle wyglądać na telefonie",
      imagesNoAlt: "Wiele obrazów bez opisu alternatywnego (alt)",
      noTitle: "Brak lub zbyt krótki tytuł strony (title)",
      vagueOffer: "Oferta jest mało konkretna w nagłówkach i opisach",
    },
    focus: {
      offer: "czytelność oferty",
      conversion: "konwersja i CTA",
      trust: "zaufanie i wiarygodność",
      seo: "podstawy SEO i treść",
      contact: "łatwość kontaktu",
      mobile: "użyteczność na telefonie",
      message: "wiadomość sprzedażowa",
    },
    impression: {
      high: "Strona wygląda na przemyślaną, a oferta jest dość czytelna.",
      medium: "Strona wygląda poprawnie, ale oferta jest mało konkretna.",
      low: "Z pierwszego wejścia trudno zrozumieć, co dokładnie firma oferuje.",
    },
    doesPrefix: "Strona komunikuje:",
    doesUnknown: "Nie udało się jednoznacznie ustalić, czym zajmuje się firma.",
    limitations: {
      homepageOnly:
        "Analiza dotyczy wyłącznie kodu HTML strony głównej: bez podstron, bez pomiaru wydajności i bez treści ładowanych skryptami.",
      manual: "Dane pochodzą z ręcznie wklejonej treści, nie z pobrania strony.",
      thin: "Pobrany HTML zawiera mało treści — strona może być renderowana w przeglądarce (JS) i wyniki są niepełne.",
      truncated: "Strona była bardzo duża — przeanalizowano tylko początek dokumentu.",
      fetchFailed: "Nie udało się pobrać strony automatycznie.",
    },
    businessTypes: {
      construction: "firma remontowo-budowlana",
      food: "gastronomia",
      ecommerce: "sklep internetowy",
      software: "oprogramowanie / SaaS / IT",
      legal_finance: "usługi prawne lub finansowe",
      health: "zdrowie i medycyna",
      beauty: "beauty i wellness",
      education: "edukacja i szkolenia",
      real_estate: "nieruchomości",
      automotive: "motoryzacja",
      marketing: "agencja marketingowa / kreatywna",
      local_service: "lokalna firma usługowa",
      unknown: "branża nieustalona",
    },
    trustLabels: { reviews: "opinie klientów", portfolio: "realizacje / portfolio", certificates: "certyfikaty / gwarancje", experience: "doświadczenie / lata na rynku", clients: "logotypy klientów / partnerzy", reviewData: "dane strukturalne opinii" },
  },
  en: {
    problems: {
      noH1: "No clear H1 headline describing the offer",
      noMeta: "Missing meta description (search result snippet)",
      noCta: "No clear call to action (CTA) detected",
      noContact: "No contact details detected (phone, email, form)",
      noTrust: "No trust signals detected (reviews, case studies, certificates)",
      thinContent: "Very little text content on the homepage",
      noViewport: "Missing meta viewport — the page may render poorly on phones",
      imagesNoAlt: "Many images without alternative text (alt)",
      noTitle: "Missing or too short page title",
      vagueOffer: "The offer is vague in headings and descriptions",
    },
    focus: {
      offer: "offer clarity",
      conversion: "conversion and CTAs",
      trust: "trust and credibility",
      seo: "SEO basics and content",
      contact: "ease of contact",
      mobile: "mobile usability",
      message: "sales message",
    },
    impression: {
      high: "The site looks considered and the offer is fairly clear.",
      medium: "The site looks fine, but the offer is not very specific.",
      low: "On first visit it is hard to tell what the company actually offers.",
    },
    doesPrefix: "The site communicates:",
    doesUnknown: "It was not possible to determine clearly what the company does.",
    limitations: {
      homepageOnly:
        "The analysis covers the homepage HTML only: no subpages, no performance measurement and no script-rendered content.",
      manual: "Data comes from manually pasted content, not from fetching the site.",
      thin: "The fetched HTML has little content — the site may be rendered in the browser (JS) and results are incomplete.",
      truncated: "The page was very large — only the beginning of the document was analysed.",
      fetchFailed: "The site could not be fetched automatically.",
    },
    businessTypes: {
      construction: "construction / renovation company",
      food: "food and hospitality",
      ecommerce: "online store",
      software: "software / SaaS / IT",
      legal_finance: "legal or financial services",
      health: "health and medical",
      beauty: "beauty and wellness",
      education: "education and training",
      real_estate: "real estate",
      automotive: "automotive",
      marketing: "marketing / creative agency",
      local_service: "local service business",
      unknown: "industry not determined",
    },
    trustLabels: { reviews: "customer reviews", portfolio: "portfolio / case studies", certificates: "certificates / guarantees", experience: "experience / track record", clients: "client logos / partners", reviewData: "structured review data" },
  },
  nl: {
    problems: {
      noH1: "Geen duidelijke H1-kop die het aanbod beschrijft",
      noMeta: "Geen meta description (tekst in zoekresultaten)",
      noCta: "Geen duidelijke call-to-action (CTA) gevonden",
      noContact: "Geen contactgegevens gevonden (telefoon, e-mail, formulier)",
      noTrust: "Geen vertrouwenssignalen gevonden (reviews, referenties, certificaten)",
      thinContent: "Zeer weinig tekstinhoud op de homepage",
      noViewport: "Geen meta viewport — de pagina ziet er mogelijk slecht uit op mobiel",
      imagesNoAlt: "Veel afbeeldingen zonder alternatieve tekst (alt)",
      noTitle: "Paginatitel ontbreekt of is te kort",
      vagueOffer: "Het aanbod is vaag in koppen en beschrijvingen",
    },
    focus: {
      offer: "duidelijkheid van het aanbod",
      conversion: "conversie en CTA's",
      trust: "vertrouwen en geloofwaardigheid",
      seo: "SEO-basis en inhoud",
      contact: "gemak van contact",
      mobile: "gebruik op mobiel",
      message: "verkoopboodschap",
    },
    impression: {
      high: "De site oogt doordacht en het aanbod is vrij duidelijk.",
      medium: "De site ziet er prima uit, maar het aanbod is weinig concreet.",
      low: "Bij het eerste bezoek is moeilijk te zien wat het bedrijf precies aanbiedt.",
    },
    doesPrefix: "De site communiceert:",
    doesUnknown: "Het was niet mogelijk om duidelijk vast te stellen wat het bedrijf doet.",
    limitations: {
      homepageOnly:
        "De analyse betreft alleen de HTML van de homepage: geen subpagina's, geen prestatiemeting en geen door scripts geladen inhoud.",
      manual: "De gegevens komen uit handmatig geplakte inhoud, niet uit het ophalen van de site.",
      thin: "De opgehaalde HTML bevat weinig inhoud — de site wordt mogelijk in de browser (JS) opgebouwd en de resultaten zijn onvolledig.",
      truncated: "De pagina was erg groot — alleen het begin van het document is geanalyseerd.",
      fetchFailed: "De site kon niet automatisch worden opgehaald.",
    },
    businessTypes: {
      construction: "bouw- en renovatiebedrijf",
      food: "horeca",
      ecommerce: "webshop",
      software: "software / SaaS / IT",
      legal_finance: "juridische of financiële dienstverlening",
      health: "gezondheid en zorg",
      beauty: "beauty en wellness",
      education: "onderwijs en training",
      real_estate: "vastgoed",
      automotive: "automotive",
      marketing: "marketing- / creatief bureau",
      local_service: "lokaal dienstverlenend bedrijf",
      unknown: "branche niet vastgesteld",
    },
    trustLabels: { reviews: "klantbeoordelingen", portfolio: "projecten / portfolio", certificates: "certificaten / garanties", experience: "ervaring / jaren in bedrijf", clients: "klantlogo's / partners", reviewData: "gestructureerde reviewdata" },
  },
};
