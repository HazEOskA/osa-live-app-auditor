import type { ConsoleMessageRecord, Finding } from "@/shared/types";
import { severityForConsoleError } from "../findings/severity";

export const CHECK_ID = "console-error-check";

export function runConsoleErrorCheck(
  messages: ConsoleMessageRecord[],
  nextId: () => string,
): Finding[] {
  return messages
    .filter((m) => m.level === "error")
    .map((m) => ({
      id: nextId(),
      category: "console-error" as const,
      severity: severityForConsoleError(m.text),
      title: "Console error logged during audit",
      description: m.text,
      pageUrl: m.pageUrl,
      selector: m.location,
      reproductionSteps: [
        `Open ${m.pageUrl}`,
        "Observe the browser DevTools console during and after page load.",
      ],
      evidenceRefs: ["logs/console.json"],
      timestamp: m.timestamp,
      confidence: 1,
      checkId: CHECK_ID,
    }));
}
