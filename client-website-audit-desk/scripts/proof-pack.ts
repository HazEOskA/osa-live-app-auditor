/**
 * Runs the validation chain and writes artifacts/proof/PROOF.md + proof.json.
 * Every line is a real exit code from a real command; nothing is hand-written.
 * Usage: npm run proof   (set PW_CHROMIUM_PATH if Playwright's own Chromium is not installed)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface Step {
  name: string;
  cmd: string;
  args: string[];
}

const steps: Step[] = [
  { name: "lint", cmd: "npm", args: ["run", "lint"] },
  { name: "typecheck", cmd: "npm", args: ["run", "typecheck"] },
  { name: "unit tests", cmd: "npm", args: ["test"] },
  { name: "build", cmd: "npm", args: ["run", "build"] },
  { name: "e2e (mobile emulation)", cmd: "npm", args: ["run", "test:e2e"] },
];

const outDir = path.join(process.cwd(), "artifacts", "proof");
fs.mkdirSync(outDir, { recursive: true });

const results = steps.map((s) => {
  const started = Date.now();
  const r = spawnSync(s.cmd, s.args, { encoding: "utf8", shell: process.platform === "win32" });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  fs.writeFileSync(path.join(outDir, `${s.name.replace(/\W+/g, "-")}.log`), output);
  const tail = output.trim().split("\n").slice(-3).join(" | ").slice(0, 300);
  console.log(`${r.status === 0 ? "PASS" : "FAIL"}  ${s.name}`);
  return { name: s.name, status: r.status === 0 ? "PASS" : "FAIL", exitCode: r.status, seconds: Math.round((Date.now() - started) / 100) / 10, tail };
});

const git = (args: string[]) => spawnSync("git", args, { encoding: "utf8" }).stdout?.trim() ?? "unknown";
const meta = { generatedAt: new Date().toISOString(), commit: git(["rev-parse", "HEAD"]), node: process.version, liveUrl: process.env.LIVE_URL ?? "unknown (not deployed / LIVE_URL not set)" };

fs.writeFileSync(path.join(outDir, "proof.json"), JSON.stringify({ meta, results }, null, 2));
fs.writeFileSync(
  path.join(outDir, "PROOF.md"),
  [
    "# Proof pack",
    "",
    `- Commit: \`${meta.commit}\``,
    `- Node: ${meta.node}`,
    `- Generated: ${meta.generatedAt}`,
    `- Live URL: ${meta.liveUrl}`,
    "",
    "| Step | Result | Seconds | Last output |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.name} | ${r.status} | ${r.seconds} | ${r.tail.replace(/\|/g, "\\|")} |`),
    "",
    "Not covered by this script: Vercel deploy and a check on a physical phone (see README, section Deploy).",
    "",
  ].join("\n"),
);

process.exit(results.every((r) => r.status === "PASS") ? 0 : 1);
