# Replacement Supabase owner-run staging pack

This runbook is intentionally owner-run. Codex may prepare and review it, but
must not unpause a project, apply hosted migrations, deploy Edge Functions,
set secrets, enable cron workflows, or upload Storage objects.

## Preconditions

- INC-001 is invalidated or the old project is decommissioned, and access-log
  review is recorded.
- The authoritative replacement project is confirmed as
  `qktgjpbifknqjpvrgkrj`.
- The old project remains frozen; no production traffic is redirected yet.
- A non-empty backup/export packet exists and has a SHA-256 manifest.
- The owner has a disposable restore target and a rollback window.
- All credentials are entered through the approved secret system. Never put a
  service-role key, database password, or function secret in Git, a command
  argument, or a log.

## Gate 1 — backup and restore rehearsal

1. Export roles, schema and data using the current Supabase backup/restore
   procedure. Keep `roles.sql`, `schema.sql`, and `data.sql` separate.
2. Record file sizes, SHA-256 hashes, export timestamp, project reference and
   intentionally excluded schemas/tables.
3. Restore into a disposable validation project, not the pilot project.
4. Compare migration history, table/view/function counts, policies, grants,
   extensions, Auth configuration and Storage metadata.
5. Run a restore readback and record the rollback procedure.

**Exit evidence:** non-empty exports, hash manifest, successful isolated
restore, schema comparison, and an owner sign-off. The current zero-byte files
in the checkout do not satisfy this gate.

## Gate 2 — migration order and database boundary

1. Confirm the repository migration count using its documented 122-active plus
   one-disabled counting rule.
2. Apply migrations to the disposable validation project first.
3. Apply the same reviewed migration set to the replacement staging project.
4. Confirm the migration ledger and target history agree before deploying any
   function.
5. Verify grants and RLS together. Test anonymous, authenticated and
   service-role behavior for every pilot table, especially lead tables.
6. Verify that direct anonymous/authenticated inserts are denied and that the
   approved server intake path is the only write path.

**Exit evidence:** migration history, SQL exit codes, role/grant snapshot,
RLS policy snapshot, negative direct-write tests, and rollback result.

## Gate 3 — security-advisor disposition

Use [the current security baseline](../remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md).
Before exposure, the owner must classify every ERROR and WARN, then re-run the
advisor after the reviewed fixes. Do not apply aggregate or generated blanket
revocations. Preserve an allowlist for any function or view that must remain
API-visible and test it with the intended role only.

## Gate 4 — Edge Functions and secrets

Deploy only the pilot allowlist, in this order:

1. `lead-capture`
2. `whop-verify-access`
3. `whop-webhook`

For each function:

- set secrets through the Supabase secret manager;
- verify the function's authentication and CORS contract;
- run synthetic success, malformed-input, unauthorized, rate-limit and
  duplicate-submission cases;
- confirm logs redact tokens, facility data and request bodies;
- record deployment ID, version, timestamp and rollback target.

Do not deploy the remaining local functions until the staged inventory assigns
each one to `scheduled`, `internal`, `deprecated`, or `not-in-pilot-scope`.

## Gate 5 — Storage and retention

1. Identify the two files in the downloaded Storage archive and record their
   names, byte sizes, hashes and intended bucket/path.
2. Create or verify the target bucket and object policies in staging.
3. Upload through the Storage API or dashboard using owner credentials only.
4. Read back each object, compare hashes, and test unauthorized access.
5. Verify retention, deletion and restore behavior for synthetic lead and
   webhook data.

Database dumps do not prove Storage-object transfer; keep separate object
   receipts.

## Gate 6 — operations and rollback

- Keep `SUPABASE_CRONS_LIVE` disabled until all allowlisted functions pass
  smoke tests.
- Confirm rate-limit behavior against the actual Netlify/Supabase plan.
- Verify alerts, log routing, backup schedule, restore time and rollback owner.
- Exercise manual billing and existing-customer Whop management only.
- Do not enable new Whop acquisition or checkout.

## Required sign-offs

The staging packet must name owners for security/INC-001, privacy and
retention, CASL, billing/Whop, dependency exception, operations/rollback and
business validation. A green CI run, an MCP response, or this runbook cannot
substitute for those approvals.

## Stop conditions

Stop before staging if the project reference is ambiguous, INC-001 is not
invalidated, any backup is empty, any ERROR is unclassified, migration order
cannot be proven, direct writes are possible, logs contain sensitive values,
or rollback has not been exercised. Keep the product in manual/static mode
until the owner resolves the block.
