#!/bin/sh
set -eu

PORT=${PLAYWRIGHT_PHASE6_PORT:-4175}
OUT_DIR=$(mktemp -d "${TMPDIR:-/tmp}/ceip-playwright-dist.XXXXXX")

cleanup() {
  rm -rf -- "$OUT_DIR"
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

rm -rf node_modules/.vite-temp
pnpm exec tsc -b
pnpm exec vite build --outDir "$OUT_DIR" --emptyOutDir
pnpm exec vite preview --outDir "$OUT_DIR" --host 127.0.0.1 --port "$PORT" --strictPort
