#!/bin/bash
# Fix CORS Wildcard in Edge Functions
# Replaces '*' with specific allowed origins

echo "🔒 Fixing CORS wildcard in edge functions..."

# Define allowed origins
ALLOWED_ORIGIN="https://your-app.netlify.app"

# Find all edge function index.ts files
EDGE_FUNCTIONS=$(find supabase/functions -name "index.ts" -type f)

# Counter
FIXED=0
SKIPPED=0

for file in $EDGE_FUNCTIONS; do
  # Check if file contains CORS wildcard
  if grep -q "'Access-Control-Allow-Origin': '\*'" "$file"; then
    echo "  🔧 Fixing: $file"
    
    # Create backup
    cp "$file" "$file.backup"
    
    # Replace wildcard with specific origin (macOS compatible)
    sed -i '' "s|'Access-Control-Allow-Origin': '\\*'|'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '$ALLOWED_ORIGIN'|g" "$file"
    
    FIXED=$((FIXED + 1))
  else
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "✅ CORS wildcard fix complete!"
echo "  - Fixed: $FIXED files"
echo "  - Skipped: $SKIPPED files (already correct)"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git diff supabase/functions"
echo "  2. Set ALLOWED_ORIGINS in Supabase: supabase secrets set ALLOWED_ORIGINS='https://your-app.netlify.app'"
echo "  3. Deploy functions: supabase functions deploy"
