# AGENTS.md — Canada Energy Dashboard

## Security incidents — READ FIRST

`docs/security/SECRET_EXPOSURE_INCIDENTS.md` is the authoritative secret-exposure
register. INC-001 (Supabase `service_role` key) is the **only open owner action** —
rotate it in the Supabase dashboard. INC-002 (Gemini key) is **closed**
(owner-verified revoked, live probe `API_KEY_INVALID` 2026-10-06). Do not
re-investigate from scratch; read the register. Do not block repository work on
the open owner action.

## Read-only checks (safe to run; no writes, no network mutation, no secrets printed)

- `pnpm exec tsc -b` — typecheck
- `pnpm run lint` — ESLint
- `node scripts/check-client-env-safety.mjs` — scans for dangerous `VITE_*` names
- `node scripts/check-secret-scan.mjs` — scans tracked+untracked files for credential
  literals (JWT/Google/Stripe/AWS patterns); reports documented history
- `node scripts/check-dep-audit.mjs` — `pnpm audit` with documented exceptions
- `node scripts/check-claim-boundaries.mjs`, `check-commercial-source-docs.mjs`,
  `check-repo-hygiene.mjs`, `check-lint-warning-baseline.mjs`
- `node scripts/verify-positioning-audit.mjs --strict`
- `git diff --check`, `git status`, `git log` — all read-only

## Working rules

- Preserve the dirty worktree — extensive WIP is intentional; never `git reset`/`clean`.
- `.env`/`.env.local` are untracked, mode 600, owner-managed — do not read or print them.
- Package manager: `pnpm@10.23.0`. Node 20+.
- Deploy, outreach, payments, and production config are human-gated — no agent action.

## Verification ladder

`pnpm exec tsc -b` → `pnpm run lint` → `npx vitest run <slice>` → `pnpm run build` →
the `check:*` gates above → `npx playwright test tests/component/<spec>` →
full `npx vitest run --coverage --no-file-parallelism` (serial — spawn tests contend).
