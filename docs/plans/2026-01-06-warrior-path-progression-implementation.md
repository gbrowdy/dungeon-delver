# Warrior Path Progression Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the new path progression system using Warrior class (Berserker/Guardian) as the guinea pig, with deterministic power/stance choices at each level.

**Architecture:**
- Level 1: Generic "Strike" power + Stamina resource for all classes
- Level 2+: Active paths get path-specific powers with upgrades; Passive paths get stance enhancement choices
- All choices are deterministic (same path = same options at same level)

**Tech Stack:** React, TypeScript, miniplex ECS, Vitest for testing

---

## Phase 1: Level 1 Simplification

### Task 1.1: Create Generic Stamina Resource

**Files:**
- Modify: `src/data/pathResources.ts`
- Test: `src/data/__tests__/pathResources.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/__tests__/pathResources.test.ts
import { describe, it, expect } from 'vitest';
import { STAMINA_RESOURCE, getPathResource } from '../pathResources';

describe('Stamina Resource', () => {
  it('should have stamina as default pre-path resource', () => {
    expect(STAMINA_RESOURCE.type).toBe('stamina');
    expect(STAMINA_RESOURCE.max).toBe(50);
    expect(STAMINA_RESOURCE.current).toBe(50);
    expect(STAMINA_RESOURCE.color).toBeDefined();
  });

  it('should return stamina for players without a path', () => {
    const resource = getPathResource(undefined);
    expect(resource.type).toBe('stamina');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/pathResources.test.ts`
Expected: FAIL with "STAMINA_RESOURCE is not exported"

**Step 3: Write minimal implementation**

```typescript
// In src/data/pathResources.ts - add near top after imports

/**
 * Stamina resource for level 1 players (before path selection)
 * Replaced by path-specific resource at level 2
 */
export const STAMINA_RESOURCE: PathResource = {
  type: 'stamina',
  current: 50,
  max: 50,
  color: '#22c55e', // green-500
  resourceBehavior: 'spend',
  generation: {},
};

// Update getPathResource function
export function getPathResource(pathId: string | undefined): PathResource {
  if (!pathId) return { ...STAMINA_RESOURCE };
  return PATH_RESOURCES[pathId] ? { ...PATH_RESOURCES[pathId] } : { ...STAMINA_RESOURCE };
}
```

Also add 'stamina' to the PathResource type in `src/types/game.ts`:

```typescript
// Find the PathResource type and add 'stamina' to the type union
type: 'fury' | 'arcane_charges' | 'momentum' | 'zeal' | 'mana' | 'stamina';
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/pathResources.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/pathResources.ts src/types/game.ts src/data/__tests__/pathResources.test.ts
git commit -m "feat(ecs): add stamina resource for pre-path players"
```

---

### Task 1.2: Create Generic Class Starting Powers

**Files:**
- Create: `src/data/startingPowers.ts`
- Test: `src/data/__tests__/startingPowers.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/__tests__/startingPowers.test.ts
import { describe, it, expect } from 'vitest';
import { GENERIC_STARTING_POWERS, getStartingPower } from '../startingPowers';

describe('Generic Starting Powers', () => {
  it('should have a starting power for each class', () => {
    expect(GENERIC_STARTING_POWERS.warrior).toBeDefined();
    expect(GENERIC_STARTING_POWERS.mage).toBeDefined();
    expect(GENERIC_STARTING_POWERS.rogue).toBeDefined();
    expect(GENERIC_STARTING_POWERS.paladin).toBeDefined();
  });

  it('should have identical stats but different names', () => {
    const warrior = GENERIC_STARTING_POWERS.warrior;
    const mage = GENERIC_STARTING_POWERS.mage;

    expect(warrior.name).toBe('Strike');
    expect(mage.name).toBe('Zap');
    expect(warrior.value).toBe(mage.value);
    expect(warrior.cooldown).toBe(mage.cooldown);
    expect(warrior.manaCost).toBe(mage.manaCost);
  });

  it('should return correct power for class', () => {
    const power = getStartingPower('warrior');
    expect(power.name).toBe('Strike');
    expect(power.manaCost).toBe(15);
    expect(power.cooldown).toBe(3);
    expect(power.value).toBe(1.2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/startingPowers.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/data/startingPowers.ts
import type { Power } from '@/types/game';
import type { CharacterClass } from '@/types/game';

/**
 * Generic Starting Powers (Level 1)
 *
 * All classes start with mechanically identical powers.
 * Different names/icons for class flavor, same stats.
 * These are replaced when choosing a path at level 2.
 */

const BASE_STARTING_POWER = {
  manaCost: 15, // Uses stamina at level 1
  cooldown: 3,
  effect: 'damage' as const,
  value: 1.2, // 120% damage
  category: 'strike' as const,
  synergies: [],
};

export const GENERIC_STARTING_POWERS: Record<CharacterClass, Power> = {
  warrior: {
    ...BASE_STARTING_POWER,
    id: 'basic-strike',
    name: 'Strike',
    description: 'A basic strike dealing 120% damage',
    icon: 'power-basic_strike',
  },
  mage: {
    ...BASE_STARTING_POWER,
    id: 'basic-zap',
    name: 'Zap',
    description: 'A basic zap dealing 120% damage',
    icon: 'power-basic_zap',
  },
  rogue: {
    ...BASE_STARTING_POWER,
    id: 'basic-slash',
    name: 'Slash',
    description: 'A basic slash dealing 120% damage',
    icon: 'power-basic_slash',
  },
  paladin: {
    ...BASE_STARTING_POWER,
    id: 'basic-smite',
    name: 'Smite',
    description: 'A basic smite dealing 120% damage',
    icon: 'power-basic_smite',
  },
};

export function getStartingPower(characterClass: CharacterClass): Power {
  return { ...GENERIC_STARTING_POWERS[characterClass] };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/startingPowers.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/startingPowers.ts src/data/__tests__/startingPowers.test.ts
git commit -m "feat(data): add generic starting powers for level 1"
```

