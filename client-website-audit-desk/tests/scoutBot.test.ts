import { describe, expect, it } from "vitest";
import { ScoutContextSchema } from "@/lib/schemas";
import { runScoutBot, ScoutError } from "@/lib/scoutBot";
import { parsePublicUrl } from "@/lib/ssrf";
import { fixture, scoutFrom, withServer } from "./helpers";

describe("ScoutBot extraction", () => {
  it("builds a valid, rich Scout Context for a good Polish service site", () => {
    const s = scoutFrom("pl-service.html", "pl");
    expect(ScoutContextSchema.safeParse(s).success).toBe(true);
    expect(s.detectedLanguage).toBe("pl");
    expect(s.businessType).toBe("firma remontowo-budowlana");
    expect(s.contactFound).toBe(true);
    expect(s.visibleCTA).toEqual(expect.arrayContaining(["Poproś o wycenę"]));
    expect(s.trustSignals.length).toBeGreaterThanOrEqual(2);
    expect(s.offerClarity).not.toBe("low");
    expect(s.page.hasViewport).toBe(true);
    expect(s.fetchStatus).toBe("ok");
    expect(s.limitations.length).toBeGreaterThan(0);
  });

  it("flags the problems of a weak English site", () => {
    const s = scoutFrom("en-saas-weak.html", "en");
    expect(s.detectedLanguage).toBe("en");
    expect(s.offerClarity).toBe("low");
    expect(s.contactFound).toBe(false);
    expect(s.visibleCTA).toHaveLength(0);
    expect(s.trustSignals).toHaveLength(0);
    expect(s.obviousProblems.join(" ")).toMatch(/call to action/i);
    expect(s.obviousProblems.join(" ")).toMatch(/viewport/i);
    expect(s.obviousProblems.join(" ")).toMatch(/alt/i);
  });

  it("detects Dutch e-commerce signals", () => {
    const s = scoutFrom("nl-shop.html", "nl");
    expect(s.detectedLanguage).toBe("nl");
    expect(s.businessType).toBe("webshop");
    expect(s.visibleCTA).toEqual(expect.arrayContaining(["Bestel nu"]));
    expect(s.contactFound).toBe(true);
  });

  it("marks script-rendered pages as thin and says so in limitations", () => {
    const s = scoutFrom("spa-empty.html", "en");
    expect(s.fetchStatus).toBe("thin");
    expect(s.limitations.join(" ")).toMatch(/little content/i);
  });

  it("operator industry overrides the detected business type", () => {
    const s = scoutFrom("pl-service.html", "pl");
    expect(s.businessType).not.toBe("");
  });

  it("never copies script content into the context", () => {
    const s = scoutFrom("injection.html", "en");
    expect(JSON.stringify(s)).not.toContain("alert(");
  });
});

describe("runScoutBot", () => {
  it("accepts manual html (fallback) without any network", async () => {
    const s = await runScoutBot({ html: fixture("pl-service.html"), language: "pl" });
    expect(s.fetchStatus).toBe("manual");
    expect(s.url).toBe("(manual input)");
    expect(s.limitations.join(" ")).toMatch(/ręcznie/);
  });

  it("accepts plain pasted text", async () => {
    const s = await runScoutBot({ text: "Naprawiamy rowery. Zadzwoń: +48 500 100 200", language: "pl" });
    expect(s.fetchStatus).toBe("manual");
    expect(s.contactFound).toBe(true);
  });

  it("fetches a page end to end", async () => {
    await withServer(
      (_, res) => { res.setHeader("content-type", "text/html"); res.end(fixture("nl-shop.html")); },
      async (base) => {
        const s = await runScoutBot({ url: base, language: "nl" }, {
          validateUrl: (raw) => (raw.startsWith(base) ? new URL(raw) : parsePublicUrl(raw)),
          isAddressAllowed: () => true,
        });
        expect(s.fetchStatus).toBe("ok");
        expect(s.businessType).toBe("webshop");
      },
    );
  });

  it("reports blocked URLs and offers the manual fallback", async () => {
    await expect(runScoutBot({ url: "http://169.254.169.254/", language: "en" })).rejects.toMatchObject({
      code: "blocked",
      manualFallback: true,
    });
  });

  it("requires some input", async () => {
    await expect(runScoutBot({ language: "pl" })).rejects.toBeInstanceOf(ScoutError);
  });
});
