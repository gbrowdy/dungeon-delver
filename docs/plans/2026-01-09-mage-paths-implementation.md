# Mage Paths Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement full Archmage (active) and Enchanter (passive) paths for the Mage class following established ECS patterns.

**Architecture:** Powers follow Berserker pattern (Power interface with upgrades). Enhancements follow Guardian pattern (StanceEnhancementEffect discriminated union → recomputePassiveEffects → computed object). Systems read from computed values.

**Tech Stack:** TypeScript, React, miniplex ECS, Vitest, Playwright

**Reference:** See `docs/plans/2026-01-09-mage-paths-design.md` for full design specifications.

---

## Phase 1: Type Definitions

### Task 1.1: Add New Status Effect Types

**Files:**
- Modify: `src/constants/enums.ts:22-29`

**Step 1: Add vulnerable and burn to STATUS_EFFECT_TYPE**

```typescript
// In src/constants/enums.ts, update STATUS_EFFECT_TYPE:
export const STATUS_EFFECT_TYPE = {
  POISON: 'poison',
  STUN: 'stun',
  SLOW: 'slow',
  BLEED: 'bleed',
  VULNERABLE: 'vulnerable',  // Enemy takes +X% damage
  BURN: 'burn',              // DoT with computed modifiers
} as const;
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add src/constants/enums.ts
git commit -m "feat(types): add vulnerable and burn status effect types"
```

---

### Task 1.2: Add Power Interface Extensions

**Files:**
- Modify: `src/types/game.ts`

**Step 1: Find Power interface and add new properties**

Add these optional properties to the `Power` interface:

```typescript
// Add to Power interface in src/types/game.ts:

// Archmage-specific properties
resetAllCooldowns?: boolean;      // Reset all other cooldowns on cast
chargeModify?: number;            // Modify charges (negative = reduce)
visualMultiHit?: {                // Animation-only multi-hit display
  count: number;
  interval: number;
};
enemyVulnerable?: number;         // Apply vulnerable status (% damage amp)
enemyVulnerableDuration?: number; // Duration for vulnerable status
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): add Archmage power interface extensions"
```

---

### Task 1.3: Add Enchanter StanceEnhancementEffect Types

**Files:**
- Modify: `src/types/paths.ts:317-343`

**Step 1: Add burn effect types to StanceEnhancementEffect union**

```typescript
// Add to StanceEnhancementEffect union in src/types/paths.ts:

// === ENCHANTER: ARCANE SURGE (BURN) ===
| { type: 'burn_damage_percent'; value: number }
| { type: 'burn_proc_chance'; value: number }
| { type: 'burn_duration_bonus'; value: number }
| { type: 'burn_max_stacks'; value: number }
| { type: 'burn_tick_rate'; value: number }
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
| { type: 'hex_intensity'; value: number }
| { type: 'hex_lifesteal'; value: number }
| { type: 'hex_armor_reduction'; value: number }
| { type: 'hex_reflect'; value: number }
| { type: 'hex_damage_aura'; value: number }
| { type: 'hex_heal_on_enemy_attack'; value: number }
| { type: 'hex_disable_abilities'; value: boolean }
```

**Step 2: Update StanceEnhancement stanceId union**

```typescript
// Update StanceEnhancement interface stanceId type:
export interface StanceEnhancement {
  id: string;
  name: string;
  tier: number;
  description: string;
  stanceId: 'iron_stance' | 'retribution_stance' | 'arcane_surge' | 'hex_veil';
  effects: StanceEnhancementEffect[];
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/types/paths.ts
git commit -m "feat(types): add Enchanter stance enhancement effect types"
```

---

### Task 1.4: Add Enchanter ComputedPassiveEffects Fields

**Files:**
- Modify: `src/ecs/components.ts:108-169`

**Step 1: Add burn computed fields to ComputedPassiveEffects**

```typescript
// Add to ComputedPassiveEffects interface in src/ecs/components.ts:

// === BURN EFFECTS (Arcane Surge) ===
burnDamagePercent: number;
burnProcChance: number;
burnDurationBonus: number;
burnMaxStacks: number;
burnTickRateMultiplier: number;
damageVsBurning: number;
critRefreshesBurn: boolean;
lifestealFromBurns: number;
burnExecuteThreshold: number;
burnExecuteBonus: number;
burnIgnoresArmor: boolean;
burnCanCrit: boolean;

// === HEX EFFECTS (Hex Veil) ===
hexDamageReduction: number;
hexSlowPercent: number;
hexDamageAmp: number;
hexRegen: number;
hexIntensityMultiplier: number;
hexLifesteal: number;
hexArmorReduction: number;
hexReflect: number;
hexDamageAura: number;
hexHealOnEnemyAttack: number;
hexDisableAbilities: boolean;
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: FAIL (createDefaultComputed needs updating)

**Step 3: Update createDefaultComputed in passive-effect.ts**

Add default values for all new fields in `src/ecs/systems/passive-effect.ts:34-75`:

```typescript
// Add to createDefaultComputed() return object:

// Burn effects
burnDamagePercent: 100,
burnProcChance: 0,
burnDurationBonus: 0,
burnMaxStacks: 1,
burnTickRateMultiplier: 1,
damageVsBurning: 0,
critRefreshesBurn: false,
lifestealFromBurns: 0,
burnExecuteThreshold: 0,
burnExecuteBonus: 0,
burnIgnoresArmor: false,
burnCanCrit: false,

// Hex effects
hexDamageReduction: 0,
hexSlowPercent: 0,
hexDamageAmp: 0,
hexRegen: 0,
hexIntensityMultiplier: 1,
hexLifesteal: 0,
hexArmorReduction: 0,
hexReflect: 0,
hexDamageAura: 0,
hexHealOnEnemyAttack: 0,
hexDisableAbilities: false,
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Run existing tests**