---

### Task 1.3: Update Player Factory to Use Stamina + Generic Power

**Files:**
- Modify: `src/ecs/factories/index.ts`
- Test: `src/ecs/factories/__tests__/player.test.ts`

**Step 1: Write the failing test**

```typescript
// src/ecs/factories/__tests__/player.test.ts
import { describe, it, expect } from 'vitest';
import { createPlayerEntity } from '../index';

describe('createPlayerEntity with new starting system', () => {
  it('should start with stamina resource', () => {
    const player = createPlayerEntity('warrior');
    expect(player.pathResource?.type).toBe('stamina');
  });

  it('should start with generic Strike power for warrior', () => {
    const player = createPlayerEntity('warrior');
    expect(player.powers).toHaveLength(1);
    expect(player.powers?.[0]?.name).toBe('Strike');
  });

  it('should start with generic Zap power for mage', () => {
    const player = createPlayerEntity('mage');
    expect(player.powers?.[0]?.name).toBe('Zap');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/factories/__tests__/player.test.ts`
Expected: FAIL (current implementation uses class-specific powers)

**Step 3: Modify implementation**

In `src/ecs/factories/index.ts`, update the `createPlayerEntity` function:

```typescript
// Add import at top
import { getStartingPower } from '@/data/startingPowers';
import { STAMINA_RESOURCE } from '@/data/pathResources';

// In createPlayerEntity function, replace the starting power logic:
// OLD: const startingPower = CLASS_DATA[characterClass].startingPower;
// NEW:
const startingPower = getStartingPower(characterClass);

// Replace pathResource initialization:
// OLD: pathResource: getPathResource(undefined),
// NEW:
pathResource: { ...STAMINA_RESOURCE },
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/factories/__tests__/player.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/factories/index.ts src/ecs/factories/__tests__/player.test.ts
git commit -m "feat(ecs): use stamina + generic powers at level 1"
```

---

## Phase 2: Berserker Power Data

### Task 2.1: Create Berserker Power Definitions

