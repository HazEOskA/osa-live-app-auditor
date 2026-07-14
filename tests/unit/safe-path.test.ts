import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveWithinRoot, UnsafePathError } from "@/proof/safe-path";

describe("resolveWithinRoot", () => {
  it("resolves a simple relative path inside the root", () => {
    const root = mkdtempSync(path.join(tmpdir(), "safe-path-"));
    try {
      const resolved = resolveWithinRoot(root, "screenshots/initial.png");
      expect(resolved).toBe(path.join(root, "screenshots", "initial.png"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects absolute paths", () => {
    const root = mkdtempSync(path.join(tmpdir(), "safe-path-"));
    try {
      expect(() => resolveWithinRoot(root, "/etc/passwd")).toThrow(UnsafePathError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects traversal outside the root via ..", () => {
    const root = mkdtempSync(path.join(tmpdir(), "safe-path-"));
    try {
      expect(() => resolveWithinRoot(root, "../../etc/passwd")).toThrow(UnsafePathError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlink that escapes the root", () => {
    const root = mkdtempSync(path.join(tmpdir(), "safe-path-"));
    const outside = mkdtempSync(path.join(tmpdir(), "safe-path-outside-"));
    try {
      writeFileSync(path.join(outside, "secret.txt"), "top secret");
      symlinkSync(path.join(outside, "secret.txt"), path.join(root, "evidence.txt"));
      expect(() => resolveWithinRoot(root, "evidence.txt")).toThrow(UnsafePathError);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("allows a nested directory to be created and resolved safely", () => {
    const root = mkdtempSync(path.join(tmpdir(), "safe-path-"));
    try {
      mkdirSync(path.join(root, "logs"));
      const resolved = resolveWithinRoot(root, "logs/network.json");
      expect(resolved.startsWith(root)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
