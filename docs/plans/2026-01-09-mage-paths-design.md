# Mage Paths Full Implementation Design

## Overview

This document defines the complete implementation for the Mage class paths:
- **Archmage (Active):** Burst spell timing with Arcane Charges resource
- **Enchanter (Passive):** Sustained magical pressure with burn/hex stances

Both paths follow the established patterns from Warrior (Berserker/Guardian).

---

## Design Philosophy

| Aspect | Archmage | Enchanter |
|--------|----------|-----------|
| **Core fantasy** | "I unleash devastating spells at the perfect moment" | "My magic constantly works for me" |
| **Player agency** | High - timing power casts around charge decay | Low - choose stance, watch effects proc |
| **Resource** | Arcane Charges (gain-based, decays) | None (stance-based) |
| **Skill expression** | Managing charge windows, big vs small spell choice | Stance selection, enhancement build |

---

## Part 1: Archmage (Active Path)

### Resource: Arcane Charges

Already defined in `pathResources.ts`:
- **Behavior:** `gain` - casting spells ADDS charges (reverse mana)
- **Max:** 100
- **Decay:** 5 per second
- **Passive bonus:** +0.5% spell damage per charge (up to +50% at 100)

**Gameplay rhythm:**
1. Cast spells → charges build up
2. At high charges, can't cast expensive spells (no "room")
3. Wait for decay → opens casting window
4. Repeat

### Power Progression

Following Berserker pattern:
- **Level 2:** Choose Power 1 (2 options)
- **Level 4:** Choose Power 2 (2 options)
- **Level 6:** Choose Power 3 (2 options)
- **Level 8:** Subpath grants Power 4

### Level 2 Powers: Small vs Big

**Choice tension:** Establish relationship with Arcane Charges

#### Arcane Bolt (Small Spell)
```typescript
const ARCANE_BOLT: ArchmagePower = {
  id: 'arcane_bolt',
  name: 'Arcane Bolt',
  description: 'Deal 150% damage. Low charge cost.',
  icon: 'power-arcane_bolt',
  resourceCost: 15,  // Adds 15 charges
  cooldown: 4,
  effect: 'damage',
  value: 1.5,
  category: 'spell',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '180% damage, 12 charge cost',
      value: 1.8,
      resourceCost: 12,
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 3s',
      cooldown: 3,  // ECS-compliant: static value
    },
  ],
};
```

#### Meteor Strike (Big Nuke)
```typescript
const METEOR_STRIKE: ArchmagePower = {
  id: 'meteor_strike',
  name: 'Meteor Strike',
  description: 'Deal 450% damage. High charge cost.',
  icon: 'power-meteor_strike',
  resourceCost: 60,  // Adds 60 charges - need low charges to cast
  cooldown: 12,
  effect: 'damage',
  value: 4.5,
  category: 'spell',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '550% damage',
      value: 5.5,
    },
    {
      tier: 2,
      description: 'Stuns enemy for 2s on hit',
      stunDuration: 2,
    },
  ],
};
```

**Balance note:** Meteor's 450% multiplier compensates for:
- Lost passive damage bonus during decay wait (~25-40% less auto-attack damage)
- Fewer total casts compared to Arcane Bolt spammer

### Level 4 Powers: Buff vs Debuff

**Choice tension:** Enhance yourself or weaken the enemy

#### Arcane Empowerment (Self-Buff)
```typescript
const ARCANE_EMPOWERMENT: ArchmagePower = {
  id: 'arcane_empowerment',
  name: 'Arcane Empowerment',
  description: '+35% Power, +20% Speed for 6s.',
  icon: 'power-arcane_empowerment',
  resourceCost: 25,
  cooldown: 12,
  effect: 'buff',
  value: 0.35,
  category: 'buff',
  synergies: [],
  buffStats: [
    { stat: 'power', value: 0.35 },
    { stat: 'speed', value: 0.20 },
  ],
  buffDuration: 6,
  upgrades: [
    {
      tier: 1,
      description: '+45% Power, +30% Speed, 8s duration',
      buffPower: 0.45,
      buffSpeed: 0.30,
      buffDuration: 8,
    },
    {
      tier: 2,
      description: 'Also grants +15% critical hit chance',
      buffCritChance: 0.15,  // ECS-compliant: uses existing buff stat system
    },
  ],
};
```

