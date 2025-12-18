# Icon Generation - Wave 2 Complete

## What Was Created

A comprehensive icon generation system that creates placeholder pixel art icons for all game UI elements.

### Script: `scripts/generate-placeholder-icons.js`

- **Zero dependencies**: Implements PNG file format manually using Node.js built-ins
- **Pure JavaScript**: Uses only `fs`, `path`, and `zlib` (Node.js standard library)
- **Re-runnable**: Safe to run multiple times, overwrites existing files
- **Fast**: Generates all 47 icons in under a second

### Icon Categories Generated

1. **Stats** (16×16px) - 7 icons
   - health, mana, power, armor, speed, fortune, gold

2. **Status Effects** (16×16px) - 5 icons
   - poison, stun, slow, bleed, regeneration

3. **Powers** (32×32px) - 16 icons
   - All combat powers (crushing_blow, power_strike, fan_of_knives, etc.)

4. **Items** (24×24px) - 4 icons
   - weapon, armor, accessory, potion

5. **Enemy Abilities** (16×16px) - 8 icons
   - attack, multi_hit, poison, stun, heal, enrage, shield, triple_strike

6. **UI Controls** (24×24px) - 11 icons
   - pause, play, speed controls (1x/2x/3x), trophy, star, skull, hammer, question, sparkle

**Total: 51 placeholder icons**

## Usage

### Generate Icons

```bash
npm run generate:icons
```

Or directly:

```bash
node scripts/generate-placeholder-icons.js
```

### Output Location

```
public/assets/icons/
├── stats/
│   ├── health.png
│   ├── mana.png
│   ├── power.png
│   ├── armor.png
│   ├── speed.png
│   ├── fortune.png
│   └── gold.png
├── status/
│   ├── poison.png
│   ├── stun.png
│   ├── slow.png
│   ├── bleed.png
│   └── regeneration.png
├── powers/
│   ├── crushing_blow.png
│   ├── power_strike.png
│   ├── fan_of_knives.png
│   ├── flurry.png
│   ├── ambush.png
│   ├── coup_de_grace.png
│   ├── frost_nova.png
│   ├── stunning_blow.png
│   ├── battle_cry.png
│   ├── inner_focus.png
│   ├── reckless_swing.png
│   ├── blood_pact.png
│   ├── divine_heal.png
│   ├── regeneration.png
│   ├── earthquake.png
│   └── vampiric_touch.png
├── items/
│   ├── weapon.png
│   ├── armor.png
│   ├── accessory.png
│   └── potion.png
├── abilities/
│   ├── attack.png
│   ├── multi_hit.png
│   ├── poison.png
│   ├── stun.png
│   ├── heal.png
│   ├── enrage.png
│   ├── shield.png
│   └── triple_strike.png
└── ui/
    ├── pause.png
    ├── play.png
    ├── speed_1x.png
    ├── speed_2x.png
    ├── speed_3x.png
    ├── trophy.png
    ├── star.png
    ├── skull.png
    ├── hammer.png
    ├── question.png
    └── sparkle.png
```

## Color Palette

All icons use colors from the game's palette (defined in `constants/sprites.ts`):

- **Red**: Health, damage, attacks
- **Blue**: Mana, speed boosts
- **Green**: Healing, regeneration, speed
- **Orange**: Power, attacks
- **Purple**: Special abilities, vampiric effects
- **Gold**: Currency, fortune, rewards
- **Silver**: Armor, weapons, controls
- **Yellow**: Stun effects, sparkles
- **Cyan**: Frost/cold effects
- **Poison Green**: Poison effects
- **Bone**: Death/skull icons
- **Brown**: Earth effects (earthquake)

## Icon Patterns

The script generates simple geometric shapes for each icon type:

- **Heart**: Health icons
- **Diamond**: Mana
- **Shield**: Armor/defense
- **Sword**: Weapons/attacks
- **Star**: Rewards/fortune
- **Circle/Droplet**: Status effects, potions
- **Cross**: Healing
- **Hammer**: Physical attacks

## Technical Details

### PNG Implementation

The script manually creates PNG files following the PNG specification:

1. **PNG Signature**: Standard 8-byte PNG header
2. **IHDR Chunk**: Image dimensions and format (RGBA, 8-bit)
3. **IDAT Chunk**: Compressed pixel data (zlib deflate)
4. **IEND Chunk**: End of file marker

### CRC32 Calculation

Implements CRC32 checksum for PNG chunk validation using the PNG-specific polynomial.

### Pixel Format

- **Color Type**: RGBA (6) - True color with alpha channel
- **Bit Depth**: 8 bits per channel
- **Scanline Filter**: None (0) - Simple unfiltered pixel data

## Next Steps

### Wave 3: PixelIcon Component Integration

After this wave, the next task is to create a React component (`PixelIcon`) that loads and displays these PNG icons throughout the UI.

### Future Improvements

1. **Proper Pixel Art**: Replace placeholders with hand-crafted pixel art
2. **Animation Support**: Add animated versions for special effects
3. **Size Variants**: Generate multiple resolutions for different UI contexts
4. **Sprite Sheets**: Combine icons into sprite sheets for better performance

## Files Created

1. `/scripts/generate-placeholder-icons.js` - Main generation script
2. `/scripts/README-icons.md` - Script documentation
3. `/ICON_GENERATION.md` - This file (summary)
4. Updated `/package.json` - Added `generate:icons` script

## Validation

To verify icons were generated correctly:

```bash
# Count generated files
find public/assets/icons -name "*.png" | wc -l
# Should output: 51

# Check directory structure
tree public/assets/icons
```

## Notes

- Icons are **placeholder quality** - simple geometric shapes with appropriate colors
- All icons use **transparent backgrounds**
- Icons are optimized for **pixel-perfect rendering** at their native sizes
- The script is **idempotent** - safe to run repeatedly
