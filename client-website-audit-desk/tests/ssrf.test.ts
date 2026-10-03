import { describe, expect, it } from "vitest";
import { isPrivateIp, parsePublicUrl, UnsafeUrlError } from "@/lib/ssrf";

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12::1",
    "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "not-an-ip",
  ])("blocks %s", (ip) => expect(isPrivateIp(ip)).toBe(true));

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"])(
    "allows %s",
    (ip) => expect(isPrivateIp(ip)).toBe(false),
  );
});

describe("parsePublicUrl", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(parsePublicUrl("example.com/path").toString()).toBe("https://example.com/path");
  });
  it.each([
    "ftp://example.com", "file:///etc/passwd", "javascript:alert(1)", "http://localhost", "http://app.localhost",
    "http://127.0.0.1", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "http://intranet",
    "http://printer.local", "https://user:pw@example.com", "http://example.com:8080", "http://example.com:22",
    "http://2130706433", "http://0x7f.0.0.1", "", "   ",
  ])("rejects %j", (raw) => expect(() => parsePublicUrl(raw)).toThrow(UnsafeUrlError));
});
