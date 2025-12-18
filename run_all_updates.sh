#!/bin/bash
set -e  # Exit on error

echo "========================================="
echo "Wave 4: Update Path Data Files - Icon Migration"
echo "========================================="
echo ""

cd /Users/gilbrowdy/rogue-wave4-data

# Verify we're in the correct directory
pwd
echo ""

# Run the path files update script
echo "Step 1: Updating path data files..."
python3 apply_icon_updates.py
echo ""

# Run the constants/icons.ts update script
echo "Step 2: Updating constants/icons.ts..."
python3 update_icons_constants.py
echo ""

# Check if TypeScript compiles
echo "Step 3: Checking TypeScript compilation..."
npm run build
if [ $? -eq 0 ]; then
    echo "✓ TypeScript compilation successful!"
else
    echo "✗ TypeScript compilation failed!"
    exit 1
fi
echo ""

# Commit the changes
echo "Step 4: Committing changes..."
git add src/data/paths/warrior.ts
git add src/data/paths/mage.ts
git add src/data/paths/rogue.ts
git add src/data/paths/paladin.ts
git add src/constants/icons.ts
git commit -m "feat(data): update path files to use PixelIcon type strings (Wave 4.1-4.4)"
echo "✓ Changes committed!"
echo ""

# Clean up scripts
echo "Step 5: Cleaning up temporary scripts..."
rm -f apply_icon_updates.py
rm -f update_icons_constants.py
rm -f update_icons.sh
rm -f update_path_icons.py
rm -f run_all_updates.sh
echo "✓ Cleanup complete!"
echo ""

echo "========================================="
echo "Wave 4 Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  - Updated 4 path data files (warrior, mage, rogue, paladin)"
echo "  - Added PATH_ABILITY_ICONS to constants/icons.ts"
echo "  - TypeScript compiles without errors"
echo "  - Changes committed to branch"
echo ""
