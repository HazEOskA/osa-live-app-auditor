import type { Finding, PageErrorRecord } from "@/shared/types";
import { severityForRuntimeError } from "../findings/severity";

export const CHECK_ID = "runtime-error-check";

export function runRuntimeErrorCheck(errors: PageErrorRecord[], nextId: () => string): Finding[] {
  return errors.map((err) => ({
    id: nextId(),
    category: "runtime-error" as const,
    severity: severityForRuntimeError(),
    title: "Uncaught JavaScript exception",
    description: err.message,
    pageUrl: err.pageUrl,
    reproductionSteps: [`Open ${err.pageUrl}`, "Observe an uncaught exception thrown on the page."],
    evidenceRefs: ["logs/runtime.json"],
    timestamp: err.timestamp,
    confidence: 1,
    checkId: CHECK_ID,
  }));
}
