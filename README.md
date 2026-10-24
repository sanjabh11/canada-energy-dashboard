# Canada Energy Intelligence Platform (CEIP)

Canadian energy intelligence dashboard — a React/TypeScript evidence-pack application backed by Supabase, deployed to Netlify.

**Live demo:** https://canada-energy.netlify.app · **License:** MIT ([LICENSE](LICENSE))

> Commercial positioning, proof-pack detail, sellability ratings, and the do-not-claim list live in **[docs/COMMERCIAL_STATUS.md](docs/COMMERCIAL_STATUS.md)**. Canonical positioning rules live in **[docs/COMMERCIAL_SOURCE_OF_TRUTH.md](docs/COMMERCIAL_SOURCE_OF_TRUTH.md)**. This README covers engineering onboarding only.

## Repository Snapshot

- **CI:** `.github/workflows/ci.yml` runs install → `pnpm audit` → Semgrep SAST → migration verification → `tsc -b` → **ESLint** → claim-boundary, commercial-source, repo-hygiene, client-env-safety, metadata, pilot-evidence, and positioning-audit guards → `vitest --coverage` → `vite build` + bundle budgets → Playwright smokes.
- **Workflows:** 20 workflow files under `.github/workflows/` cover CI plus scheduled data-ingest, training, and ops jobs.
- **Proof boundaries:** buyer-facing claims are enforced by `check:claim-boundaries` (428 files), commercial sources by `check:commercial-source`, and the do-not-claim list in `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`. Client-side secrets are blocked by `check:client-env-safety` scanning `src/`, `supabase/`, env files, and CI workflows for dangerous `VITE_*` keys.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | Matches the toolchain expected by Vite 7 / tsx. |
| pnpm | 10.x | Pinned via `packageManager: pnpm@10.23.0`. Enable with `corepack enable`. |
| Supabase | CLI + a project | Needed for `supabase/` edge functions, migrations, and any script that touches the database. |
| Playwright | (dev dep) | `pnpm exec playwright install chromium` before browser tests. |
| Python | 3.x | Only for `scripts/*.py` data-ingest utilities (needs `requests`/`supabase`/`sklearn` depending on the script). |

## Setup

```bash
corepack enable                # make pnpm 10 available
pnpm install                   # install dependencies
cp .env.example .env           # fill in Supabase URL + keys
pnpm dev                       # start Vite dev server
```

`.env.example` documents the required variables. `VITE_`-prefixed keys ship in the client bundle — never put secrets behind them (enforced by `pnpm run check:client-env-safety` and `check:built-client-env`).

## Architecture Map

| Path | What lives there |
|---|---|
| `src/` | React 18 + TypeScript SPA. `App.tsx` routes, `components/` UI (shadcn/ui + Tailwind), `lib/` domain logic (forecasting, proof packs, billing adapters, positioning), `hooks/`, `fixtures/`, `instrumentation/`. |
| `supabase/functions/` | ~100 Deno edge functions (`api-v2-*` endpoints, ingest crons, forecast/alert jobs). Shared code in `supabase/functions/_shared/`. |
| `supabase/migrations/` | 116 SQL migrations, applied in order via the Supabase CLI or `scripts/run-migrations-*.mjs`. |
| `supabase/config.toml`, `supabase/seed/`, `supabase/fixes/` | Local Supabase config, seed data, one-off SQL fixes. |
| `scripts/` | Node `.mjs`/`.ts`/`.sh`/`.py` automation — `check-*` guards, `report-*` generators, data import, deploy/test utilities. Full index: [scripts/README.md](scripts/README.md). |
| `tests/` | `unit/` Vitest specs, `component/` Playwright specs, `fixtures/`, `nightly/`, plus legacy Node test entry points. |
| `public/` | Static assets, `manifest.json`, status/data JSON validated by `check:public-metadata`. |
| `ops/` | Utility connector bridge ops scripts (separate from `scripts/`). |
| `docs/` | Commercial + strategy docs. Start with `docs/COMMERCIAL_STATUS.md`. |
| `.github/workflows/` | 20 workflow files: CI plus scheduled data/cron/train jobs. |
| `netlify.toml` | Netlify build config for the deployed site. |

## Key Commands

### Everyday

| Command | Purpose |
|---|---|
| `pnpm dev` | Vite dev server. |
| `pnpm build` / `pnpm build:prod` | Type-check (`tsc -b`) + Vite build (prod adds `BUILD_MODE=prod`). |
| `pnpm preview` | Preview the production build locally. |
| `pnpm test` | Vitest unit suite (`vitest run`). |
| `pnpm run lint` | ESLint over the repo. |
| `pnpm run format` / `format:check` | Prettier on `src/**/*.{ts,tsx,css}`. |

### Tests & smoke

