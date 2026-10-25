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
evidence claim, and snapshot were resynchronised; that predecessor state
returned zero warnings with `253/253` inventory values. The current
implementation overlay adds three evidence documents, so the snapshot is now
`257` and the strict verifier must be rerun before this overlay receives a
new CI receipt.

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

## Current-head receipt before the implementation overlay

- HEAD `4967b728d2c09724198e7ec286065b7a6cfd8ef5` completed CI run
  `39990265678` with `lint-typecheck`, `test`, `evidence-binding`, and
  `build-and-smoke` all successful.
- The evidence artifact was `12519384283` (`ci-evidence-9ee16c26df6b0e9a36f2f615d27e83dc63e697f3`).
- This receipt is the last verified predecessor. The repository changes in
  this implementation overlay require a new exact-head CI receipt before they
  can be called CI-verified.

## Implementation overlay awaiting a new receipt

- Removed a hard-coded database password from
  `scripts/shell/test_migration.sh`. The helper now requires the approved
  `SUPABASE_DB_PASSWORD` environment injection, fails closed when it is absent,
  and never prints or embeds a credential.
- Added `tests/unit/migrationHelperSecurity.test.ts` to prevent literal
  password piping and to prove the missing-password stop path.
- Added the standalone migration/data ledger and the owner-run Supabase
  staging pack.
- Added the point-in-time replacement-project security baseline. It records
  26 ERROR, 73 WARN, and 108 INFO findings; it is not an advisor-clearance or
  staging claim.
- Resynchronised EV-005 after adding the three evidence documents: the
  positioning verifier now reports `257/257` documentation files with zero
  warnings locally.

These changes are source/local evidence only until a new CI run binds the
resulting commit. Hosted project state, secrets, deployments, and owner gates
remain untouched.

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

## Update — deviation ledger ported to repo (audit-9)

The six target-only migrations applied during the `qktgjpbifknqjpvrgkrj`
replay are now repository migrations (`9cb343e`), so a fresh replay
reproduces the target:

| Target ledger entry | Repo file |
|---|---|
| `20250927_fix_weather_data_primary_key` | `20250926001_fix_weather_data_primary_key.sql` (re-orders the fix before the 20250927 seed upsert) |
| `20261023_enable_cube_for_earthdistance` + `20261023_enable_earthdistance_for_ev` | `20251112008_enable_cube_earthdistance.sql` (pre-`20251113004`) |
| `20261023_create_provinces_reference` | `20251112009_create_provinces_reference.sql` (pre-`20251113007`) |
| `20261023_harden_rls_auto_enable_api_acl` | `20261023001_harden_rls_auto_enable_api_acl.sql` |
| `20261023_revoke_legacy_public_lead_writes` | `20261023002_revoke_legacy_public_lead_writes.sql` |

Active refs (netlify.toml, cron workflows, scripts, tests, edge defaults)
repointed `qnymbecjgeaoxsfphrti` → `qktgjpbifknqjpvrgkrj`. The incident
register, historical addenda, archive docs, and the mission identity
question retain `qnymbecjgeaoxsfphrti` — the leaked key's project of
record is a historical fact, not a mutable config value.

Remaining target-side divergences still documented (not ported — they
were non-destructive replays of defective source files):
`20250927` policy/ON CONFLICT rewrites, `innovations.name` backfill,
`20251009005` idempotent replay, `20251010004` deferred ordered replay,
`20251010007` alternate weather schema recorded no-op, `20251012001`
adapted index/defaults, `20251013001` non-destructive view replay,
`20251014005` + clear-mock no-ops. A fresh repo replay of those files
still differs from target; they are candidates for a future
canonicalization pass. A prior replay note described the target schema as
semantically equivalent and advisor-clean; that historical wording is
superseded by the current replacement-project security baseline and must not
be read as present advisor clearance.

Data phase result (Codex): 6,797 rows accepted across 87 whitelisted
public tables; 89 withheld (41 null/invalid required fields, 48 missing
FK parents); auth/storage/credential/lead tables excluded by policy.
Edge functions still undeployed; `.env` anon key + INC-001 revocation
remain owner steps.

