# Path Progression System Design

## Overview

Two distinct progression systems for active and passive paths, providing fundamentally different gameplay experiences within the same game. All choices are **deterministic** - no RNG in what options are presented. Every player on the same path sees the same choices at the same levels.

## Design Principles

1. **Two games in one**: Active and passive paths are intentionally different mechanics
2. **No RNG in choices**: Level-up options are fixed per path/level, not random draws
3. **No respec**: This is a roguelike - respec by starting a new run
4. **Open-ended progression**: No artificial capstone ceiling; system extensible beyond level 15
5. **Meaningful choices**: Every decision should shape your playstyle

---

## Level 1: Universal Start

All classes start the same way mechanically:
- **Basic ability**: Class-flavored but identical effect (Warrior "Strike", Mage "Zap", etc.)
- **Stamina**: Generic resource (replaced at level 2)
- **Block**: Basic defensive ability

| Class | Basic Ability | Effect |
|-------|---------------|--------|
| Warrior | Strike | 120% damage, 15 stamina, 3s CD |
| Mage | Zap | 120% damage, 15 stamina, 3s CD |
| Rogue | Slash | 120% damage, 15 stamina, 3s CD |
| Paladin | Smite | 120% damage, 15 stamina, 3s CD |

Level 1 is the "tutorial" phase before identity forms.

---

## Level 2: Path Divergence

At level 2, active and passive paths become completely different games:

### Active Path (Level 2)
- Stamina → Path-specific resource (Fury, Arcane Charges, Momentum, Zeal)
- Basic ability → Choose first POWER (2 predetermined options)
- Keep Block

### Passive Path (Level 2)
- Remove Stamina (no resource bar)
- Remove Basic ability (no powers)
- Remove Block (no manual defense)
- Get 2 Stances + stance toggle

**Passive path feel**: Like an idle game. Set up your build, watch it execute automatically.

---

## Active Path Progression

Active paths reward player timing, resource management, and power usage.

### Core Mechanic
- **Powers**: Clickable abilities with cooldowns, chosen at specific levels
- **Upgrades**: Each power has a linear upgrade path (Base → Tier 1 → Tier 2)
- **Upgrade choices**: Pick which of your owned powers to upgrade
- **Deterministic**: Same path = same choices at same levels

### Progression Table

| Level | Event | Choices Available |
|-------|-------|-------------------|
| 1 | Start | Basic ability + Stamina + Block |
| 2 | Path selection | Choose path → get resource, choose Power 1 (2 fixed options) |
| 3 | Upgrade | Upgrade Power 1 to T1 |
| 4 | Power 2 | Choose 1 of 2 fixed power options |
| 5 | Upgrade | Choose: P1→T2 or P2→T1 |
| 6 | Power 3 | Choose 1 of 2 fixed power options |
| 7 | Upgrade | Choose which power to upgrade |
| 8 | Subpath | Choose 1 of 2 subpaths → grants Power 4 |
| 9 | Upgrade | Choose which power to upgrade (4 choices) |
| 10 | Upgrade | Choose which power to upgrade |
| 11 | Upgrade | Choose which power to upgrade |
| 12 | Upgrade | Choose which power to upgrade |
| 13 | Upgrade | Choose which power to upgrade |
| 14 | Upgrade | Choose which power to upgrade |
| 15 | Upgrade | Choose which power to upgrade |

### Math Check
- 4 powers × 2 upgrade tiers = 8 upgrades needed to max all
- Upgrade opportunities: Levels 3, 5, 7, 9, 10, 11, 12, 13, 14, 15 = 10 opportunities
- Result: All powers can be maxed by level 15 with 2 spare upgrade slots

### Power Structure
Each power has:
- **Base**: The power as initially selected
- **Tier 1**: First upgrade (numerical boost or added effect)
- **Tier 2**: Second upgrade (further enhancement)

