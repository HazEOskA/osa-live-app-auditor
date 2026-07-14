import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { combineHashes, sha256File, sha256Hex, sha256OfObject } from "@/proof/hashing";

describe("sha256Hex", () => {
  it("matches a known SHA-256 vector", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is deterministic for the same input", () => {
    expect(sha256Hex("hello")).toBe(sha256Hex("hello"));
  });

  it("changes when input changes by a single byte", () => {
    expect(sha256Hex("hello")).not.toBe(sha256Hex("hellp"));
  });
});

describe("sha256OfObject", () => {
  it("is independent of key order", () => {
    expect(sha256OfObject({ a: 1, b: 2 })).toBe(sha256OfObject({ b: 2, a: 1 }));
  });
});

describe("sha256File", () => {
  it("hashes file contents from disk and matches sha256Hex of the same bytes", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "hash-test-"));
    const filePath = path.join(dir, "sample.txt");
    writeFileSync(filePath, "evidence contents");
    try {
      const fromFile = await sha256File(filePath);
      expect(fromFile).toBe(sha256Hex("evidence contents"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("combineHashes", () => {
  it("is order-sensitive", () => {
    const a = combineHashes(["h1", "h2"]);
    const b = combineHashes(["h2", "h1"]);
    expect(a).not.toBe(b);
  });

  it("is deterministic for the same ordered input", () => {
    expect(combineHashes(["h1", "h2", "h3"])).toBe(combineHashes(["h1", "h2", "h3"]));
  });

  it("returns a stable digest for an empty list", () => {
    expect(combineHashes([])).toHaveLength(64);
  });
});
