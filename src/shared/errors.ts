export type AuditErrorCode =
  | "INVALID_TARGET"
  | "TARGET_NOT_ALLOWED"
  | "BROWSER_LAUNCH_FAILED"
  | "NAVIGATION_FAILED"
  | "RUN_TIMEOUT"
  | "ACTION_LIMIT_EXCEEDED"
  | "PROOF_BUNDLE_INVALID"
  | "PROOF_BUNDLE_TAMPERED"
  | "INTERNAL_ERROR";

export class AuditError extends Error {
  readonly code: AuditErrorCode;

  constructor(code: AuditErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuditError";
    this.code = code;
  }
}

export class ProofVerificationError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`Proof bundle verification failed: ${reasons.join("; ")}`);
    this.name = "ProofVerificationError";
    this.reasons = reasons;
  }
}
