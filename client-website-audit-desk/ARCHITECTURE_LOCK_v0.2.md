# ARCHITECTURE LOCK v0.2 — Client Website Audit Desk + ScoutBot

Supersedes `ARCHITECTURE_LOCK_v0.1` (scope lock unchanged). v0.2 folds in the senior review findings.
Lives in `client-website-audit-desk/`; the repository root still holds the separate runtime-auditor docs.

## Flow

```
URL (or pasted HTML/text)
  → /api/scout → ScoutBot → Scout Context (Zod-validated)
  → /api/audit → deterministic score (scoring.ts) + AI narrative (Zod structured output) | template fallback
  → Audit Report → dashboard · print/PDF · copyable client message
  → history (browser localStorage)
```

## Decisions (and what changed vs v0.1)

| # | Decision |
|---|---|
| 1 | App lives in `client-website-audit-desk/` inside the existing repo; root docs untouched. |
| 2 | **SSRF protection** (`lib/ssrf.ts`, `lib/fetchPublicWebsite.ts`): http/https only, ports 80/443, no credentials, no literal private IPs, no internal hostnames; DNS result validated **at connect time** (blocks rebinding); every redirect re-validated, max 5; 10 s total timeout; 1.5 MB cap counted **after** decompression; html content-types only. |
| 3 | **Storage**: browser `localStorage` (max 50, schema-validated on read). No server-side JSON file (Vercel filesystem is not durable). Server persistence is v0.3. |
| 4 | **Access gate** (`lib/guard.ts`): fail-closed — in production `/api/*` returns 503 unless `ACCESS_PASSWORD` is set (`ALLOW_OPEN_ACCESS=true` is for local dev/tests only). Constant-time compare, per-IP rate limit (best-effort per instance), body size cap. Set a spend limit at the LLM provider. |
| 5 | **Score is deterministic** (`lib/scoring.ts`, 7 weighted criteria = 100 pts) computed from Scout Context only. The AI writes narrative and never changes the number. |
| 6 | **LLM**: Anthropic SDK, structured output validated by Zod, one retry, then template fallback with a visible warning. Default model `claude-opus-5-5`, override with `AUDIT_MODEL`. No key ⇒ template audit (`source: "template"`). |
| 7 | **Prompt injection**: page text is fenced in `<page_data>` as untrusted data, closing tags neutralised; system prompt forbids following it; output is always human-reviewed, nothing is auto-sent. |
| 8 | **Honesty**: Scout Context carries `fetchStatus` and `limitations[]`; reports state what was not verified (subpages, performance, JS-rendered content). Thin/SPA pages are flagged. |
| 9 | **PDF** = print-optimised HTML (`window.print()` on the dashboard + `/api/pdf` standalone doc). Works on phones, no headless browser on serverless. Server-side PDF is v0.3. |
| 10 | **Manual fallback**: pasted HTML/text goes through the same ScoutBot pipeline (`fetchStatus: "manual"`). |
| 11 | **Mobile proof** = Playwright Pixel 7 emulation (stated as emulation). A physical-phone check remains a manual step. |
| 12 | Tests first-class: HTML fixtures (PL/EN/NL/SPA/injection), SSRF + fetch tests against a local server, engine/guard/storage/pdf tests, Playwright E2E, CI workflow, `npm run proof`. |

## Still out of scope (unchanged)

Crawler, pentest/port scanning, auto-mailing, CRM, payments, user accounts, multi-user SaaS, production DB.

## Open items (cannot be decided by code)

- Vercel project, env vars and the live URL — require the owner's account (see README → Deploy).
- Real-phone check and a real-site sample audit with a live `ANTHROPIC_API_KEY` — not executed in the build environment.