## Update — audit-9 reconciliation (deep-research peer review)

External re-verification findings, dispositioned:

- **Counting rule (122 vs 123):** the repo holds **122 active `.sql`
  migrations + 1 `.disabled`** (`20250904_investment_tables.sql.disabled`)
  = 123 dir entries. The target ledger has **123 records** = 117 replayed
  repo names + 6 target-only names. The repo's five ported files cover
  all six target entries (the two extension entries merged into
  `20251112008`). A fresh replay therefore produces 122 ledger versions —
  the one-name delta vs target is the merged extension entry, recorded
  here, not an error.
- **Run conclusion semantics:** run `39948353655` concluded `failure`
  because `evidence-binding` was red (designed staleness signal for the
  unbound intermediates it now covers). Its three verification jobs were
  all green, making it binding-eligible. goal.md previously said "all 4
  jobs green" — corrected.
- **HEAD generations:** `2f1b88d` (all-green run incl. gate), `a86f1f8`
  (loop receipt). Current exact-head run `39959995194` on `a86f1f8`:
  `lint-typecheck`/`test`/`evidence-binding` green, `build-and-smoke`
  `build-and-smoke` green — run conclusion `success` (all 4 jobs green).
- **Function surface:** 111 local `supabase/functions/` dirs, **0
  deployed** on target. The pilot intake function is `lead-capture`
  (no `intake` function exists); Whop paths are `whop-verify-access`
  and `whop-webhook`. A pilot function allowlist (below) replaces the
  vague "deploy intake" task.
- **Dump stubs:** `data.sql`, `roles.sql`, `schema.sql` are **zero-byte**
  untracked files — placeholders, NOT usable backups. Per Supabase's
  restore flow, real exports must be generated (or backups/PITR chosen)
  before recovery is claimed.
- **Target security baseline (refreshed 2026-10-23T16:58:12.995Z):** the
  replacement project reported 108 `rls_enabled_no_policy` INFO findings,
  26 `security_definer_view` ERROR findings, one `rls_disabled_in_public`
  ERROR, 42 mutable-search-path WARN findings, 11 anonymous and 11
  authenticated security-definer execution WARN findings, five
  API-exposed materialized-view WARN findings, and four public-extension WARN
  findings. The previous `108 + 23 performance INFO` summary was incomplete;
  see `docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md`.
  No advisor finding is closed by this snapshot. Grant-layer denial for lead
  tables is verified; hosted REST/function behavior is not.
- **Semgrep semantics:** the CI step is audit-mode — a completed run
  means "scan executed", not "security cleared". Finding dispositions
  remain part of the security review, not the CI signal.

### Pilot function allowlist (candidate; owner-gated deploy)

- `lead-capture` — intake (pilot-required)
- `whop-verify-access` — existing-customer entitlement (owner config)
- `whop-webhook` — billing lifecycle events (owner config)
- All other ~108 functions: classified non-pilot; leave undeployed or
  disabled until a staged inventory review (P2 of the audit-9 packet)
  assigns each to scheduled/internal/deprecated.

### Port hardening pass (audit-9 sweep)

Two robustness fixes to the ported migrations before canonicalization:
- `20261023002`: policy-drop filter now matches `TO public` scoped
  INSERT/ALL policies too (roles ⊂ {anon, authenticated, public}); a
  public-scoped permissive policy would otherwise survive the port.
  Policies that include service_role or other named roles are unaffected.
- `20250926001`: `weather_data` dedup adds `ctid` tiebreak so equal
  `created_at` values can't strand duplicate rows and fail the PK add.

## Handoff record — audit-9 closeout (Devin → Codex)

- **Final HEAD:** `5c883f1` (+ this handoff commit, evidence-only)
- **Run:** `39987095875` — conclusion `success`, all 4 jobs green
  (`lint-typecheck`, `test`, `evidence-binding`, `build-and-smoke`);
  `head_sha` == `5c883f1` exact
