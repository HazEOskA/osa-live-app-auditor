# Safety Policy v0.1

## Default posture

The auditor is read-oriented and non-destructive by default. A visible control is not automatically authorized for execution.

## Action classes

### SAFE

May run automatically in an isolated test environment:

- opening pages
- scrolling
- expanding navigation
- switching tabs or panels
- typing synthetic test data into non-sensitive fields
- opening and closing dialogs
- interacting with local test fixtures

### RISKY

Requires explicit scenario authorization or an approval gate:

- submitting forms
- uploading files
- changing account or application settings
- triggering external API calls with side effects
- sending test messages
- creating records
- starting deployments or workflows

### BLOCKED

Must never run automatically:

- payments, purchases or financial transfers
- deleting production data
- sending real emails, DMs or notifications
- publishing public content
- modifying authentication, permissions or secrets
- accepting legal agreements
- irreversible production actions
- bypassing security controls

## Environment policy

Preferred order:

1. controlled local fixture
2. isolated preview deployment
3. staging environment with synthetic data
4. production only in read-only mode unless explicitly approved

## Data policy

Never commit:

- credentials or tokens
- session cookies
- private preview URLs
- customer or employee data
- screenshots containing sensitive information
- Playwright traces from private systems
- generated audit artifacts

Secrets must be provided through environment variables and excluded by `.gitignore`.

## Network policy

The auditor records request metadata needed for evidence but must redact authorization headers, cookies, tokens and sensitive request bodies before generating reports.

## Execution limits

Every run must support:

- maximum action count
- maximum run duration
- same-origin restriction by default
- domain allowlist
- immediate stop on policy violation
- deterministic run identifier

## Approval gate

A risky action may proceed only when the scenario explicitly declares:

- exact action
- expected target
- allowed environment
- expected effect
- rollback or cleanup method

## Failure behavior

When uncertain, the auditor returns `BLOCKED` rather than guessing or executing a potentially harmful action.
