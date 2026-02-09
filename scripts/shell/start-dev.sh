#!/bin/bash
# Clean start script for Phase 1 development

echo "🧹 Step 1: Cleaning Vite cache..."
rm -rf node_modules/.vite node_modules/.vite-temp .vite dist 2>/dev/null

echo "✅ Cache cleared"
echo ""
echo "🚀 Step 2: Starting dev server..."
echo ""
echo "⚠️  IMPORTANT INSTRUCTIONS:"
echo "1. Wait for the server to show: 'Local: http://localhost:5173/'"
echo "2. Open that URL in your browser"
echo "3. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to hard reload"
echo "4. Look for these tabs in navigation:"
echo "   - AI Data Centres (position 3)"
echo "   - Hydrogen Hub (position 4)"
echo "   - Critical Minerals (position 5)"
echo ""
echo "Starting server now..."
echo "========================================"

npm run dev