**Files:**
- Create: `src/data/paths/berserker-powers.ts`
- Test: `src/data/paths/__tests__/berserker-powers.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/paths/__tests__/berserker-powers.test.ts
import { describe, it, expect } from 'vitest';
import {
  BERSERKER_POWERS,
  getBerserkerPowerChoices,
  getBerserkerPowerUpgrade
} from '../berserker-powers';

describe('Berserker Powers', () => {
  describe('Power definitions', () => {
    it('should have level 2 power choices', () => {
      const choices = getBerserkerPowerChoices(2);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('rage_strike');
      expect(choices[1].id).toBe('savage_slam');
    });

    it('should have level 4 power choices', () => {
      const choices = getBerserkerPowerChoices(4);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('berserker_roar');
      expect(choices[1].id).toBe('reckless_charge');
    });

    it('should have level 6 power choices', () => {
      const choices = getBerserkerPowerChoices(6);
      expect(choices).toHaveLength(2);
    });

    it('should return empty array for non-power levels', () => {
      const choices = getBerserkerPowerChoices(3);
      expect(choices).toHaveLength(0);
    });
  });

  describe('Power upgrades', () => {
    it('should return T1 upgrade for rage_strike', () => {
      const upgrade = getBerserkerPowerUpgrade('rage_strike', 1);
      expect(upgrade).toBeDefined();
      expect(upgrade?.tier).toBe(1);
      expect(upgrade?.value).toBe(2.4); // 240% damage
    });

    it('should return T2 upgrade for rage_strike', () => {
      const upgrade = getBerserkerPowerUpgrade('rage_strike', 2);
      expect(upgrade).toBeDefined();
      expect(upgrade?.tier).toBe(2);
      expect(upgrade?.guaranteedCrit).toBe(true);
    });

    it('should return undefined for invalid tier', () => {
      const upgrade = getBerserkerPowerUpgrade('rage_strike', 3);
      expect(upgrade).toBeUndefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/paths/__tests__/berserker-powers.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/data/paths/berserker-powers.ts
import type { Power } from '@/types/game';

/**
 * Berserker Path Powers
 *
 * Level 2: Choose Power 1 (Rage Strike vs Savage Slam)
 * Level 4: Choose Power 2 (Berserker Roar vs Reckless Charge)
 * Level 6: Choose Power 3 (Bloodthirst vs Unstoppable Force)
 * Level 8: Subpath grants Power 4 (Warcry vs Death Sentence)
 */

export interface PowerUpgrade {
  tier: 1 | 2;
  description: string;
  // Stat changes
  value?: number;
  cooldown?: number;
  resourceCost?: number;
  // Special effects
  damageThreshold?: number; // HP threshold for bonus damage
  guaranteedCrit?: boolean;
  stunDuration?: number;
  bonusDamageToStunned?: number;
  buffDuration?: number;
  buffPower?: number;
  buffSpeed?: number;
  lifesteal?: number;
  selfDamagePercent?: number;
  healOnKill?: number;
  shieldOnOverheal?: number;
  cooldownReductionOnKill?: number;
  deathImmunityDuration?: number;
  reflectDuringImmunity?: number;
}

export interface BerserkerPower extends Power {
  upgrades: [PowerUpgrade, PowerUpgrade]; // T1, T2
}

// Level 2 Powers
const RAGE_STRIKE: BerserkerPower = {
  id: 'rage_strike',
  name: 'Rage Strike',
  description: 'Deal 200% damage. +50% damage if below 50% HP.',
  icon: 'power-rage_strike',
  manaCost: 0,
  resourceCost: 30,
  cooldown: 5,
  effect: 'damage',
  value: 2.0,
  category: 'strike',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '240% damage, threshold 60% HP',
      value: 2.4,
      damageThreshold: 60,
    },
    {
      tier: 2,
      description: 'Guaranteed crit if below threshold',
      guaranteedCrit: true,
    },
  ],
};

const SAVAGE_SLAM: BerserkerPower = {
  id: 'savage_slam',
  name: 'Savage Slam',
  description: 'Deal 150% damage. Stun for 1.5s.',
  icon: 'power-savage_slam',
  manaCost: 0,
  resourceCost: 50,
  cooldown: 8,
  effect: 'damage',
  value: 1.5,
  category: 'control',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '180% damage, stun 2s',
      value: 1.8,
      stunDuration: 2,
    },
    {
      tier: 2,
      description: 'Stunned enemies take 25% more damage for 4s',
      bonusDamageToStunned: 0.25,
    },
  ],
};

// Level 4 Powers
const BERSERKER_ROAR: BerserkerPower = {
  id: 'berserker_roar',
  name: 'Berserker Roar',
  description: '+40% Power, +25% Speed for 6s.',
  icon: 'power-berserker_roar',
  manaCost: 0,
  resourceCost: 25,
  cooldown: 10,
  effect: 'buff',
  value: 0.4,
  category: 'buff',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '+50% Power, +35% Speed, 8s duration',
      buffPower: 0.5,
      buffSpeed: 0.35,
      buffDuration: 8,
    },
    {
      tier: 2,
      description: 'Also grants 15% lifesteal during buff',
      lifesteal: 0.15,
    },
  ],
};

const RECKLESS_CHARGE: BerserkerPower = {
  id: 'reckless_charge',
  name: 'Reckless Charge',
  description: 'Deal 150% damage. Lose 10% max HP.',
  icon: 'power-reckless_charge',
  manaCost: 0,
  resourceCost: 35,
  cooldown: 6,
  effect: 'damage',
  value: 1.5,
  category: 'sacrifice',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '200% damage, self-damage 8%',
      value: 2.0,
      selfDamagePercent: 8,
    },
    {
      tier: 2,
      description: 'If this kills, heal for 20% max HP',
      healOnKill: 20,
    },
  ],
};

// Level 6 Powers
const BLOODTHIRST: BerserkerPower = {
  id: 'bloodthirst',
  name: 'Bloodthirst',
  description: 'Deal 160% damage. Heal 100% of damage dealt.',
  icon: 'power-bloodthirst',
  manaCost: 0,
  resourceCost: 50,
  cooldown: 8,
  effect: 'damage',
  value: 1.6,
  category: 'heal',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '200% damage, overheal becomes shield (max 20% HP)',
      value: 2.0,
      shieldOnOverheal: 20,
    },
    {
      tier: 2,
      description: 'Cooldown reduced by 2s per kill',
      cooldownReductionOnKill: 2,
    },
  ],
};

const UNSTOPPABLE_FORCE: BerserkerPower = {
  id: 'unstoppable_force',
  name: 'Unstoppable Force',
  description: 'Deal 300% damage. Immune to death for 3s.',
  icon: 'power-unstoppable_force',
  manaCost: 0,
  resourceCost: 60,
  cooldown: 12,
  effect: 'damage',
  value: 3.0,
  category: 'strike',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '400% damage, immunity 4s',
      value: 4.0,
      deathImmunityDuration: 4,
    },
    {
      tier: 2,
      description: 'During immunity, reflect 50% damage taken',
      reflectDuringImmunity: 0.5,
    },
  ],
};

// Level 8 Subpath Powers
const WARCRY: BerserkerPower = {
  id: 'warcry',
  name: 'Warcry',
  description: 'Stun 2s, enemy -25% damage for 8s.',
  icon: 'power-warcry',
  manaCost: 0,
  resourceCost: 40,
  cooldown: 15,
  effect: 'debuff',
  value: 0,
  category: 'control',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: 'Stun 2.5s, debuff -35% damage',
      stunDuration: 2.5,
    },
    {
      tier: 2,
      description: 'Your attacks during stun deal +50% damage',
      bonusDamageToStunned: 0.5,
    },
  ],
};

const DEATH_SENTENCE: BerserkerPower = {
  id: 'death_sentence',
  name: 'Death Sentence',
  description: '200% damage. 500% if enemy <30% HP. Kill resets all CDs.',
  icon: 'power-death_sentence',
  manaCost: 0,
  resourceCost: 70,
  cooldown: 10,
  effect: 'damage',
  value: 2.0,
  category: 'execute',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: 'Threshold 35% HP, execute damage 600%',
      damageThreshold: 35,
      value: 6.0,
    },
    {
      tier: 2,
      description: 'Kills also restore 50% max HP',
      healOnKill: 50,
    },
  ],
};

// Power lookup by level
const POWER_CHOICES_BY_LEVEL: Record<number, [BerserkerPower, BerserkerPower]> = {
  2: [RAGE_STRIKE, SAVAGE_SLAM],
  4: [BERSERKER_ROAR, RECKLESS_CHARGE],
  6: [BLOODTHIRST, UNSTOPPABLE_FORCE],
};

// Subpath powers
const SUBPATH_POWERS: Record<string, BerserkerPower> = {
  warlord: WARCRY,
  executioner: DEATH_SENTENCE,
};

export const BERSERKER_POWERS = {
  rage_strike: RAGE_STRIKE,
  savage_slam: SAVAGE_SLAM,
  berserker_roar: BERSERKER_ROAR,
  reckless_charge: RECKLESS_CHARGE,
  bloodthirst: BLOODTHIRST,
  unstoppable_force: UNSTOPPABLE_FORCE,
  warcry: WARCRY,
  death_sentence: DEATH_SENTENCE,
};

export function getBerserkerPowerChoices(level: number): BerserkerPower[] {
  return POWER_CHOICES_BY_LEVEL[level] ?? [];
}

export function getBerserkerSubpathPower(subpathId: string): BerserkerPower | undefined {
  return SUBPATH_POWERS[subpathId];
}

export function getBerserkerPowerUpgrade(powerId: string, tier: number): PowerUpgrade | undefined {
  const power = BERSERKER_POWERS[powerId as keyof typeof BERSERKER_POWERS];
  if (!power || tier < 1 || tier > 2) return undefined;
  return power.upgrades[tier - 1];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/paths/__tests__/berserker-powers.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/paths/berserker-powers.ts src/data/paths/__tests__/berserker-powers.test.ts
git commit -m "feat(data): add Berserker power definitions with upgrades"
```

