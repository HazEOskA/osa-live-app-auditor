import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveWithinRoot, toPosixRelative } from "./safe-path";

/** Top-level run-directory entries that count as evidence for hashing/manifest purposes. */
export const EVIDENCE_ENTRIES = [
  "screenshots",
  "logs",
  "findings",
  "metadata",
  "events.jsonl",
  "audit-report.json",
];

/** Recursively lists every evidence file under the run directory, as posix-relative paths. */
export function collectEvidenceRelativePaths(runDir: string): string[] {
  const results: string[] = [];

  for (const entry of EVIDENCE_ENTRIES) {
    const absoluteEntry = resolveWithinRoot(runDir, entry);
    let stat;
    try {
      stat = statSync(absoluteEntry);
    } catch {
      continue;
    }

    if (stat.isFile()) {
      results.push(toPosixRelative(runDir, absoluteEntry));
      continue;
    }
    if (!stat.isDirectory()) continue;

    const stack = [absoluteEntry];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const dirent of readdirSync(dir, { withFileTypes: true })) {
        const childRelative = toPosixRelative(runDir, path.join(dir, dirent.name));
        const childAbsolute = resolveWithinRoot(runDir, childRelative);
        if (dirent.isDirectory()) {
          stack.push(childAbsolute);
        } else if (dirent.isFile()) {
          results.push(childRelative);
        }
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}