#### Arcane Weakness (Enemy Debuff)
```typescript
const ARCANE_WEAKNESS: ArchmagePower = {
  id: 'arcane_weakness',
  name: 'Arcane Weakness',
  description: 'Enemy takes 25% more damage for 8s.',
  icon: 'power-arcane_weakness',
  resourceCost: 20,
  cooldown: 10,
  effect: 'debuff',
  value: 0.25,
  category: 'debuff',
  synergies: [],
  enemyDamageAmp: 25,  // +25% damage taken by enemy
  debuffDuration: 8,
  upgrades: [
    {
      tier: 1,
      description: '35% more damage, 10s duration',
      enemyDamageAmp: 35,
      debuffDuration: 10,
    },
    {
      tier: 2,
      description: 'Enemy also attacks 20% slower',
      enemySlowPercent: 20,
    },
  ],
};
```

### Level 6 Powers: Sustained vs Burst Utility

**Choice tension:** Reliable damage vs situational power

#### Siphon Soul (Sustained + Lifesteal)
```typescript
const SIPHON_SOUL: ArchmagePower = {
  id: 'siphon_soul',
  name: 'Siphon Soul',
  description: 'Deal 200% damage. Heal 50% of damage dealt.',
  icon: 'power-siphon_soul',
  resourceCost: 35,
  cooldown: 8,
  effect: 'damage',
  value: 2.0,
  category: 'sustain',
  synergies: [],
  lifestealPercent: 50,
  upgrades: [
    {
      tier: 1,
      description: '250% damage, heal 75% of damage dealt',
      value: 2.5,
      lifestealPercent: 75,
    },
    {
      tier: 2,
      description: 'If this heals you to full, gain 15% max HP as shield',
      shieldOnFullHeal: 15,
    },
  ],
};
```

#### Arcane Surge (Burst + Reset)
```typescript
const ARCANE_SURGE_POWER: ArchmagePower = {
  id: 'arcane_surge_power',
  name: 'Arcane Surge',
  description: 'Deal 180% damage. Reset all other power cooldowns.',
  icon: 'power-arcane_surge',
  resourceCost: 50,
  cooldown: 15,
  effect: 'damage',
  value: 1.8,
  category: 'utility',
  synergies: [],
  resetAllCooldowns: true,  // ECS-compliant: simple boolean flag
  upgrades: [
    {
      tier: 1,
      description: '220% damage, also restores 30 charges',
      value: 2.2,
      chargeModify: -30,  // ECS-compliant: reduces current charges by 30
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 12s',
      cooldown: 12,  // ECS-compliant: static value
    },
  ],
};
```

### Subpaths

At level 8, player chooses subpath and gains capstone power.

#### Battlemage Subpath
**Fantasy:** "Always casting" - sustained spell pressure, never stop pressing buttons.

**Capstone Power:**
```typescript
const SPELLSTORM: ArchmagePower = {
  id: 'spellstorm',
  name: 'Spellstorm',
  description: 'Deal 480% damage (shown as 4 rapid hits). Low charge cost.',
  icon: 'power-spellstorm',
  resourceCost: 20,  // Low cost for sustained caster
  cooldown: 10,
  effect: 'damage',
  value: 4.8,  // 4 × 120% = 480% total, calculated at once
  category: 'sustained',
  synergies: [],
  visualMultiHit: { count: 4, interval: 750 },  // ECS-compliant: animation only
  upgrades: [
    {
      tier: 1,
      description: '600% damage (5 hits visually), 15 charge cost',
      value: 6.0,  // 5 × 120%
      resourceCost: 15,
      visualMultiHit: { count: 5, interval: 600 },
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 8s',
      cooldown: 8,  // ECS-compliant: static value
    },
  ],
};
```

#### Destroyer Subpath
**Fantasy:** "One big hit" - explosive burst, wait for the perfect moment.

