#!/usr/bin/env bash
# Downloads core GeoJSON files needed for the map
# Run from project root: bash scripts/download-geojson.sh

set -e
BASE="public/geojson"

echo "📥 Downloading India states (Natural Earth / GADM simplified)..."

# India states — from Natural Earth via raw GitHub
curl -sL "https://raw.githubusercontent.com/datameet/maps/master/States/india_states.geojson" \
  -o "$BASE/political/india-states.geojson" && echo "  ✓ india-states.geojson"

# India districts — simplified GADM
curl -sL "https://raw.githubusercontent.com/datameet/maps/master/Districts/india_districts-2019.geojson" \
  -o "$BASE/political/india-districts.geojson" && echo "  ✓ india-districts.geojson"

echo ""
echo "🌊 Major rivers..."
curl -sL "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson" \
  -o "$BASE/physical/rivers-major.geojson" && echo "  ✓ rivers-major.geojson"

echo ""
echo "✅ Core GeoJSON downloaded. For historical boundaries, digitize in QGIS"
echo "   and save to public/geojson/historical/"
