export type AuditStatus =
  | "IDLE"
  | "VALIDATING_TARGET"
  | "STARTING_BROWSER"
  | "DISCOVERING_UI"
  | "EXECUTING_CHECKS"
  | "COLLECTING_EVIDENCE"
  | "GENERATING_PROOF"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED";

export const FINDING_CATEGORIES = [
  "console-error",
  "failed-request",
  "http-error",
  "broken-image",
  "dead-link",
  "dead-control",
  "runtime-error",
  "accessibility-warning",
  "navigation-failure",
  "audit-system-error",
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  pageUrl: string;
  selector?: string;
  reproductionSteps: string[];
  evidenceRefs: string[];
  timestamp: string;
  confidence: number;
  checkId: string;
}

export type AuditEventType =
  | "run-started"
  | "status-changed"
  | "page-opened"
  | "console-message"
  | "page-error"
  | "request-failed"
  | "response-received"
  | "element-discovered"
  | "action-attempted"
  | "action-skipped"
  | "action-result"
  | "screenshot-captured"
  | "check-executed"
  | "finding-created"
  | "run-completed"
  | "run-failed";

export interface AuditEvent {
  seq: number;
  timestamp: string;
  type: AuditEventType;
  data: Record<string, unknown>;
}

export interface EvidenceFileManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
  contentType: string;
}

export interface TargetInfo {
  requestedUrl: string;
  normalizedUrl: string;
  host: string;
  protocol: string;
}

export interface EnvironmentInfo {
  node: string;
  playwright: string;
  os: string;
  arch: string;
  mode: "demo" | "ai-assisted";
}

export interface ProofBundleVerification {
  instructions: string;
  command: string;
}

export interface ProofBundle {
  schemaVersion: string;
  runId: string;
  target: TargetInfo;
  startedAt: string;
  completedAt: string;
  status: AuditStatus;
  environment: EnvironmentInfo;
  executedChecks: string[];
  eventCount: number;
  findingCount: number;
  evidence: EvidenceFileManifestEntry[];
  eventStreamHash: string;
  rootHash: string;
  verification: ProofBundleVerification;
}

export interface ActionAttempt {
  selector: string;
  accessibleName: string;
  tagName: string;
  role: string | null;
  elementType: string | null;
  classification: "safe" | "risky" | "blocked";
  reason?: string;
}

export interface DiscoveredElement {
  selector: string;
  tagName: string;
  role: string | null;
  accessibleName: string;
  elementType: string | null;
  text: string;
  href?: string;
}

export interface RunSummary {
  runId: string;
  target: TargetInfo;
  status: AuditStatus;
  startedAt: string;
  completedAt?: string;
  findingCount: number;
  error?: string;
}

export interface ConsoleMessageRecord {
  level: "error" | "warning";
  text: string;
  location?: string;
  pageUrl: string;
  timestamp: string;
}

export interface PageErrorRecord {
  message: string;
  stack?: string;
  pageUrl: string;
  timestamp: string;
}

export interface FailedRequestRecord {
  url: string;
  method: string;
  failureText: string;
  pageUrl: string;
  timestamp: string;
}

export interface HttpErrorRecord {
  url: string;
  method: string;
  status: number;
  statusText: string;
  pageUrl: string;
  timestamp: string;
}

export interface BrokenImageRecord {
  src: string;
  selector: string;
  pageUrl: string;
  timestamp: string;
}

export interface DeadLinkCheckRecord {
  href: string;
  selector: string;
  status: number | null;
  error?: string;
  pageUrl: string;
  timestamp: string;
}

export interface ActionResultRecord {
  element: DiscoveredElement;
  classification: "safe" | "risky" | "blocked";
  reason?: string;
  dispatched: boolean;
  dispatchError?: string;
  effectObserved: boolean;
  effectDescription: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  urlBefore: string;
  urlAfter?: string;
  timestamp: string;
}

export interface NavigationRecord {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  timestamp: string;
}

export interface BrowserSessionResult {
  navigation: NavigationRecord;
  consoleMessages: ConsoleMessageRecord[];
  pageErrors: PageErrorRecord[];
  failedRequests: FailedRequestRecord[];
  httpErrors: HttpErrorRecord[];
  brokenImages: BrokenImageRecord[];
  deadLinkChecks: DeadLinkCheckRecord[];
  discoveredElements: DiscoveredElement[];
  actionResults: ActionResultRecord[];
  screenshots: { name: string; path: string }[];
  truncatedByLimit: boolean;
}