---

## Phase 3: Guardian Stance Enhancement Data

### Task 3.1: Create Guardian Stance Enhancement Definitions

**Files:**
- Create: `src/data/paths/guardian-enhancements.ts`
- Test: `src/data/paths/__tests__/guardian-enhancements.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/paths/__tests__/guardian-enhancements.test.ts
import { describe, it, expect } from 'vitest';
import {
  IRON_PATH_ENHANCEMENTS,
  RETRIBUTION_PATH_ENHANCEMENTS,
  getGuardianEnhancement,
} from '../guardian-enhancements';

describe('Guardian Stance Enhancements', () => {
  describe('Iron Path', () => {
    it('should have 13 tiers', () => {
      expect(IRON_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have tier 1 as Fortified Skin', () => {
      expect(IRON_PATH_ENHANCEMENTS[0].name).toBe('Fortified Skin');
      expect(IRON_PATH_ENHANCEMENTS[0].tier).toBe(1);
    });

    it('should have tier 13 as Immortal Bulwark', () => {
      expect(IRON_PATH_ENHANCEMENTS[12].name).toBe('Immortal Bulwark');
      expect(IRON_PATH_ENHANCEMENTS[12].tier).toBe(13);
    });
  });

  describe('Retribution Path', () => {
    it('should have 13 tiers', () => {
      expect(RETRIBUTION_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have tier 1 as Sharpened Thorns', () => {
      expect(RETRIBUTION_PATH_ENHANCEMENTS[0].name).toBe('Sharpened Thorns');
    });
  });

  describe('getGuardianEnhancement', () => {
    it('should return correct iron enhancement for tier', () => {
      const enhancement = getGuardianEnhancement('iron', 3);
      expect(enhancement?.name).toBe('Regenerating Bulwark');
    });

    it('should return correct retribution enhancement for tier', () => {
      const enhancement = getGuardianEnhancement('retribution', 1);
      expect(enhancement?.name).toBe('Sharpened Thorns');
    });

    it('should return undefined for invalid tier', () => {
      const enhancement = getGuardianEnhancement('iron', 14);
      expect(enhancement).toBeUndefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/paths/__tests__/guardian-enhancements.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/data/paths/guardian-enhancements.ts

/**
 * Guardian Stance Enhancements
 *
 * Two linear progression paths, one per stance.
 * At each level-up (3-15), player chooses which path to advance.
 * Enhancements only apply while in that stance.
 */

export interface StanceEnhancement {
  id: string;
  name: string;
  tier: number;
  description: string;
  stanceId: 'iron_stance' | 'retribution_stance';
  effects: StanceEnhancementEffect[];
}

export type StanceEnhancementEffect =
  | { type: 'armor_percent'; value: number }
  | { type: 'damage_reduction'; value: number }
  | { type: 'hp_regen'; value: number }
  | { type: 'cc_immunity'; value: boolean }
  | { type: 'armor_scaling_dr'; perArmor: number } // +X% DR per Y armor
  | { type: 'low_hp_armor'; threshold: number; value: number }
  | { type: 'on_hit_heal_chance'; chance: number; healPercent: number }
  | { type: 'max_damage_per_hit'; percent: number }
  | { type: 'remove_speed_penalty'; value: boolean }
  | { type: 'max_hp_percent'; value: number }
  | { type: 'regen_multiplier_above_hp'; threshold: number; multiplier: number }
  | { type: 'armor_reduces_dot'; value: boolean }
  | { type: 'survive_lethal'; value: boolean }
  | { type: 'reflect_percent'; value: number }
  | { type: 'damage_per_hit_stack'; valuePerStack: number; maxStacks: number }
  | { type: 'heal_from_reflect'; percent: number }
  | { type: 'reflect_scaling_per_hit'; value: number }
  | { type: 'counter_attack_chance'; chance: number }
  | { type: 'low_hp_reflect_multiplier'; threshold: number; multiplier: number }
  | { type: 'passive_damage_aura'; damagePerSecond: number }
  | { type: 'next_attack_bonus_after_hit'; value: number }
  | { type: 'permanent_power_per_hit'; value: number }
  | { type: 'reflect_ignores_armor'; value: boolean }
  | { type: 'on_hit_burst_chance'; chance: number; powerPercent: number }
  | { type: 'reflect_can_crit'; value: boolean }
  | { type: 'reflect_kill_heal'; percent: number };

export const IRON_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'iron_1_fortified_skin',
    name: 'Fortified Skin',
    tier: 1,
    description: '+20% Armor',
    stanceId: 'iron_stance',
    effects: [{ type: 'armor_percent', value: 20 }],
  },
  {
    id: 'iron_2_damage_absorption',
    name: 'Damage Absorption',
    tier: 2,
    description: 'Damage reduction increased to 20%',
    stanceId: 'iron_stance',
    effects: [{ type: 'damage_reduction', value: 20 }],
  },
  {
    id: 'iron_3_regenerating_bulwark',
    name: 'Regenerating Bulwark',
    tier: 3,
    description: '+2 HP per second',
    stanceId: 'iron_stance',
    effects: [{ type: 'hp_regen', value: 2 }],
  },
  {
    id: 'iron_4_immovable',
    name: 'Immovable',
    tier: 4,
    description: 'Immune to slows and stuns',
    stanceId: 'iron_stance',
    effects: [{ type: 'cc_immunity', value: true }],
  },
  {
    id: 'iron_5_armor_scaling',
    name: 'Armor Scaling',
    tier: 5,
    description: '+1% damage reduction per 5 Armor',
    stanceId: 'iron_stance',
    effects: [{ type: 'armor_scaling_dr', perArmor: 5 }],
  },
  {
    id: 'iron_6_last_bastion',
    name: 'Last Bastion',
    tier: 6,
    description: 'Below 30% HP: +50% Armor',
    stanceId: 'iron_stance',
    effects: [{ type: 'low_hp_armor', threshold: 30, value: 50 }],
  },
  {
    id: 'iron_7_stalwart_recovery',
    name: 'Stalwart Recovery',
    tier: 7,
    description: '15% chance when hit: heal 5% max HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'on_hit_heal_chance', chance: 15, healPercent: 5 }],
  },
  {
    id: 'iron_8_unbreakable',
    name: 'Unbreakable',
    tier: 8,
    description: "Can't take more than 20% max HP per hit",
    stanceId: 'iron_stance',
    effects: [{ type: 'max_damage_per_hit', percent: 20 }],
  },
  {
    id: 'iron_9_stone_form',
    name: 'Stone Form',
    tier: 9,
    description: 'Remove speed penalty (-15% → 0%)',
    stanceId: 'iron_stance',
    effects: [{ type: 'remove_speed_penalty', value: true }],
  },
  {
    id: 'iron_10_living_fortress',
    name: 'Living Fortress',
    tier: 10,
    description: '+25% max HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'max_hp_percent', value: 25 }],
  },
  {
    id: 'iron_11_regeneration_surge',
    name: 'Regeneration Surge',
    tier: 11,
    description: 'HP regen doubled above 70% HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'regen_multiplier_above_hp', threshold: 70, multiplier: 2 }],
  },
  {
    id: 'iron_12_juggernaut',
    name: 'Juggernaut',
    tier: 12,
    description: 'Armor reduces DoT damage',
    stanceId: 'iron_stance',
    effects: [{ type: 'armor_reduces_dot', value: true }],
  },
  {
    id: 'iron_13_immortal_bulwark',
    name: 'Immortal Bulwark',
    tier: 13,
    description: 'Once per floor: survive lethal at 1 HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'survive_lethal', value: true }],
  },
];

export const RETRIBUTION_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'retribution_1_sharpened_thorns',
    name: 'Sharpened Thorns',
    tier: 1,
    description: 'Reflect damage increased to 30%',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_percent', value: 30 }],
  },
  {
    id: 'retribution_2_vengeful_strikes',
    name: 'Vengeful Strikes',
    tier: 2,
    description: '+10% damage per hit taken (max 5 stacks)',
    stanceId: 'retribution_stance',
    effects: [{ type: 'damage_per_hit_stack', valuePerStack: 10, maxStacks: 5 }],
  },
  {
    id: 'retribution_3_blood_mirror',
    name: 'Blood Mirror',
    tier: 3,
    description: 'Heal 25% of damage reflected',
    stanceId: 'retribution_stance',
    effects: [{ type: 'heal_from_reflect', percent: 25 }],
  },
  {
    id: 'retribution_4_escalating_revenge',
    name: 'Escalating Revenge',
    tier: 4,
    description: 'Reflect +5% per hit (no cap)',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_scaling_per_hit', value: 5 }],
  },
  {
    id: 'retribution_5_counter_strike',
    name: 'Counter Strike',
    tier: 5,
    description: '20% chance to auto-attack when hit',
    stanceId: 'retribution_stance',
    effects: [{ type: 'counter_attack_chance', chance: 20 }],
  },
  {
    id: 'retribution_6_pain_conduit',
    name: 'Pain Conduit',
    tier: 6,
    description: 'Below 50% HP: reflect doubled',
    stanceId: 'retribution_stance',
    effects: [{ type: 'low_hp_reflect_multiplier', threshold: 50, multiplier: 2 }],
  },
  {
    id: 'retribution_7_thorns_aura',
    name: 'Thorns Aura',
    tier: 7,
    description: 'Enemies take 5 damage per second',
    stanceId: 'retribution_stance',
    effects: [{ type: 'passive_damage_aura', damagePerSecond: 5 }],
  },
  {
    id: 'retribution_8_retaliation',
    name: 'Retaliation',
    tier: 8,
    description: 'After hit: next attack +75% damage',
    stanceId: 'retribution_stance',
    effects: [{ type: 'next_attack_bonus_after_hit', value: 75 }],
  },
  {
    id: 'retribution_9_wrath_accumulator',
    name: 'Wrath Accumulator',
    tier: 9,
    description: '+2% Power per hit (permanent)',
    stanceId: 'retribution_stance',
    effects: [{ type: 'permanent_power_per_hit', value: 2 }],
  },
  {
    id: 'retribution_10_death_reflection',
    name: 'Death Reflection',
    tier: 10,
    description: 'Reflect ignores armor',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_ignores_armor', value: true }],
  },
  {
    id: 'retribution_11_explosive_thorns',
    name: 'Explosive Thorns',
    tier: 11,
    description: '25% on hit: deal 50% Power as burst',
    stanceId: 'retribution_stance',
    effects: [{ type: 'on_hit_burst_chance', chance: 25, powerPercent: 50 }],
  },
  {
    id: 'retribution_12_vengeance_incarnate',
    name: 'Vengeance Incarnate',
    tier: 12,
    description: 'Reflect can crit',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_can_crit', value: true }],
  },
  {
    id: 'retribution_13_avatar_of_punishment',
    name: 'Avatar of Punishment',
    tier: 13,
    description: 'Reflect kills heal 30% max HP',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_kill_heal', percent: 30 }],
  },
];

export function getGuardianEnhancement(
  path: 'iron' | 'retribution',
  tier: number
): StanceEnhancement | undefined {
  const enhancements = path === 'iron'
    ? IRON_PATH_ENHANCEMENTS
    : RETRIBUTION_PATH_ENHANCEMENTS;
  return enhancements.find(e => e.tier === tier);
}

export function getGuardianEnhancementChoices(
  ironTier: number,
  retributionTier: number
): { iron: StanceEnhancement | undefined; retribution: StanceEnhancement | undefined } {
  return {
    iron: getGuardianEnhancement('iron', ironTier + 1),
    retribution: getGuardianEnhancement('retribution', retributionTier + 1),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/paths/__tests__/guardian-enhancements.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/paths/guardian-enhancements.ts src/data/paths/__tests__/guardian-enhancements.test.ts
git commit -m "feat(data): add Guardian stance enhancement definitions"
```

