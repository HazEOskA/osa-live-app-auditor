import type { Severity } from "@/shared/types";

export function severityForHttpStatus(status: number): Severity {
  if (status >= 500) return "high";
  if (status === 404) return "medium";
  if (status >= 400) return "medium";
  return "info";
}

export function severityForConsoleError(text: string): Severity {
  const lower = text.toLowerCase();
  if (lower.includes("uncaught") || lower.includes("referenceerror") || lower.includes("typeerror")) {
    return "high";
  }
  return "medium";
}

export function severityForFailedRequest(): Severity {
  return "high";
}

export function severityForRuntimeError(): Severity {
  return "high";
}

export function severityForBrokenImage(): Severity {
  return "low";
}

export function severityForDeadLink(status: number | null): Severity {
  if (status === null) return "high";
  return severityForHttpStatus(status);
}

export function severityForDeadControl(): Severity {
  return "medium";
}

export function severityForAccessibilityWarning(): Severity {
  return "low";
}
