# Migration replay comparison — repo vs target ledger

## Commands (owner runs against qktgjpbifknqjpvrgkrj)

    # target ledger
    psql "$DB_URL" -c "select version,name from supabase_migrations.schema_migrations order by version"
    # local versions
    ls supabase/migrations/*.sql | sed 's/.*\///;s/\.sql//'

## Known deltas (documented, not errors)

- Repo: 122 active `.sql` + `20250904_investment_tables.sql.disabled`
- Target: 123 records = 117 repo names + 6 target-only names; the 6 are
  ported to 5 repo files (two extension entries merged into
  `20251112008_enable_cube_earthdistance.sql`).
- Non-destructive target replays NOT ported (deviation ledger):
  20250927 policy/ON CONFLICT rewrites, innovations.name backfill,
  20251009005 idempotent replay, 20251010004 ordered replay,
  20251010007 weather no-op, 20251012001 index/defaults,
  20251013001 non-destructive view, 20251014005 + clear-mock no-ops.
  A fresh repo replay differs from target on those files —
  semantic equivalence, not byte equivalence; candidates for a
  future canonicalization pass.

## Rollback

Snapshot/backup before any new migration batch; rollback = restore
point-in-time, never hand-DELETE schema objects.
