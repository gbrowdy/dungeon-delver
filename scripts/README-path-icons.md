# Path Ability Icon Generation Script

This script generates placeholder pixel art icons for all path abilities across all character classes.

## Usage

```bash
node scripts/generate-path-ability-icons.js
```

Or via npm:
```bash
npm run generate:path-icons
```

## What It Generates

The script creates **82 path ability icons** (32x32 PNG with transparency):

### Warrior (26 icons)
- **Berserker Path** (13): blood_rage, pain_fueled, adrenaline_rush, bloodbath, reckless_fury, battle_trance, intimidating_presence, warlord_command, crushing_blows, executioners_strike, killing_spree, mortal_wounds, undying_fury
- **Guardian Path** (13): iron_skin, regeneration, damage_reduction, auto_block, last_stand, endurance, fortress_stance, immovable_object, healing_aura, thorns, vengeful_strike, retribution, immortal_guardian

### Mage (24 icons)
- **Archmage Path** (12): archmage_spell_power, archmage_mana_efficiency, archmage_cooldown_mastery, archmage_spell_crit, elementalist_fire_mastery, elementalist_ice_mastery, elementalist_lightning_mastery, elementalist_elemental_convergence, destroyer_overwhelming_power, destroyer_spell_surge, destroyer_glass_cannon, destroyer_apocalypse
- **Enchanter Path** (12): enchanter_passive_power, enchanter_mana_regen, enchanter_damage_aura, enchanter_dot_amplify, spellweaver_auto_cast, spellweaver_chain_cast, spellweaver_efficient_automation, spellweaver_arcane_assembly, sage_wisdom_aura, sage_toxic_field, sage_arcane_field, sage_overwhelming_presence

### Rogue (16 icons)
- **Assassin Path** (8): rogue_assassin_vital_strike, rogue_assassin_ambush, rogue_assassin_precision, rogue_assassin_ruthless_efficiency, rogue_assassin_killing_spree, rogue_assassin_execute, rogue_assassin_shadow_dance, rogue_assassin_death_mark
- **Duelist Path** (8): rogue_duelist_riposte, rogue_duelist_en_garde, rogue_duelist_blade_dancer, rogue_duelist_evasion, rogue_duelist_uncanny_dodge, rogue_duelist_blur, rogue_duelist_perfect_form, rogue_duelist_shadowstep

### Paladin (16 icons)
- **Crusader Path** (8): holy_strike, righteous_fury, smite_the_wicked, mark_of_judgment, weakening_light, divine_condemnation, crusader_holy_avenger, crusader_divine_wrath
- **Protector Path** (8): blessed_recovery, healing_ward, shield_of_renewal, enduring_faith, armor_of_sacrifice, last_stand, protector_eternal_guardian, protector_unbreakable_will

## Output Structure

Icons are generated in:
```
public/assets/icons/abilities/paths/
├── warrior/
│   ├── blood_rage.png
│   ├── pain_fueled.png
│   └── ... (24 more)
├── mage/
│   ├── archmage_spell_power.png
│   └── ... (23 more)
├── rogue/
│   ├── rogue_assassin_vital_strike.png
│   └── ... (15 more)
└── paladin/
    ├── holy_strike.png
    └── ... (15 more)
```

## Icon Specifications

- **Size**: 32x32 pixels
- **Format**: PNG with transparency
- **Color Scheme**:
  - **Warrior**: Red/Orange (#ef4444, #f97316) - aggressive, combat-focused
  - **Mage**: Blue/Purple (#3b82f6, #8b5cf6) - magical, arcane
  - **Rogue**: Green/Dark (#22c55e, #1f2937) - stealthy, precise
  - **Paladin**: Gold/White (#fbbf24, #fef3c7) - holy, protective

## Pattern Generation

Each ability icon uses a thematic pattern that visually represents its function:

- **Offensive abilities**: Swords, daggers, flames, explosions
- **Defensive abilities**: Shields, armor, barriers, walls
- **Utility abilities**: Auras, gears, spirals, marks
- **Passive abilities**: Circles, halos, fields, radiance

## Technical Details

- **No external dependencies** - Uses Node.js built-in modules only (fs, path, zlib)
- **Pure PNG generation** - Manually constructs PNG data using PNG specification
- **Automatic directory creation** - Creates necessary subdirectories if they don't exist
- **Safe to re-run** - Overwrites existing icons with fresh versions

## Integration

Generated icons are used by the `PixelIcon` component:

```tsx
<PixelIcon name="blood_rage" category="abilities/paths/warrior" size={32} />
```

## Notes

- These are placeholder icons for development
- Icons are gitignored (`.gitignore` excludes `public/assets/icons/**/*.png`)
- Icons are generated locally as needed during development
- Replace with production pixel art when assets are ready
