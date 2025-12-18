#!/bin/bash
#
# Wave 4: Path Data Icon Migration - Execution Script
#
# This script executes the Python automation that updates all path data files
# and the constants/icons.ts file, then commits the changes.
#

set -e  # Exit on error

cd /Users/gilbrowdy/rogue-wave4-data

echo ""
echo "=================================================================="
echo "  WAVE 4: PATH DATA ICON MIGRATION"
echo "=================================================================="
echo ""
echo "This will:"
echo "  1. Update 4 path data files (warrior, mage, rogue, paladin)"
echo "  2. Add PATH_ABILITY_ICONS to constants/icons.ts"
echo "  3. Run 'npm run build' to verify compilation"
echo "  4. Commit changes to the branch"
echo ""
echo "Working directory: $(pwd)"
echo ""
read -p "Press ENTER to continue or CTRL+C to abort..."
echo ""

# Make the Python script executable
chmod +x execute_wave4_updates.py

# Execute the Python script
python3 execute_wave4_updates.py

echo ""
echo "=================================================================="
echo "  EXECUTION COMPLETE"
echo "=================================================================="
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff HEAD~1"
echo "  2. Test the application: npm run dev"
echo "  3. The conductor will merge this into the main feature branch"
echo ""
