import type { BrowserSessionResult, Finding } from "@/shared/types";
import { createFindingIdGenerator } from "./id";
import { runConsoleErrorCheck, CHECK_ID as CONSOLE_ERROR_CHECK } from "../checks/console-errors";
import { runRuntimeErrorCheck, CHECK_ID as RUNTIME_ERROR_CHECK } from "../checks/runtime-errors";
import { runNetworkFailureCheck, CHECK_ID as NETWORK_FAILURE_CHECK } from "../checks/network-failures";
import { runBrokenImageCheck, CHECK_ID as BROKEN_IMAGE_CHECK } from "../checks/broken-images";
import { runDeadLinkCheck, CHECK_ID as DEAD_LINK_CHECK } from "../checks/dead-links";
import { runDeadControlCheck, CHECK_ID as DEAD_CONTROL_CHECK } from "../checks/dead-controls";
import { runAccessibilityCheck, CHECK_ID as ACCESSIBILITY_CHECK } from "../checks/accessibility";

export const SYSTEM_LIMITS_CHECK_ID = "system-limits-check";

export const ALL_CHECK_IDS = [
  CONSOLE_ERROR_CHECK,
  RUNTIME_ERROR_CHECK,
  NETWORK_FAILURE_CHECK,
  BROKEN_IMAGE_CHECK,
  DEAD_LINK_CHECK,
  DEAD_CONTROL_CHECK,
  ACCESSIBILITY_CHECK,
  SYSTEM_LIMITS_CHECK_ID,
];

export function buildFindings(runId: string, session: BrowserSessionResult): Finding[] {
  const nextId = createFindingIdGenerator(runId);
  const findings: Finding[] = [
    ...runConsoleErrorCheck(session.consoleMessages, nextId),
    ...runRuntimeErrorCheck(session.pageErrors, nextId),
    ...runNetworkFailureCheck(session.failedRequests, session.httpErrors, nextId),
    ...runBrokenImageCheck(session.brokenImages, nextId),
    ...runDeadLinkCheck(session.deadLinkChecks, nextId),
    ...runDeadControlCheck(session.actionResults, nextId),
    ...runAccessibilityCheck(session.discoveredElements, session.navigation.finalUrl, nextId),
  ];

  if (session.truncatedByLimit) {
    findings.push({
      id: nextId(),
      category: "audit-system-error",
      severity: "info",
      title: "Audit run stopped early due to configured limits",
      description:
        "The action budget or run deadline was reached before every discovered element could be tested. Results are a partial but truthful sample of what was checked.",
      pageUrl: session.navigation.finalUrl,
      reproductionSteps: ["Re-run with a higher maxActions / longer timeout to test the remaining elements."],
      evidenceRefs: ["events.jsonl"],
      timestamp: new Date().toISOString(),
      confidence: 1,
      checkId: SYSTEM_LIMITS_CHECK_ID,
    });
  }

  return findings;
}
