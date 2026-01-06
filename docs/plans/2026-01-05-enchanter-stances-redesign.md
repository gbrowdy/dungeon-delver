# Enchanter Stances Redesign

**Date**: 2026-01-05
**Status**: Approved

## Problem

The Enchanter (Mage passive path) stances only provide stat bonuses, unlike other passive paths which have unique combat mechanics:

| Path | Unique Mechanics |
|------|------------------|
| Guardian | `reflect_damage` |
| Duelist | `auto_block`, `counter_attack` |
| Protector | `lifesteal` |
| Enchanter | *(none - just stats)* |

## Solution

Redesign Enchanter stances to each have a distinct combat mechanic:

### Arcane Surge (Offensive Stance)

**Unique Mechanic**: `arcane_burn` - Chance-based proc with DoT

- 20% chance on attack to trigger Arcane Burn
- Deals 30% bonus damage immediately
- Applies DoT: 5 damage/sec for 3 seconds (15 total damage)
- Combat log: "Arcane Burn! X damage + burning for 15"

**Stat Bonuses**:
- +15% Power
- +10% Speed

### Hex Veil (Defensive Stance)

**Unique Mechanic**: `hex_aura` - Passive enemy debuff

- While in this stance, enemies deal 15% less damage
- Always active, no attack interaction needed
- Applied before armor calculation
- Combat log on stance switch: "Hex Veil weakens the enemy"

**Stat Bonuses**:
- +15% Armor
- +10% Speed

## Implementation

### 1. Update stance definitions (`src/data/stances.ts`)

Replace `ENCHANTER_STANCES` with new definitions using new behavior types.

### 2. Add behavior handlers (`src/ecs/systems/combat.ts`)

- `arcane_burn`: In player attack section, check for proc chance, apply bonus damage + status effect
- `hex_aura`: In enemy attack section, check if player has hex_aura behavior, reduce damage

### 3. Add DoT status effect

Either use existing `statusEffects` system or add arcane burn as a simple tick in combat.

### 4. Update types if needed (`src/types/paths.ts`)

Add `arcane_burn` and `hex_aura` to behavior modifier types.

## Future Work

- Review passive path abilities to ensure they complement these stance mechanics
- Abilities could extend these (e.g., increase burn duration, hex reduces armor too)
