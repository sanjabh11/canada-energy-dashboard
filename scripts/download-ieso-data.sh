#!/bin/bash
# Download IESO Historical Data for Ontario
# Data sources: http://reports.ieso.ca/public/

set -e

DATA_DIR="./data/historical"
mkdir -p "$DATA_DIR/ieso"

echo "📥 Downloading IESO Ontario Historical Data..."
echo ""

# Generator Output by Fuel Type - October 2024
echo "Downloading Generator Output by Fuel Type (Oct 2024)..."
curl -o "$DATA_DIR/ieso/generator_output_oct2024.csv" \
  "http://reports.ieso.ca/public/GenOutputbyFuelHourly/PUB_GenOutputbyFuelHourly_202410.csv" \
  --silent --show-error --fail || echo "⚠️  Failed to download generator output"

# Ontario Demand - October 2024
echo "Downloading Ontario Demand (Oct 2024)..."
curl -o "$DATA_DIR/ieso/ontario_demand_oct2024.csv" \
  "http://reports.ieso.ca/public/Demand/PUB_Demand_202410.csv" \
  --silent --show-error --fail || echo "⚠️  Failed to download demand data"

# Generator Output - September 2024 (for baseline comparison)
echo "Downloading Generator Output by Fuel Type (Sep 2024)..."
curl -o "$DATA_DIR/ieso/generator_output_sep2024.csv" \
  "http://reports.ieso.ca/public/GenOutputbyFuelHourly/PUB_GenOutputbyFuelHourly_202409.csv" \
  --silent --show-error --fail || echo "⚠️  Failed to download Sept generator output"

# Ontario Demand - September 2024
echo "Downloading Ontario Demand (Sep 2024)..."
curl -o "$DATA_DIR/ieso/ontario_demand_sep2024.csv" \
  "http://reports.ieso.ca/public/Demand/PUB_Demand_202409.csv" \
  --silent --show-error --fail || echo "⚠️  Failed to download Sept demand"

echo ""
echo "✅ Download complete!"
echo ""
echo "Files saved to: $DATA_DIR/ieso/"
ls -lh "$DATA_DIR/ieso/"
echo ""
echo "Next step: Run 'node scripts/import-historical-data.mjs' to import into database"