Run: `npx vitest run src/ecs`
Expected: PASS (all existing tests still work)

**Step 6: Commit**

```bash
git add src/ecs/components.ts src/ecs/systems/passive-effect.ts
git commit -m "feat(ecs): add Enchanter computed passive effect fields"
```

---

## Phase 2: Archmage Powers

### Task 2.1: Create Archmage Powers File Structure

**Files:**
- Create: `src/data/paths/archmage-powers.ts`

**Step 1: Create file with imports and interface**

```typescript
// src/data/paths/archmage-powers.ts
import type { Power } from '@/types/game';

/**
 * Archmage Path Powers
 *
 * Level 2: Choose Power 1 (Arcane Bolt vs Meteor Strike)
 * Level 4: Choose Power 2 (Arcane Empowerment vs Arcane Weakness)
 * Level 6: Choose Power 3 (Siphon Soul vs Arcane Surge)
 * Level 8: Subpath grants Power 4 (Spellstorm vs Annihilate)
 */

export interface PowerUpgrade {
  tier: 1 | 2;
  description: string;
  value?: number;
  cooldown?: number;
  resourceCost?: number;
  // Buff upgrades
  buffPower?: number;
  buffSpeed?: number;
  buffDuration?: number;
  buffCritChance?: number;
  // Debuff upgrades
  enemyDamageAmp?: number;
  debuffDuration?: number;
  enemySlowPercent?: number;
  // Sustain upgrades
  lifestealPercent?: number;
  shieldOnFullHeal?: number;
  // Utility upgrades
  chargeModify?: number;
  stunDuration?: number;
  healOnKill?: number;
  // Visual
  visualMultiHit?: { count: number; interval: number };
}

export interface ArchmagePower extends Power {
  upgrades: [PowerUpgrade, PowerUpgrade];
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/archmage-powers.ts
git commit -m "feat(data): create archmage-powers.ts with interface"
```

---

### Task 2.2: Add Level 2 Powers (Arcane Bolt & Meteor Strike)

**Files:**
- Modify: `src/data/paths/archmage-powers.ts`

**Step 1: Add Arcane Bolt**

```typescript
const ARCANE_BOLT: ArchmagePower = {
  id: 'arcane_bolt',
  name: 'Arcane Bolt',
  description: 'Deal 150% damage. Low charge cost.',
  icon: 'power-arcane_bolt',
  resourceCost: 15,
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
      cooldown: 3,
    },
  ],
};
```

**Step 2: Add Meteor Strike**

```typescript
const METEOR_STRIKE: ArchmagePower = {
  id: 'meteor_strike',
  name: 'Meteor Strike',
  description: 'Deal 450% damage. High charge cost.',
  icon: 'power-meteor_strike',
  resourceCost: 60,
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

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/data/paths/archmage-powers.ts
git commit -m "feat(data): add Archmage level 2 powers"
```

---

### Task 2.3: Add Level 4 Powers (Arcane Empowerment & Arcane Weakness)

**Files:**
- Modify: `src/data/paths/archmage-powers.ts`

