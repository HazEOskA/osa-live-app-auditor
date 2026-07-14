# Architecture

This document describes the implementation as it actually exists in this repository. For the
original pre-implementation design notes, see `docs/ARCHITECTURE_LOCK.md`, `docs/MVP_SCOPE.md`,
and `docs/SAFETY_POLICY.md` — this MVP followed their module boundaries closely, adapted to the
concrete Proof Bundle / verifier contract described here.

## Stack

- Next.js 16 (App Router) — operator UI + API routes, single deployable unit
- TypeScript, strict mode
- Playwright (`chromium`, headless) — the browser worker
- Zod — proof bundle schema validation
- Vitest — unit, integration, and tamper-detection tests
- Node's built-in `crypto` — SHA-256 hashing, no external hashing dependency

## Module map

```
src/
  audit/
    orchestrator.ts        Wires everything below into one run; owns the run directory,
                            the event log, and the AuditStatus state machine.
    target-validator.ts     URL normalization + protocol/host allow-list.
    browser-worker.ts       Playwright: navigation, element discovery, safe-click execution,
                            console/network/runtime evidence collection, screenshots.
    safe-actions.ts         Destructive-label deny-list + safe/risky/blocked classification.
    run-id.ts, event-log.ts  Small run-scoped utilities.
    checks/                 One deterministic check per finding category (console errors,
                             runtime errors, network failures, broken images, dead links,
                             dead controls, accessibility name checks).
    findings/               Finding ID generation, severity mapping, and the aggregator
                             (build-findings.ts) that runs every check and returns Finding[].
  proof/
    stable-json.ts          Deterministic JSON serialization (sorted object keys) — the
                             foundation every hash is computed over.
    hashing.ts               sha256Hex / sha256File / sha256OfObject / combineHashes.
    safe-path.ts             resolveWithinRoot: rejects absolute paths, `..` traversal, and
                             symlink escapes. Used by the bundle builder, the validator, and
                             the screenshot API route.
    evidence-walk.ts          Shared file-enumeration logic used by both the bundle builder
                             (to build the manifest) and the validator (to detect files added
                             to the run directory without being declared).
    schemas.ts                Zod schemas for Finding / AuditEvent / ProofBundle.
    bundle-builder.ts          Builds proof-bundle.json from a completed run directory.
    validator.ts               Independent verifier. No import of orchestrator/browser-worker.
  shared/
    types.ts, errors.ts        Cross-cutting types (AuditStatus, Finding, ProofBundle, ...)
                             and the AuditError/ProofVerificationError classes.
  app/
    page.tsx                  Operator UI (client component): submit URL, poll status,
                             view findings/screenshots, download bundle, run verification.
    api/audits/route.ts        POST start an audit (fire-and-forget + in-memory run registry
                             for live polling), GET list past + in-flight runs.
    api/audits/[runId]/...     Status, verify (re-runs the independent validator), proof-bundle
                             download, screenshot serving, zip-of-run-directory download.
scripts/
  run-audit.ts                CLI: npm run audit -- <url>
  verify.ts                    CLI: npm run verify -- <proof-bundle.json>
  serve-fixture.ts              Standalone fixture-app server for manual runs/demos.
tests/
  unit/                       stable-json, hashing, safe-path, severity mapping, safe-actions
                             deny-list, target-validator, finding/bundle schema tests.
  integration/                 Full orchestrator run against the local fixture app; asserts
                             specific findings for specific fixture defects, not just "some
                             findings exist."
  tamper/                       Builds a minimal valid run+bundle directly via bundle-builder
                             (bypassing the browser, for speed), then tampers a fresh clone
                             per test and asserts the validator rejects it.
  fixtures/                    The static fixture app + a tiny Node http server for it.
```

## Why the audit runtime and the proof system are separate

`src/audit/*` produces evidence and writes it to disk. `src/proof/*` only ever reads a run
directory back from disk to hash it (`bundle-builder.ts`) or re-verify it (`validator.ts`).
Nothing in `src/proof` imports from `src/audit`, and `validator.ts` specifically does not import
`bundle-builder.ts` either — it recomputes everything from first principles (re-reading files,
re-hashing, re-deriving the event stream hash and root hash) so that a bug in the builder can't
silently make the validator agree with it. The CLI (`npm run verify`) and the API route
(`POST /api/audits/[runId]/verify`) both call the exact same `verifyProofBundle` function.

