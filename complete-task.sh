#!/bin/bash
# Complete Task 4.5-4.6: Update UI Components for Path Icons
# This script replaces files, validates build, and commits changes

set -e  # Exit on error

cd /Users/gilbrowdy/rogue-wave4-ui

echo "========================================="
echo "Task 4.5-4.6: Update UI Components"
echo "========================================="
echo ""

# Step 1: Replace the original files
echo "[1/4] Replacing original files with updated versions..."
mv src/components/game/AbilityChoicePopup-NEW.tsx src/components/game/AbilityChoicePopup.tsx
mv src/components/game/PathSelectionScreen-NEW.tsx src/components/game/PathSelectionScreen.tsx
echo "  ✓ Replaced AbilityChoicePopup.tsx"
echo "  ✓ Replaced PathSelectionScreen.tsx"
echo ""

# Step 2: Remove the helper script (this one will remain)
rm -f replace-files.sh
echo "  ✓ Cleaned up temporary files"
echo ""

# Step 3: Run build check
echo "[2/4] Running build check..."
npm run build
if [ $? -eq 0 ]; then
  echo "  ✓ Build passed!"
else
  echo "  ✗ Build failed! Please check errors above."
  exit 1
fi
echo ""

# Step 4: Run lint check
echo "[3/4] Running lint check..."
npm run lint
if [ $? -eq 0 ]; then
  echo "  ✓ Lint passed!"
else
  echo "  ⚠ Lint warnings (non-fatal)"
fi
echo ""

# Step 5: Git commit
echo "[4/4] Committing changes..."
git add src/components/game/AbilityChoicePopup.tsx
git add src/components/game/PathSelectionScreen.tsx
git commit -m "feat(ui): update path components to render PixelIcon (Wave 4.5-4.6)

- Replace Lucide icon rendering with PixelIcon in AbilityChoicePopup
- Replace Lucide icon rendering with PixelIcon in PathSelectionScreen
- Keep Lucide imports only for UI elements (Check, Crown, Info, etc.)
- Update ability preview icons in path selection
- Use appropriate icon sizes: 48px for ability cards, 32px for paths, 16px for previews"

echo "  ✓ Changes committed!"
echo ""

echo "========================================="
echo "Task 4.5-4.6 Complete!"
echo "========================================="
echo ""
echo "Summary of changes:"
echo "  • AbilityChoicePopup.tsx: Switched from Lucide dynamic icons to PixelIcon"
echo "  • PathSelectionScreen.tsx: Switched from Lucide dynamic icons to PixelIcon"
echo ""
echo "Next steps:"
echo "  • The changes have been committed to the worktree branch"
echo "  • Conductor should merge this branch back to the main feature branch"
