# CEIP audit addendum — 2026-10-23

This addendum records the latest independently checked CI receipt. It does not
change the owner, hosted, accessibility, performance, CASL, or buyer gates.

## Current CI receipt

- Code-binding source remains `01006d91a65939a758a4c34d4a27f2c11e23dcc7`,
  bound by run `39774258190` with all four required jobs green.
- The latest CI-tested documentation descendant is
  `0550c290db1e4db20d0480d05aaeeb3419723fd5`, bound by run
  `39777254650`; the run head SHA equals that source SHA and all four jobs
  (`lint-typecheck`, `test`, `build-and-smoke`, `evidence-binding`) succeeded.
- The latest artifact is `12425598211` with GitHub digest
  `sha256:93f00e9745d615cece0a16a6502a00aa6d1d1a5422735d92d15967f774ea74b4`.
  Its merge checkout is `2748966f831fc24888777e38563353047ac2de98` and its
  pull-request head is the documentation descendant above.
- The artifact manifest records `complete: true`, `missing_files: []`,
  `file_count: 9`, `jobs: "not-recorded"`, and tree fingerprint
  `b23651bd7bb2b10382ac4b7cc289a92f60ff4c5a9afcbbcff6cc467405112573`
  (`1682` hashed files, `4` skipped entries). The manifest sidecar verifies.
- An independent re-download checked all nine manifest file hashes and byte
  sizes. Browser result statistics were Phase 0 `35 expected / 0 unexpected`,
  Phase 6 `80 / 0`, wedge `80 / 0`, and automated accessibility `110 / 0`,
  with no flaky or skipped cases.

## Binding-gate remediation verified

The repository-owned gate changes are covered by separate green CI runs:

1. `9aee025` / run `39770946488`: merge-aware `git diff-tree -m`, paginated
   run discovery, covered-descendant attribution, and regression fixtures.
2. `01006d9` / run `39774258190`: canonical `CI` workflow and required
   `lint-typecheck`, `test`, and `build-and-smoke` job checks.

The local gate currently reports the exact bound source and does not treat the
working-tree deletion of `coverage/lcov.info` as evidence. The local checkout
contains only that intentional unstaged deletion; no restoration or reset was
performed. Local focused evidence is `11/11` binding tests, typecheck exit `0`,
targeted lint exit `0`, syntax checks exit `0`, and `git diff --check` clean.

The strict positioning verifier initially caught EV-005 at `252` versus `253`
documentation files after this addendum was added. The phase-1 inventory,
evidence claim, and snapshot were resynchronised; the strict verifier now
returns zero warnings with `253/253` inventory values. This drift was closed
before the evidence update was recorded.

The evidence-binding job remains a staleness signal. A bound run is accepted
only when the named workflow is `CI`, all required verification jobs exist and
are successful, and the run head SHA matches the bound source. Merge commits
are inspected with parent-aware file attribution; all paginated candidate runs
are considered; a run with only the binding job is rejected.

## Decision and remaining gates

Repository remediation is defensible at the committed-CI and independently
checked-artifact layers. Staging and pilot remain **STOP**.

Still owner/hosted-gated: INC-001 invalidation and access-log review; the
`qnymb…`/`cwij…` Supabase project identity; unpause or owner-approved project
migration; hosted migration order, RLS, direct-write denial, rate limits,
retention, logging, restore and rollback; `WHOP_CEIP_*` configuration and edge
deployment; `/v5/me` removal/verification; CASL approval; manual WCAG 2.2
review; deployed performance; and all `0/11` paid buyer experiments.

Read-only Supabase control-plane evidence on 2026-10-23 lists only project
`cwijcjhdugfqwsjbrdro` in the connected account, with status `INACTIVE` and
region `ap-southeast-1`. The incident register's `qnymbecjgeaoxsfphrti` is
not reconciled to that inventory. This confirms the owner stop rule; it is not
evidence that the leaked key has been invalidated.

The local `coverage/lcov.info` deletion is preserved as a dirty-overlay item.
No deployment, project restoration, outreach, checkout enablement, or buyer
contact was performed.

## Update — new authoritative Supabase project (audit-8 continuation)

- Owner provisioned new project `qktgjpbifknqjpvrgkrj` (healthy, nano,
  zero migrations/backups). Endpoint reachable: `GET /rest/v1/` → 401
  (API alive, key required).
- `.env` updated: `VITE_SUPABASE_URL` + `VITE_SUPABASE_EDGE_BASE` now
  point at `qktgjpbifknqjpvrgkrj`; `VITE_SUPABASE_ANON_KEY` still carries
  the OLD project's anon key — owner must paste the new project's anon
  key (Dashboard → API Keys → anon public).
- Devin MCP scaffold added to `~/.config/devin/mcp_config.json`
  (`--read-only --project-ref=qktgjpbifknqjpvrgkrj`, `disabled:true`)
  pending owner PAT.
- Supersedes the `qnymb…` vs `cwij…` identity question for the FORWARD
  path: `qktgjpbifknqjpvrgkrj` is now the authoritative project.
- **INC-001 remains open:** the leaked `service_role` key belonged to
  `qnymbecjgeaoxsfphrti` per the register; creating a new project does
  NOT revoke the old key. Owner must still disable/revoke it in the old
  project's dashboard (or delete that project) and review logs.
- Migration to the new project (schema + RLS + intake function) is a
  fresh migration-before-function deployment — all hosted staging
  checks (RLS denial, dedup, rate limits, retention, rollback) apply
  to `qktgjpbifknqjpvrgkrj` before pilot intake.