**Capstone Power:**
```typescript
const ANNIHILATE: ArchmagePower = {
  id: 'annihilate',
  name: 'Annihilate',
  description: 'Deal 700% damage. Can only cast at 0 charges (fills to max).',
  icon: 'power-annihilate',
  resourceCost: 100,  // ECS-compliant: requires 0 charges to cast (fills to 100)
  cooldown: 18,
  effect: 'damage',
  value: 7.0,
  category: 'nuke',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '900% damage',
      value: 9.0,
    },
    {
      tier: 2,
      description: 'If this kills, restore 50% HP',
      healOnKill: 50,  // ECS-compliant: uses existing healOnKill pattern
    },
  ],
};
```

### Archmage File Structure

Create `src/data/paths/archmage-powers.ts`:
- Define `ArchmagePower` interface extending `Power` with upgrades
- Export all powers
- Export helper functions: `getArchmagePowerChoices(level)`, `getArchmageSubpathPower(subpathId)`

---

## Part 2: Enchanter (Passive Path)

### Stances (Already Defined)

From `stances.ts`:
- **Arcane Surge:** +15% Power, +10% Speed, 20% chance Arcane Burn proc
- **Hex Veil:** +15% Armor, +10% Speed, enemies deal 15% less damage

### Enhancement Progressions

Following Guardian pattern: 13 tiers per stance, linear progression.

### Arcane Surge Path (Burn/DoT Focus)

| Tier | Name | Description | Effect Type |
|------|------|-------------|-------------|
| 1 | Searing Touch | Burn damage +25% | `burn_damage_percent` |
| 2 | Volatile Magic | Burn proc chance +15% (35% total) | `burn_proc_chance` |
| 3 | Lingering Flames | Burn duration +2s | `burn_duration_bonus` |
| 4 | Stacking Inferno | Burns can stack up to 3 times | `burn_max_stacks` |
| 5 | Rapid Combustion | Burn ticks 25% faster | `burn_tick_rate` |
| 6 | Pyromaniac | +20% damage vs burning enemies | `damage_vs_burning` |
| 7 | Eternal Flame | Critical hits refresh burn duration | `crit_refreshes_burn` |
| 8 | Soul Burn | Heal 15% of burn damage dealt | `lifesteal_from_burns` |
| 9 | Wildfire | Burn proc chance +25% (60% total) | `burn_proc_chance` |
| 10 | Meltdown | Burns deal +50% damage to low HP enemies (<30%) | `burn_execute_bonus` |
| 11 | Infernal Mastery | Burn damage +50% | `burn_damage_percent` |
| 12 | Soulfire | Burns ignore armor | `burn_ignores_armor` |
| 13 | Avatar of Flame | Burn ticks can critically strike | `burn_can_crit` |

### Hex Veil Path (Hex/Debuff Focus)

| Tier | Name | Description | Effect Type |
|------|------|-------------|-------------|
| 1 | Weakening Hex | Enemy damage reduced by additional 10% (25% total) | `hex_damage_reduction` |
| 2 | Chilling Curse | Enemy attacks 15% slower | `hex_slow_percent` |
| 3 | Vulnerability | Hexed enemy takes 10% more damage | `hex_damage_amp` |
| 4 | Arcane Drain | Regenerate 1 HP per second while enemy is hexed | `hex_regen` |
| 5 | Deep Curse | Hex effects intensify by 20% | `hex_intensity` |
| 6 | Mana Leech | Heal 5% of damage dealt to hexed enemy | `hex_lifesteal` |
| 7 | Curse of Frailty | Hexed enemy has -15% armor | `hex_armor_reduction` |
| 8 | Retributive Hex | Reflect 15% damage from hexed enemy | `hex_reflect` |
| 9 | Suffocating Curse | Hexed enemy takes 5 damage per second | `hex_damage_aura` |
| 10 | Curse Mastery | All hex effects +30% | `hex_intensity` |
| 11 | Doom Mark | Hexed enemy takes 25% more damage | `hex_damage_amp` |
| 12 | Life Drain Aura | Heal 3% max HP when hexed enemy attacks | `hex_heal_on_enemy_attack` |
| 13 | Master Hexer | Disable enemy special abilities | `hex_disable_abilities` |

### New StanceEnhancementEffect Types Required

Add to `src/types/paths.ts` StanceEnhancementEffect union:

