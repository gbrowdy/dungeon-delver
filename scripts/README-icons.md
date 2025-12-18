# Icon Generation Script

This script generates placeholder pixel art icons for the game.

## Usage

### Generate SVG Icons (No dependencies required)
```bash
node scripts/generate-placeholder-icons.js
```

### Generate PNG Icons (Requires pngjs)
```bash
# Install pngjs first
npm install pngjs --save-dev

# Then run the script
node scripts/generate-placeholder-icons.js
```

## Icon Categories

- **Stats** (16x16): health, mana, power, armor, speed, fortune, gold
- **Status Effects** (16x16): poison, stun, slow, bleed, regeneration
- **Powers** (32x32): All power abilities (16 total)
- **Items** (24x24): weapon, armor, accessory, potion
- **Enemy Abilities** (16x16): attack, multi_hit, poison, stun, heal, enrage, shield, triple_strike
- **UI Controls** (24x24): pause, play, speed controls, trophy, star, skull, hammer, question, sparkle

## Output

Icons are generated in:
```
public/assets/icons/
├── stats/
├── status/
├── powers/
├── items/
├── abilities/
└── ui/
```

Format: PNG (if pngjs installed) or SVG (fallback)

## Re-running

The script is safe to re-run - it will overwrite existing icons with fresh versions.
