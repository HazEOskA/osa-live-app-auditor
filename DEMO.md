# Demo (2–3 minutes)

This walks through the full loop: URL → real browser audit → real findings → real evidence →
Proof Bundle → independent verification → readable result. It uses the bundled fixture app so it
needs no internet access and no API keys.

## 0. Setup (once)

```bash
npm install
```

## 1. Start the fixture app (terminal 1)

```bash
npm run fixture:serve
# Fixture app running at http://127.0.0.1:4310
```

The fixture app (`tests/fixtures/app/`) deliberately contains one working button, one dead
button, one broken image, one link that 404s, one deliberate console error, one failed network
request, and one safe navigation link — so every finding category has something real to detect.

## 2. Start the operator UI (terminal 2)

```bash
npm run dev
# ready on http://localhost:3000
```

Open `http://localhost:3000` in a browser.

## 3. Run an audit

1. Paste `http://127.0.0.1:4310` into the URL field.
2. Click **Start audit**.
3. Watch the status pill move through `VALIDATING TARGET → STARTING BROWSER → DISCOVERING UI →
   EXECUTING CHECKS → COLLECTING EVIDENCE → GENERATING PROOF → VERIFYING → COMPLETED` (a few
   seconds total).

## 4. Inspect the results

- **Findings** panel: 8 findings, including `dead-control` for the "Do nothing" button,
  `broken-image` for the missing image, `dead-link` for the 404 link, `console-error` and
  `failed-request` for the deliberate errors. Note the *working* button does **not** appear as a
  dead control — its click reveals a hidden panel, a real observed DOM effect.
- **Screenshots** panel: the initial page load, plus before/after screenshots for every button
  that was actually clicked.
- **Target & run metadata**: root hash, event stream hash, event count, evidence file count.

## 5. Download and verify the Proof Bundle

- Click **Download proof-bundle.json** (or **Download full evidence (.zip)** for everything).
- Click **Run bundle verification** — this calls the same independent validator used by the CLI
  and reports `VALID` with a file count.

Equivalent from the command line:

```bash
npm run audit -- http://127.0.0.1:4310
# ...
# Verify with:  npm run verify -- artifacts/runs/<run-id>/proof-bundle.json

npm run verify -- artifacts/runs/<run-id>/proof-bundle.json
# Result:    VALID
```

## 6. See tamper detection actually work

```bash
RUN=$(ls -td artifacts/runs/*/ | head -1)
cp -r "$RUN" /tmp/tampered-run
echo "corrupted" >> /tmp/tampered-run/screenshots/initial.png
npm run verify -- /tmp/tampered-run/proof-bundle.json
# Result:    INVALID
#   - Evidence file modified: screenshots/initial.png (...)
echo "exit code: $?"   # 1
rm -rf /tmp/tampered-run
```

## 7. A pre-generated example is already in the repo

`artifacts/sample-run/` is a committed, real audit run of the fixture app — you can verify it
without running anything else:

```bash
npm run verify -- artifacts/sample-run/proof-bundle.json
```

## Trying it against something else

The auditor works against any `http://`/`https://` target, subject to the security boundaries in
`README.md` (no `file:`/`javascript:`/`data:`, private/internal hosts always blocked, localhost
allowed only outside `NODE_ENV=production` or via `AUDIT_HOST_ALLOWLIST`). For example, point it
at any local dev server you already have running on `localhost:3000`.
