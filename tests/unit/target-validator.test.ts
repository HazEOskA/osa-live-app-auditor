import { describe, expect, it } from "vitest";
import { validateTarget } from "@/audit/target-validator";
import { AuditError } from "@/shared/errors";

describe("validateTarget", () => {
  it("accepts a well-formed http URL and normalizes it", () => {
    const result = validateTarget("http://example.com/path?x=1#frag");
    expect(result.protocol).toBe("http:");
    expect(result.host).toBe("example.com");
    expect(result.normalizedUrl).toBe("http://example.com/path?x=1");
  });

  it("accepts localhost when allowLocalhost is true", () => {
    const result = validateTarget("http://localhost:3000", { allowLocalhost: true });
    expect(result.host).toBe("localhost");
  });

  it("rejects loopback targets when allowLocalhost is false", () => {
    expect(() => validateTarget("http://127.0.0.1:3000", { allowLocalhost: false })).toThrow(AuditError);
  });

  it("rejects file: protocol", () => {
    expect(() => validateTarget("file:///etc/passwd")).toThrow(AuditError);
  });

  it("rejects javascript: protocol", () => {
    expect(() => validateTarget("javascript:alert(1)")).toThrow(AuditError);
  });

  it("rejects data: protocol", () => {
    expect(() => validateTarget("data:text/html,<h1>hi</h1>")).toThrow(AuditError);
  });

  it("rejects malformed URLs", () => {
    expect(() => validateTarget("not a url")).toThrow(AuditError);
  });

  it("rejects empty input", () => {
    expect(() => validateTarget("   ")).toThrow(AuditError);
  });

  it("rejects embedded credentials", () => {
    expect(() => validateTarget("http://user:pass@example.com")).toThrow(AuditError);
  });

  it("rejects private RFC1918 hosts even with allowLocalhost true", () => {
    expect(() => validateTarget("http://192.168.1.5", { allowLocalhost: true })).toThrow(AuditError);
    expect(() => validateTarget("http://10.0.0.5", { allowLocalhost: true })).toThrow(AuditError);
  });

  it("rejects link-local metadata-service address", () => {
    expect(() => validateTarget("http://169.254.169.254/latest/meta-data")).toThrow(AuditError);
  });

  it("enforces AUDIT_HOST_ALLOWLIST for non-loopback public hosts when set", () => {
    const original = process.env.AUDIT_HOST_ALLOWLIST;
    process.env.AUDIT_HOST_ALLOWLIST = "allowed.example.com,*.trusted.example.com";
    try {
      expect(() => validateTarget("http://not-allowed.example.com")).toThrow(AuditError);
      expect(validateTarget("http://allowed.example.com").host).toBe("allowed.example.com");
      expect(validateTarget("http://sub.trusted.example.com").host).toBe("sub.trusted.example.com");
    } finally {
      if (original === undefined) delete process.env.AUDIT_HOST_ALLOWLIST;
      else process.env.AUDIT_HOST_ALLOWLIST = original;
    }
  });
});
