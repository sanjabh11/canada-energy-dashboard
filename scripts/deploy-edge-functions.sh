#!/bin/bash

# Deploy Real Data Integration Edge Functions
# This script helps deploy the Supabase Edge Functions for real data streaming

set -e

echo "🚀 Deploying Real Data Integration Edge Functions..."
echo "==================================================="

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    echo "❌ Error: Not in project root. Please run from the project root directory."
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged into Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: Not logged into Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "📋 Available Edge Functions:"
echo "----------------------------"
ls -la supabase/functions/*/ 2>/dev/null | grep -E "stream-|manifest" | while read line; do
    dirname=$(basename "$line")
    echo "✅ $dirname"
done

echo ""

# Deploy manifest endpoint first (no external dependencies)
echo "📦 Deploying manifest endpoint..."
if [ -d "supabase/functions/manifest" ]; then
    supabase functions deploy manifest --no-verify-jwt
    echo "✅ Manifest endpoint deployed"
else
    echo "⚠️  Manifest endpoint not found, skipping..."
fi

# Deploy streaming endpoints
echo "📊 Deploying streaming endpoints..."

# IESO Ontario demand streaming
if [ -d "supabase/functions/stream-ontario-demand" ]; then
    echo "📈 Deploying Ontario demand streaming..."
    supabase functions deploy stream-ontario-demand --no-verify-jwt
    echo "✅ Ontario demand streaming deployed"
else
    echo "⚠️  Ontario demand endpoint not found, skipping..."
fi

# AESO Alberta market streaming (if implemented)
if [ -d "supabase/functions/stream-alberta-market" ]; then
    echo "📈 Deploying Alberta market streaming..."
    supabase functions deploy stream-alberta-market --no-verify-jwt
    echo "✅ Alberta market streaming deployed"
else
    echo "⚠️  Alberta market endpoint not implemented yet, skipping..."
fi

# Weather streaming (if implemented)
if [ -d "supabase/functions/stream-weather" ]; then
    echo "🌤️ Deploying weather streaming..."
    supabase functions deploy stream-weather --no-verify-jwt
    echo "✅ Weather streaming deployed"
else
    echo "⚠️  Weather endpoint not implemented yet, skipping..."
fi

# Historical data endpoint (if implemented)
if [ -d "supabase/functions/historical-demand" ]; then
    echo "📚 Deploying historical data streaming..."
    supabase functions deploy historical-demand --no-verify-jwt
    echo "✅ Historical data streaming deployed"
else
    echo "⚠️  Historical endpoint not implemented yet, skipping..."
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Next Steps:"
echo "1. Update environment variables in Supabase dashboard"
echo "2. Enable live streaming: VITE_ENABLE_LIVE_STREAMING=true"
echo "3. Test the endpoints using the manifest:"
echo "   curl https://your-project.supabase.co/functions/v1/manifest"
echo "4. Monitor usage and performance in Supabase dashboard"
echo ""
echo "Environment Variables to Set:"
echo "- VITE_ENABLE_LIVE_STREAMING=true"
echo "- VITE_SUPABASE_URL=your_project_url"
echo "- VITE_SUPABASE_ANON_KEY=your_key"
echo "- KAGGLE_USERNAME=your_username (for historical data)"
echo "- KAGGLE_KEY=your_api_key"
echo ""
echo "💡 Remember: Always test with mock data first by setting fallback to true!"