```typescript
// === ENCHANTER: ARCANE SURGE (BURN) ===
| { type: 'burn_damage_percent'; value: number }
| { type: 'burn_proc_chance'; value: number }
| { type: 'burn_duration_bonus'; value: number }
| { type: 'burn_max_stacks'; value: number }
| { type: 'burn_tick_rate'; value: number }  // 25 = 25% faster
| { type: 'damage_vs_burning'; value: number }
| { type: 'crit_refreshes_burn'; value: boolean }
| { type: 'lifesteal_from_burns'; value: number }
| { type: 'burn_execute_bonus'; threshold: number; value: number }
| { type: 'burn_ignores_armor'; value: boolean }
| { type: 'burn_can_crit'; value: boolean }

// === ENCHANTER: HEX VEIL (DEBUFF) ===
| { type: 'hex_damage_reduction'; value: number }
| { type: 'hex_slow_percent'; value: number }
| { type: 'hex_damage_amp'; value: number }
| { type: 'hex_regen'; value: number }
| { type: 'hex_intensity'; value: number }  // Multiplier for all hex effects
| { type: 'hex_lifesteal'; value: number }
| { type: 'hex_armor_reduction'; value: number }
| { type: 'hex_reflect'; value: number }
| { type: 'hex_damage_aura'; value: number }
| { type: 'hex_heal_on_enemy_attack'; value: number }
| { type: 'hex_disable_abilities'; value: boolean }
```

### New ComputedPassiveEffects Fields Required

Add to `src/ecs/components.ts` ComputedPassiveEffects:

```typescript
// === BURN EFFECTS (Arcane Surge) ===
burnDamagePercent: number;        // Base: 100, enhanced: 125, 175, etc.
burnProcChance: number;           // Base: 20, enhanced: 35, 60
burnDurationBonus: number;        // Seconds added to burn duration
burnMaxStacks: number;            // 1 = no stacking, 3 = stacks 3x
burnTickRateMultiplier: number;   // 1.0 = normal, 1.25 = 25% faster
damageVsBurning: number;          // Bonus % damage vs burning enemies
critRefreshesBurn: boolean;
lifestealFromBurns: number;       // % of burn damage healed
burnExecuteThreshold: number;     // Enemy HP % threshold
burnExecuteBonus: number;         // Bonus burn damage below threshold
burnIgnoresArmor: boolean;
burnCanCrit: boolean;

// === HEX EFFECTS (Hex Veil) ===
hexDamageReduction: number;       // Base: 15, stacks additively
hexSlowPercent: number;           // Enemy attack speed reduction
hexDamageAmp: number;             // % more damage to hexed enemy
hexRegen: number;                 // HP per second while enemy hexed
hexIntensityMultiplier: number;   // Multiplier for all hex values
hexLifesteal: number;             // % of damage dealt healed
hexArmorReduction: number;        // Enemy armor reduction
hexReflect: number;               // Reflect % from hexed enemy
hexDamageAura: number;            // Damage per second to hexed enemy
hexHealOnEnemyAttack: number;     // % max HP healed when hexed attacks
hexDisableAbilities: boolean;     // Disable enemy specials
```

### Enchanter File Structure

Create `src/data/paths/enchanter-enhancements.ts`:
- Define `ARCANE_SURGE_PATH_ENHANCEMENTS: StanceEnhancement[]`
- Define `HEX_VEIL_PATH_ENHANCEMENTS: StanceEnhancement[]`
- Export helper functions matching Guardian pattern

### StanceEnhancement stanceId Update

Update the `StanceEnhancement` interface stanceId to support Enchanter:

```typescript
export interface StanceEnhancement {
  id: string;
  name: string;
  tier: number;
  description: string;
  stanceId: 'iron_stance' | 'retribution_stance' | 'arcane_surge' | 'hex_veil';
  effects: StanceEnhancementEffect[];
}
```

---

## Part 3: System Integration

### ECS Patterns to Follow

1. **Data-driven effects:** All effects are typed data, no per-ability code
2. **Computed values:** `recomputePassiveEffects()` pre-calculates everything
3. **Systems read computed:** Combat systems never calculate on the fly
4. **Hooks return values:** Passive hooks return data, systems apply it

### Systems to Modify

#### power.ts
- Add processing for new Archmage power mechanics:
  - `multiHit` (Spellstorm)
  - `fillsCharges` (Annihilate)
  - `resetOtherCooldowns` (Arcane Surge Power)
  - `enemyDamageAmp` debuff application
  - `chargeRestore` effect

