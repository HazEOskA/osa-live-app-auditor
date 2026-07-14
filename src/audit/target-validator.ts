import { AuditError } from "@/shared/errors";
import type { TargetInfo } from "@/shared/types";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// RFC1918 / loopback / link-local ranges plus IPv6 equivalents. Matched against
// the literal host so obviously private targets are rejected without a DNS
// lookup. This does not protect against DNS rebinding to a private address
// after validation; see README "Security boundaries" for that known limitation.
const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
];

const LOOPBACK_HOSTNAMES = new Set(["localhost", "::1"]);

function isPrivateHost(hostname: string): boolean {
  const bare = hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (LOOPBACK_HOSTNAMES.has(bare)) return true;
  if (PRIVATE_IPV4_PATTERNS.some((re) => re.test(bare))) return true;
  if (bare === "::1" || bare.startsWith("fc") || bare.startsWith("fd") || bare.startsWith("fe80")) {
    return true;
  }
  return false;
}

function isLoopbackHost(hostname: string): boolean {
  const bare = hostname.replace(/^\[/, "").replace(/\]$/, "");
  return LOOPBACK_HOSTNAMES.has(bare) || bare === "127.0.0.1" || bare.startsWith("127.");
}

function parseAllowlist(): string[] | null {
  const raw = process.env.AUDIT_HOST_ALLOWLIST;
  if (!raw || raw.trim().length === 0) return null;
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatchesAllowlist(host: string, allowlist: string[]): boolean {
  const lowerHost = host.toLowerCase();
  return allowlist.some((pattern) => {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1); // ".example.com"
      return lowerHost.endsWith(suffix) || lowerHost === pattern.slice(2);
    }
    return lowerHost === pattern;
  });
}

export interface TargetValidationOptions {
  /** Overrides NODE_ENV-based localhost allowance, primarily for tests. */
  allowLocalhost?: boolean;
}

/**
 * Normalizes and validates an operator-supplied target URL. Throws AuditError
 * with code INVALID_TARGET or TARGET_NOT_ALLOWED on rejection.
 */
export function validateTarget(rawUrl: string, options: TargetValidationOptions = {}): TargetInfo {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new AuditError("INVALID_TARGET", "Target URL must not be empty.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AuditError("INVALID_TARGET", `"${trimmed}" is not a valid absolute URL.`);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new AuditError(
      "INVALID_TARGET",
      `Protocol "${parsed.protocol}" is not permitted. Only http:// and https:// are allowed.`,
    );
  }

  if (parsed.username || parsed.password) {
    throw new AuditError("INVALID_TARGET", "Target URL must not embed credentials.");
  }

  const allowLocalhostByEnv =
    options.allowLocalhost ?? process.env.NODE_ENV !== "production";
  const allowlist = parseAllowlist();

  if (isLoopbackHost(parsed.hostname)) {
    if (!allowLocalhostByEnv && !(allowlist && hostMatchesAllowlist(parsed.hostname, allowlist))) {
      throw new AuditError(
        "TARGET_NOT_ALLOWED",
        `Loopback target "${parsed.hostname}" is only allowed in development or via AUDIT_HOST_ALLOWLIST.`,
      );
    }
  } else if (isPrivateHost(parsed.hostname)) {
    throw new AuditError(
      "TARGET_NOT_ALLOWED",
      `Private/internal host "${parsed.hostname}" is never allowed as an audit target.`,
    );
  } else if (allowlist && !hostMatchesAllowlist(parsed.hostname, allowlist)) {
    throw new AuditError(
      "TARGET_NOT_ALLOWED",
      `Host "${parsed.hostname}" is not in AUDIT_HOST_ALLOWLIST.`,
    );
  }

  parsed.hash = "";

  return {
    requestedUrl: rawUrl,
    normalizedUrl: parsed.toString(),
    host: parsed.hostname,
    protocol: parsed.protocol,
  };
}
