#!/usr/bin/env tsx
import { verifyProofBundle, formatVerificationReport } from "../src/proof/validator";

async function main() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("Usage: npm run verify -- <path-to-proof-bundle.json>");
    process.exit(2);
  }

  const report = await verifyProofBundle(bundlePath);
  console.log(formatVerificationReport(report));
  process.exit(report.valid ? 0 : 1);
}

main().catch((err) => {
  console.error("Verifier crashed:", err);
  process.exit(2);
});
