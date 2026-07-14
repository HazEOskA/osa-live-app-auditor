#!/usr/bin/env tsx
import { runAudit } from "../src/audit/orchestrator";

async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error("Usage: npm run audit -- <targetUrl> [maxActions]");
    process.exit(2);
  }
  const maxActions = process.argv[3] ? Number(process.argv[3]) : undefined;

  console.log(`Starting audit of ${targetUrl} ...`);
  const result = await runAudit({
    targetUrl,
    maxActions,
    onStatusChange: (status) => console.log(`[status] ${status}`),
  });

  console.log("");
  console.log(`Run ID:      ${result.runId}`);
  console.log(`Run dir:     ${result.runDir}`);
  console.log(`Status:      ${result.status}`);
  console.log(`Findings:    ${result.findings.length}`);
  if (result.verification) {
    console.log(`Verified:    ${result.verification.valid ? "VALID" : "INVALID"}`);
  }
  if (result.error) {
    console.log(`Error:       ${result.error}`);
  }
  if (result.proofBundle) {
    console.log(`Proof bundle: ${result.runDir}/proof-bundle.json`);
    console.log(`Verify with:  npm run verify -- ${result.runDir}/proof-bundle.json`);
  }

  process.exit(result.status === "COMPLETED" ? 0 : 1);
}

main().catch((err) => {
  console.error("Audit crashed:", err);
  process.exit(2);
});