| Command | Purpose |
|---|---|
| `pnpm run test:strategy-audit-slice` | Focused Vitest slice covering commercial positioning, forecasting, and proof-pack gates. |
| `pnpm run test:component` | Full Playwright component suite. |
| `pnpm run test:browser:phase6` | Chromium smoke of the proof-pack routes against a local preview. |
| `pnpm run test:browser:local:proof-packs` | Same smoke, grepped to the six proof-pack routes, building `dist` first. |
| `pnpm run test:browser:hosted:proof-packs` | Hosted smoke against https://canada-energy.netlify.app. |
| `pnpm run cloud:health` / `cloud:test` / `cloud:all` | Edge-function deploy + health + endpoint tests (needs Supabase env). |

### Guards (`check:*`) — most useful

| Command | Purpose |
|---|---|
| `pnpm run check:claim-boundaries` | Blocks banned/overclaim phrases in source + active docs. |
| `pnpm run check:commercial-source` | Keeps active commercial docs aligned with the source of truth (incl. the ratings table below). |
| `pnpm run check:client-env-safety` / `check:built-client-env` | Blocks secrets in `VITE_` client env and in `dist`. |
| `pnpm run check:repo-hygiene` | Blocks tracked junk (`.DS_Store`, logs, dumps, test artifacts). |
| `pnpm run check:release-readiness` | The big gate: claim, source, pilot-evidence, unit, browser, build, metadata, and bundle-budget checks in one. |
| `pnpm run check:post-deploy-live` | Live metadata + static parity + hosted proof-pack smoke after an approved deploy. |

`report:*`, `create:*`, `validate:*`, `record:*`, `prepare:*`, and `ops:*` commands generate readiness reports, evidence workspaces, and validators — see [scripts/README.md](scripts/README.md) and [docs/COMMERCIAL_STATUS.md](docs/COMMERCIAL_STATUS.md).

## Deployment

- **Hosting:** Netlify, config in `netlify.toml`; site at https://canada-energy.netlify.app.
- **Process:** `scripts/deploy-production.sh` runs pre-deploy checks (build + metadata + bundle budgets) before deploying. Production deploys require explicit approval; afterwards run `pnpm run check:post-deploy-live` for the live parity gate.
- **Edge functions:** `pnpm run cloud:deploy` (`supabase functions deploy`) or `scripts/deploy-edge-functions.sh`.

## Testing Conventions

- **Unit tests** are Vitest specs in `tests/unit/` (`*.test.ts`). Run all with `pnpm test`; run one file with `pnpm exec vitest run tests/unit/<name>.test.ts`.
- **Browser/component tests** are Playwright specs in `tests/component/` run under `playwright.config.ts` with the `chromium` project. They expect `VITE_ENABLE_EDGE_FETCH=false` so no live edge calls happen in tests; the harness builds/preview-serves the app itself.
- **Fixtures** live in `tests/fixtures/` and `src/fixtures/`; buyer-evidence style fixtures must never masquerade as real evidence (the 95% gate rejects fixture registers).
- Tests that spawn governance scripts should pass `--skip-probes` where supported to avoid hangs.

## Contributing

- Small, bounded PRs. Run `pnpm run lint`, `pnpm test`, `pnpm run build`, and `pnpm run check:repo-hygiene` before opening one.
- **Claim discipline is enforced in CI-adjacent checks.** Do not add banned phrases (production connector claims, certification claims, live-price claims, AI/GPU superiority claims) anywhere under `src/`, `public/`, `docs/growth/`, or the active commercial docs — `check:claim-boundaries` will fail. See the do-not-claim list in [docs/COMMERCIAL_STATUS.md](docs/COMMERCIAL_STATUS.md).
- Client-side env vars must use `VITE_` only for non-secret values.
- Keep proof-pack routes demonstrable; any new "sellable" claim needs a live route plus the matching guard updates.
- Husky `prepare` + lint-staged run ESLint/Prettier on staged `src/` files.

## Commercial Positioning Snapshot

> Full detail: [docs/COMMERCIAL_STATUS.md](docs/COMMERCIAL_STATUS.md). Ratings below are current sellability-confidence ratings kept in sync by `check:commercial-source` — do not edit them without matching buyer evidence.
>
> Canonical positioning: **TIER = current focused pilot hypothesis (desk-research validated only); utility forecasting = documented fallback pending buyer evidence.**

| Rank | Proof pack | Route | Rating |
|---:|---|---|---:|
| 1 | Utility demand forecast planning pack | `/utility-demand-forecast` | 4.5/5 |
| 2 | Forecast benchmarking and provenance layer | `/forecast-benchmarking` | 4.6/5 |
| 3 | OEB/AUC regulatory filing packs | `/regulatory-filing` | 4.3/5 |
| 4 | Ontario GA/ICI 5CP decision-support pack | `/ga-ici-5cp` | 4.2/5 |
| 5 | Privacy-preserving BYO-CSV proof generator | `/byo-csv-proof` | 4.1/5 |
| 6 | TIER scenario memo | `/roi-calculator` | 4.0/5 |
| 7 | TIER credit banking audit pack | `/credit-banking` | 3.9/5 |
| 8 | Asset health executive capex pack | `/asset-health` | 4.1/5 |
| 9 | Utility security procurement pack | `/utility-security` | 4.0/5 |
| 10 | Shadow billing invoice proof pack | `/shadow-billing` | 3.8/5 |
