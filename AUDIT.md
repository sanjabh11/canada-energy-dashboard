# AUDIT — Canada Energy Intelligence Platform

**Audited commit:** `1c450b5` (2026-07-16)  
**Audit date:** 2026-07-26  
**Method:** Read-only inspection. Commands run: `tsc -b`, `vitest run`, `vite build`, `pnpm audit`, `gh run list`, `grep` sweeps, targeted file reads. Playwright smoke was authorized but deferred due to hung test suite (see F-7). All claims below are backed by session-observed evidence unless tagged `[UNVERIFIED]`.

---

## Repo Map

React 18 + TypeScript + Vite 7 SPA on Netlify, Supabase backend (112 migrations, 38 RLS policy files, 86 Edge Functions). 129 route definitions across 70 lazy-loaded chunks. 59 governance scripts (`scripts/check-*.mjs`, `scripts/report-*.mjs`). Three billing providers: Whop (primary auth), Stripe, Paddle, plus a Lemon Squeezy adapter. Monetization logic spans `entitlements.ts`, `pricingCatalog.ts`, `billingAdapter.ts`, and four provider-specific components.

---

## Findings (17 actionable, F-1–F-17; F-18 informational = 18 entries)

### Security

**F-1. Client-exposed Lemon Squeezy webhook secret and API key**  
Where: `src/lib/lemonSqueezyAdapter.ts:59-60,391`  
Consequence: `VITE_LEMON_SQUEEZY_WEBHOOK_SECRET` and `VITE_LEMON_SQUEEZY_API_KEY` are bundled into client JS. Anyone can extract them from the deployed bundle and forge webhook events or call the Lemon Squeezy API directly.  
Severity: **Critical** | Fact | Confidence: High

**F-2. Client-env safety scanner has a blind spot for `src/`**  
Where: `scripts/check-client-env-safety.mjs:140`  
Consequence: The scanner only checks `.env`, `package.json`, `netlify.toml`, `vite.config.ts`, and `.github/` for dangerous `VITE_*` keys. It scans `src/` and `supabase/` only for JWT-like literals, not `VITE_` secrets. F-1 goes undetected by this guardrail.  
Severity: **High** | Fact | Confidence: High

**F-3. PaddleProvider uses hardcoded fallback client token**  
Where: `src/components/billing/PaddleProvider.tsx:30`  
Consequence: `PADDLE_CLIENT_TOKEN` falls back to `'test_paddle_token'` when env var is missing. In production misconfiguration, checkout silently uses a sandbox token, causing failed payments without user-visible error.  
Severity: **Medium** | Fact | Confidence: High

### CI / Release Governance

**F-4. CI pipeline failing on audited commit**  
Where: `.github/workflows/ci.yml` — `test` and `lint-typecheck` jobs  
Consequence: `gh run list` shows red runs for `1c450b5`. Broken CI means no merge gate; regressions ship unimpeded.  
Severity: **Critical** | Fact | Confidence: High

**F-5. ESLint not enforced in CI**  
Where: `.github/workflows/ci.yml:38-50`  
Consequence: The `lint-typecheck` job runs `tsc -b` and Semgrep but omits `pnpm run lint`. The `eslint .` script exists in `package.json:130` but is never invoked by CI. Lint regressions accumulate undetected.  
Severity: **High** | Fact | Confidence: High

**F-6. Broken unit test in auth flow**  
Where: `tests/unit/authGuestRefresh.test.ts:54`  
Consequence: `localStorage.clear is not a function` — the test stubs `localStorage` incompletely, removing `.clear()`. This test fails locally and in CI, contributing to F-4. The core guest-auth path has zero passing test coverage.  
Severity: **High** | Fact | Confidence: High

