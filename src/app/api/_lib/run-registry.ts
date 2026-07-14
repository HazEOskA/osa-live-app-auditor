import path from "node:path";
import type { AuditStatus } from "@/shared/types";

export const ARTIFACTS_ROOT = path.join(process.cwd(), "artifacts", "runs");

const RUN_ID_PATTERN = /^run-[0-9A-Za-z:.\-]+-[0-9a-f]{6}$/;

export function isValidRunId(runId: string): boolean {
  return RUN_ID_PATTERN.test(runId);
}

/** Resolves a runId to its run directory, rejecting anything that isn't a well-formed run ID. */
export function resolveRunDir(runId: string): string | null {
  if (!isValidRunId(runId)) return null;
  const dir = path.resolve(ARTIFACTS_ROOT, runId);
  const rootWithSep = ARTIFACTS_ROOT.endsWith(path.sep) ? ARTIFACTS_ROOT : ARTIFACTS_ROOT + path.sep;
  if (!dir.startsWith(rootWithSep)) return null;
  return dir;
}

export interface LiveRunState {
  runId: string;
  status: AuditStatus;
  targetUrl: string;
  startedAt: string;
}

// Tracks in-flight runs for this Node process. Completed runs are read back
// from their run directory on disk instead, so this only needs to cover the
// window between "audit requested" and "evidence written to disk."
const liveRuns = new Map<string, LiveRunState>();

export function setLiveRunState(state: LiveRunState): void {
  liveRuns.set(state.runId, state);
}

export function getLiveRunState(runId: string): LiveRunState | undefined {
  return liveRuns.get(runId);
}

export function listLiveRuns(): LiveRunState[] {
  return [...liveRuns.values()];
}
