# Dependency remediation — 2026-10-24

This note records a repository-only dependency update. It does not authorize a
deployment, hosted migration, or pilot decision. The current evidence layer is
local; a CI run on the exact commit is required before this change is used as
release evidence.

## Change

| Package | Affected local resolution | Patched resolution | Reason |
|---|---:|---:|---|
| `zod` | 3.24.2 and 3.25.76 | 4.6.7 | `GHSA-mrhx-c7xc-m3w5` (high; oversized constrained collections) |
| `undici` | 7.30.0 | 7.30.1 | Current moderate/high advisories in the 7.30.0 graph |
| `fast-uri` | 3.1.8 | 3.1.9 | Current authority/normalization advisories in the 3.1.8 graph |

The direct Zod dependency and the workspace override now resolve to `4.6.7`.
The override graph resolves all three packages to the patched versions. Zod 4
requires an explicit key and value schema for `z.record`; the affected schemas
were updated accordingly. The generic `z.ZodTypeAny` declaration was replaced
with the public `z.ZodType` type.

The Zod migration follows the upstream [Zod 4 migration guide](https://zod.dev/v4/changelog).
The high-severity advisory and affected-version range are recorded in the
[GitHub advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). The
dependency checker remains fail-closed for new moderate-or-higher advisories;
no new exception was added.

## Local verification

| Check | Result | Proof layer |
|---|---|---|
| Frozen install | PASS; `pnpm@10.23.0` installed the patched graph | local environment |
| `pnpm why zod undici fast-uri` | PASS; `zod 4.6.7`, `undici 7.30.1`, `fast-uri 3.1.9` | local dependency graph |
| `node scripts/check-dep-audit.mjs` | PASS; 0 critical/high/moderate advisories | local audit |
| TypeScript build | PASS; `tsc -b --pretty false --diagnostics` | local source check |
| Zod/agent/schema tests | PASS; 4 files, 58 tests | local unit tests |
| ESLint | PASS; 0 errors, 1,736 warnings | local lint |
| Warning baseline | PASS; 1,736 ≤ 1,742 | local ratchet |
| Production build | PASS; Vite build completed | local build |

## Remaining proof boundary

The local shell fails the Corepack toolchain gate because Corepack is absent
from PATH. Bare `pnpm 10.23.0` was used only for local verification and does
not satisfy the release-readiness check. CI must install the pinned toolchain
and run the dependency, type, test, build, evidence-binding, and browser gates
on the exact commit. The intentional unstaged deletion of `coverage/lcov.info`
was preserved and was not used as coverage evidence.

This note does not close the owner-gated INC-001, Supabase project identity,
hosted RLS/migration/function deployment, privacy/CASL, manual WCAG,
performance, or buyer-validation gates.
