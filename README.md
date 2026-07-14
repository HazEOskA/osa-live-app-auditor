# Osa Live App Auditor

An autonomous QA agent that opens a live web application with a real browser, interacts with it,
and produces **verifiable evidence** of what it actually checked — not just a text summary that
claims to have checked it.

## The problem

"The page loads and the UI looks finished" is not the same claim as "this button was clicked, no
effect was observed, and here is the screenshot and DOM trace proving it." Most QA reports are
unverifiable prose. This tool instead produces a **Proof Bundle**: a hashed, independently
re-checkable manifest of every piece of evidence it collected, so a skeptical reader (or a CI job)
can confirm the audit's findings are backed by real observations rather than trust the report at
face value.

## What it does

1. Accepts a target URL from an operator (web UI or CLI).
2. Opens the page with Playwright (Chromium), waits for a stable load state.
3. Discovers visible, enabled interactive elements (buttons, links, inputs, ARIA roles).
4. Classifies every element as `safe`, `risky`, or `blocked` against a destructive-action
   deny-list, and only clicks `safe` ones.
5. Observes real effects: DOM mutations, URL changes, dialogs, console errors, uncaught
   exceptions, failed/4xx/5xx network requests, broken images, and unreachable links.
6. Turns *observed* evidence into structured findings — it never fabricates a finding that isn't
   backed by a specific piece of collected evidence.
7. Writes a self-contained run directory (screenshots, logs, findings, metadata, an append-only
   event log) and a `proof-bundle.json` that hashes every one of those files.
8. Independently re-verifies that bundle (a separate code path that trusts nothing from the audit
   run itself) and reports the result.
9. Presents all of this in an operator UI: status, findings, screenshots, downloadable bundle,
   and an on-demand "run verification" button.

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full module breakdown. In short:

```
Operator UI (Next.js)
   │  POST /api/audits  { targetUrl }
   ▼
Orchestrator (src/audit/orchestrator.ts)
   │
   ├─ Target Validator   — protocol/host allow-list, rejects file:/javascript:/data:, blocks
   │                       private/loopback IPs outside dev
   ├─ Browser Worker     — Playwright: navigate, discover, classify, click safe elements,
   │                       collect console/network/runtime evidence, screenshot
   ├─ Finding Engine     — deterministic checks turn evidence into categorized, severity-ranked
   │                       findings (never the other way around)
   └─ Proof Bundle       — hashes every evidence file + the event stream, writes proof-bundle.json
   ▼
Independent Validator (src/proof/validator.ts) — re-reads the bundle from disk, recomputes every
   hash, and reports VALID/INVALID. Has zero dependency on the orchestrator or browser worker.
```

## Deterministic ("demo") mode

The default and only mode wired into this MVP is deterministic: every finding is a rule-based
check against Playwright-observed evidence (console errors, HTTP status codes, DOM mutation
counts, etc.). It requires **no API key** and produces identical evidence categories on every run
against the same fixture. This is what makes the fixture-app integration test and the tamper tests
reproducible in CI.

An **optional AI-assisted mode** is architecturally reserved (`environment.mode` in the proof
bundle) for a future adapter that could summarize/prioritize *already-collected* findings — it
would never be allowed to originate a finding on its own, and this MVP does not wire one up, so
there's nothing to disable: it's simply not present.

## What evidence is collected

Per run, under `artifacts/runs/<run-id>/`:

- `screenshots/` — initial page screenshot, plus before/after screenshots for every safe action taken
- `logs/console.json` — console errors and warnings
- `logs/network.json` — failed requests, HTTP ≥400 responses, dead-link check results
- `logs/runtime.json` — uncaught JavaScript exceptions
- `findings/findings.json` — structured findings (category, severity, evidence references, repro steps)
- `metadata/target.json`, `metadata/environment.json` — what was audited, and with what tool versions
- `events.jsonl` — an append-only, sequence-numbered log of everything the auditor did, in order
- `audit-report.json` — a human-readable consolidated report
- `proof-bundle.json` — the hashed manifest tying all of the above together

## What the Proof Bundle proves — and what it doesn't

**It proves:** every evidence file listed in the manifest has the exact SHA-256 hash recorded at
generation time; the event stream (`events.jsonl`) has not been altered or truncated since
generation; no evidence file was deleted, and no extra file was added to the run directory without
being declared; and the bundle's own root hash is internally consistent with its manifest.

**It does not prove:** that the machine which ran the audit wasn't compromised, that the target
application will behave identically on a different run, or that the bundle's own top-level fields
(e.g. `status`, `runId`) weren't rewritten *together with* a re-derived root hash — there is no
external signing key, so a fully-regenerated, self-consistent bundle cannot be distinguished from
a genuine one by hash-checking alone. The verifier's job is tamper-evidence of a **delivered**
bundle against **its own recorded evidence**, not a cryptographic signature of authorship.

## Security boundaries

- Only `http://` and `https://` targets are accepted; `file:`, `javascript:`, `data:`, and any
  other protocol are rejected before a browser is ever launched.
- Loopback/localhost targets are allowed only when `NODE_ENV !== "production"` (or via explicit
  `AUDIT_HOST_ALLOWLIST`); private RFC1918 and link-local addresses (including the
  `169.254.169.254` cloud metadata address) are **always** rejected, in every environment.
- `AUDIT_HOST_ALLOWLIST` (comma-separated hostnames, `*.suffix` wildcards supported) restricts
  which public hosts can be audited at all, when set.
- A destructive-action deny-list (`src/audit/safe-actions.ts`) blocks clicks on anything that
  looks like delete/purchase/logout/unsubscribe/publish/etc.; file upload controls and
  `javascript:`/`data:` links are never actioned; form submit and password fields are marked
  `risky` and are never auto-clicked. Extend the list via `AUDIT_DENY_LABELS`.
- Every run enforces a max action count, a per-action timeout, a navigation timeout, and a total
  run deadline; the browser is always closed in a `finally` block.
- Evidence file paths are resolved through `resolveWithinRoot` (rejects absolute paths, `..`
  traversal, and symlink escapes) everywhere the proof system or the API touches the filesystem.

## Local setup

```bash
npm install
```

Playwright's Chromium must be available; in most environments `npx playwright install chromium`
is needed once (this repo pins `playwright@1.56.1` to match a specific Chromium build — see
"Known limitations" below if your environment already has a matching browser cached).

## Commands

```bash
# Development server (operator UI + API routes)
npm run dev

# Lint / typecheck / unit+integration+tamper tests / production build
npm run lint
npm run typecheck
npm test
npm run build

# Run one audit from the CLI (writes to artifacts/runs/<run-id>/)
npm run audit -- http://localhost:3000 [maxActions]

# Independently verify a proof bundle
npm run verify -- artifacts/runs/<run-id>/proof-bundle.json

# Serve the local fixture app (has one working button, one dead button, one
# broken image, one 404 link, one console error, one failed request, one safe link)
npm run fixture:serve
```

## Demo flow

See [`DEMO.md`](DEMO.md) for a reproducible 2–3 minute walkthrough, and
`artifacts/sample-run/` for a real, independently-verifiable audit run committed to this repo.

## Status

Implemented: audit orchestrator, Playwright browser worker, deterministic finding engine, Proof
Bundle generation, independent validator with tamper-detection tests, operator UI, fixture app,
unit/integration/tamper test suites, production build. See "Known limitations" in `ARCHITECTURE.md`
for what is deliberately out of scope for this MVP.