**F-7. `vitest run --coverage` hangs indefinitely**  
Where: `tests/unit/launchEvidenceManifest.test.ts`, `tests/unit/productionApprovalPacket.test.ts`  
Consequence: These tests spawn governance `.mjs` scripts as child processes without `--skip-probes`. The probes wait for network responses that never arrive in CI, deadlocking the suite. Coverage cannot be measured.  
Severity: **High** | Fact | Confidence: High

### Monetization / Data Integrity

**F-8. Three divergent pricing sources of truth**  
Where: `src/lib/entitlements.ts:66` ($29/$99/$299), `src/lib/pricingCatalog.ts:27` ($29/$99/$299), `src/components/monetization/WhopTierGate.tsx:47` ($49/$149/$299)  
Consequence: `WhopTierGate` shows prices 69% higher than the canonical catalog. If this component is ever rendered, users see wrong prices. The three sources must be consolidated to one.  
Severity: **High** | Fact | Confidence: High

**F-9. `WhopTierGate` is dead code with wrong prices**  
Where: `src/components/monetization/WhopTierGate.tsx` (169 lines)  
Consequence: Zero import sites outside its own module. 169 lines of unused code with incorrect pricing data create a trap for future developers who might wire it in.  
Severity: **Medium** | Fact | Confidence: High

**F-10. Client-side billing provider switching via localStorage**  
Where: `src/lib/billingAdapter.ts:385-420`  
Consequence: `setBillingProvider()` stores the active provider in `localStorage` and dynamically imports the Lemon Squeezy adapter (which exposes secrets — see F-1). A user or script can force-load the vulnerable adapter at runtime.  
Severity: **Medium** | Fact | Confidence: High

### Architecture & Design

**F-11. `helpContent.ts` is a 5,727-LOC God object**  
Where: `src/lib/helpContent.ts`  
Consequence: Single file holds all help content for the entire platform as one exported object. Any edit risks merge conflicts; the file is untestable in isolation; tree-shaking cannot exclude unused entries.  
Severity: **Medium** | Judgment | Confidence: High

**F-12. 13 stale TODO/FIXME markers in `src/`**  
Where: `src/lib/gamificationService.ts` (8 TODOs), `src/components/ComplianceDashboard.tsx:78`, `src/lib/whop.ts:708`, `src/components/billing/PaddleProvider.tsx:30`, `src/App.tsx:334`, `src/components/HelpButton.tsx:124`  
Consequence: Gamification tracking (modules, certificates, webinars, streaks) is stubbed with `current = 0`. ComplianceDashboard admits fake data. These are known-incomplete features shipped as if functional.  
Severity: **Medium** | Fact | Confidence: High

### Testing