---

## Phase 4: Player State Tracking

### Task 4.1: Add Path Progression State to Player Entity

**Files:**
- Modify: `src/ecs/components.ts`
- Modify: `src/types/paths.ts`

**Step 1: Define new types in paths.ts**

Add to `src/types/paths.ts`:

```typescript
/**
 * Tracks player's power upgrade state (active paths)
 */
export interface PowerUpgradeState {
  powerId: string;
  currentTier: 0 | 1 | 2; // 0 = base, 1 = T1, 2 = T2 (max)
}

/**
 * Tracks player's stance enhancement state (passive paths)
 */
export interface StanceProgressionState {
  ironTier: number;        // Current tier in Iron path (0-13)
  retributionTier: number; // Current tier in Retribution path (0-13)
  acquiredEnhancements: string[]; // IDs of acquired enhancements
}

/**
 * Extended PlayerPath with progression tracking
 */
export interface PlayerPathProgression {
  pathId: string;
  pathType: 'active' | 'passive';
  subpathId?: string;
  // Active path state
  powerUpgrades?: PowerUpgradeState[];
  // Passive path state
  stanceProgression?: StanceProgressionState;
}
```

**Step 2: Update Entity interface in components.ts**

Add to Entity interface in `src/ecs/components.ts`:

```typescript
// Add new component for path progression
pathProgression?: PlayerPathProgression;

// Add pending choice flags
pendingPowerChoice?: {
  level: number;
  choices: Power[];
};
pendingUpgradeChoice?: {
  powerIds: string[]; // IDs of powers that can be upgraded
};
pendingStanceEnhancement?: {
  ironChoice: StanceEnhancement;
  retributionChoice: StanceEnhancement;
};
```