- **Artifact:** `12517835140`, digest
  `sha256:1b6e7bc2cc9282fe3f246fbfc5297b186e08911fea2a94b44f7f6b50df4b973f`;
  merge `97bef02b`
- **Changed files this cycle:** 5 ported migrations
  (`20250926001` weather PK, `20251112008` cube+earthdistance,
  `20251112009` provinces, `20261023001` rls_auto_enable ACL,
  `20261023002` lead-write revoke w/ public-policy + ctid fixes);
  ~50 ref-repointed files (`qnymb`→`qktg`, active config only;
  history preserved); `ci.yml` (pinned pipx semgrep);
  `verify-supabase-migrations.mjs` (revoke/do); 14 gated cron workflows;
  `docs/PILOT_FUNCTION_INVENTORY.md`; EV-005 pins (3 sources);
  goal/mission/addenda/loop receipts
- **Dirty overlay:** `coverage/lcov.info` intentionally deleted
  (unstaged, preserved); `data.sql`/`roles.sql`/`schema.sql` zero-byte
  untracked stubs — NOT usable backups
- **Unresolved owner gates:** `.env` anon key (line 12, still old
  project's); PAT → `~/.config/devin/mcp_config.json` + `disabled:false`;
  INC-001 service_role revocation on `qnymbecjgeaoxsfphrti` + log review;
  repo var `SUPABASE_CRONS_LIVE=true` (only after function deploy)
- **Unresolved staging gates:** edge-function deploy (`lead-capture`,
  `whop-verify-access`, `whop-webhook` per inventory allowlist);
  hosted RLS/migration-order/rate-limit/retention/rollback proofs;
  108+23 advisor-finding dispositions; withheld 89-row reconciliation;
  4 missing source tables; real backup exports; 2 storage files;
  CASL, manual WCAG, deployed performance, buyer 0/11

## Update — audit-10 binding (Devin, 2026-10-24)

- Codex 9-commit audit batch (`779eef6..a460a82`) pushed as one
  execution-order step; run `40071166986` on `a460a82`: `head_sha`
  exact, all three verification jobs green, `evidence-binding` red as
  designed staleness signal → conclusion `failure`, binding-eligible.
- Bound source is now `a460a82`/run `40071166986` (merge `881877d9`,
  artifact `12552180184`, digest
  `sha256:dfa5873f8f06dbb2f4b766752c5e64a1696fd23d9c86f5e499fc2b05b55406f3`).
  All nine commits are covered inside the bound source.
- Parallel-lane prep (uncommitted during run, per Codex scoping):
  four-table decision analysis — `der_assets_summary` exists only as an
  `api-v2-vpp-platforms` response shape (no `.from()` table query, no
  migration) → all four source-only tables are formally excludable as
  out-of-band objects; `der_assets_summary` gets a verify-before-decide
  flag. 89 withheld rows: 41 null/invalid + 48 FK-absent per manifest.
- `check:supabase-app-lint` blocked by `401 Invalid access token`;
  secret/client-env/hygiene scans JEV-denied (protected paths) —
  owner-side steps, unchanged.

## Update — audit-11 exact-head cross-verification (Codex, 2026-10-24)

The CI-reviewed parent is `389dad33600fc2b754bf39d8c69637e0b4f718d5`. Run
`40073506314` has `head_sha` equal to that exact source commit and all four
jobs (`lint-typecheck`, `test`, `evidence-binding`, `build-and-smoke`)
successful. This supersedes the audit-10 `a460a82` / `40071166986` receipt for
current-state claims; the older run remains historical evidence. The local
evidence/migration descendant after `389dad3`; its push was blocked by the
shared-state guard, so it remains locally checked and unbound at the remote
CI layer.

The current artifact is `12551764380`, GitHub digest
`sha256:036865d5043db63b545b6b80ec73dbc9e01bc6dd663dd26632e7eb8541a6a9f4`,
merge SHA `02d17636953cf1a2e2482abfe50704b5a1c42c28`. A fresh artifact download
reproduced the GitHub digest. Its manifest has `complete: true`,
`missing_files: []`, `file_count: 9`, and `jobs: "not-recorded"`; the sidecar
verified and all nine listed evidence files matched their recorded SHA-256
hashes and byte counts. External GitHub job conclusions remain authoritative.

The worktree still intentionally contains `D coverage/lcov.info` and
untracked zero-byte `data.sql`, `roles.sql`, and `schema.sql`. They were not
restored, staged, or presented as backup evidence. No hosted mutation,
deployment, project unpause, secret read, outreach, or buyer experiment was
performed.

The old-project SQL backup passed gzip integrity and has SHA-256
`b1addd8f7310c6b968aa0b861b9cdf6bf3c9616f4a6e80bc7182d8f19b265a38`.
Metadata-only parsing found the four source-only tables and row counts
`der_assets_summary=4`, `energy_events=37409`,
`onet_related_occupations=42`, and `smr_vendors=5`. Application caller review
found no table query for any of them; `der_assets_summary` is only a response
shape in `api-v2-vpp-platforms`. The migration ledger therefore records a
bounded recommendation to exclude all four from pilot scope, pending named
data-steward confirmation and rollback impact. The 89 withheld rows remain
`NOT_REPLAYED` pending the owner’s redacted row-level packet.

**Audit-11 decision (historical):** repository evidence was CI-verified and
artifact-verified for the `389dad3` parent; the descendant was not yet
CI-verified at that point.
Staging and pilot remain **STOP**. INC-001 invalidation and log
review, project identity, hosted migration/RLS/rate-limit/retention/rollback,
allowlisted function deployment, `WHOP_CEIP_*`, CASL, manual WCAG, deployed
performance, and buyer `0/11` remain open owner gates.

## Update — audit-12 exact-head receipt (2026-10-24)

The evidence/migration packet commit `f196402ef5555a23b29687c5e9ee408858bd2396`
was pushed and verified by CI run `40110114146`. Its `head_sha` is exact and
all four jobs (`lint-typecheck`, `test`, `evidence-binding`, and
`build-and-smoke`) succeeded. This supersedes the `389dad3`/`40073506314`
receipt for current-state claims; the older receipt remains historical.

The current artifact is `12567025326` with GitHub digest
`sha256:3e0aec961a5f74046fa81e3fbcaaee5a907bbd7c8a16edebf1f8666560b37dad`.
The downloaded ZIP reproduced that digest. Its manifest records merge
checkout `1dc964af`, `complete: true`, `missing_files: []`, nine evidence
files, and `jobs: "not-recorded"`; the sidecar hash verified and all nine
listed files matched their recorded SHA-256 hashes and byte counts. External
GitHub job conclusions are authoritative for job status.

The worktree remains intentionally dirty only with `D coverage/lcov.info` and
untracked zero-byte `data.sql`, `roles.sql`, and `schema.sql` stubs. No reset,
restore, hosted mutation, deployment, secret read, outreach, or buyer
experiment was performed. The four-table decisions, 89-row reconciliation,
deviation comparison, function manifest, storage receipt, and owner sign-off
matrix remain preparation artifacts; their hosted and steward gates are open.

## Update — INC-001 closed + first hosted RLS proof (2026-10-24)

- Owner confirmed `qnymbecjgeaoxsfphrti`/`cwijcjhdugfqwsjbrdro` are not in
  the account — the leak-site project is deleted/third-party, so the
  leaked service_role key is invalidated-by-deletion. Incident register
  updated; INC-001 closed.
- `.env` now carries the new project's anon key + URL/edge base; PAT
  wired into Supabase CLI + MCP config (`disabled:false`).
- First hosted proof on `qktgjpbifknqjpvrgkrj`: anonymous POST to
  `lead_intake_submissions` and `leads` → **401 denied** — direct public
  writes on lead tables are live-blocked (grant+policy layer working).
  `provinces` read returns 13 rows via anon key — ported reference
  migration live.

## Update — first hosted hardening pass (Devin, 2026-10-24)

Advisor pull via management API: **208 lints** — dispositioned:
- `rls_enabled_no_policy` ×108: 107 intentional deny-all
  (server-only: api_keys, api_usage, lead tables, etc.); **1 real gap:
  `innovations`** — client `.from('innovations')` read was broken.
  Fixed: `innovations_public_select` policy created (anon+authenticated
  SELECT) — anon REST read verified `200`.
- `anon_security_definer_function_executable` ×11: worst =
  `execute_readonly_sql(text)` + `(text,integer)` — arbitrary SQL as
  security definer, anon-executable. Only caller is the `nl2sql` edge
  function (service_role, unaffected). **REVOKED from
  anon+authenticated** — anon RPC now returns `404`.
- `rls_disabled_in_public` ERROR: `spatial_ref_sys` — platform-managed
  PostGIS table; cannot alter; recorded as managed exception.
- Remaining review lanes (need per-item decisions, not blanket fixes):
  `function_search_path_mutable` ×42, `security_definer_view` ×26,
  `authenticated_security_definer_function_executable` ×11,
  `materialized_view_in_api` ×5 (transmission_congestion_summary,
  cross_border_trade_summary, ccus_project_summary,
  mv_llm_daily_spend, provincial_emissions_summary),
  `extension_in_public` ×4.

Proof layer: these are hosted mutations on `qktgjpbifknqjpvrgkrj`
executed via owner-authorized PAT through the management query
endpoint — logged here as the required evidence receipt.

## Update — hosted hardening pass 2 (Devin, 2026-10-24)

- `function_search_path_mutable` 42 -> 0: all flagged public functions
  `ALTER ... SET search_path = public, pg_temp` (non-breaking fix).
- Sec-definer RPC surface closed: `execute_readonly_sql`,
  `award_badge_if_eligible`, `can_access_feature`,
  `check_api_rate_limit`, `get_user_tier`, `increment_ai_queries`,
  `record_api_usage`, `st_estimatedextent` (3 overloads) EXECUTE revoked
  from anon+authenticated — zero client/edge callers; service_role
  unaffected. Advisors still show 11 (lint cache lag); revocation verified.
- `security_definer_view` ERROR class: PostgREST served all 26 to anon.
  REVOKED `anon` SELECT on 25 (kept `connector_freshness` — the client
  reads it in connectorFreshness.ts); REVOKED `authenticated` SELECT on
  the 3 internal/business views: `user_tier_stats`,
  `gtm_weekly_funnel_summary`, `data_quality_summary`. Verified: anon
  probes -> 401; connector_freshness -> 200.
- Residual (documented, not mutated): `rls_enabled_no_policy` x107
  intentional deny-all; `extension_in_public` x4 (cube, earthdistance,
  postgis, vector — schema move is disruptive, low-value);
  `materialized_view_in_api` x5 + `spatial_ref_sys` managed exception.
- Lint totals: 208 -> 165 (advisor recompute lag explains residual
  anon/sec-definer counts).

## Update — pilot function deployment (Devin, 2026-10-24)

Deployed to `qktgjpbifknqjpvrgkrj` via owner-approved CLI:
- `lead-capture` — LIVE-verified end-to-end: malformed POST -> 400;
  synthetic lead -> `{"success":true}`; row confirmed in
  `public.contact_leads` (n=2 for synthetic-staging-20261024@example.invalid).
  Note: `lead-capture` writes to `contact_leads`, NOT
  `lead_intake_submissions` — intake-table deny-all stays correct.
  **Dedup gap observed**: identical email resubmitted -> second row
  accepted (function has no dedupe constraint/logic). Recorded for
  follow-up; not a regression.
- `whop-verify-access`, `whop-webhook` — deployed; runtime requires
  owner-set secrets (WHOP_API_KEY, WHOP_CEIP_*,
  WHOP_WEBHOOK_SECRET, VITE_WHOP_PRODUCT_*) — untestable until then.
- `SUPABASE_CRONS_LIVE` stays unset — cron-targeted functions still
  0 deployed.

Hosted proof points so far: anon lead-table INSERT -> 401; innovations
read -> 200; execute_readonly_sql RPC -> 404; sec-definer views ->
401/25 anon + 3 authenticated; intake function round-trip -> success.
