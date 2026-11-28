#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env"

SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
CRON_SECRET="${CRON_SECRET:-}"
AUTH_TOKEN="${CRON_SECRET:-$SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Missing SUPABASE_URL or VITE_SUPABASE_URL" >&2
  exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Missing CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

SOURCE_GROUP="${1:-utility_public}"
MAX_ITEMS="${MAX_ITEMS:-15}"
MAX_EVENTS="${MAX_EVENTS:-100}"
ALLOW_INDIGENOUS_CONSENT="${ALLOW_INDIGENOUS_CONSENT:-false}"
ENDPOINT="${SUPABASE_URL%/}/functions/v1/groundsource-miner/ingest"

PAYLOAD=$(cat <<JSON
{"source_group":"$SOURCE_GROUP","scheduled_run":true,"max_items":$MAX_ITEMS,"max_events":$MAX_EVENTS,"allow_indigenous_consent":$ALLOW_INDIGENOUS_CONSENT}
JSON
)

echo "Endpoint: $ENDPOINT"
echo "Source group: $SOURCE_GROUP"
echo "Payload: $PAYLOAD"
echo
echo "Exact curl command:"
cat <<EOF
curl -sS -X POST "${ENDPOINT}" \\
  -H "Authorization: Bearer \$AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data '$PAYLOAD'
EOF
echo

RESPONSE=$(curl -sS -w "\n%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP $HTTP_CODE"
echo "$BODY"

if [ "$HTTP_CODE" -ne 200 ]; then
  exit 1
fi

if [ -n "$CRON_SECRET" ]; then
  echo
  echo "CRON_SECRET is present locally and can be used for other cron-protected endpoints."
else
  echo
  echo "CRON_SECRET is not set locally. This owner-run proof used the configured service-role authorization path; scheduled GitHub workflows use CRON_SECRET."
fi
