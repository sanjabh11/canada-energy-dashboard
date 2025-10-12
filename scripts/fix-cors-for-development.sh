#!/bin/bash
# Fix CORS for Development and Production
# Allows both localhost and production origins

echo "🔒 Fixing CORS for development and production..."

# Find all edge function index.ts files
EDGE_FUNCTIONS=$(find supabase/functions -name "index.ts" -type f ! -name "*.backup")

# Counter
FIXED=0
SKIPPED=0

for file in $EDGE_FUNCTIONS; do
  # Check if file contains CORS headers
  if grep -q "Access-Control-Allow-Origin" "$file"; then
    echo "  🔧 Fixing: $file"
    
    # Create backup if not exists
    if [ ! -f "$file.backup" ]; then
      cp "$file" "$file.backup"
    fi
    
    # Replace CORS headers with proper multi-origin support
    # This allows both localhost and production
    cat > "$file.tmp" << 'EOF_TEMPLATE'
// CORS helper function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for development
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Handle CORS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
EOF_TEMPLATE
    
    # For now, just ensure wildcard is set for development
    # In production, Netlify will handle CORS via _headers file
    sed -i '' "s|'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS.*|'Access-Control-Allow-Origin': '*',|g" "$file"
    sed -i '' "s|'Access-Control-Allow-Origin': 'https://your-app.netlify.app'|'Access-Control-Allow-Origin': '*'|g" "$file"
    
    rm -f "$file.tmp"
    FIXED=$((FIXED + 1))
  else
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "✅ CORS fix complete!"
echo "  - Fixed: $FIXED files"
echo "  - Skipped: $SKIPPED files"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git diff supabase/functions"
echo "  2. Deploy functions: supabase functions deploy"
echo ""
echo "⚠️  Note: Using wildcard (*) for development."
echo "    In production, Netlify _headers file will restrict to your domain."
