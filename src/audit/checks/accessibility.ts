import type { DiscoveredElement, Finding } from "@/shared/types";
import { severityForAccessibilityWarning } from "../findings/severity";

export const CHECK_ID = "accessibility-name-check";

const NAMEABLE_TAGS = new Set(["button", "a"]);

export function runAccessibilityCheck(
  elements: DiscoveredElement[],
  pageUrl: string,
  nextId: () => string,
): Finding[] {
  return elements
    .filter((el) => {
      const isNameable = NAMEABLE_TAGS.has(el.tagName) || el.role === "button" || el.role === "link";
      return isNameable && el.accessibleName.trim().length === 0;
    })
    .map((el) => ({
      id: nextId(),
      category: "accessibility-warning" as const,
      severity: severityForAccessibilityWarning(),
      title: "Interactive element has no accessible name",
      description: `A ${el.tagName} element (${el.selector}) exposes no text, aria-label or title, so assistive technology cannot describe it.`,
      pageUrl,
      selector: el.selector,
      reproductionSteps: [`Open ${pageUrl}`, `Inspect element ${el.selector} with a screen reader or accessibility tree`],
      evidenceRefs: ["screenshots/initial.png"],
      timestamp: new Date().toISOString(),
      confidence: 1,
      checkId: CHECK_ID,
    }));
}
