#!/usr/bin/env bash

set -euo pipefail

HOST="${1:-}"
PORT="${2:-443}"
OUTPUT_DIR="${3:-ops/utility-connector-bridge/evidence}"

if [[ -z "$HOST" ]]; then
  echo "Usage: bash ops/utility-connector-bridge/scripts/layer-c-tls-evidence.sh <host> [port] [output-dir]"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

SAFE_HOST="${HOST//[^a-zA-Z0-9._-]/_}"
RAW_OUTPUT="$OUTPUT_DIR/${SAFE_HOST}-openssl-s_client.txt"
LEAF_CERT="$OUTPUT_DIR/${SAFE_HOST}-leaf.pem"
CERT_DETAILS="$OUTPUT_DIR/${SAFE_HOST}-leaf-details.txt"

echo "Capturing openssl s_client output for ${HOST}:${PORT} ..."
openssl s_client -connect "${HOST}:${PORT}" -servername "$HOST" -showcerts < /dev/null > "$RAW_OUTPUT" 2>&1

awk '
  /-----BEGIN CERTIFICATE-----/ { capture=1 }
  capture { print }
  /-----END CERTIFICATE-----/ { exit }
' "$RAW_OUTPUT" > "$LEAF_CERT"

if [[ ! -s "$LEAF_CERT" ]]; then
  echo "Failed to extract a leaf certificate from $RAW_OUTPUT"
  exit 1
fi

openssl x509 -in "$LEAF_CERT" -noout -subject -issuer -dates -ext subjectAltName > "$CERT_DETAILS"

echo "Saved raw transcript to $RAW_OUTPUT"
echo "Saved extracted leaf certificate to $LEAF_CERT"
echo "Saved certificate details to $CERT_DETAILS"
echo
cat "$CERT_DETAILS"