**Step 3: Commit**

```bash
git add src/types/paths.ts src/ecs/components.ts
git commit -m "feat(types): add path progression state tracking types"
```

---

## Phase 5: Level-Up Flow Changes

### Task 5.1: Update Progression System for Path-Aware Level-Ups

**Files:**
- Modify: `src/ecs/systems/progression.ts`
- Test: `src/ecs/systems/__tests__/progression.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/ecs/systems/__tests__/progression.test.ts
describe('Path-aware level-ups', () => {
  it('should set pendingPowerChoice at level 4 for active path', () => {
    const player = createTestPlayer({ level: 3, pathId: 'berserker' });
    player.progression.xp = player.progression.xpToNext; // Trigger level up

    runProgressionSystem();

    expect(player.level).toBe(4);
    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice.choices).toHaveLength(2);
  });

  it('should set pendingUpgradeChoice at level 3 for active path', () => {
    const player = createTestPlayer({ level: 2, pathId: 'berserker', powers: ['rage_strike'] });
    player.progression.xp = player.progression.xpToNext;

    runProgressionSystem();

    expect(player.level).toBe(3);
    expect(player.pendingUpgradeChoice).toBeDefined();
    expect(player.pendingUpgradeChoice.powerIds).toContain('rage_strike');
  });

  it('should set pendingStanceEnhancement at level 3 for passive path', () => {
    const player = createTestPlayer({ level: 2, pathId: 'guardian' });
    player.progression.xp = player.progression.xpToNext;

    runProgressionSystem();

    expect(player.level).toBe(3);
    expect(player.pendingStanceEnhancement).toBeDefined();
    expect(player.pendingStanceEnhancement.ironChoice.tier).toBe(1);
    expect(player.pendingStanceEnhancement.retributionChoice.tier).toBe(1);
  });
});
```

