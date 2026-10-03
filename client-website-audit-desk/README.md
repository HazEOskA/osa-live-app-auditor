# Client Website Audit Desk v0.1 (+ ScoutBot)

Operator pastes a client's URL → **ScoutBot** reads the public homepage and builds a compact **Scout Context** → the **Audit Engine** returns a score (0–100), recommendations and a ready-to-edit client message → print/save as PDF → history.

A sales/content/conversion tool. **Not** a security scanner or crawler. Nothing is sent to clients automatically.

Architecture: [`ARCHITECTURE_LOCK_v0.2.md`](ARCHITECTURE_LOCK_v0.2.md)

## Run locally

```bash
npm install
cp .env.example .env.local     # set ALLOW_OPEN_ACCESS=true for local dev, optionally ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the app still works: score and facts are real, wording comes from a deterministic template (marked `szablon (bez AI)`).

## Verify

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx playwright install chromium && npm run test:e2e   # or PW_CHROMIUM_PATH=/path/to/chromium
npm run proof                                         # writes artifacts/proof/PROOF.md
```

## Environment

| Variable | Purpose |
|---|---|
| `ACCESS_PASSWORD` | **Required in production.** Operators enter it in the form; sent as `x-access-password`. |
| `ALLOW_OPEN_ACCESS` | `true` only for local dev/tests (otherwise `/api/*` is 503 without a password). |
| `ANTHROPIC_API_KEY` | Optional. Enables the AI narrative. Set a spend limit in the provider console. |
| `AUDIT_MODEL` | Optional model override (default `claude-opus-5-5`). |

## Deploy (Vercel)

1. Import the GitHub repo in Vercel and set **Root Directory** to `client-website-audit-desk`.
2. Add `ACCESS_PASSWORD` (and optionally `ANTHROPIC_API_KEY`, `AUDIT_MODEL`) for Preview and Production.
3. Deploy the preview, open it on a real phone, run one audit, then promote to production.
4. Record the URL: `LIVE_URL=https://… npm run proof`.

## Safety notes

- URL fetching is SSRF-hardened (see lock v0.2, decision 2). Private/internal targets are refused.
- Page text is treated as untrusted data in the LLM prompt.
- History lives only in the operator's browser (`localStorage`).
- The rate limiter is per server instance (best effort); the hard cost cap is your LLM provider's spend limit.
