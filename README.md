# Osa Live App Auditor

Evidence-driven runtime auditor for web applications.

This project does not review only source code. It opens a real application, interacts with it like a user, observes runtime effects, and produces a verdict backed by evidence.

## Mission

Turn this:

> The page loads and the UI looks finished.

into this:

> The visible feature was used, its expected effect was observed, and evidence was captured.

## Core capabilities

- **Eyes:** screenshots, DOM snapshots, accessibility tree, visible-state inspection
- **Hands:** click, type, scroll, upload, navigate
- **Sensors:** console, network, storage and page-state observation
- **Verdict:** `PASS`, `FAIL` or `BLOCKED`
- **Evidence:** before/after screenshots, Playwright trace, runtime logs and HTML report
- **Ears:** audio capture and transcript validation in a later phase

## MVP v0.1

```text
URL
→ open application
→ map visible interactive elements
→ perform safe actions
→ observe runtime effects
→ collect evidence
→ produce PASS / FAIL / BLOCKED report
```

The first acceptance test is detection of a dead button: an element looks interactive, receives a click, but causes no DOM, navigation, network or state change.

## Planned stack

- Node.js
- TypeScript
- Playwright
- Vitest
- Zod
- HTML reporter
- GitHub Actions

MVP v0.1 is deterministic and does not require an LLM.

## Safety

Destructive actions, payments, production submissions, message sending and data deletion are blocked by default. Risky actions require an explicit approval gate.

Do not commit generated evidence, private preview URLs, credentials or customer data. This repository may be public.

## Documentation

- [`docs/ARCHITECTURE_LOCK.md`](docs/ARCHITECTURE_LOCK.md)
- [`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md)
- [`docs/SAFETY_POLICY.md`](docs/SAFETY_POLICY.md)

## Status

`ARCHITECTURE LOCKED / IMPLEMENTATION NOT STARTED`