**F-13. Coverage threshold set to 45% lines**  
Where: `vitest.config.ts:25`  
Consequence: A 45% line coverage gate allows the majority of code to ship untested. Industry baseline for production apps is 70-80%. Combined with F-7 (coverage can't actually run), there is no effective coverage enforcement.  
Severity: **Low** | Fact | Confidence: High

### Code Quality

**F-14. Bug-fix-dense test files indicate fragile governance tests**  
Where: `tests/unit/launchEvidenceManifest.test.ts` (19 commits), `tests/unit/progressDigestReadiness.test.ts` (11), `tests/unit/buyerEvidenceReadiness.test.ts` (8)  
Consequence: These three test files account for 38 commits in the last 100, suggesting repeated break-fix cycles. The tests are tightly coupled to governance script output formats, making them brittle.  
Severity: **Low** | Judgment | Confidence: Medium

### Documentation

**F-15. README.md is a commercial status document, not an onboarding guide**  
Where: `README.md`  
Consequence: 188 lines covering commercial status, proof packs, and a do-not-claim list — but zero lines on prerequisites, local setup, architecture overview, or contribution guidelines. New developers cannot bootstrap without tribal knowledge.  
Severity: **Medium** | Fact | Confidence: High

### Dependencies

**F-16. `pnpm audit` fails with JSON parse error**  
Where: Observed during session  
Consequence: `pnpm audit --audit-level moderate` exits non-zero with `Unexpected token ''` — not from a vulnerability finding, but from a registry/parse issue. CI's security audit step is effectively broken.  
Severity: **Medium** | Fact | Confidence: Medium `[UNVERIFIED — may be environment-specific]`

### DevEx & Ops

**F-17. 59 governance scripts with no discoverability index**  
Where: `scripts/check-*.mjs` (59 files)  
Consequence: The `package.json` exposes ~40 `check:`/`report:` scripts, but 59 `.mjs` files exist in `scripts/`. Developers cannot discover which scripts exist or what they do without listing the directory. No `scripts/README.md` exists.  
Severity: **Low** | Judgment | Confidence: High

### Performance

**F-18. No findings above Low severity**  
The codebase already implements route-level `React.lazy()` (70 chunks), vendor `manualChunks` in `vite.config.ts`, and immutable asset caching in `netlify.toml`. Bundle splitting is well-executed.  
Severity: **Info** | Fact | Confidence: High

### Strengths

- **70 lazy-loaded routes** — excellent code-splitting discipline
- **38 RLS policy files across 112 migrations** — database-level access control is taken seriously
- **59 governance scripts** — strong intent toward automated quality gates
- **Semgrep SAST** in CI — proactive static analysis
- **Claim-boundary checks** (`check:claim-boundaries`) — rare and valuable for a commercial product

---

## Improvement Strategy

### Theme 1: Close the secret-exposure gap (M0)
Move all `VITE_LEMON_SQUEEZY_*` secrets server-side. Fix the env-safety scanner to cover `src/`. Delete or server-gate the Lemon Squeezy adapter. **Done signal:** `check:client-env-safety` passes with zero dangerous keys; scanner covers `src/`.

### Theme 2: Restore CI as a merge gate (M0–M1)
Fix the broken test (F-6), unblock the hung tests (F-7), add `pnpm run lint` to CI (F-5), and resolve the `pnpm audit` parse issue (F-16). **Done signal:** `gh run list` shows green on `main`; CI runs `lint + tsc + test + build`.

### Theme 3: Consolidate pricing to one source of truth (M1)
Delete `WhopTierGate.tsx` (F-9). Make `pricingCatalog.ts` the single source; `entitlements.ts` imports from it. **Done signal:** `grep -r "price" src/ --include='*.tsx'` returns no hardcoded numbers outside `pricingCatalog.ts`.

### Theme 4: Raise the test floor (M2)
Fix the governance test brittleness (F-14), raise coverage threshold from 45% to 65% (F-13), and ensure `vitest run --coverage` completes in under 60 seconds. **Done signal:** Coverage gate passes at 65%; no test hangs.

### Theme 5: Convert README from sales to engineering (M3)
Add prerequisites, setup, architecture diagram, and contribution guide. Move commercial content to `docs/COMMERCIAL_STATUS.md`. **Done signal:** A new developer can `pnpm install && pnpm dev` using only README instructions.

**Non-goals:** Rewriting the governance script framework. Replacing Whop auth. Adding new features. Performance optimization (F-18 shows this is adequate).

---

## Task Plan

### Milestone M0 — Safety Net (1–2 days)

| # | Task | Files | Acceptance | Effort | Risk |
|---|------|-------|------------|--------|------|
| T1 | Remove `VITE_` prefix from Lemon Squeezy secrets; move to Edge Function | `lemonSqueezyAdapter.ts`, `billingAdapter.ts` | `check:client-env-safety` passes | 2h | Medium |
| T2 | Fix env-safety scanner to cover `src/` for `VITE_*` keys | `scripts/check-client-env-safety.mjs:140` | Scanner flags `VITE_*SECRET*` in `src/` | 1h | Low |
| T3 | Fix `authGuestRefresh.test.ts` localStorage stub | `tests/unit/authGuestRefresh.test.ts:54` | `vitest run authGuestRefresh` passes | 30m | Low |
| T4 | Add `--skip-probes` to governance script spawns in tests | `launchEvidenceManifest.test.ts`, `productionApprovalPacket.test.ts` | `vitest run --coverage` completes <60s | 1h | Low |

### Milestone M1 — Critical Fixes (2–3 days)

| # | Task | Files | Acceptance | Effort | Risk |
|---|------|-------|------------|--------|------|
| T5 | Add `pnpm run lint` to CI `lint-typecheck` job | `.github/workflows/ci.yml` | CI runs eslint; `gh run list` green | 30m | Low |
| T6 | Delete `WhopTierGate.tsx`; consolidate pricing to `pricingCatalog.ts` | `WhopTierGate.tsx`, `entitlements.ts` | `grep -r '\$49' src/` returns zero hits | 1h | Low |
| T7 | Remove Paddle fallback token; fail loud if missing | `PaddleProvider.tsx:30` | Build fails when `VITE_PADDLE_CLIENT_TOKEN` unset in prod | 30m | Low |
| T8 | Remove client-side `setBillingProvider` localStorage switching | `billingAdapter.ts:385` | Provider is server-determined only | 2h | Medium |

### Milestone M2 — High-Leverage (3–5 days)

| # | Task | Files | Acceptance | Effort | Risk |
|---|------|-------|------------|--------|------|
| T9 | Raise coverage threshold 45%→65%; fix brittle governance tests | `vitest.config.ts`, 3 test files | `vitest run --coverage` passes at 65% | 4h | Medium |
| T10 | Split `helpContent.ts` into per-domain files | `helpContent.ts` → `helpContent/*.ts` | No file >500 LOC; imports unchanged | 4h | Low |
| T11 | Resolve `pnpm audit` JSON parse failure | `package.json` overrides or pnpm version | `pnpm audit` exits 0 or reports real CVEs | 1h | Low |

### Milestone M3 — Quality & Polish (ongoing)

| # | Task | Files | Acceptance | Effort | Risk |
|---|------|-------|------------|--------|------|
| T12 | Rewrite README as onboarding guide; move commercial to `docs/` | `README.md`, `docs/COMMERCIAL_STATUS.md` | New dev can setup from README alone | 2h | Low |
| T13 | Create `scripts/README.md` index of all 59 governance scripts | `scripts/README.md` | `ls scripts/*.mjs` count matches index | 1h | Low |
| T14 | Triage 13 stale TODOs: implement or remove | `gamificationService.ts`, `ComplianceDashboard.tsx`, `whop.ts` | Zero TODOs older than 90 days without an issue link | 3h | Low |

### Quick Wins (do first, <30 min each)
- **T3** — Fix localStorage stub (one line)
- **T5** — Add `pnpm run lint` to CI (one line)
- **T6** — Delete `WhopTierGate.tsx` (one file)

### Implementation Sketch: T1 (Top priority)
```typescript
// lemonSqueezyAdapter.ts — remove VITE_ prefix, read from Edge Function
export async function getLemonSqueezyWebhookSecret(): Promise<string> {
  const { data } = await supabase.functions.invoke('lemon-squeezy-config');
  return data?.webhook_secret || '';
}
```
Move `VITE_LEMON_SQUEEZY_WEBHOOK_SECRET` → `LEMON_SQUEEZY_WEBHOOK_SECRET` (no `VITE_` prefix) in Netlify env vars. Create a minimal Edge Function `lemon-squeezy-config` that returns the secret to authenticated admin users only.

### Implementation Sketch: T3
```typescript
// authGuestRefresh.test.ts:54 — replace bare localStorage stub
const localStorageMock = {
  getItem: vi.fn(), setItem: vi.fn(),
  removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(),
  length: 0,
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

### Implementation Sketch: T5
```yaml
# .github/workflows/ci.yml — add after Type check step
- name: Lint
  run: pnpm run lint
```