**Step 2: Implement progression system changes**

The detailed implementation will modify `progression.ts` to:
1. Check path type after level-up
2. For active paths: determine if it's a power level (2,4,6,8) or upgrade level (3,5,7,9+)
3. For passive paths: always offer stance enhancement choice (levels 3-15)
4. Set appropriate pending choice flags

**Step 3-5: Implementation, test, commit**

This task will require significant implementation. See the actual progression.ts file for current structure.

---

## Phase 6: Input System - Handle Path Choices

### Task 6.1: Add Power Selection Command Handler

**Files:**
- Modify: `src/ecs/commands.ts`
- Modify: `src/ecs/systems/input.ts`

Add new commands:
```typescript
// In commands.ts
export const Commands = {
  // ... existing
  selectPower: (powerId: string) => ({ type: 'SELECT_POWER' as const, powerId }),
  upgradePower: (powerId: string) => ({ type: 'UPGRADE_POWER' as const, powerId }),
  selectStanceEnhancement: (stanceId: 'iron' | 'retribution') =>
    ({ type: 'SELECT_STANCE_ENHANCEMENT' as const, stanceId }),
};
```

---

## Phase 7: UI Components

### Task 7.1: Create Power Choice Popup

**Files:**
- Create: `src/components/game/PowerChoicePopup.tsx`