Upgrades are linear (no branching within a power's upgrade path).

---

## Passive Path Progression

Passive paths work automatically without player intervention. Players specialize by enhancing one of two stances.

### Core Mechanic
- **Two stances per path**: One defensive/sustain, one offensive/counter
- **Binary choices**: Each level offers "Stance A enhancement" vs "Stance B enhancement"
- **Cumulative specialization**: Choices stack to create your build identity
- **Enhancements only apply in their stance**: Strategic stance switching matters

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
| 1 | Start | Basic ability + Stamina + Block |
| 2 | Path selection | Remove all buttons, get 2 Stances |
| 3 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 4 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 5 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 6 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 7 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 8 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 9 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 10 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 11 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 12 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 13 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 14 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |
| 15 | Enhancement | Stance A boost vs Stance B boost (fixed pair) |

### Math Check
- 13 binary choices (levels 3-15)
- Theoretical builds: 2^13 = 8,192 combinations
- Practical archetypes: Full A (tank), Full B (offense), various hybrids

### Enhancement Design Principles

Enhancements:
1. **Only apply in their stance**: Iron enhancements only work in Iron Stance
2. **Linear paths**: Each stance has a 13-tier progression path
3. **Choose which to advance**: At each level, pick "advance Stance A" or "advance Stance B"
4. **Mix and match**: Go all-in on one stance (13/0) or balance (7/6)

---

## WARRIOR CLASS - Complete Design

### BERSERKER (Active Path) - Powers

**Resource**: Fury (builds from combat: +8 on hit, +12 on damaged)

#### Level 2: Power 1 Choice

| Rage Strike | Savage Slam |
|-------------|-------------|
| 30 Fury, 5s CD | 50 Fury, 8s CD |
| Deal 200% damage. +50% if below 50% HP. | Deal 150% damage. Stun for 1.5s. |

**Rage Strike Upgrades:**
- T1: 240% damage, threshold → 60% HP
- T2: Crit guaranteed if below threshold

**Savage Slam Upgrades:**
- T1: 180% damage, stun → 2s
- T2: Stunned enemies take 25% more damage from you for 4s

#### Level 4: Power 2 Choice

| Berserker Roar | Reckless Charge |
|----------------|-----------------|
| 25 Fury, 10s CD | 35 Fury, 6s CD |
| +40% Power, +25% Speed for 6s | Deal 150% damage. Lose 10% max HP. |

**Berserker Roar Upgrades:**
- T1: +50% Power, +35% Speed, 8s duration
- T2: Also grants 15% lifesteal during buff

**Reckless Charge Upgrades:**
- T1: 200% damage, self-damage → 8%
- T2: If this kills, heal for 20% max HP

#### Level 6: Power 3 Choice

| Bloodthirst | Unstoppable Force |
|-------------|-------------------|
| 50 Fury, 8s CD | 60 Fury, 12s CD |
| Deal 160% damage. Heal 100% of damage dealt. | Deal 300% damage. Immune to death for 3s. |

**Bloodthirst Upgrades:**
- T1: 200% damage, overheal → shield (up to 20% max HP)
- T2: Cooldown reduced by 2s per kill

**Unstoppable Force Upgrades:**
- T1: 400% damage, immunity → 4s
- T2: During immunity, reflect 50% damage taken

#### Level 8: Subpath → Power 4

| Warlord: Warcry | Executioner: Death Sentence |
|-----------------|----------------------------|
| 40 Fury, 15s CD | 70 Fury, 10s CD |
| Stun 2s, enemy -25% damage for 8s | 200% damage. 500% if enemy <30% HP. Kill resets all CDs. |

**Warcry Upgrades:**
- T1: Stun → 2.5s, debuff → -35% damage
- T2: Your attacks during stun deal +50% damage

**Death Sentence Upgrades:**
- T1: Threshold → 35% HP, execute damage → 600%
- T2: Kills also restore 50% max HP

---

### GUARDIAN (Passive Path) - Stance Enhancements

**Stances:**
- **Iron Stance**: +25% Armor, -15% Speed, 15% damage reduction
- **Retribution Stance**: +15% Power, +10% Armor, 20% reflect damage

Each stance has a 13-tier linear progression. At each level-up (3-15), choose which stance path to advance.

#### IRON PATH (Defensive)

| Tier | Name | Effect (in Iron Stance only) |
|------|------|------------------------------|
| 1 | Fortified Skin | +20% Armor |
| 2 | Damage Absorption | Damage reduction → 20% |
| 3 | Regenerating Bulwark | +2 HP/s |
| 4 | Immovable | Immune to slows/stuns |
| 5 | Armor Scaling | +1% damage reduction per 5 Armor |
| 6 | Last Bastion | Below 30% HP: +50% Armor |
| 7 | Stalwart Recovery | 15% chance when hit: heal 5% max HP |
| 8 | Unbreakable | Can't take >20% max HP per hit |
| 9 | Stone Form | Remove speed penalty (-15% → 0%) |
| 10 | Living Fortress | +25% max HP |
| 11 | Regeneration Surge | HP regen doubled above 70% HP |
| 12 | Juggernaut | Armor reduces DoT damage |
| 13 | Immortal Bulwark | Once/floor: survive lethal at 1 HP |

#### RETRIBUTION PATH (Offensive)

| Tier | Name | Effect (in Retribution Stance only) |
|------|------|-------------------------------------|
| 1 | Sharpened Thorns | Reflect → 30% |
| 2 | Vengeful Strikes | +10% damage per hit taken (max 5 stacks) |
| 3 | Blood Mirror | Heal 25% of damage reflected |
| 4 | Escalating Revenge | Reflect +5% per hit (no cap) |
| 5 | Counter Strike | 20% chance to auto-attack when hit |
| 6 | Pain Conduit | Below 50% HP: reflect doubled |
| 7 | Thorns Aura | Enemies take 5 damage/s |
| 8 | Retaliation | After hit: next attack +75% damage |
| 9 | Wrath Accumulator | +2% Power per hit (permanent) |
| 10 | Death Reflection | Reflect ignores armor |
| 11 | Explosive Thorns | 25% on hit: deal 50% Power as burst |
| 12 | Vengeance Incarnate | Reflect can crit |
| 13 | Avatar of Punishment | Reflect kills heal 30% max HP |

#### Example Guardian Builds

- **Full Iron (13/0)**: Ultimate tank, unkillable wall
- **Full Retribution (0/13)**: Maximum punishment, enemies kill themselves
- **Balanced (7/6)**: Solid tank with meaningful reflect
- **Iron-heavy (10/3)**: Tank with reflect sustain from Blood Mirror

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