#### passive-effect.ts
- Add `recomputePassiveEffects()` cases for all new Enchanter effect types
- Add processing for burn/hex effects

#### combat.ts
- Read burn effects from `passiveEffectState.computed`
- Apply hex effects to enemy damage calculations
- Implement burn stacking logic

#### status-effect.ts
- Handle burn as enhanced status effect with computed modifiers
- Apply burn tick rate, stacking, crit

### New Systems Required

None - all mechanics fit within existing system responsibilities.

---

## Part 4: Update Existing Files

### mage.ts Updates

Replace stub abilities with proper path structure:
- Remove placeholder ARCHMAGE_ABILITIES
- Remove placeholder ENCHANTER_ABILITIES
- Update path definitions to reference new power/enhancement files
- Ensure subpath definitions are correct

### pathResources.ts

Archmage resource already defined - no changes needed.

### stances.ts

Enchanter stances already defined - no changes needed.

---

## Part 5: Implementation Checklist

### Phase 1: Type Definitions
- [ ] Add `vulnerable` to STATUS_EFFECT_TYPE in `constants/enums.ts`
- [ ] Add `burn` to STATUS_EFFECT_TYPE in `constants/enums.ts`
- [ ] Add Power interface extensions to `types/game.ts`:
  - `resetAllCooldowns`, `chargeModify`, `visualMultiHit`
  - `enemyVulnerable`, `enemyVulnerableDuration`
- [ ] Add Enchanter StanceEnhancementEffect types to `types/paths.ts`
- [ ] Add Enchanter ComputedPassiveEffects fields to `ecs/components.ts`
- [ ] Update StanceEnhancement stanceId union to include `arcane_surge` | `hex_veil`

### Phase 2: Archmage Powers
- [ ] Create `src/data/paths/archmage-powers.ts`
- [ ] Define all 8 powers with upgrades (following BerserkerPower pattern)
- [ ] Add helper functions: `getArchmagePowerChoices()`, `getArchmageSubpathPower()`
- [ ] Update `mage.ts` path definitions to reference new powers

### Phase 3: Enchanter Enhancements
- [ ] Create `src/data/paths/enchanter-enhancements.ts`
- [ ] Define ARCANE_SURGE_PATH_ENHANCEMENTS (13 tiers)
- [ ] Define HEX_VEIL_PATH_ENHANCEMENTS (13 tiers)
- [ ] Add helper functions (following Guardian pattern)

### Phase 4: System Integration
- [ ] Update `power.ts`: resetAllCooldowns, chargeModify, enemyVulnerable
- [ ] Update `passive-effect.ts`: recomputePassiveEffects() for all Enchanter effect types
- [ ] Update `combat.ts`: vulnerable status check, hex damage amp/reduction
- [ ] Update `status-effect.ts`: burn mechanics with computed modifiers
- [ ] Update `enemy-ability.ts`: hexDisableAbilities check
- [ ] Update `attack-timing.ts`: hexSlowPercent check (if applicable)
- [ ] Update `regen.ts`: hexRegen check (if applicable)

### Phase 5: Testing
- [ ] Unit tests for Archmage power definitions
- [ ] Unit tests for Enchanter enhancement definitions
- [ ] ECS system tests for new power mechanics
- [ ] ECS system tests for burn/hex computed effects
- [ ] E2E Playwright tests for Archmage path
- [ ] E2E Playwright tests for Enchanter path

---

---

## Part 6: ECS Integration

### Power Interface Extensions

Add to `Power` interface in `types/game.ts`:

```typescript
// Archmage-specific properties
resetAllCooldowns?: boolean;      // Reset all other cooldowns on cast
chargeModify?: number;            // Modify charges (negative = reduce)
visualMultiHit?: {                // Animation-only multi-hit display
  count: number;
  interval: number;
};
enemyVulnerable?: number;         // Apply vulnerable status (% damage amp)
enemyVulnerableDuration?: number; // Duration for vulnerable
```

### System Modifications

