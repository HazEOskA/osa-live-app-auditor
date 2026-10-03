import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { FetchError, fetchPublicWebsite, type FetchOptions } from "@/lib/fetchPublicWebsite";
import { parsePublicUrl } from "@/lib/ssrf";
import { fixture, withServer } from "./helpers";

/** Test-only relaxations: allow the loopback test server for the FIRST hop, keep production validation for everything else. */
const loopbackFirstHop = (base: string): FetchOptions => ({
  validateUrl: (raw) => (raw.startsWith(base) ? new URL(raw) : parsePublicUrl(raw)),
  isAddressAllowed: () => true,
});

describe("fetchPublicWebsite", () => {
  it("refuses loopback targets with the strict defaults", async () => {
    await withServer((_, res) => res.end("secret"), async (base) => {
      await expect(fetchPublicWebsite(base)).rejects.toMatchObject({ code: "blocked" });
    });
  });

  it("refuses a hostname whose DNS resolves to a private address (checked at connect time)", async () => {
    // "localhost.localdomain"-style tricks: a public-looking name that resolves to loopback.
    await expect(fetchPublicWebsite("http://127.0.0.1.nip.io/")).rejects.toBeInstanceOf(FetchError);
  });

  it("fetches html and returns the final url", async () => {
    await withServer(
      (_, res) => { res.setHeader("content-type", "text/html; charset=utf-8"); res.end(fixture("pl-service.html")); },
      async (base) => {
        const page = await fetchPublicWebsite(base, loopbackFirstHop(base));
        expect(page.status).toBe(200);
        expect(page.html).toContain("Kompleksowe remonty");
        expect(page.truncated).toBe(false);
      },
    );
  });

  it("decompresses gzip bodies", async () => {
    await withServer(
      (_, res) => { res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" }); res.end(zlib.gzipSync("<h1>zip ok</h1>")); },
      async (base) => expect((await fetchPublicWebsite(base, loopbackFirstHop(base))).html).toContain("zip ok"),
    );
  });

  it("follows same-origin redirects", async () => {
    await withServer(
      (req, res) => {
        if (req.url === "/") { res.writeHead(302, { location: "/final" }); return res.end(); }
        res.setHeader("content-type", "text/html"); res.end("<h1>final</h1>");
      },
      async (base) => {
        const page = await fetchPublicWebsite(base, loopbackFirstHop(base));
        expect(page.finalUrl).toBe(`${base}/final`);
      },
    );
  });

  it("re-validates redirect targets (redirect to cloud metadata is blocked)", async () => {
    await withServer(
      (_, res) => { res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" }); res.end(); },
      async (base) => {
        await expect(fetchPublicWebsite(base, loopbackFirstHop(base))).rejects.toMatchObject({ code: "blocked" });
      },
    );
  });

  it("stops redirect loops", async () => {
    await withServer(
      (_, res) => { res.writeHead(302, { location: "/" }); res.end(); },
      async (base) => {
        await expect(fetchPublicWebsite(base, loopbackFirstHop(base))).rejects.toMatchObject({ code: "too_many_redirects" });
      },
    );
  });

  it("rejects non-html content and http errors", async () => {
    await withServer(
      (req, res) => {
        if (req.url === "/err") { res.writeHead(500); return res.end("x"); }
        res.setHeader("content-type", "application/pdf"); res.end("%PDF");
      },
      async (base) => {
        await expect(fetchPublicWebsite(base, loopbackFirstHop(base))).rejects.toMatchObject({ code: "not_html" });
        await expect(fetchPublicWebsite(`${base}/err`, loopbackFirstHop(base))).rejects.toMatchObject({ code: "http_error" });
      },
    );
  });

  it("caps the body size and flags truncation (also for decompression bombs)", async () => {
    await withServer(
      (_, res) => { res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" }); res.end(zlib.gzipSync("<p>" + "a".repeat(5_000_000) + "</p>")); },
      async (base) => {
        const page = await fetchPublicWebsite(base, { ...loopbackFirstHop(base), maxBytes: 100_000 });
        expect(page.truncated).toBe(true);
        expect(page.html.length).toBeLessThanOrEqual(100_000);
      },
    );
  });

  it("times out slow servers", async () => {
    await withServer(
      () => { /* never respond */ },
      async (base) => {
        await expect(fetchPublicWebsite(base, { ...loopbackFirstHop(base), timeoutMs: 300 })).rejects.toMatchObject({ code: "timeout" });
      },
    );
  });
});
