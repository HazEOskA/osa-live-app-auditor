import { randomBytes } from "node:crypto";

export function generateRunId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const suffix = randomBytes(3).toString("hex");
  return `run-${stamp}-${suffix}`;
}
