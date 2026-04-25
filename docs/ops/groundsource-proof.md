# Groundsource Proof Runbook

This runbook documents the exact terminal path for manually proving the live
`groundsource-miner` edge function.

## Required local environment

The script accepts either `SUPABASE_URL` or `VITE_SUPABASE_URL`.

Required:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `VITE_SUPABASE_URL`

Optional:

- `CRON_SECRET`

`CRON_SECRET` is recommended for consistency across cron-protected endpoints,
but it is not required for this specific proof path because
`groundsource-miner` also accepts:

- `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
- `x-supabase-cron: true`

## Helper script

Use:

```bash
./scripts/run-groundsource-proof.sh policy_public
```

or:

```bash
MAX_ITEMS=5 MAX_EVENTS=20 ./scripts/run-groundsource-proof.sh utility_public
```

The helper loads `.env.local` and `.env`, falls back from `SUPABASE_URL` to
`VITE_SUPABASE_URL`, prints the exact `curl` command, then executes it.

## Exact curl commands

Policy proof:

```bash
export SUPABASE_URL="https://qnymbecjgeaoxsfphrti.supabase.co"

curl -sS -X POST "${SUPABASE_URL}/functions/v1/groundsource-miner/ingest" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "x-supabase-cron: true" \
  -H "Content-Type: application/json" \
  --data '{"source_group":"policy_public","scheduled_run":true,"max_items":15,"max_events":100,"allow_indigenous_consent":false}'
```

Utility proof:

```bash
export SUPABASE_URL="https://qnymbecjgeaoxsfphrti.supabase.co"

curl -sS -X POST "${SUPABASE_URL}/functions/v1/groundsource-miner/ingest" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "x-supabase-cron: true" \
  -H "Content-Type: application/json" \
  --data '{"source_group":"utility_public","scheduled_run":true,"max_items":5,"max_events":20,"allow_indigenous_consent":false}'
```

## Why the utility proof uses a smaller batch

The live function can hit Supabase worker resource limits when the
`utility_public` run is invoked with the larger scheduled payload:

- `max_items=15`
- `max_events=100`

Observed failure:

- `{"code":"WORKER_RESOURCE_LIMIT","message":"Function failed due to not having enough compute resources (please check logs)"}`

For manual proof runs, use the reduced utility payload above. The scheduled
workflow can still be tuned separately if resource pressure persists.

## What a passing result looks like

Successful proof should include:

- `HTTP 200`
- `extraction_mode: "llm"`
- `llm_source_count > 0`
- one or more `documents`
- one or more `events`
- `meta.claim_label: "validated"`

## Optional CRON_SECRET setup

Generate:

```bash
openssl rand -hex 32
```

Then set the same value in:

- Supabase Edge Function secrets
- GitHub Actions repo secret `CRON_SECRET`
- optionally local `.env` or `.env.local`

This is recommended operational hygiene, but not a blocker for the current
manual proof flow.
