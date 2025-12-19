#!/bin/bash
# Generate all placeholder icons for the game

echo "Generating all placeholder icons..."
echo ""

echo "1. Generating base icons (stats, powers, items, etc.)..."
node scripts/generate-placeholder-icons.js

echo ""
echo "2. Generating path ability icons..."
node scripts/generate-path-ability-icons.js

echo ""
echo "✓ All icons generated successfully!"
echo ""
echo "Icons are located in: public/assets/icons/"
