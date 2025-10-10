#!/bin/bash
# Helper script to run nightly tests with environment variables

set -e

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  echo "📦 Loading environment variables from .env.local"
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "⚠️  .env.local not found - using existing environment variables"
fi

# Validate required variables
if [ -z "$VITE_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: VITE_SUPABASE_URL or SUPABASE_URL not set"
  exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY not set"
  exit 1
fi

if [ -z "$VITE_SUPABASE_EDGE_BASE" ] && [ -z "$SUPABASE_FUNCTIONS_BASE" ]; then
  echo "❌ Error: VITE_SUPABASE_EDGE_BASE or SUPABASE_FUNCTIONS_BASE not set"
  exit 1
fi

echo "✅ Environment variables validated"
echo ""

# Run tests
node tests/nightly/ceip_nightly_tests.mjs
