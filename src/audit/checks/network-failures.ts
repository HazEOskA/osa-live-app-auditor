import type { Finding, FailedRequestRecord, HttpErrorRecord } from "@/shared/types";
import { severityForFailedRequest, severityForHttpStatus } from "../findings/severity";

export const CHECK_ID = "network-failure-check";

export function runNetworkFailureCheck(
  failedRequests: FailedRequestRecord[],
  httpErrors: HttpErrorRecord[],
  nextId: () => string,
): Finding[] {
  const findings: Finding[] = [];

  for (const req of failedRequests) {
    findings.push({
      id: nextId(),
      category: "failed-request",
      severity: severityForFailedRequest(),
      title: "Network request failed to complete",
      description: `${req.method} ${req.url} failed: ${req.failureText}`,
      pageUrl: req.pageUrl,
      reproductionSteps: [`Open ${req.pageUrl}`, `Observe the network request to ${req.url}`],
      evidenceRefs: ["logs/network.json"],
      timestamp: req.timestamp,
      confidence: 1,
      checkId: CHECK_ID,
    });
  }

  for (const res of httpErrors) {
    findings.push({
      id: nextId(),
      category: "http-error",
      severity: severityForHttpStatus(res.status),
      title: `Server responded with HTTP ${res.status}`,
      description: `${res.method} ${res.url} returned ${res.status} ${res.statusText}`,
      pageUrl: res.pageUrl,
      reproductionSteps: [`Open ${res.pageUrl}`, `Observe the response for ${res.url}`],
      evidenceRefs: ["logs/network.json"],
      timestamp: res.timestamp,
      confidence: 1,
      checkId: CHECK_ID,
    });
  }

  return findings;
}
