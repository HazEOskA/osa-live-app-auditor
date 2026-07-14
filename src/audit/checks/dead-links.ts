import type { DeadLinkCheckRecord, Finding } from "@/shared/types";
import { severityForDeadLink } from "../findings/severity";

export const CHECK_ID = "dead-link-check";

export function runDeadLinkCheck(checks: DeadLinkCheckRecord[], nextId: () => string): Finding[] {
  return checks
    .filter((c) => c.status === null || c.status >= 400)
    .map((c) => ({
      id: nextId(),
      category: "dead-link" as const,
      severity: severityForDeadLink(c.status),
      title: c.status === null ? "Link target could not be reached" : `Link returns HTTP ${c.status}`,
      description:
        c.status === null
          ? `Requesting "${c.href}" failed: ${c.error}`
          : `Requesting "${c.href}" returned HTTP ${c.status}.`,
      pageUrl: c.pageUrl,
      selector: c.selector,
      reproductionSteps: [`Open ${c.pageUrl}`, `Follow the link at ${c.selector} (${c.href})`],
      evidenceRefs: ["logs/network.json"],
      timestamp: c.timestamp,
      confidence: 1,
      checkId: CHECK_ID,
    }));
}
