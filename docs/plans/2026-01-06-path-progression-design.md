# Path Progression System Design

## Overview

Two distinct progression systems for active and passive paths, providing fundamentally different gameplay experiences within the same game. All choices are **deterministic** - no RNG in what options are presented. Your available choices at each level are 100% determined by your previous selections.

## Design Principles

1. **Two games in one**: Active and passive paths are intentionally different mechanics
2. **No RNG in choices**: Level-up options are determined by prior choices, not random draws
3. **No respec**: This is a roguelike - respec by starting a new run
4. **Open-ended progression**: No artificial capstone ceiling; system extensible beyond level 15
5. **Meaningful choices**: Every decision should shape your playstyle

---

## Active Path Progression

Active paths reward player timing, power management, and manual ability usage.

### Core Mechanic
- **Abilities**: Unlocked at specific levels, choose 1 of 2 options
- **Upgrades**: Each ability has a linear upgrade path (Base → Tier 1 → Tier 2)
- **Upgrade choices**: Pick which of your owned abilities to upgrade

### Progression Table

| Level | Event | Choices Available |
|-------|-------|-------------------|
| 2 | Path selection | 2 paths (e.g., Berserker vs Guardian) |
| 3 | Ability 1 | Choose 1 of 2 ability options |
| 4 | Upgrade | Upgrade Ability 1 to Tier 1 (automatic, single choice) |
| 5 | Ability 2 | Choose 1 of 2 ability options |
| 6 | Upgrade | Choose: Upgrade A1→T2 OR A2→T1 |
| 7 | Ability 3 | Choose 1 of 2 ability options |
| 8 | Upgrade | Choose: Upgrade A1, A2, or A3 |
| 9 | Subpath | Choose 1 of 2 subpaths (grants Ability 4) |
| 10 | Upgrade | Choose: Upgrade A1, A2, A3, or A4 |
| 11 | Upgrade | Choose: Upgrade any ability |
| 12 | Upgrade | Choose: Upgrade any ability |
| 13 | Upgrade | Choose: Upgrade any ability |
| 14 | Upgrade | Choose: Upgrade any ability |
| 15 | Upgrade | Choose: Upgrade any ability |

### Math Check
- 4 abilities × 2 upgrade tiers = 8 upgrades needed to max all
- Upgrade opportunities: Levels 4, 6, 8, 10, 11, 12, 13, 14, 15 = 9 opportunities
- Result: All abilities can be maxed by level 15 with 1 spare upgrade slot

### Ability Structure
Each ability has:
- **Base**: The ability as initially selected
- **Tier 1**: First upgrade (numerical boost or added effect)
- **Tier 2**: Second upgrade (further enhancement)

