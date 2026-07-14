import type { DiscoveredElement } from "@/shared/types";

/**
 * Default deny-list of destructive action labels. Matched case-insensitively
 * as whole-word/phrase substrings against an element's accessible name, text
 * content and title attribute. Extend via AUDIT_DENY_LABELS (comma-separated).
 */
export const DEFAULT_DENY_LABELS: string[] = [
  "delete",
  "remove",
  "destroy",
  "purge",
  "wipe",
  "erase",
  "cancel subscription",
  "cancel plan",
  "unsubscribe",
  "deactivate",
  "disable account",
  "delete account",
  "close account",
  "confirm delete",
  "permanently",
  "buy now",
  "purchase",
  "checkout",
  "pay now",
  "place order",
  "submit payment",
  "add to cart",
  "confirm payment",
  "log out",
  "logout",
  "log off",
  "sign out",
  "sign-out",
  "send message",
  "send email",
  "publish",
  "make public",
  "revoke",
  "reset password",
  "change password",
  "transfer",
  "withdraw",
];

const DESTRUCTIVE_ROLES = new Set(["menuitem"]); // combined with label matching, not role alone

function envDenyLabels(): string[] {
  const raw = process.env.AUDIT_DENY_LABELS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getDenyLabels(): string[] {
  return [...DEFAULT_DENY_LABELS, ...envDenyLabels()];
}

export interface SafetyClassification {
  classification: "safe" | "risky" | "blocked";
  reason?: string;
}

/**
 * Classifies whether an interactive element is safe to click automatically.
 * Blocked: matches a destructive label, is a file upload control, or is a
 * form-submit button for a non-trivial form. Risky/blocked elements are
 * recorded but never actioned by the deterministic browser worker.
 */
export function classifyElement(element: DiscoveredElement): SafetyClassification {
  const haystack = `${element.accessibleName} ${element.text}`.toLowerCase();

  if (element.elementType === "file") {
    return { classification: "blocked", reason: "File upload controls are never actioned." };
  }

  if (element.role && DESTRUCTIVE_ROLES.has(element.role) && haystack.trim().length === 0) {
    return { classification: "blocked", reason: "Unlabeled menu item; refusing to guess intent." };
  }

  const denyLabels = getDenyLabels();
  const matchedLabel = denyLabels.find((label) => haystack.includes(label));
  if (matchedLabel) {
    return {
      classification: "blocked",
      reason: `Label matched destructive deny-list entry "${matchedLabel}".`,
    };
  }

  if (element.elementType === "submit" || element.elementType === "password") {
    return {
      classification: "risky",
      reason: "Form submission / credential fields require explicit scenario authorization.",
    };
  }

  if (element.href) {
    try {
      const url = new URL(element.href, "http://placeholder.invalid");
      if (url.protocol === "javascript:" || url.protocol === "data:") {
        return { classification: "blocked", reason: `Unsafe link protocol "${url.protocol}".` };
      }
    } catch {
      // relative or unparsable href; leave classification to fall through
    }
  }

  return { classification: "safe" };
}

export function isSafeToClick(element: DiscoveredElement): boolean {
  return classifyElement(element).classification === "safe";
}