#### power.ts additions:
```typescript
// After applying power effect:

// Reset all other cooldowns
if (power.resetAllCooldowns && entity.cooldowns) {
  for (const [powerId] of entity.cooldowns) {
    if (powerId !== power.id) entity.cooldowns.delete(powerId);
  }
}

// Modify charges (for gain-type resources)
if (power.chargeModify && entity.pathResource?.resourceBehavior === 'gain') {
  entity.pathResource.current = Math.max(0,
    Math.min(entity.pathResource.max, entity.pathResource.current + power.chargeModify));
}

// Apply vulnerable status
if (power.enemyVulnerable && target) {
  target.statusEffects?.push({
    id: `vulnerable-${power.id}-${Date.now()}`,
    type: 'vulnerable',
    value: power.enemyVulnerable,
    remainingTurns: power.enemyVulnerableDuration ?? 8,
    icon: 'target',
  });
}
```

#### combat.ts additions:
```typescript
// When calculating damage to enemy, check vulnerable status:
if (target.statusEffects?.some(s => s.type === 'vulnerable')) {
  const vulnEffect = target.statusEffects.find(s => s.type === 'vulnerable');
  if (vulnEffect) {
    damage = Math.round(damage * (1 + vulnEffect.value / 100));
  }
}
```

### Enchanter Effect Processing

All Enchanter effects use the established passive-effect pattern:

1. **Enhancement acquired** → `recomputePassiveEffects()` called
2. **Effects aggregated** → Written to `passiveEffectState.computed`
3. **Combat systems** → READ from computed, never calculate per-enhancement

#### Burn effects (status-effect.ts reads from computed):
```typescript
// When processing burn/bleed ticks on enemy:
const player = getPlayer();
const burnConfig = player?.passiveEffectState?.computed;
if (burnConfig && effect.type === 'burn') {
  let tickDamage = effect.value * (1 + burnConfig.burnDamagePercent / 100);

  if (burnConfig.burnCanCrit && Math.random() < player.derivedStats?.critChance) {
    tickDamage *= player.derivedStats?.critDamage ?? 1.5;
  }

  if (!burnConfig.burnIgnoresArmor) {
    tickDamage = Math.max(1, tickDamage - (enemy.defense?.value ?? 0));
  }

  enemy.health.current -= Math.round(tickDamage);
}
```

#### Hex effects (various systems read from computed):
```typescript
// combat.ts - when enemy attacks player:
if (player.stanceState?.activeStanceId === 'hex_veil') {
  const computed = player.passiveEffectState?.computed;
  if (computed?.hexDamageReduction) {
    damage *= (1 - computed.hexDamageReduction / 100);
  }
}

// combat.ts - when player attacks enemy:
if (player.stanceState?.activeStanceId === 'hex_veil') {
  const computed = player.passiveEffectState?.computed;
  if (computed?.hexDamageAmp) {
    damage *= (1 + computed.hexDamageAmp / 100);
  }
}

// enemy-ability.ts - check for ability disable:
const playerComputed = getPlayer()?.passiveEffectState?.computed;
if (playerComputed?.hexDisableAbilities) {
  return; // Skip enemy ability processing
}
```

---

## Part 7: Visualization, Animation & UI

### Animation System Overview

The game uses these animation primitives:
- **CombatAnimationType:** `idle`, `attack`, `hit`, `cast`, `die`
- **FloatingEffectType:** `damage`, `heal`, `miss`, `crit`
- **VisualEffects:** `flash` (white/red/green/gold), `shake`, `hitStop`, `aura` (red/blue/green), `powerImpact`

### Archmage Power Animations

#### Arcane Bolt
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (quick, 200ms) - mage raises hand briefly |
| **Projectile** | Small purple orb travels to enemy (fast, 150ms travel) |
| **Impact** | Purple flash on enemy, small shake |
| **Floating text** | Purple damage number |
| **Sound cue** | Quick "zap" sound |

#### Meteor Strike
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (long, 600ms) - mage raises both arms, builds energy |
| **Anticipation** | Screen darkens slightly, enemy gets red targeting circle |
| **Projectile** | Large orange/red meteor falls from above (400ms) |
| **Impact** | Screen shake (strong), orange flash, `hitStop` (150ms) |
| **Floating text** | Large orange damage number with impact particles |
| **Sound cue** | Building rumble → loud explosion |