Upgrades are linear (no branching within an ability's upgrade path).

### Example: Berserker Path

```
Level 3: Choose Ability 1
  → Blood Rage: +15% damage when below 50% HP
  → Pain Fueled: +1 Power per 10% missing HP

Level 4: Upgrade Ability 1
  → Blood Rage T1: Threshold increased to 60% HP, damage bonus to 20%

Level 5: Choose Ability 2
  → Adrenaline Rush: +20% Speed below 30% HP
  → Bloodbath: Kill heals 15% max HP

Level 6: Upgrade Choice
  → Upgrade Blood Rage to T2: Also grants 10% lifesteal
  → Upgrade Adrenaline Rush to T1: Threshold to 40%, speed to 25%
```

---

## Passive Path Progression

Passive paths work automatically without player intervention. Players specialize by enhancing one of two stances.

### Core Mechanic
- **Two stances per path**: One defensive/sustain, one offensive/counter
- **Binary choices**: Each level offers "Stance A enhancement" vs "Stance B enhancement"
- **Cumulative specialization**: Choices stack to create your build identity

### Current Stances

| Path | Stance A (Defensive) | Stance B (Offensive) |
|------|---------------------|---------------------|
| Guardian (Warrior) | Iron: +Armor, damage reduction | Retribution: +Power, reflect |
| Enchanter (Mage) | Hex Veil: +Armor, enemy debuff | Arcane Surge: +Power, burn proc |
| Duelist (Rogue) | Evasion: +Speed, auto-negate | Counter: +Power, counter-attack |
| Protector (Paladin) | Bulwark: +Armor, +HP, reduction | Healing: +Regen, lifesteal |

### Progression Table

| Level | Event | Choices Available |
|-------|-------|-------------------|
| 2 | Path selection | 2 paths |
| 3 | Enhancement | Stance A boost vs Stance B boost |
| 4 | Enhancement | Stance A boost vs Stance B boost |
| 5 | Enhancement | Stance A boost vs Stance B boost |
| 6 | Enhancement | Stance A boost vs Stance B boost |
| 7 | Enhancement | Stance A boost vs Stance B boost |
| 8 | Enhancement | Stance A boost vs Stance B boost |
| 9 | Enhancement | Stance A boost vs Stance B boost |
| 10 | Enhancement | Stance A boost vs Stance B boost |
| 11 | Enhancement | Stance A boost vs Stance B boost |
| 12 | Enhancement | Stance A boost vs Stance B boost |
| 13 | Enhancement | Stance A boost vs Stance B boost |
| 14 | Enhancement | Stance A boost vs Stance B boost |
| 15 | Enhancement | Stance A boost vs Stance B boost |

### Math Check
- 13 binary choices (levels 3-15)
- Theoretical builds: 2^13 = 8,192 combinations
- Practical archetypes: Full A (tank), Full B (offense), various hybrids

### Enhancement Design Principles

Enhancements should:
1. **Synergize with stance theme**: Iron Stance enhancements boost armor/mitigation
2. **Scale meaningfully**: Later enhancements can be more powerful
3. **Enable different sub-builds**: Multiple ways to spec into same stance
4. **Remain useful in other stance**: An Iron enhancement should still help somewhat in Retribution

### Example: Guardian Path

```
Level 3:
  → Iron Will: +15% armor effectiveness while in Iron Stance
  → Vengeful Spirit: +10% reflect damage while in Retribution Stance

Level 4:
  → Fortress Foundation: Iron Stance damage reduction scales with armor
  → Thorns of Pain: Retribution reflect also slows enemies 10%

Level 5:
  → Immovable: Iron Stance grants slow immunity
  → Blood Mirror: Retribution heals for 25% of damage reflected

Level 6:
  → Stalwart Defender: +20% HP while in Iron Stance
  → Escalating Revenge: Reflect damage increases by 5% per hit taken (resets on stance switch)
```

---

## Implementation Considerations

### Data Structure Changes

Active paths need:
- Ability upgrade definitions (Tier 1, Tier 2 for each ability)
- Tracking which abilities player has and their current tier
- Logic to present correct upgrade choices based on owned abilities

Passive paths need:
- Enhancement definitions per stance (13+ per stance)
- Tracking which enhancements player has selected
- Logic to apply cumulative enhancement effects

### UI Changes

Active path level-up screen:
- Variable number of choices (1-4 depending on owned abilities)
- Clear indication of which ability each upgrade affects
- Show current tier and next tier effect

Passive path level-up screen:
- Always 2 choices (Stance A vs Stance B enhancement)
- Show how enhancement synergizes with stance
- Display current enhancement count per stance (e.g., "Iron: 3, Retribution: 2")

### Future Extensibility

System designed to extend beyond level 15:
- Add more upgrade tiers (Tier 3?) for active paths
- Add more enhancement options for passive paths
- Potentially add "mastery" bonuses for 10+ picks in one stance

---

## Open Questions

1. **Subpath timing**: Level 9 feels late. Consider level 6 or 7?
2. **Enhancement power curve**: Should later enhancements be strictly stronger, or offer variety?
3. **Stance enhancement persistence**: Do enhancements only apply in that stance, or provide reduced benefit in either?
4. **Block ability**: Active paths have block + 4 abilities. Does block upgrade too?

---

## Next Steps

1. Design specific ability upgrade paths for each active path
2. Design 13+ stance enhancements per passive path
3. Implement data structures and type definitions
4. Build level-up UI for both systems
5. Balance testing
