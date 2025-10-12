#!/bin/bash
# Automated console.log replacement script
# Replaces all console.log/warn/info/error with debug utility calls

set -e

echo "🔧 Replacing console.log with debug utility..."

# Files to process (remaining files with console.log)
FILES=(
  "src/components/CurtailmentAnalyticsDashboard.tsx"
  "src/hooks/useWebSocket.ts"
  "src/lib/dataManager.ts"
  "src/components/RenewableOptimizationHub.tsx"
  "src/lib/clientStreamSimulator.ts"
  "src/lib/data/streamingService.ts"
  "src/components/DigitalTwinDashboard.tsx"
  "src/lib/featureFlags.ts"
  "src/lib/progressTracker.ts"
  "src/components/ConsultationTracker.tsx"
  "src/components/EnergyDataDashboard.tsx"
  "src/components/ProvincialGenerationDataManager.tsx"
  "src/components/RealTimeDashboard.tsx"
  "src/lib/consultationWorkflow.ts"
  "src/lib/weatherService.ts"
)

COUNT=0

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  Skipping $file (not found)"
    continue
  fi
  
  echo "Processing $file..."
  
  # Check if debug import already exists
  if ! grep -q "import.*debug.*from.*@/lib/debug" "$file" 2>/dev/null; then
    # Find first import line
    first_import=$(grep -n "^import" "$file" 2>/dev/null | head -1 | cut -d: -f1)
    
    if [ -n "$first_import" ]; then
      # Add import after first import
      sed -i '' "${first_import}a\\
import { debug } from '@/lib/debug';\\
" "$file"
      echo "  ✅ Added debug import"
    else
      # No imports found, add at top
      sed -i '' "1i\\
import { debug } from '@/lib/debug';\\
\\
" "$file"
      echo "  ✅ Added debug import at top"
    fi
  else
    echo "  ℹ️  Debug import already exists"
  fi
  
  # Count replacements
  BEFORE=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
  
  # Replace console.log/warn/error/info with debug equivalents
  sed -i '' 's/console\.log(/debug.log(/g' "$file"
  sed -i '' 's/console\.warn(/debug.warn(/g' "$file"
  sed -i '' 's/console\.error(/debug.error(/g' "$file"
  sed -i '' 's/console\.info(/debug.info(/g' "$file"
  
  AFTER=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
  REPLACED=$((BEFORE - AFTER))
  
  if [ "$REPLACED" -gt 0 ]; then
    echo "  ✅ Replaced $REPLACED console.* calls"
    COUNT=$((COUNT + REPLACED))
  else
    echo "  ℹ️  No replacements needed"
  fi
done

echo ""
echo "🎉 Complete! Replaced $COUNT console.* calls across ${#FILES[@]} files"
echo "⚠️  Note: Review changes and test before committing"
