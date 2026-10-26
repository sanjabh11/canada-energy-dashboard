# CEIP audit addendum — 2026-10-26

## Scope and proof boundary

This addendum records a local planning and evidence-reconciliation pass. It is
not a staging, deployment, production, compliance, or buyer-validation receipt.
The repository remains under the controlled-pilot mission and all hosted and
human gates remain stop-gated.

## Current exact-head CI receipt — 2026-10-26

- Bound source: `180a1e5d745d961d7b1b48d8c14f7b82dd3e746a`
- CI run: `40282361170` (head SHA exact)
- Verification jobs: `lint-typecheck`, `test`, and `build-and-smoke` all succeeded
- Evidence-binding job: failed as the designed staleness signal for the prior
  unbound code commit; it does not invalidate the three verification jobs
- Artifact: `12634400722`
- GitHub artifact digest: `sha256:a6553839f6f73e3d8174be3a949123e60ff3507ddfeb141b864137c730e849ff`
- Local ZIP rehash: not performed because the approved command path blocked
  network egress; no local byte-level verification is claimed

This receipt supersedes the earlier snapshot for repository CI identity. It
still does not prove hosted staging, owner approval, compliance, or buyer
validation.

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
project is `qktgjpbifknqjpvrgkrj`. Read-only dashboard inventory showed
migrations and five visible Edge Functions, no Storage buckets/objects, and no
Free-plan scheduled backups. Those observations do not prove hosted RLS,
function behavior, retention, logging, rollback, or backup recovery.

The project-scoped read-only MCP token displayed on 2026-10-25 was revoked and
was not printed here. The CLI OAuth MCP remains the preferred read-only path;
the in-chat connector still needs an account refresh before it can query the
replacement project.

## Required next proof

1. Preserve this dirty overlay and reconcile the duplicate local/remote commit
   histories without reset or force-push.
2. Bind the resulting documentation commit to a fresh exact-head CI run and
   retain its run, artifact, digest, manifest, sidecar, and job conclusions.
3. Keep replacement-project staging blocked until the owner supplies project
   identity, backup/export, migration order, RLS/direct-write denial,
   rate-limit, retention, redacted-log, monitoring, restore, rollback, and
   named privacy/CASL/billing/operations approvals.
4. Keep buyer validation at 0/11 until the owner runs the pre-registered paid
   experiments and records the decision.

**Decision:** repository work may continue; staging and pilot remain STOP.
