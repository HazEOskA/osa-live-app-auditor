import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256File, sha256OfObject, combineHashes } from "./hashing";
import { resolveWithinRoot } from "./safe-path";
import { collectEvidenceRelativePaths } from "./evidence-walk";
import { PROOF_SCHEMA_VERSION } from "./schemas";
import type {
  EnvironmentInfo,
  EvidenceFileManifestEntry,
  ProofBundle,
  TargetInfo,
  AuditStatus,
} from "@/shared/types";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".jsonl": "application/x-ndjson",
  ".txt": "text/plain",
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function buildEvidenceManifest(runDir: string): Promise<EvidenceFileManifestEntry[]> {
  const relativePaths = collectEvidenceRelativePaths(runDir);
  const manifest: EvidenceFileManifestEntry[] = [];

  for (const relativePath of relativePaths) {
    const absolutePath = resolveWithinRoot(runDir, relativePath);
    const sha256 = await sha256File(absolutePath);
    const bytes = statSync(absolutePath).size;
    manifest.push({ path: relativePath, sha256, bytes, contentType: contentTypeFor(relativePath) });
  }

  manifest.sort((a, b) => a.path.localeCompare(b.path));
  return manifest;
}

function computeEventStreamHash(runDir: string): { hash: string; eventCount: number } {
  const eventsPath = resolveWithinRoot(runDir, "events.jsonl");
  let raw = "";
  try {
    raw = readFileSync(eventsPath, "utf-8");
  } catch {
    return { hash: combineHashes([]), eventCount: 0 };
  }

  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  const hashes = lines.map((line) => sha256OfObject(JSON.parse(line)));
  return { hash: combineHashes(hashes), eventCount: lines.length };
}

export interface BuildProofBundleParams {
  runDir: string;
  runId: string;
  target: TargetInfo;
  startedAt: string;
  completedAt: string;
  status: AuditStatus;
  environment: EnvironmentInfo;
  executedChecks: string[];
  findingCount: number;
}

export async function buildProofBundle(params: BuildProofBundleParams): Promise<ProofBundle> {
  const evidence = await buildEvidenceManifest(params.runDir);
  const { hash: eventStreamHash, eventCount } = computeEventStreamHash(params.runDir);
  const rootHash = combineHashes([...evidence.map((e) => e.sha256), eventStreamHash]);

  const bundle: ProofBundle = {
    schemaVersion: PROOF_SCHEMA_VERSION,
    runId: params.runId,
    target: params.target,
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    status: params.status,
    environment: params.environment,
    executedChecks: params.executedChecks,
    eventCount,
    findingCount: params.findingCount,
    evidence,
    eventStreamHash,
    rootHash,
    verification: {
      instructions:
        "Run the independent validator against this file. It re-reads every evidence file from disk, recomputes each SHA-256 hash, recomputes the event stream hash and the root hash, and exits non-zero if anything was modified, added, missing, or path-unsafe.",
      command: `npm run verify -- artifacts/runs/${params.runId}/proof-bundle.json`,
    },
  };

  const bundlePath = resolveWithinRoot(params.runDir, "proof-bundle.json");
  writeFileSync(bundlePath, JSON.stringify(bundle, null, 2), "utf-8");

  return bundle;
}
