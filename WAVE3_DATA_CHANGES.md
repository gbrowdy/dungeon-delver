# Wave 3 Data Files Icon Updates

## Summary
Updated all data files to use icon type strings instead of emoji characters for the PixelIcon component system.

## Files Modified

### 1. src/data/powers.ts (Task 3.12)
Updated all 16 power definitions with icon type strings:

| Power ID | Old Icon | New Icon Type |
|----------|----------|---------------|
| crushing-blow | 🔨 | power-crushing_blow |
| power-strike | ⚡ | power-power_strike |
| fan-of-knives | 🗡️ | power-fan_of_knives |
| flurry | 💨 | power-flurry |
| ambush | 🎯 | power-ambush |
| coup-de-grace | 💀 | power-coup_de_grace |
| frost-nova | ❄️ | power-frost_nova |
| stunning-blow | ⚡ | power-stunning_blow |
| battle-cry | 📯 | power-battle_cry |
| inner-focus | ✨ | power-inner_focus |
| reckless-swing | 🩸 | power-reckless_swing |
| blood-pact | 💉 | power-blood_pact |
| divine-heal | ✝️ | power-divine_heal |
| regeneration | 💚 | power-regeneration |
| earthquake | 🌋 | power-earthquake |
| vampiric-touch | 🦇 | power-vampiric_touch |

### 2. src/data/items.ts (Task 3.13)
Updated ITEM_TEMPLATES with icon type strings for all 12 item variants:

**Weapons:**
- Sword: ⚔️ → item-sword
- Axe: 🪓 → item-axe
- Staff: 🪄 → item-staff
- Dagger: 🗡️ → item-dagger

**Armor:**
- Plate Armor: 🛡️ → item-plate_armor
- Chainmail: 🦺 → item-chainmail
- Leather Armor: 🧥 → item-leather_armor
- Robe: 👘 → item-robe

**Accessories:**
- Ring: 💍 → item-ring
- Amulet: 📿 → item-amulet
- Belt: 🎗️ → item-belt
- Boots: 👢 → item-boots

### 3. src/data/enemies.ts (Task 3.14)
Updated ENEMY_ABILITIES with icon type strings for all 7 abilities:

| Ability | Old Icon | New Icon Type |
|---------|----------|---------------|
| double_strike | ⚔️⚔️ | ability-multi_hit |
| poison_bite | 🐍 | ability-poison |
| stunning_blow | 💫 | ability-stun |
| regenerate | 💚 | ability-heal |
| enrage | 😤 | ability-enrage |
| shield_bash | 🛡️ | ability-shield |
| triple_strike | ⚔️⚔️⚔️ | ability-triple_strike |

Also updated default attack icon in `calculateEnemyIntent()`:
- Default attack: ⚔️ → ability-attack

### 4. src/constants/icons.ts
Expanded POWER_ICONS and ITEM_ICONS with all variants:

**Added 16 power icons:**
- CRUSHING_BLOW through VAMPIRIC_TOUCH

**Added 12 item variant icons:**
- SWORD, AXE, STAFF, DAGGER (weapons)
- PLATE_ARMOR, CHAINMAIL, LEATHER_ARMOR, ROBE (armor)
- RING, AMULET, BELT, BOOTS (accessories)

## Impact
- All data files now use consistent icon type strings
- Icons will be rendered via PixelIcon component instead of raw emojis
- Maintains all existing game functionality
- No changes to game logic, only icon field values

## Next Steps
1. Verify TypeScript compilation with `npm run build`
2. Test in-game rendering with PixelIcon component
3. Commit changes to worktree branch