### Task 7.2: Create Upgrade Choice Popup

**Files:**
- Create: `src/components/game/UpgradeChoicePopup.tsx`

### Task 7.3: Create Stance Enhancement Popup

**Files:**
- Create: `src/components/game/StanceEnhancementPopup.tsx`

### Task 7.4: Update Game.tsx to Show New Popups

**Files:**
- Modify: `src/components/game/Game.tsx`

---

## Phase 8: Integration Testing

### Task 8.1: E2E Test - Berserker Power Progression

**Files:**
- Create: `e2e/berserker-progression.spec.ts`

Test full flow:
1. Create warrior, reach level 2
2. Select Berserker path
3. Choose first power (Rage Strike)
4. Level to 3, upgrade Rage Strike
5. Level to 4, choose second power
6. Verify powers in power bar

### Task 8.2: E2E Test - Guardian Stance Progression

**Files:**
- Create: `e2e/guardian-progression.spec.ts`

Test full flow:
1. Create warrior, reach level 2
2. Select Guardian path
3. Verify stances available, no powers
4. Level to 3, choose Iron enhancement
5. Level to 4, choose Retribution enhancement
6. Verify enhancements apply in correct stance

---

## Summary

**Total Tasks:** ~15 tasks across 8 phases
**Estimated Scope:** Medium-large feature

**Key Dependencies:**
- Phase 1 (stamina/generic powers) blocks Phase 2-3
- Phase 2-3 (data) blocks Phase 5-6
- Phase 4 (state tracking) blocks Phase 5-7
- Phase 5-6 (systems) blocks Phase 7
- Phase 7 (UI) blocks Phase 8

**Testing Strategy:**
- Unit tests for data definitions
- Unit tests for system logic
- E2E tests for full user flows

---

Plan complete and saved to `docs/plans/2026-01-06-warrior-path-progression-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
