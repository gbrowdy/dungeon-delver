#!/bin/bash
# Script to replace the original files with updated versions

cd /Users/gilbrowdy/rogue-wave4-ui

# Replace AbilityChoicePopup.tsx
mv src/components/game/AbilityChoicePopup-NEW.tsx src/components/game/AbilityChoicePopup.tsx

# Replace PathSelectionScreen.tsx
mv src/components/game/PathSelectionScreen-NEW.tsx src/components/game/PathSelectionScreen.tsx

echo "Files replaced successfully!"
echo "Updated:"
echo "  - src/components/game/AbilityChoicePopup.tsx"
echo "  - src/components/game/PathSelectionScreen.tsx"
