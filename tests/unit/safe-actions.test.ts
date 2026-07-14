import { describe, expect, it } from "vitest";
import { classifyElement, isSafeToClick } from "@/audit/safe-actions";
import type { DiscoveredElement } from "@/shared/types";

function el(overrides: Partial<DiscoveredElement>): DiscoveredElement {
  return {
    selector: "#el",
    tagName: "button",
    role: null,
    accessibleName: "",
    elementType: null,
    text: "",
    ...overrides,
  };
}

describe("classifyElement", () => {
  it("blocks elements whose label matches the destructive deny-list", () => {
    const result = classifyElement(el({ accessibleName: "Delete account" }));
    expect(result.classification).toBe("blocked");
    expect(result.reason).toMatch(/deny-list/);
  });

  it("blocks common destructive phrasings", () => {
    for (const label of ["Buy now", "Log out", "Unsubscribe", "Send message", "Cancel subscription"]) {
      expect(classifyElement(el({ accessibleName: label })).classification).toBe("blocked");
    }
  });

  it("blocks file upload controls regardless of label", () => {
    const result = classifyElement(el({ elementType: "file", accessibleName: "Attach photo" }));
    expect(result.classification).toBe("blocked");
  });

  it("marks form submission and password fields as risky, not safe", () => {
    expect(classifyElement(el({ elementType: "submit", accessibleName: "Save" })).classification).toBe("risky");
    expect(classifyElement(el({ elementType: "password" })).classification).toBe("risky");
  });

  it("classifies an ordinary labeled button as safe", () => {
    expect(classifyElement(el({ accessibleName: "Reveal panel" })).classification).toBe("safe");
  });

  it("blocks javascript: and data: link protocols", () => {
    expect(
      classifyElement(el({ tagName: "a", href: "javascript:alert(1)", accessibleName: "Click" })).classification,
    ).toBe("blocked");
  });

  it("respects AUDIT_DENY_LABELS environment overrides", () => {
    const original = process.env.AUDIT_DENY_LABELS;
    process.env.AUDIT_DENY_LABELS = "launch missiles";
    try {
      expect(classifyElement(el({ accessibleName: "Launch Missiles" })).classification).toBe("blocked");
    } finally {
      if (original === undefined) delete process.env.AUDIT_DENY_LABELS;
      else process.env.AUDIT_DENY_LABELS = original;
    }
  });
});

describe("isSafeToClick", () => {
  it("is true only for safe classification", () => {
    expect(isSafeToClick(el({ accessibleName: "Reveal panel" }))).toBe(true);
    expect(isSafeToClick(el({ accessibleName: "Delete account" }))).toBe(false);
    expect(isSafeToClick(el({ elementType: "submit" }))).toBe(false);
  });
});
