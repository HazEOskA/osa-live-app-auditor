import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { sha256File, sha256OfObject, combineHashes } from "./hashing";
import { resolveWithinRoot, UnsafePathError } from "./safe-path";
import { collectEvidenceRelativePaths } from "./evidence-walk";
import { proofBundleSchema, type ProofBundleParsed } from "./schemas";

export interface VerificationReport {
  valid: boolean;
  bundlePath: string;
  runDir: string;
  runId?: string;
  errors: string[];
  checkedFiles: number;
}

/**
 * Independently verifies a proof bundle. Trusts nothing from the audit run
 * itself: re-reads every evidence file from disk, recomputes every hash, and
 * compares against what the bundle claims. Never throws for verification
 * failures — those go into `errors`; it only throws for I/O errors reading
 * the bundle file itself.
 */
export async function verifyProofBundle(bundlePath: string): Promise<VerificationReport> {
  const errors: string[] = [];
  const absoluteBundlePath = path.resolve(bundlePath);
  const runDir = path.dirname(absoluteBundlePath);

  if (!existsSync(absoluteBundlePath)) {
    return { valid: false, bundlePath: absoluteBundlePath, runDir, errors: [`Bundle file not found: ${absoluteBundlePath}`], checkedFiles: 0 };
  }

  let raw: string;
  try {
    raw = readFileSync(absoluteBundlePath, "utf-8");
  } catch (err) {
    return { valid: false, bundlePath: absoluteBundlePath, runDir, errors: [`Failed to read bundle: ${(err as Error).message}`], checkedFiles: 0 };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    return { valid: false, bundlePath: absoluteBundlePath, runDir, errors: [`Bundle is not valid JSON: ${(err as Error).message}`], checkedFiles: 0 };
  }

  const schemaResult = proofBundleSchema.safeParse(parsedJson);
  if (!schemaResult.success) {
    const issues = schemaResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { valid: false, bundlePath: absoluteBundlePath, runDir, errors: [`Bundle failed schema validation:`, ...issues], checkedFiles: 0 };
  }

  const bundle: ProofBundleParsed = schemaResult.data;
  let checkedFiles = 0;

  // 1. Every manifest entry must resolve inside the run directory, exist, and hash-match.
  const manifestPaths = new Set<string>();
  const recomputedHashes: { path: string; sha256: string }[] = [];
  for (const entry of bundle.evidence) {
    manifestPaths.add(entry.path);
    let absoluteEntryPath: string;
    try {
      absoluteEntryPath = resolveWithinRoot(runDir, entry.path);
    } catch (err) {
      if (err instanceof UnsafePathError) {
        errors.push(`Manifest entry "${entry.path}" is unsafe: ${err.message}`);
        continue;
      }
      throw err;
    }

    if (!existsSync(absoluteEntryPath)) {
      errors.push(`Evidence file missing: ${entry.path}`);
      continue;
    }

    const stat = statSync(absoluteEntryPath);
    if (stat.size !== entry.bytes) {
      errors.push(`Evidence file size mismatch for ${entry.path}: manifest says ${entry.bytes} bytes, actual ${stat.size} bytes.`);
    }

    const actualHash = await sha256File(absoluteEntryPath);
    checkedFiles += 1;
    recomputedHashes.push({ path: entry.path, sha256: actualHash });
    if (actualHash !== entry.sha256) {
      errors.push(`Evidence file modified: ${entry.path} (manifest sha256 ${entry.sha256}, actual ${actualHash}).`);
    }
  }

  // 2. Detect evidence added to the run directory but absent from the manifest.
  let actualEvidencePaths: string[] = [];
  try {
    actualEvidencePaths = collectEvidenceRelativePaths(runDir);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      errors.push(`Run directory contains an unsafe path: ${err.message}`);
    } else {
      throw err;
    }
  }
  for (const actualPath of actualEvidencePaths) {
    if (!manifestPaths.has(actualPath)) {
      errors.push(`Evidence file present on disk but not declared in manifest: ${actualPath}`);
    }
  }

  // 3. Recompute the event stream hash from events.jsonl content, independent of the manifest.
  let recomputedEventStreamHash = combineHashes([]);
  let recomputedEventCount = 0;
  try {
    const eventsPath = resolveWithinRoot(runDir, "events.jsonl");
    if (existsSync(eventsPath)) {
      const eventsRaw = readFileSync(eventsPath, "utf-8");
      const lines = eventsRaw.split("\n").filter((l) => l.trim().length > 0);
      recomputedEventCount = lines.length;
      const hashes = lines.map((line, idx) => {
        try {
          return sha256OfObject(JSON.parse(line));
        } catch {
          errors.push(`events.jsonl line ${idx + 1} is not valid JSON.`);
          return "";
        }
      });
      recomputedEventStreamHash = combineHashes(hashes);
    }
  } catch (err) {
    if (err instanceof UnsafePathError) {
      errors.push(`events.jsonl path is unsafe: ${err.message}`);
    } else {
      throw err;
    }
  }

  if (recomputedEventStreamHash !== bundle.eventStreamHash) {
    errors.push(`Event stream hash mismatch: bundle says ${bundle.eventStreamHash}, recomputed ${recomputedEventStreamHash}.`);
  }
  if (recomputedEventCount !== bundle.eventCount) {
    errors.push(`Event count mismatch: bundle says ${bundle.eventCount}, recomputed ${recomputedEventCount}.`);
  }

  // 4. Recompute the root hash strictly from the manifest hashes actually recorded in the
  //    bundle (order-sorted) plus the recomputed event stream hash. This mirrors bundle-builder.
  const sortedManifestHashes = [...bundle.evidence]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((e) => e.sha256);
  const recomputedRootHash = combineHashes([...sortedManifestHashes, recomputedEventStreamHash]);
  if (recomputedRootHash !== bundle.rootHash) {
    errors.push(`Root hash mismatch: bundle says ${bundle.rootHash}, recomputed ${recomputedRootHash}.`);
  }

  // 5. Finding count sanity check against findings/findings.json if present.
  try {
    const findingsPath = resolveWithinRoot(runDir, "findings/findings.json");
    if (existsSync(findingsPath)) {
      const findings = JSON.parse(readFileSync(findingsPath, "utf-8"));
      if (Array.isArray(findings) && findings.length !== bundle.findingCount) {
        errors.push(`Finding count mismatch: bundle says ${bundle.findingCount}, findings.json has ${findings.length}.`);
      }
    }
  } catch {
    errors.push("findings/findings.json is not valid JSON.");
  }

  return {
    valid: errors.length === 0,
    bundlePath: absoluteBundlePath,
    runDir,
    runId: bundle.runId,
    errors,
    checkedFiles,
  };
}

export function formatVerificationReport(report: VerificationReport): string {
  const lines: string[] = [];
  lines.push(`Proof Bundle Verification Report`);
  lines.push(`Bundle:    ${report.bundlePath}`);
  if (report.runId) lines.push(`Run ID:    ${report.runId}`);
  lines.push(`Files checked: ${report.checkedFiles}`);
  lines.push(`Result:    ${report.valid ? "VALID" : "INVALID"}`);
  if (report.errors.length > 0) {
    lines.push("");
    lines.push("Problems found:");
    for (const err of report.errors) lines.push(`  - ${err}`);
  }
  return lines.join("\n");
}
