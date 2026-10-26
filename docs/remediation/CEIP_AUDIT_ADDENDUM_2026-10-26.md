# CEIP audit addendum — 2026-10-26

## Scope and proof boundary

This addendum records a local planning and evidence-reconciliation pass. It is
not a staging, deployment, production, compliance, or buyer-validation receipt.
The repository remains under the controlled-pilot mission and all hosted and
human gates remain stop-gated.

## Current code-bearing CI verification receipt — 2026-10-26

- Code-bearing source: `3941e1dabc7904e48826dc6eccd1c2105bb795be`
- CI run: `40292290033` (head SHA exact)
- Verification jobs: `lint-typecheck`, `test`, and `build-and-smoke` succeeded
- `evidence-binding`: failed only because the documents still named the
  previous source; this is the designed stale-document signal
- Artifact: `12637053422`
- GitHub artifact digest: `sha256:41d9c8dfbb726ec7027860d18cadedf397b9c1dec6a93928a1e5d4a60e602d54`
- The run includes readonly-SQL privilege hardening, fail-closed rate
  protection, and service-role-only API rate accounting changes.
- Local ZIP rehash is not claimed.

This receipt proves repository verification only. The evidence-only document
update is required to rebind the mission; it still does not prove hosted
staging, owner approval, compliance, or buyer validation.

## Snapshot identity

- Branch: `codex/green-button-truth-spine`
- Local snapshot before this addendum: `de11fa4`
- Remote PR head observed during the snapshot: `5ba25d9`
- Remote CI observed: run `40216410789`, all four jobs successful for
  `5ba25d9`; this run does not prove the local snapshot or this addendum.
- The local tree intentionally retains the tracked deletion of
  `coverage/lcov.info` and untracked zero-byte `data.sql`, `roles.sql`, and
  `schema.sql` stubs. They were not restored, staged, or used as backups.

## Local verification results

| Check | Result | Proof boundary |
|---|---|---|
| `git diff --check` | PASS | local working tree |
| `pnpm exec tsc -b --pretty false` | PASS | local working tree |
| `pnpm run lint` | PASS, 0 errors; established warning baseline | local working tree |
| `check-lint-warning-baseline` | PASS | local working tree |
| `check-dep-audit` | PASS with documented exception | local working tree |
| claim-boundary check | PASS | local working tree |
| commercial-source-doc check | PASS | local working tree |
| strict positioning verifier | PASS | local working tree |
| repository hygiene | GUARD-BLOCKED before scan | no result inferred |
| client environment safety | GUARD-BLOCKED before scan | no result inferred |
| secret scan | GUARD-BLOCKED before scan | no result inferred |

The guard-blocked checks remain unverified. No credential value was inspected or
printed.

## Incident and replacement-project state

The authoritative incident register records INC-001 as owner-recorded
`INVALIDATED-BY-DELETION` on 2026-10-24 because the leak-site project was
deleted or outside the owner's account. The historical credential remains in
public Git history; the leak-site project must never be restored. The forward
project is `qktgjpbifknqjpvrgkrj`.

A fresh read-only MCP observation at `2026-10-26T08:37:53Z` returned 123 applied migrations
(ending at `20261023094758`) and five ACTIVE Edge Functions:
`lead-capture`, `whop-verify-access`, `whop-webhook`,
`calibration-cron`, and `storage-dispatch-scheduler`. The repository
migrations `20261026001` and `20261026002` are not live. Security advisors
still report 23 security-definer-view ERRORs, one RLS-disabled ERROR, 107
RLS-no-policy INFOs, four extension WARNs, five materialized-view WARNs, and
11+11 executable security-definer WARNs. No hosted migration, function
deployment, storage upload, backup, restore, or rollback was performed.

The authenticated account token inventory contains no matching CEIP or Devin
project-scoped token. No unrelated token was deleted; the CLI OAuth MCP remains
the preferred read-only path. Inventory absence is not treated as a direct
audit-event receipt.

## Repository security overlay

The repository changes are present and locally tested, and the verification
jobs for `3941e1dabc7904e48826dc6eccd1c2105bb795be` passed in CI:
- `20261026001_harden_readonly_sql_privileges`
- `20261026002_harden_api_key_rate_functions`
- fail-closed rate-protection behavior and service-role-only API accounting

These migrations remain repository-only until an owner applies them to the
replacement project and runs the negative RLS/direct-write, rate-limit, and
service-role staging checks. No hosted mutation was performed by this agent.

## Required next proof

1. Preserve the dirty overlay and keep the tracked `coverage/lcov.info`
   deletion and zero-byte dump stubs out of commits.
2. Keep the replacement-project security findings open until every ERROR has
   an owner, object-level disposition and tested migration; do not apply this
   new privilege migration remotely from the agent lane.
3. Keep replacement-project staging blocked until the owner supplies project
   identity, backup/export, migration order, RLS/direct-write denial,
   rate-limit, retention, redacted-log, monitoring, restore, rollback, and
   named privacy/CASL/billing/operations approvals.
4. Keep buyer validation at 0/11 until the owner runs the pre-registered paid
   experiments and records the decision.

**Decision:** repository work may continue; staging and pilot remain STOP.