## Execution flow and the UI state machine

`orchestrator.ts` drives these `AuditStatus` values, in order, persisting most of them as
`status-changed` events in `events.jsonl`:

```
VALIDATING_TARGET → STARTING_BROWSER → DISCOVERING_UI → EXECUTING_CHECKS →
COLLECTING_EVIDENCE → GENERATING_PROOF → VERIFYING → COMPLETED | FAILED
```

One subtlety that shaped the implementation: **the event log is itself hashed evidence** (it's
part of the proof bundle's manifest, and its content also produces the separate
`eventStreamHash`). That means it must be completely frozen — no more appends — before
`buildProofBundle` reads it. The two post-freeze states (`GENERATING_PROOF`, `VERIFYING`) are
therefore reported to the UI/CLI live (via `onStatusChange`) but are **not** written to
`events.jsonl`; only stages up through evidence/finding writing are persisted as events. An early
version of this code appended a `status-changed` event *after* the bundle was built, which grew
`events.jsonl` past the hash the bundle had just recorded — every self-verification failed. Fixed
by moving the final `run-completed`/`run-failed` event append to just before proof generation
starts, and by keeping `GENERATING_PROOF`/`VERIFYING`/final-status transitions in-memory only.

## Design choices worth calling out

- **Anchors are checked, not clicked.** Rather than navigating away from the audited page to
  follow every link (which would cost the single browser session its ability to keep testing
  other elements, and complicates "what page is this evidence from"), the dead-link check issues
  a same-origin-or-not HTTP GET via Playwright's `APIRequestContext` for each discovered anchor
  href and records the status code. This is deterministic, fast, bounded (`maxDeadLinkChecks`),
  and doesn't require the crawling this MVP explicitly excludes.
- **Dead-control detection is evidence-based, not heuristic.** A safe element is classified
  `dead-control` only if it was actually clicked, dispatch succeeded, and *none* of {DOM mutation
  count > 0 via a `MutationObserver`, URL change, dialog appearance} was observed in the 600ms
  after the click. The fixture app's "working button" (which reveals a hidden panel) is asserted
  in the integration test to specifically *not* produce this finding.
- **Zip download shells out to the system `zip` binary** (`bundle-zip` API route) rather than
  adding a zip library dependency, since it's a single feature with a fixed, non-shell argv and a
  validated run directory as its only input.
- **In-memory run registry for live status**, keyed by run ID, in the Next.js API layer. This is
  intentionally simple (module-level `Map`) and does not survive a server restart mid-run — but
  every completed/failed run's full state is durably readable from `audit-report.json` and
  `proof-bundle.json` on disk regardless, so a restart only affects the "still running" polling
  experience, not the evidence itself.

## Known limitations

- No crawling: only the single page at the target URL is audited (per scope lock).
- Broken-image detection only catches images that have already attempted to load by the time
  evidence is collected; lazy-loaded off-screen images may be missed.
- DNS-based SSRF protection is host-literal only (RFC1918/loopback/link-local pattern match); it
  does not resolve DNS to check for rebinding to a private address after validation.
- The in-memory run registry means the "list of in-flight runs" resets on a server restart (see
  above) — finished runs are unaffected since they're read from disk.
- No authentication on the operator UI/API — this matches the scope lock ("do not add
  authentication") and assumes a trusted single-operator deployment.
- The optional AI-assisted summarization mode described in the mission brief is not implemented;
  `environment.mode` is reserved for it but always reports `"demo"` in this MVP.
- Vercel deployment: the frontend/API routes are Next.js and Vercel-compatible, but **Playwright
  browser execution does not work in Vercel's serverless/edge runtimes** — see the Deployment
  section of `DEMO.md` for the recommended split (frontend on Vercel, browser worker on a
  container/VM host such as Railway or a small VPS with Chromium available).