#### Arcane Empowerment
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (300ms) - mage surrounds self with energy |
| **Effect** | Blue `aura` on player for buff duration |
| **Floating text** | "+35% Power" and "+20% Speed" in blue |
| **UI indicator** | Buff icon appears in buff bar with timer |
| **Sound cue** | Ascending chime / power-up sound |

#### Arcane Weakness
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (300ms) - mage points at enemy |
| **Projectile** | Purple curse mark travels to enemy |
| **Effect** | Purple debuff particles on enemy for duration |
| **Floating text** | "Weakened" in purple on enemy |
| **UI indicator** | Debuff icon on enemy health bar |
| **Sound cue** | Dark magical whoosh |

#### Siphon Soul
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (400ms) - mage reaches toward enemy |
| **Effect** | Green energy stream from enemy to player |
| **Impact** | Green flash on enemy (damage), green flash on player (heal) |
| **Floating text** | Red damage on enemy, green heal on player (simultaneous) |
| **Sound cue** | Draining/siphoning sound |

#### Arcane Surge Power
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (300ms) - mage pulses with energy |
| **Impact** | Purple flash on enemy |
| **Effect** | All power icons briefly flash/pulse to indicate reset |
| **Floating text** | Purple damage number + "Cooldowns Reset!" text |
| **Sound cue** | Magical burst + UI "refresh" chime |

#### Spellstorm (Battlemage Capstone)
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (initial 400ms) - mage channels continuously |
| **Effect** | Player has swirling purple aura during channel |
| **Hits** | 4 rapid purple bolts hit enemy at 750ms intervals |
| **Impact** | Small purple flash per hit, mini-shake per hit |
| **Floating text** | 4 separate damage numbers, staggered |
| **Sound cue** | Rapid "zap-zap-zap-zap" |

#### Annihilate (Destroyer Capstone)
| Element | Description |
|---------|-------------|
| **Cast animation** | `cast` (800ms) - mage gathers massive energy, screen darkens |
| **Anticipation** | Arcane Charge bar visually fills to 100, glows intensely |
| **Effect** | Massive purple/white beam from player to enemy |
| **Impact** | Large screen shake, white flash, long `hitStop` (200ms) |
| **Floating text** | Huge damage number with explosion particles |
| **Sound cue** | Building charge sound → massive detonation |

### Enchanter Passive Effect Visuals

#### Arcane Surge Stance (Burn)
| Element | Description |
|---------|-------------|
| **Stance indicator** | Orange/red tint on player sprite, fire particles |
| **Burn proc** | Orange flash on enemy when burn triggers |
| **Burn DoT** | Small flame icon on enemy, orange damage ticks |
| **Floating text** | Orange "Burn!" on proc, orange tick damage numbers |
| **Sound cue** | Fire ignition sound on proc |

#### Hex Veil Stance (Debuff)
| Element | Description |
|---------|-------------|
| **Stance indicator** | Purple tint on player sprite, hex symbols orbit |
| **Hex active** | Purple chains/marks visible on enemy |
| **Damage reduction** | Enemy attacks show "Weakened" with reduced damage |
| **Floating text** | Purple "Hexed" on combat start |
| **Sound cue** | Dark magical hum ambient |

### Enhancement Visual Escalation

As players gain enhancements, visual intensity should increase:

#### Arcane Surge Path (Burn)
| Tier Range | Visual Change |
|------------|---------------|
| 1-4 | Small flame particles on enemy when burning |
| 5-8 | Larger flames, burn ticks show faster |
| 9-12 | Enemy visibly "on fire" with intense particle effect |
| 13 (Capstone) | Burns have crit flash (gold spark on crit tick) |

#### Hex Veil Path (Debuff)
| Tier Range | Visual Change |
|------------|---------------|
| 1-4 | Single hex mark on enemy |
| 5-8 | Multiple hex marks, chains visible |
| 9-12 | Enemy has dark aura, visible weakness |
| 13 (Capstone) | Enemy abilities show "Disabled" with strikethrough |

### UI Elements

#### Arcane Charge Bar (Archmage)
- Position: Below player health bar (or dedicated resource area)
- Color: Purple gradient (darker when low, brighter when high)
- Visual states:
  - 0-30: Dim purple, "ready to cast big spells"
  - 31-70: Medium glow
  - 71-100: Bright glow, particles, indicates high damage bonus
