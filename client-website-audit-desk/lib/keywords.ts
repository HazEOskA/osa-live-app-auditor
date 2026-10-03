/** Keyword lists (pl / en / nl). All matching is case-insensitive on visible text. */

export const CTA_PATTERNS: RegExp[] = [
  /kontakt|zadzwoń|zadzwon|napisz do nas|wycen|bezpłatn|bezplatn|umów|umow|zamów|zamow|kup\b|kup teraz|zapisz|sprawdź ofert|sprawdz ofert|zarezerwuj|rezerwacj|dowiedz się|zobacz ofert/i,
  /contact|get a quote|request a|book\b|book a|buy\b|buy now|sign up|get started|start (free|now)|free trial|demo\b|call us|learn more|order now|subscribe/i,
  /contact|offerte|boek\b|boeken|bestel|koop\b|aanvragen|gratis|bel ons|afspraak|aanmelden|meer informatie|probeer/i,
];

export const TRUST_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "reviews", pattern: /opinie|recenzj|referencj|testimonial|reviews?\b|ervaringen|beoordelingen|klantverhalen|\b[45][.,]\d\s?\/\s?5\b/i },
  { label: "portfolio", pattern: /realizacj|portfolio|case stud|nasze prace|our work|projecten|onze projecten|referenties/i },
  { label: "certificates", pattern: /certyfikat|gwarancj|licencj|certified|certificate|guarantee|warranty|iso\s?\d{4,5}|keurmerk|certificaat|garantie/i },
  { label: "experience", pattern: /\d+\s*(\+\s*)?(lat|years?|jaar|jaren)\b|lat na rynku|years of experience|jaar ervaring|doświadczeni/i },
  { label: "clients", pattern: /zaufali nam|nasi klienci|trusted by|our clients|onze klanten|partnerzy|our partners|partners\b/i },
];

export const OFFER_WORDS: RegExp =
  /usług|oferuj|oferta|cennik|cena|od\s+\d+\s*(zł|pln|eur|€)|services?|pricing|price|products?|solutions?|we (offer|provide|build|help)|diensten|aanbod|prijzen|producten|wij (bieden|leveren|helpen)/i;

export const GENERIC_H1: RegExp =
  /^(welcome|witamy|witaj|strona główna|home|homepage|welkom|start|index)\b/i;

export const BUSINESS_RULES: { key: string; pattern: RegExp }[] = [
  { key: "construction", pattern: /remont|budow|wykończ|instalac|dachy|elewacj|renovat|construction|contractor|plumb|roofing|bouw|verbouw|aannemer|dakdekker|schilder/i },
  { key: "food", pattern: /restaurac|menu\b|kuchni|catering|kawiarn|pizzeri|restaurant|café|cafe|bakery|horeca|bistro|reserveer/i },
  { key: "ecommerce", pattern: /koszyk|do koszyka|sklep internetowy|add to cart|shopping cart|checkout|free shipping|winkelwagen|in winkelmand|gratis verzending/i },
  { key: "software", pattern: /\bsaas\b|software|aplikacj|platform|\bapi\b|oprogramowani|cloud|dashboard|app\b|ontwikkel/i },
  { key: "legal_finance", pattern: /kancelari|adwokat|radca prawny|prawnik|księgow|biuro rachunkow|ubezpiecz|law firm|attorney|lawyer|accountant|insurance|advocat|boekhoud|verzekering|notaris/i },
  { key: "health", pattern: /gabinet|lekarz|klinik|stomatolog|dentyst|fizjoterap|medyczn|clinic|dentist|doctor|physio|medical|tandarts|huisarts|fysio|praktijk/i },
  { key: "beauty", pattern: /fryzjer|salon|kosmetyk|paznokci|masaż|spa\b|hair salon|beauty|nails|massage|wellness|kapper|schoonheid|nagelstudio/i },
  { key: "education", pattern: /szkoleni|kurs\b|kursy|szkoł|nauka|academy|training|course|school|tutor|opleiding|cursus|les\b|lessen/i },
  { key: "real_estate", pattern: /nieruchomo|mieszkani|deweloper|real estate|property|estate agent|makelaar|vastgoed|woning/i },
  { key: "automotive", pattern: /warsztat|samochod|auto serwis|opony|car repair|garage|tyres|tires|dealership|autobedrijf|autogarage|banden/i },
  { key: "marketing", pattern: /agencja|marketing|reklam|seo\b|branding|social media|agency|creative studio|bureau|reclame/i },
];

export const STOPWORDS: Record<"pl" | "en" | "nl", string[]> = {
  pl: ["i", "w", "z", "na", "do", "nie", "się", "jest", "oraz", "dla", "to", "że", "od", "po", "przez", "nasze", "naszej", "firma", "usługi"],
  en: ["the", "and", "of", "to", "in", "is", "for", "with", "your", "our", "we", "you", "on", "are", "that", "services"],
  nl: ["de", "het", "een", "en", "van", "voor", "met", "op", "zijn", "wij", "ons", "onze", "uw", "dat", "niet", "diensten"],
};
