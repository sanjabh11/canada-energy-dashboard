#!/bin/bash

# Deploy CORS Fixes to Supabase Edge Functions
# This script redeploys Edge Functions with updated CORS settings

set -e

PROJECT_REF="qnymbecjgeaoxsfphrti"

echo "🚀 Deploying CORS fixes to Supabase Edge Functions..."
echo ""

# Deploy analytics functions
echo "📊 Deploying analytics functions..."
supabase functions deploy api-v2-analytics-national-overview --project-ref $PROJECT_REF
supabase functions deploy api-v2-analytics-provincial-metrics --project-ref $PROJECT_REF
supabase functions deploy api-v2-analytics-trends --project-ref $PROJECT_REF

echo ""
echo "✅ All CORS fixes deployed successfully!"
echo ""
echo "🧪 Test with:"
echo "  Local:  http://localhost:5174"
echo "  Prod:   https://canada-energy.netlify.app"
