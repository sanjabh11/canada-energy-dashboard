#!/usr/bin/env bash

set -euo pipefail

# Owner-run helper only. Never put a database password in this file or on the
# command line. Supply it through the approved secret manager for this command.
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  printf '%s\n' 'SUPABASE_DB_PASSWORD is required; no migration was attempted.' >&2
  exit 2
fi

if ! command -v supabase >/dev/null 2>&1; then
  printf '%s\n' 'supabase CLI is required; no migration was attempted.' >&2
  exit 2
fi

printf '%s\n' "$SUPABASE_DB_PASSWORD" | supabase db push --password-stdin