**Step 1: Add Arcane Empowerment**

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
      buffCritChance: 0.15,
    },
  ],
};
```

**Step 2: Add Arcane Weakness**

```typescript
const ARCANE_WEAKNESS: ArchmagePower = {
  id: 'arcane_weakness',
  name: 'Arcane Weakness',
  description: 'Enemy takes 25% more damage for 8s.',
  icon: 'power-arcane_weakness',
  resourceCost: 20,
  cooldown: 10,
  effect: 'debuff',
  value: 0,
  category: 'debuff',
  synergies: [],
  enemyVulnerable: 25,
  enemyVulnerableDuration: 8,
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

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/data/paths/archmage-powers.ts
git commit -m "feat(data): add Archmage level 4 powers"
```

---

### Task 2.4: Add Level 6 Powers (Siphon Soul & Arcane Surge)

**Files:**
- Modify: `src/data/paths/archmage-powers.ts`

**Step 1: Add Siphon Soul**

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

**Step 2: Add Arcane Surge Power**

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
  resetAllCooldowns: true,
  upgrades: [
    {
      tier: 1,
      description: '220% damage, also restores 30 charges',
      value: 2.2,
      chargeModify: -30,
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 12s',
      cooldown: 12,
    },
  ],
};
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/data/paths/archmage-powers.ts
git commit -m "feat(data): add Archmage level 6 powers"
```

---

### Task 2.5: Add Subpath Capstone Powers (Spellstorm & Annihilate)

**Files:**
- Modify: `src/data/paths/archmage-powers.ts`

**Step 1: Add Spellstorm (Battlemage)**

```typescript
const SPELLSTORM: ArchmagePower = {
  id: 'spellstorm',
  name: 'Spellstorm',
  description: 'Deal 480% damage (shown as 4 rapid hits). Low charge cost.',
  icon: 'power-spellstorm',
  resourceCost: 20,
  cooldown: 10,
  effect: 'damage',
  value: 4.8,
  category: 'sustained',
  synergies: [],
  visualMultiHit: { count: 4, interval: 750 },
  upgrades: [
    {
      tier: 1,
      description: '600% damage (5 hits visually), 15 charge cost',
      value: 6.0,
      resourceCost: 15,
      visualMultiHit: { count: 5, interval: 600 },
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 8s',
      cooldown: 8,
    },
  ],
};
```

**Step 2: Add Annihilate (Destroyer)**

```typescript
const ANNIHILATE: ArchmagePower = {
  id: 'annihilate',
  name: 'Annihilate',
  description: 'Deal 700% damage. Can only cast at 0 charges (fills to max).',
  icon: 'power-annihilate',
  resourceCost: 100,
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
      healOnKill: 50,
    },
  ],
};
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/data/paths/archmage-powers.ts
git commit -m "feat(data): add Archmage subpath capstone powers"
```

---

### Task 2.6: Add Exports and Helper Functions

**Files:**
- Modify: `src/data/paths/archmage-powers.ts`

**Step 1: Add power lookup and exports**

```typescript
// Power choices by level
const POWER_CHOICES_BY_LEVEL: Record<number, [ArchmagePower, ArchmagePower]> = {
  2: [ARCANE_BOLT, METEOR_STRIKE],
  4: [ARCANE_EMPOWERMENT, ARCANE_WEAKNESS],
  6: [SIPHON_SOUL, ARCANE_SURGE_POWER],
};

// Subpath powers
const SUBPATH_POWERS: Record<string, ArchmagePower> = {
  battlemage: SPELLSTORM,
  destroyer: ANNIHILATE,
};

export const ARCHMAGE_POWERS = {
  arcane_bolt: ARCANE_BOLT,
  meteor_strike: METEOR_STRIKE,
  arcane_empowerment: ARCANE_EMPOWERMENT,
  arcane_weakness: ARCANE_WEAKNESS,
  siphon_soul: SIPHON_SOUL,
  arcane_surge_power: ARCANE_SURGE_POWER,
  spellstorm: SPELLSTORM,
  annihilate: ANNIHILATE,
};

export function getArchmagePowerChoices(level: number): ArchmagePower[] {
  return POWER_CHOICES_BY_LEVEL[level] ?? [];
}

export function getArchmageSubpathPower(subpathId: string): ArchmagePower | undefined {
  return SUBPATH_POWERS[subpathId];
}

export function getArchmagePowerUpgrade(powerId: string, tier: number): PowerUpgrade | undefined {
  const power = ARCHMAGE_POWERS[powerId as keyof typeof ARCHMAGE_POWERS];
  if (!power || tier < 1 || tier > 2) return undefined;
  return power.upgrades[tier - 1];
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/archmage-powers.ts
git commit -m "feat(data): add Archmage power exports and helpers"
```

---

### Task 2.7: Write Unit Tests for Archmage Powers

**Files:**
- Create: `src/data/paths/__tests__/archmage-powers.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  ARCHMAGE_POWERS,
  getArchmagePowerChoices,
  getArchmageSubpathPower,
  getArchmagePowerUpgrade,
} from '../archmage-powers';

describe('Archmage Powers', () => {
  describe('power definitions', () => {
    it('should have 8 powers defined', () => {
      expect(Object.keys(ARCHMAGE_POWERS)).toHaveLength(8);
    });

    it('should have valid resource costs for gain-type resource', () => {
      for (const power of Object.values(ARCHMAGE_POWERS)) {
        expect(power.resourceCost).toBeGreaterThanOrEqual(0);
        expect(power.resourceCost).toBeLessThanOrEqual(100);
      }
    });

    it('should have upgrades for all powers', () => {
      for (const power of Object.values(ARCHMAGE_POWERS)) {
        expect(power.upgrades).toHaveLength(2);
        expect(power.upgrades[0].tier).toBe(1);
        expect(power.upgrades[1].tier).toBe(2);
      }
    });
  });

  describe('getArchmagePowerChoices', () => {
    it('should return 2 choices for level 2', () => {
      const choices = getArchmagePowerChoices(2);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('arcane_bolt');
      expect(choices[1].id).toBe('meteor_strike');
    });

    it('should return 2 choices for level 4', () => {
      const choices = getArchmagePowerChoices(4);
      expect(choices).toHaveLength(2);
    });

    it('should return 2 choices for level 6', () => {
      const choices = getArchmagePowerChoices(6);
      expect(choices).toHaveLength(2);
    });

    it('should return empty array for invalid levels', () => {
      expect(getArchmagePowerChoices(3)).toHaveLength(0);
      expect(getArchmagePowerChoices(8)).toHaveLength(0);
    });
  });

  describe('getArchmageSubpathPower', () => {
    it('should return Spellstorm for battlemage', () => {
      const power = getArchmageSubpathPower('battlemage');
      expect(power?.id).toBe('spellstorm');
    });

    it('should return Annihilate for destroyer', () => {
      const power = getArchmageSubpathPower('destroyer');
      expect(power?.id).toBe('annihilate');
    });

    it('should return undefined for invalid subpath', () => {
      expect(getArchmageSubpathPower('invalid')).toBeUndefined();
    });
  });

  describe('getArchmagePowerUpgrade', () => {
    it('should return T1 upgrade', () => {
      const upgrade = getArchmagePowerUpgrade('arcane_bolt', 1);
      expect(upgrade?.tier).toBe(1);
      expect(upgrade?.value).toBe(1.8);
    });

    it('should return T2 upgrade', () => {
      const upgrade = getArchmagePowerUpgrade('arcane_bolt', 2);
      expect(upgrade?.tier).toBe(2);
      expect(upgrade?.cooldown).toBe(3);
    });

    it('should return undefined for invalid tier', () => {
      expect(getArchmagePowerUpgrade('arcane_bolt', 0)).toBeUndefined();
      expect(getArchmagePowerUpgrade('arcane_bolt', 3)).toBeUndefined();
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/data/paths/__tests__/archmage-powers.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/__tests__/archmage-powers.test.ts
git commit -m "test(data): add Archmage powers unit tests"
```

---

## Phase 3: Enchanter Enhancements

### Task 3.1: Create Enchanter Enhancements File Structure

**Files:**
- Create: `src/data/paths/enchanter-enhancements.ts`

**Step 1: Create file with imports**

```typescript
// src/data/paths/enchanter-enhancements.ts
/**
 * Enchanter Stance Enhancements
 *
 * Two linear progression paths, one per stance.
 * At each level-up (3-15), player chooses which path to advance.
 * Enhancements only apply while in that stance.
 */

import type { StanceEnhancement } from '@/types/paths';
```

**Step 2: Commit**

```bash
git add src/data/paths/enchanter-enhancements.ts
git commit -m "feat(data): create enchanter-enhancements.ts structure"
```

---

### Task 3.2: Add Arcane Surge Path Enhancements (Tiers 1-7)

**Files:**
- Modify: `src/data/paths/enchanter-enhancements.ts`

**Step 1: Add first 7 tiers**

```typescript
export const ARCANE_SURGE_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'arcane_surge_1_searing_touch',
    name: 'Searing Touch',
    tier: 1,
    description: 'Burn damage +25%',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_damage_percent', value: 25 }],
  },
  {
    id: 'arcane_surge_2_volatile_magic',
    name: 'Volatile Magic',
    tier: 2,
    description: 'Burn proc chance +15% (35% total)',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_proc_chance', value: 15 }],
  },
  {
    id: 'arcane_surge_3_lingering_flames',
    name: 'Lingering Flames',
    tier: 3,
    description: 'Burn duration +2s',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_duration_bonus', value: 2 }],
  },
  {
    id: 'arcane_surge_4_stacking_inferno',
    name: 'Stacking Inferno',
    tier: 4,
    description: 'Burns can stack up to 3 times',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_max_stacks', value: 3 }],
  },
  {
    id: 'arcane_surge_5_rapid_combustion',
    name: 'Rapid Combustion',
    tier: 5,
    description: 'Burn ticks 25% faster',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_tick_rate', value: 25 }],
  },
  {
    id: 'arcane_surge_6_pyromaniac',
    name: 'Pyromaniac',
    tier: 6,
    description: '+20% damage vs burning enemies',
    stanceId: 'arcane_surge',
    effects: [{ type: 'damage_vs_burning', value: 20 }],
  },
  {
    id: 'arcane_surge_7_eternal_flame',
    name: 'Eternal Flame',
    tier: 7,
    description: 'Critical hits refresh burn duration',
    stanceId: 'arcane_surge',
    effects: [{ type: 'crit_refreshes_burn', value: true }],
  },
];
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/enchanter-enhancements.ts
git commit -m "feat(data): add Arcane Surge enhancements tiers 1-7"
```

---

### Task 3.3: Add Arcane Surge Path Enhancements (Tiers 8-13)

**Files:**
- Modify: `src/data/paths/enchanter-enhancements.ts`

**Step 1: Add remaining tiers**

```typescript
// Add to ARCANE_SURGE_PATH_ENHANCEMENTS array:
  {
    id: 'arcane_surge_8_soul_burn',
    name: 'Soul Burn',
    tier: 8,
    description: 'Heal 15% of burn damage dealt',
    stanceId: 'arcane_surge',
    effects: [{ type: 'lifesteal_from_burns', value: 15 }],
  },
  {
    id: 'arcane_surge_9_wildfire',
    name: 'Wildfire',
    tier: 9,
    description: 'Burn proc chance +25% (60% total)',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_proc_chance', value: 25 }],
  },
  {
    id: 'arcane_surge_10_meltdown',
    name: 'Meltdown',
    tier: 10,
    description: 'Burns deal +50% damage to low HP enemies (<30%)',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_execute_bonus', threshold: 30, value: 50 }],
  },
  {
    id: 'arcane_surge_11_infernal_mastery',
    name: 'Infernal Mastery',
    tier: 11,
    description: 'Burn damage +50%',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_damage_percent', value: 50 }],
  },
  {
    id: 'arcane_surge_12_soulfire',
    name: 'Soulfire',
    tier: 12,
    description: 'Burns ignore armor',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_ignores_armor', value: true }],
  },
  {
    id: 'arcane_surge_13_avatar_of_flame',
    name: 'Avatar of Flame',
    tier: 13,
    description: 'Burn ticks can critically strike',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_can_crit', value: true }],
  },
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/enchanter-enhancements.ts
git commit -m "feat(data): add Arcane Surge enhancements tiers 8-13"
```

---

### Task 3.4: Add Hex Veil Path Enhancements (Tiers 1-7)

**Files:**
- Modify: `src/data/paths/enchanter-enhancements.ts`

**Step 1: Add first 7 tiers**

```typescript
export const HEX_VEIL_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'hex_veil_1_weakening_hex',
    name: 'Weakening Hex',
    tier: 1,
    description: 'Enemy damage reduced by additional 10% (25% total)',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_reduction', value: 10 }],
  },
  {
    id: 'hex_veil_2_chilling_curse',
    name: 'Chilling Curse',
    tier: 2,
    description: 'Enemy attacks 15% slower',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_slow_percent', value: 15 }],
  },
  {
    id: 'hex_veil_3_vulnerability',
    name: 'Vulnerability',
    tier: 3,
    description: 'Hexed enemy takes 10% more damage',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_amp', value: 10 }],
  },
  {
    id: 'hex_veil_4_arcane_drain',
    name: 'Arcane Drain',
    tier: 4,
    description: 'Regenerate 1 HP per second while enemy is hexed',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_regen', value: 1 }],
  },
  {
    id: 'hex_veil_5_deep_curse',
    name: 'Deep Curse',
    tier: 5,
    description: 'Hex effects intensify by 20%',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_intensity', value: 20 }],
  },
  {
    id: 'hex_veil_6_mana_leech',
    name: 'Mana Leech',
    tier: 6,
    description: 'Heal 5% of damage dealt to hexed enemy',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_lifesteal', value: 5 }],
  },
  {
    id: 'hex_veil_7_curse_of_frailty',
    name: 'Curse of Frailty',
    tier: 7,
    description: 'Hexed enemy has -15% armor',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_armor_reduction', value: 15 }],
  },
];
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/enchanter-enhancements.ts
git commit -m "feat(data): add Hex Veil enhancements tiers 1-7"
```

---

### Task 3.5: Add Hex Veil Path Enhancements (Tiers 8-13)

**Files:**
- Modify: `src/data/paths/enchanter-enhancements.ts`

**Step 1: Add remaining tiers**

```typescript
// Add to HEX_VEIL_PATH_ENHANCEMENTS array:
  {
    id: 'hex_veil_8_retributive_hex',
    name: 'Retributive Hex',
    tier: 8,
    description: 'Reflect 15% damage from hexed enemy',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_reflect', value: 15 }],
  },
  {
    id: 'hex_veil_9_suffocating_curse',
    name: 'Suffocating Curse',
    tier: 9,
    description: 'Hexed enemy takes 5 damage per second',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_aura', value: 5 }],
  },
  {
    id: 'hex_veil_10_curse_mastery',
    name: 'Curse Mastery',
    tier: 10,
    description: 'All hex effects +30%',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_intensity', value: 30 }],
  },
  {
    id: 'hex_veil_11_doom_mark',
    name: 'Doom Mark',
    tier: 11,
    description: 'Hexed enemy takes 25% more damage',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_amp', value: 25 }],
  },
  {
    id: 'hex_veil_12_life_drain_aura',
    name: 'Life Drain Aura',
    tier: 12,
    description: 'Heal 3% max HP when hexed enemy attacks',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_heal_on_enemy_attack', value: 3 }],
  },
  {
    id: 'hex_veil_13_master_hexer',
    name: 'Master Hexer',
    tier: 13,
    description: 'Disable enemy special abilities',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_disable_abilities', value: true }],
  },
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/enchanter-enhancements.ts
git commit -m "feat(data): add Hex Veil enhancements tiers 8-13"
```

---

### Task 3.6: Add Enchanter Enhancement Helper Functions

**Files:**
- Modify: `src/data/paths/enchanter-enhancements.ts`

**Step 1: Add helper functions**

```typescript
export function getEnchanterEnhancement(
  path: 'arcane_surge' | 'hex_veil',
  tier: number
): StanceEnhancement | undefined {
  const enhancements = path === 'arcane_surge'
    ? ARCANE_SURGE_PATH_ENHANCEMENTS
    : HEX_VEIL_PATH_ENHANCEMENTS;
  return enhancements.find(e => e.tier === tier);
}

export function getEnchanterEnhancementChoices(
  arcaneSurgeTier: number,
  hexVeilTier: number
): { arcaneSurge: StanceEnhancement | undefined; hexVeil: StanceEnhancement | undefined } {
  return {
    arcaneSurge: getEnchanterEnhancement('arcane_surge', arcaneSurgeTier + 1),
    hexVeil: getEnchanterEnhancement('hex_veil', hexVeilTier + 1),
  };
}

export function getEnchanterEnhancementById(enhancementId: string): StanceEnhancement | undefined {
  const allEnhancements = [...ARCANE_SURGE_PATH_ENHANCEMENTS, ...HEX_VEIL_PATH_ENHANCEMENTS];
  return allEnhancements.find(e => e.id === enhancementId);
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/enchanter-enhancements.ts
git commit -m "feat(data): add Enchanter enhancement helper functions"
```

---

### Task 3.7: Write Unit Tests for Enchanter Enhancements

**Files:**
- Create: `src/data/paths/__tests__/enchanter-enhancements.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  ARCANE_SURGE_PATH_ENHANCEMENTS,
  HEX_VEIL_PATH_ENHANCEMENTS,
  getEnchanterEnhancement,
  getEnchanterEnhancementChoices,
  getEnchanterEnhancementById,
} from '../enchanter-enhancements';

describe('Enchanter Enhancements', () => {
  describe('enhancement definitions', () => {
    it('should have 13 Arcane Surge enhancements', () => {
      expect(ARCANE_SURGE_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have 13 Hex Veil enhancements', () => {
      expect(HEX_VEIL_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have correct tier numbers', () => {
      for (let i = 0; i < 13; i++) {
        expect(ARCANE_SURGE_PATH_ENHANCEMENTS[i].tier).toBe(i + 1);
        expect(HEX_VEIL_PATH_ENHANCEMENTS[i].tier).toBe(i + 1);
      }
    });

    it('should have correct stanceIds', () => {
      for (const e of ARCANE_SURGE_PATH_ENHANCEMENTS) {
        expect(e.stanceId).toBe('arcane_surge');
      }
      for (const e of HEX_VEIL_PATH_ENHANCEMENTS) {
        expect(e.stanceId).toBe('hex_veil');
      }
    });
  });

  describe('getEnchanterEnhancement', () => {
    it('should return correct tier for arcane_surge', () => {
      const e = getEnchanterEnhancement('arcane_surge', 1);
      expect(e?.name).toBe('Searing Touch');
    });

    it('should return correct tier for hex_veil', () => {
      const e = getEnchanterEnhancement('hex_veil', 13);
      expect(e?.name).toBe('Master Hexer');
    });

    it('should return undefined for invalid tier', () => {
      expect(getEnchanterEnhancement('arcane_surge', 14)).toBeUndefined();
    });
  });

  describe('getEnchanterEnhancementChoices', () => {
    it('should return next tier choices', () => {
      const choices = getEnchanterEnhancementChoices(0, 0);
      expect(choices.arcaneSurge?.tier).toBe(1);
      expect(choices.hexVeil?.tier).toBe(1);
    });
  });

  describe('getEnchanterEnhancementById', () => {
    it('should find enhancement by id', () => {
      const e = getEnchanterEnhancementById('hex_veil_13_master_hexer');
      expect(e?.name).toBe('Master Hexer');
    });

    it('should return undefined for invalid id', () => {
      expect(getEnchanterEnhancementById('invalid')).toBeUndefined();
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/data/paths/__tests__/enchanter-enhancements.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/__tests__/enchanter-enhancements.test.ts
git commit -m "test(data): add Enchanter enhancements unit tests"
```

---

## Phase 4: System Integration

### Task 4.1: Update passive-effect.ts for Enchanter Effect Types

**Files:**
- Modify: `src/ecs/systems/passive-effect.ts`

**Step 1: Add import for Enchanter enhancements**

```typescript
// Add import at top of file:
import { getEnchanterEnhancementById } from '@/data/paths/enchanter-enhancements';
```

**Step 2: Update getActiveStanceEnhancements to handle Enchanter**

```typescript
// Replace getActiveStanceEnhancements function:
function getActiveStanceEnhancements(player: Entity): StanceEnhancementEffect[] {
  const stanceProgression = player.pathProgression?.stanceProgression;
  const activeStanceId = player.stanceState?.activeStanceId;
  if (!stanceProgression || !activeStanceId) return [];

  const effects: StanceEnhancementEffect[] = [];

  for (const enhancementId of stanceProgression.acquiredEnhancements) {
    // Try Guardian first, then Enchanter
    let enhancement = getGuardianEnhancementById(enhancementId);
    if (!enhancement) {
      enhancement = getEnchanterEnhancementById(enhancementId);
    }
    if (!enhancement) continue;

    // Only include enhancements for the active stance
    if (enhancement.stanceId !== activeStanceId) continue;

    effects.push(...enhancement.effects);
  }

  return effects;
}
```

**Step 3: Add Enchanter effect processing in recomputePassiveEffects**

Add cases for all new effect types in the switch statement inside `recomputePassiveEffects`:

```typescript
// Add these cases to the switch in recomputePassiveEffects:

// Burn effects
case 'burn_damage_percent':
  computed.burnDamagePercent += effect.value;
  break;
case 'burn_proc_chance':
  computed.burnProcChance += effect.value;
  break;
case 'burn_duration_bonus':
  computed.burnDurationBonus += effect.value;
  break;
case 'burn_max_stacks':
  computed.burnMaxStacks = Math.max(computed.burnMaxStacks, effect.value);
  break;
case 'burn_tick_rate':
  computed.burnTickRateMultiplier *= (1 + effect.value / 100);
  break;
case 'damage_vs_burning':
  computed.damageVsBurning += effect.value;
  break;
case 'crit_refreshes_burn':
  computed.critRefreshesBurn = effect.value;
  break;
case 'lifesteal_from_burns':
  computed.lifestealFromBurns += effect.value;
  break;
case 'burn_execute_bonus':
  computed.burnExecuteThreshold = effect.threshold;
  computed.burnExecuteBonus = effect.value;
  break;
case 'burn_ignores_armor':
  computed.burnIgnoresArmor = effect.value;
  break;
case 'burn_can_crit':
  computed.burnCanCrit = effect.value;
  break;

// Hex effects
case 'hex_damage_reduction':
  computed.hexDamageReduction += effect.value;
  break;
case 'hex_slow_percent':
  computed.hexSlowPercent += effect.value;
  break;
case 'hex_damage_amp':
  computed.hexDamageAmp += effect.value;
  break;
case 'hex_regen':
  computed.hexRegen += effect.value;
  break;
case 'hex_intensity':
  computed.hexIntensityMultiplier *= (1 + effect.value / 100);
  break;
case 'hex_lifesteal':
  computed.hexLifesteal += effect.value;
  break;
case 'hex_armor_reduction':
  computed.hexArmorReduction += effect.value;
  break;
case 'hex_reflect':
  computed.hexReflect += effect.value;
  break;
case 'hex_damage_aura':
  computed.hexDamageAura += effect.value;
  break;
case 'hex_heal_on_enemy_attack':
  computed.hexHealOnEnemyAttack += effect.value;
  break;
case 'hex_disable_abilities':
  computed.hexDisableAbilities = effect.value;
  break;
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Run tests**

Run: `npx vitest run src/ecs`
Expected: PASS

**Step 6: Commit**

```bash
git add src/ecs/systems/passive-effect.ts
git commit -m "feat(ecs): add Enchanter effect processing to passive-effect system"
```

---

### Task 4.2: Update power.ts for Archmage Mechanics

**Files:**
- Modify: `src/ecs/systems/power.ts`

**Step 1: Add resetAllCooldowns handling after power effect**

Find the section after `switch (power.effect)` and before `setCooldown`, add:

```typescript
// After applying power effect, before setCooldown:

// Reset all other cooldowns
if (power.resetAllCooldowns && entity.cooldowns) {
  for (const [powerId] of entity.cooldowns) {
    if (powerId !== power.id) {
      entity.cooldowns.delete(powerId);
    }
  }
  addCombatLog('All cooldowns reset!');
}

// Modify charges (for gain-type resources, negative = reduce)
if (power.chargeModify && entity.pathResource?.resourceBehavior === 'gain') {
  entity.pathResource.current = Math.max(0,
    Math.min(entity.pathResource.max, entity.pathResource.current + power.chargeModify));
}
```

**Step 2: Add vulnerable status application in applyDebuffPower**

Add after the existing debuff handling:

```typescript
// In applyDebuffPower, add after existing status applications:

// Apply vulnerable status (enemy takes more damage)
if (power.enemyVulnerable && power.enemyVulnerable > 0) {
  const vulnDuration = power.enemyVulnerableDuration ?? 8;
  target.statusEffects.push({
    id: `vulnerable-${power.id}-${Date.now()}`,
    type: 'vulnerable',
    value: power.enemyVulnerable,
    remainingTurns: vulnDuration,
    icon: 'target',
  });
  effects.push(`vulnerable (+${power.enemyVulnerable}% damage taken) for ${vulnDuration}s`);

  queueAnimationEvent('status_applied', {
    type: 'status',
    effectType: 'vulnerable',
    applied: true,
  });
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Run tests**

Run: `npx vitest run src/ecs`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/power.ts
git commit -m "feat(ecs): add Archmage power mechanics (resetAllCooldowns, chargeModify, vulnerable)"
```

---

### Task 4.3: Update combat.ts for Vulnerable Status and Hex Effects

**Files:**
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Add vulnerable damage amplification to player attack**

Find where player damage is calculated before applying to enemy, add:

```typescript
// When calculating damage to enemy, after base damage calculation:

// Check for vulnerable status on target
if (target.statusEffects?.some(s => s.type === 'vulnerable')) {
  const vulnEffect = target.statusEffects.find(s => s.type === 'vulnerable');
  if (vulnEffect) {
    damage = Math.round(damage * (1 + vulnEffect.value / 100));
  }
}

// Check for hex damage amp (player in hex stance attacking)
const player = getPlayer();
if (player?.stanceState?.activeStanceId === 'hex_veil') {
  const computed = player.passiveEffectState?.computed;
  if (computed?.hexDamageAmp) {
    damage = Math.round(damage * (1 + computed.hexDamageAmp / 100));
  }
}
```

**Step 2: Add hex damage reduction to enemy attack**

Find where enemy damage is calculated before applying to player, add:

```typescript
// When enemy attacks player, after base damage calculation:

// Check hex damage reduction
if (player.stanceState?.activeStanceId === 'hex_veil') {
  const computed = player.passiveEffectState?.computed;
  if (computed?.hexDamageReduction) {
    const reduction = computed.hexDamageReduction * (computed.hexIntensityMultiplier ?? 1);
    damage = Math.round(damage * (1 - reduction / 100));
  }
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Run tests**

Run: `npx vitest run src/ecs`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts
git commit -m "feat(ecs): add vulnerable status and hex effects to combat system"
```

---

### Task 4.4: Update enemy-ability.ts for Hex Disable

**Files:**
- Modify: `src/ecs/systems/enemy-ability.ts`

**Step 1: Add hex disable check at start of system**

At the beginning of the EnemyAbilitySystem function, add:

```typescript
// At start of EnemyAbilitySystem, after phase check:

// Check if hex disables enemy abilities
const player = getPlayer();
if (player?.stanceState?.activeStanceId === 'hex_veil') {
  const computed = player.passiveEffectState?.computed;
  if (computed?.hexDisableAbilities) {
    return; // Skip all enemy ability processing
  }
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Run tests**

Run: `npx vitest run src/ecs`
Expected: PASS

**Step 4: Commit**

```bash
git add src/ecs/systems/enemy-ability.ts
git commit -m "feat(ecs): add hex disable abilities check to enemy-ability system"
```

---

### Task 4.5: Add Hex Aura Damage to PassiveEffectSystem

**Files:**
- Modify: `src/ecs/systems/passive-effect.ts`

**Step 1: Add hex damage aura processing in PassiveEffectSystem tick**

In the PassiveEffectSystem function, after the existing damage aura processing, add:

```typescript
// After existing damageAuraPerSecond processing:

// Process hex damage aura (only in hex_veil stance)
if (player.stanceState?.activeStanceId === 'hex_veil' && computed.hexDamageAura > 0) {
  const enemy = getActiveEnemy();
  if (enemy?.health && !enemy.dying) {
    const hexAuraDamage = computed.hexDamageAura * computed.hexIntensityMultiplier;
    const auraDamage = Math.round(hexAuraDamage * (effectiveDelta / 1000));
    if (auraDamage > 0) {
      enemy.health.current = Math.max(0, enemy.health.current - auraDamage);
    }
  }
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/ecs/systems/passive-effect.ts
git commit -m "feat(ecs): add hex damage aura processing"
```

---

## Phase 5: Update mage.ts Path Definitions

### Task 5.1: Update Archmage Path Definition

**Files:**
- Modify: `src/data/paths/mage.ts`

**Step 1: Update ARCHMAGE_PATH to use new subpath definitions**

Update the subpaths array in ARCHMAGE_PATH:

```typescript
// Update subpaths in ARCHMAGE_PATH:
subpaths: [
  {
    id: 'battlemage',
    name: 'Battlemage',
    description: 'Sustained spell pressure - never stop casting',
    icon: 'ability-paths-mage-battlemage',
    theme: 'sustained',
  },
  {
    id: 'destroyer',
    name: 'Destroyer',
    description: 'Explosive burst damage - wait for the perfect moment',
    icon: 'ability-paths-mage-destroyer',
    theme: 'burst',
  },
],
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/mage.ts
git commit -m "feat(data): update Archmage subpath definitions"
```

---

### Task 5.2: Update Enchanter Path Definition

**Files:**
- Modify: `src/data/paths/mage.ts`

**Step 1: Verify Enchanter subpaths match stance IDs**

The subpath IDs should NOT be used for Enchanter (passive path uses stances). Verify the path definition is correct:

```typescript
// Verify ENCHANTER_PATH has correct structure:
const ENCHANTER_PATH: PathDefinition = {
  id: 'enchanter',
  name: 'Enchanter',
  description: 'Magic works for you automatically. Passive auras, damage over time, and hex effects.',
  className: 'Mage',
  type: 'passive',
  icon: 'ability-paths-mage-enchanter',
  abilities: ENCHANTER_ABILITIES, // Keep existing abilities
  subpaths: [], // Passive paths don't use subpaths (they use stances)
  hasComboMechanic: false,
};
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/data/paths/mage.ts
git commit -m "feat(data): verify Enchanter path definition for passive stance system"
```

---

## Phase 6: Integration Testing

### Task 6.1: Write ECS Integration Tests for Archmage Powers

**Files:**
- Create: `src/ecs/systems/__tests__/archmage-integration.test.ts`

**Step 1: Write integration tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { createPlayer, createEnemy } from '../../factories';
import { PowerSystem } from '../power';
import { ARCHMAGE_POWERS } from '@/data/paths/archmage-powers';

describe('Archmage Power Integration', () => {
  beforeEach(() => {
    // Clear world
    for (const entity of world.entities) {
      world.remove(entity);
    }
  });

  describe('resetAllCooldowns', () => {
    it('should reset other cooldowns when power has resetAllCooldowns', () => {
      const player = createPlayer('mage');
      player.powers = [ARCHMAGE_POWERS.arcane_surge_power, ARCHMAGE_POWERS.arcane_bolt];
      player.cooldowns = new Map([
        ['arcane_bolt', { remaining: 3, base: 4 }],
      ]);
      player.pathResource = { type: 'arcane_charges', current: 0, max: 100, color: '#9333ea', resourceBehavior: 'gain' };

      // Cast arcane surge
      world.addComponent(player, 'casting', { powerId: 'arcane_surge_power', startedAtTick: 0 });

      const enemy = createEnemy('test_enemy');
      enemy.health = { current: 100, max: 100 };

      PowerSystem(16);

      // Other cooldowns should be cleared
      expect(player.cooldowns.has('arcane_bolt')).toBe(false);
      // But arcane_surge should have its own cooldown
      expect(player.cooldowns.has('arcane_surge_power')).toBe(true);
    });
  });

  describe('chargeModify', () => {
    it('should reduce charges when power has negative chargeModify', () => {
      const player = createPlayer('mage');
      const powerWithChargeModify = { ...ARCHMAGE_POWERS.arcane_surge_power };
      powerWithChargeModify.chargeModify = -30;
      player.powers = [powerWithChargeModify];
      player.pathResource = { type: 'arcane_charges', current: 50, max: 100, color: '#9333ea', resourceBehavior: 'gain' };

      world.addComponent(player, 'casting', { powerId: 'arcane_surge_power', startedAtTick: 0 });

      const enemy = createEnemy('test_enemy');
      enemy.health = { current: 100, max: 100 };

      // Cost is 50, so charges go to 100, then -30 = 70
      PowerSystem(16);

      expect(player.pathResource.current).toBe(70);
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/archmage-integration.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/ecs/systems/__tests__/archmage-integration.test.ts
git commit -m "test(ecs): add Archmage power integration tests"
```

---

### Task 6.2: Write E2E Test for Mage Path Selection

**Files:**
- Create: `e2e/mage-paths.spec.ts`

**Step 1: Write E2E test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mage Path Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=true');
  });

  test('should allow selecting Archmage path', async ({ page }) => {
    // Start new game
    await page.click('text=New Game');

    // Select Mage class
    await page.click('text=Mage');

    // Should show path selection
    await expect(page.locator('text=Choose Your Path')).toBeVisible();

    // Select Archmage
    await page.click('text=Archmage');

    // Should enter combat with Arcane Charges resource
    await expect(page.locator('text=Arcane Charges')).toBeVisible();
  });

  test('should allow selecting Enchanter path', async ({ page }) => {
    await page.click('text=New Game');
    await page.click('text=Mage');

    // Select Enchanter
    await page.click('text=Enchanter');

    // Should show stance toggle UI
    await expect(page.locator('text=Arcane Surge')).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `npx playwright test e2e/mage-paths.spec.ts --project="Desktop"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/mage-paths.spec.ts
git commit -m "test(e2e): add Mage path selection tests"
```

---

## Final Task: Run Full Test Suite

**Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: PASS

**Step 2: Run all E2E tests**

Run: `npx playwright test --project="Desktop"`
Expected: PASS

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(mage): complete Mage paths implementation

- Archmage (active): 8 powers with upgrades, Arcane Charges resource
- Enchanter (passive): 26 stance enhancements (13 per stance)
- ECS system integration for all new mechanics
- Full test coverage (unit + E2E)"
```

---

## Summary

This plan implements the Mage paths in 6 phases with 22 tasks:

1. **Phase 1** (4 tasks): Type definitions
2. **Phase 2** (7 tasks): Archmage powers
3. **Phase 3** (7 tasks): Enchanter enhancements
4. **Phase 4** (5 tasks): System integration
5. **Phase 5** (2 tasks): Path definition updates
6. **Phase 6** (2 tasks): Integration testing

Each task follows TDD with explicit test → implement → verify → commit steps.
