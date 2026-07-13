# MVP Scope v0.1

## Objective

Build one reliable vertical slice that proves the auditor can detect interactive UI elements that do not produce a meaningful runtime effect.

## Input

A local or preview web application URL plus a scenario configuration.

Example:

```json
{
  "targetUrl": "http://localhost:3000",
  "mode": "safe-discovery",
  "maxActions": 25
}
```

## Required flow

1. Launch Chromium with Playwright.
2. Open the target URL.
3. Wait for the application to reach a stable initial state.
4. Capture an initial screenshot and runtime baseline.
5. Discover visible interactive elements.
6. Classify every candidate as safe, risky or blocked.
7. Execute safe actions one at a time.
8. Capture before/after evidence for each action.
9. Observe:
   - DOM mutations
   - URL or navigation changes
   - dialogs, drawers, panels or new content
   - network activity
   - console and page errors
   - localStorage and sessionStorage changes
10. Produce a verdict for every attempted action.
11. Generate JSON and HTML reports.
12. Save Playwright trace and screenshots locally.

## Interactive element discovery

At minimum detect visible and enabled:

- buttons
- links
- inputs and textareas
- selects
- elements with button/link roles
- elements with click handlers or pointer-like interaction hints when discoverable

The report must include a stable element description based on accessible name, role, text and selector metadata.

## Dead interaction rule

A candidate may be classified as `FAIL_DEAD_INTERACTION` when:

- the action was successfully dispatched,
- no expected outcome was defined and no meaningful observable effect occurred,
- no DOM mutation, navigation, new visible state, relevant request or persisted state change was detected,
- and the element visually or semantically presented itself as interactive.

Animations, focus changes and hover-only style changes do not count as meaningful product effects by themselves.

## Required outputs

```text
artifacts/<run-id>/
  report.json
  report.html
  trace.zip
  screenshots/
  logs/
```

Generated artifacts must stay outside Git history.

## Acceptance fixture

Create a controlled fixture containing:

- one working button that opens visible content,
- one working navigation link,
- one button that triggers a request,
- one deliberately dead button,
- one destructive-looking action that must be blocked.

Expected result:

- working controls receive `PASS`,
- dead button receives `FAIL_DEAD_INTERACTION`,
- destructive action receives `BLOCKED_BY_POLICY`,
- each verdict includes evidence.

## Definition of Done

MVP v0.1 is complete only when:

- automated tests pass,
- the controlled fixture produces all expected verdicts,
- HTML report opens locally,
- trace can be inspected,
- no risky action is executed,
- a second real OsaTechGPT preview can be audited without modifying auditor source code.
