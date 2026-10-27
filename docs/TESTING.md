# Testing — clean-clone reproducibility

This is the minimal path from a fresh clone to a green unit suite. No `.env`
file, Supabase project, or hosted credential is required for the unit suite.

## Fresh clone → coverage report

```bash
pnpm i --frozen-lockfile        # pnpm@10.23.0, Node 20+
npx vitest run --coverage --no-file-parallelism
```

- Runs every `tests/unit/**/*.test.ts` serially. `--no-file-parallelism` is
  intentional: several suites spawn `node scripts/*.mjs` subprocesses and
  parallel workers contend for CPU. Serial runs finish reliably within the
  120s per-file timeout.
- Writes `coverage/lcov.info` (plus a text report). The coverage floor is
  `lines: 21` — see `vitest.config.ts`.

## Synthetic env (why tests pass without `.env`)

`tests/setup/vitest.setup.ts` injects obviously-fake fallbacks into
`import.meta.env` and `process.env` **only when a variable is unset/empty** —
real developer or CI env values always win:

| Variable | Test fallback |
|---|---|
| `VITE_SUPABASE_URL` | `https://synthetic-supabase.invalid` |
| `VITE_SUPABASE_ANON_KEY` | `synthetic-anon-key-not-a-secret` |
| `VITE_PUBLIC_APP_URL` | `https://app.invalid` |
| `VITE_UTILITY_CONNECTOR_BASE_URL` | `https://connector.invalid` |

`.invalid` is an RFC 2606 always-failing TLD, and the anon key is a
self-describing non-secret string — these exist because
`src/lib/supabaseClient.ts` calls `createClient()` at module top and throws
`supabaseUrl is required` when the env is absent. Hosted/preview tests that
exercise real Supabase, Whop, Stripe, or Netlify surfaces still require the
owner-managed env documented in `.env.example`; nothing in the unit suite
calls them.

## Gates worth running before a push

```bash
pnpm exec tsc -b                          # typecheck
node scripts/check-client-env-safety.mjs  # dangerous VITE_* names
node scripts/check-secret-scan.mjs        # credential literals (tree+history)
git diff --check                          # whitespace/conflict markers
```

Deeper ladders (lint, build, Playwright) are listed in `AGENTS.md`.
