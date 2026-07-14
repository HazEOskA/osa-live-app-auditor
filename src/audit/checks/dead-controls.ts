import type { ActionResultRecord, Finding } from "@/shared/types";
import { severityForDeadControl } from "../findings/severity";

export const CHECK_ID = "dead-control-check";

export function runDeadControlCheck(actions: ActionResultRecord[], nextId: () => string): Finding[] {
  return actions
    .filter((a) => a.classification === "safe" && a.dispatched && !a.effectObserved)
    .map((a) => ({
      id: nextId(),
      category: "dead-control" as const,
      severity: severityForDeadControl(),
      title: "Interactive control produced no observable effect",
      description:
        `Element "${a.element.accessibleName || a.element.text || a.element.tagName}" ` +
        `(${a.element.selector}) was clicked but ${a.effectDescription}.`,
      pageUrl: a.urlBefore,
      selector: a.element.selector,
      reproductionSteps: [
        `Open ${a.urlBefore}`,
        `Click element ${a.element.selector} ("${a.element.accessibleName || a.element.text}")`,
        "Observe that no DOM change, navigation or dialog results.",
      ],
      evidenceRefs: [a.beforeScreenshot, a.afterScreenshot].filter((p): p is string => Boolean(p)),
      timestamp: a.timestamp,
      confidence: 0.85,
      checkId: CHECK_ID,
    }));
}
