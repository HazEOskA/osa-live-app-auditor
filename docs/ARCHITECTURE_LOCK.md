# Architecture Lock v0.1

## Product boundary

Osa Live App Auditor is a standalone reusable audit tool. It is not embedded inside Ratio Essendi and is not tied to one application.

It audits running applications through observable behavior rather than assuming that existing code equals a working feature.

## Locked execution model

```text
Audit Request
  ↓
Scenario Loader
  ↓
Browser Operator
  ├── Eyes
  ├── Hands
  └── Runtime Sensors
  ↓
Observation Correlator
  ↓
Verdict Engine
  ↓
Evidence Pack
```

## Modules

### Scenario Loader

Loads a target URL, expected outcomes, allowed actions and blocked actions.

### Browser Operator

Uses Playwright to open the application and perform user-level interactions.

### Eyes

Capture screenshots, DOM state, accessibility information and visible element state.

### Hands

Perform click, type, scroll, upload and navigation actions within policy limits.

### Runtime Sensors

Observe console messages, page errors, network requests, URL changes, storage changes and relevant DOM mutations.

### Observation Correlator

Connects one action with its resulting evidence and determines whether an observable effect occurred.

### Verdict Engine

Returns:

- `PASS` — expected effect observed
- `FAIL` — action executed but expected effect not observed, or runtime failure detected
- `BLOCKED` — audit could not safely or technically complete the step

### Evidence Pack

Produces structured JSON plus a human-readable HTML report with screenshots, trace references, observations and verdict reasons.

## Initial repository structure

```text
src/
  browser/
  core/
  sensors/
  reporter/
  policies/
scenarios/
tests/
docs/
artifacts/       # generated locally, never committed
```

## Technology lock

- Node.js
- TypeScript
- Playwright
- Vitest
- Zod
- HTML reporter
- GitHub Actions

## Non-goals for MVP v0.1

- autonomous code repair
- LLM-based planning
- unrestricted exploration
- production submissions
- audio validation
- desktop or native mobile automation
- visual-regression platform replacement

## Completion rule

A feature is not accepted because code exists or the page loads.

A feature is accepted only when it is used in a live runtime, the expected outcome is observed, and evidence is attached.
