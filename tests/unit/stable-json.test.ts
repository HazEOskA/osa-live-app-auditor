import { describe, expect, it } from "vitest";
import { stableStringify } from "@/proof/stable-json";

describe("stableStringify", () => {
  it("sorts object keys regardless of insertion order", () => {
    const a = stableStringify({ b: 1, a: 2, c: 3 });
    const b = stableStringify({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it("sorts keys recursively in nested objects", () => {
    const value = stableStringify({ z: { y: 1, x: 2 }, a: 1 });
    expect(value).toBe('{"a":1,"z":{"x":2,"y":1}}');
  });

  it("preserves array order (arrays are not sorted)", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
  });

  it("serializes null and undefined as null", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(undefined)).toBe("null");
    expect(stableStringify({ a: undefined })).toBe('{"a":null}');
  });

  it("throws on non-finite numbers", () => {
    expect(() => stableStringify(Number.NaN)).toThrow();
    expect(() => stableStringify(Number.POSITIVE_INFINITY)).toThrow();
  });

  it("produces identical output across repeated calls (determinism)", () => {
    const value = { runId: "run-1", findings: [{ id: "f1", severity: "high" }] };
    expect(stableStringify(value)).toBe(stableStringify(structuredClone(value)));
  });
});