- Decay animation: Smooth decrease with trailing particles
- Cast feedback: Pulses when power adds charges

#### Stance Toggle UI (Enchanter)
- Shows current stance icon prominently
- Cooldown overlay when switching
- Stance-specific color theming:
  - Arcane Surge: Orange/red border, fire icon
  - Hex Veil: Purple border, hex/curse icon

#### Enhancement Tier Display
- Shows current tier (1-13) for active stance
- Visual progression indicator (like XP bar but for enhancement count)
- Tooltip shows next available enhancement for each path

### New Visual Effects Required

| Effect ID | Type | Description |
|-----------|------|-------------|
| `meteor_target` | Ground marker | Red circle on enemy position during Meteor windup |
| `soul_siphon` | Beam | Green energy stream between entities |
| `spellstorm_channel` | Aura | Swirling purple energy around caster |
| `burn_dot` | Particle | Flame particles on burning enemy |
| `hex_mark` | Overlay | Purple hex symbols on hexed enemy |
| `ability_disabled` | Icon | Strikethrough on enemy ability indicators |

### Animation Timing Constants

Add to `constants/animations.ts` or similar:

```typescript
export const ARCHMAGE_ANIMATION_TIMING = {
  ARCANE_BOLT_CAST: 200,
  ARCANE_BOLT_TRAVEL: 150,
  METEOR_CAST: 600,
  METEOR_ANTICIPATION: 400,
  METEOR_FALL: 400,
  METEOR_HITSTOP: 150,
  EMPOWERMENT_CAST: 300,
  WEAKNESS_CAST: 300,
  SIPHON_CAST: 400,
  SURGE_CAST: 300,
  SPELLSTORM_CAST: 400,
  SPELLSTORM_HIT_INTERVAL: 750,
  ANNIHILATE_CAST: 800,
  ANNIHILATE_HITSTOP: 200,
};

export const ENCHANTER_ANIMATION_TIMING = {
  BURN_PROC_FLASH: 100,
  BURN_TICK_INTERVAL: 1000, // Base, modified by enhancements
  HEX_PULSE_INTERVAL: 2000,
};
```

---

## Appendix: Power Summary Table

| Level | Option A | Option B |
|-------|----------|----------|
| 2 | Arcane Bolt (150%, 15 charge, 4s CD) | Meteor Strike (450%, 60 charge, 12s CD) |
| 4 | Arcane Empowerment (+35% Power/+20% Speed buff) | Arcane Weakness (+25% damage taken, vulnerable status) |
| 6 | Siphon Soul (200% + 50% lifesteal) | Arcane Surge (180% + reset all CDs) |
| 8 (Battlemage) | Spellstorm (480%, visual 4-hit, 20 charge) | - |
| 8 (Destroyer) | - | Annihilate (700%, 100 charge cost) |

### Power Upgrade Summary

| Power | T1 Upgrade | T2 Upgrade |
|-------|------------|------------|
| Arcane Bolt | 180% damage, 12 charge | CD → 3s |
| Meteor Strike | 550% damage | 2s stun |
| Arcane Empowerment | +45%/+30%, 8s duration | +15% crit chance |
| Arcane Weakness | 35% amp, 10s duration | Enemy 20% slower |
| Siphon Soul | 250%, 75% lifesteal | Overheal → 15% shield |
| Arcane Surge | 220%, restore 30 charges | CD → 12s |
| Spellstorm | 600% (5-hit visual), 15 charge | CD → 8s |
| Annihilate | 900% damage | Heal 50% on kill |

## Appendix: Enhancement Summary

### Arcane Surge Path (Burn)
Tiers 1-4: Foundation (damage, proc, duration, stacking)
Tiers 5-8: Scaling (tick rate, damage vs burning, crit refresh, lifesteal)
Tiers 9-12: Power (more proc, execute bonus, more damage, ignore armor)
Tier 13: Capstone (burn crits)

### Hex Veil Path (Debuff)
Tiers 1-4: Foundation (damage reduction, slow, damage amp, regen)
Tiers 5-8: Scaling (intensity, lifesteal, armor reduction, reflect)
Tiers 9-12: Power (damage aura, more intensity, more damage amp, heal on attack)
Tier 13: Capstone (disable enemy abilities)
