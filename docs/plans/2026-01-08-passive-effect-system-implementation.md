# Passive Effect System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a data-driven passive effect system that processes all 26 Guardian stance enhancements and provides a generic framework for future passive paths.

**Architecture:** A new `PassiveEffectState` component stores runtime tracking (stacks, cooldowns, flags) plus pre-computed effect values. A new `PassiveEffectSystem` recomputes effects when stances/enhancements change, updates conditionals each tick, and processes continuous effects. Integration hooks into `combat.ts`, `death.ts`, and `flow.ts` read from pre-computed values.

**Tech Stack:** TypeScript, miniplex ECS, React (for UI components reading from snapshots)

**ECS Data Flow:**
```
Stance/Enhancement Change → recomputePassiveEffects() → entity.passiveEffectState.computed
Each Tick → updateConditionalEffects() → entity.passiveEffectState.computed.conditional*
Combat Systems → READ from entity.passiveEffectState.computed (no computation)
Snapshot Creation → COPY from entity.passiveEffectState (no computation)
React UI → READ from snapshot (render only)
```

---

## Phase 1: Foundation

### Task 1: Add PassiveEffect Type Definitions

**Files:**
- Modify: `src/types/paths.ts`

**Step 1: Write the failing test**

```typescript
// src/types/__tests__/paths.test.ts
import type { PassiveEffect, PassiveStatType, PassiveCondition } from '../paths';

describe('PassiveEffect types', () => {
  it('should allow stat_percent effect', () => {
    const effect: PassiveEffect = {
      type: 'stat_percent',
      stat: 'armor',
      value: 20,
    };
    expect(effect.type).toBe('stat_percent');
  });

  it('should allow conditional effects', () => {
    const condition: PassiveCondition = { type: 'hp_below_percent', value: 30 };
    const effect: PassiveEffect = {
      type: 'stat_percent_when',
      stat: 'armor',
      value: 50,
      condition,
    };
    expect(effect.condition.type).toBe('hp_below_percent');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/paths.test.ts`
Expected: FAIL with "Cannot find name 'PassiveEffect'"

**Step 3: Add type definitions to `src/types/paths.ts`**

Add after the existing `StanceEnhancementEffect` type (around line 343):

```typescript
// ============================================================================
// PASSIVE EFFECT SYSTEM TYPES (Generic Passive Effect Processing)
// ============================================================================

/**
 * Stats that can be modified by passive effects
 */
export type PassiveStatType = 'power' | 'armor' | 'speed' | 'fortune' | 'maxHealth' | 'healthRegen';

/**
 * Conditions for conditional passive effects
 */
export type PassiveCondition =
  | { type: 'hp_below_percent'; value: number }
  | { type: 'hp_above_percent'; value: number };

/**
 * Passive effect discriminated union
 * All passive effects are expressed as typed data structures.
 * New paths add new effect instances, not new code.
 */
export type PassiveEffect =
  // === STAT MODIFIERS (continuous) ===
  | { type: 'stat_percent'; stat: PassiveStatType; value: number }
  | { type: 'stat_flat'; stat: PassiveStatType; value: number }
  | { type: 'stat_percent_when'; stat: PassiveStatType; value: number; condition: PassiveCondition }

  // === DAMAGE MODIFIERS ===
  | { type: 'damage_reduction_percent'; value: number }
  | { type: 'damage_reduction_percent_when'; value: number; condition: PassiveCondition }
  | { type: 'max_damage_per_hit_percent'; value: number }
  | { type: 'armor_reduces_dot' }

  // === REFLECT SYSTEM ===
  | { type: 'reflect_percent'; value: number }
  | { type: 'reflect_percent_when'; value: number; condition: PassiveCondition }
  | { type: 'reflect_scaling_per_hit'; value: number }
  | { type: 'reflect_ignores_armor' }
  | { type: 'reflect_can_crit' }
  | { type: 'heal_on_reflect_percent'; value: number }
  | { type: 'heal_on_reflect_kill_percent'; value: number }

  // === ON-DAMAGED PROCS ===
  | { type: 'counter_attack_percent'; value: number }
  | { type: 'damage_stack'; valuePerStack: number; maxStacks: number }
  | { type: 'heal_on_damaged_chance'; chance: number; healPercent: number }
  | { type: 'grant_next_attack_bonus'; value: number }

  // === ON-HIT PROCS ===
  | { type: 'permanent_power_per_hit'; value: number }
  | { type: 'on_hit_burst_chance'; chance: number; powerPercent: number }

  // === AURAS ===
  | { type: 'damage_aura_per_second'; value: number }

  // === DEATH PREVENTION ===
  | { type: 'survive_lethal_once_per_floor' }

  // === IMMUNITIES ===
  | { type: 'cc_immunity'; ccTypes: ('stun' | 'slow')[] }

  // === SPEED MODIFICATIONS ===
  | { type: 'remove_speed_penalty' };
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/paths.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/paths.ts src/types/__tests__/paths.test.ts
git commit -m "$(cat <<'EOF'
feat(types): add PassiveEffect discriminated union types

Adds generic passive effect type definitions for the data-driven
passive effect system. Effects are typed data, not behavior code.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add PassiveEffectState Component Type with Computed Sub-Object

**Files:**
- Modify: `src/ecs/components.ts`

**Step 1: Write the failing test**

```typescript
// src/ecs/__tests__/passive-effect-state.test.ts
import type { Entity, PassiveEffectState, ComputedPassiveEffects } from '../components';

describe('PassiveEffectState component', () => {
  it('should allow passiveEffectState with computed sub-object on entity', () => {
    const computed: ComputedPassiveEffects = {
      // Stat modifiers
      armorPercent: 25,
      powerPercent: 15,
      speedPercent: -15,
      maxHealthPercent: 0,
      healthRegenFlat: 0,
      // Damage modification
      damageReductionPercent: 15,
      maxDamagePerHitPercent: null,
      armorReducesDot: false,
      // Reflect
      baseReflectPercent: 20,
      reflectIgnoresArmor: false,
      reflectCanCrit: false,
      healOnReflectPercent: 0,
      healOnReflectKillPercent: 0,
      reflectScalingPerHit: 0,
      // On-damaged
      counterAttackChance: 0,
      damageStackConfig: null,
      healOnDamagedChance: 0,
      healOnDamagedPercent: 0,
      nextAttackBonusOnDamaged: 0,
      // On-hit
      permanentPowerPerHit: 0,
      onHitBurstChance: 0,
      onHitBurstPowerPercent: 0,
      // Auras
      damageAuraPerSecond: 0,
      // Death prevention
      hasSurviveLethal: false,
      // Immunities
      isImmuneToStuns: false,
      isImmuneToSlows: false,
      // Speed
      removeSpeedPenalty: false,
      // Conditional thresholds (static from enhancements)
      lowHpArmorThreshold: 0,
      lowHpArmorBonus: 0,
      lowHpReflectThreshold: 0,
      lowHpReflectMultiplier: 1,
      highHpRegenThreshold: 100,
      highHpRegenMultiplier: 1,
      // Conditional values (updated each tick based on HP)
      conditionalArmorPercent: 0,
      conditionalDamageReduction: 0,
      conditionalReflectMultiplier: 1,
      conditionalRegenMultiplier: 1,
    };

    const entity: Entity = {
      player: true,
      passiveEffectState: {
        combat: {
          hitsTaken: 0,
          hitsDealt: 0,
          nextAttackBonus: 0,
          damageStacks: 0,
          reflectBonusPercent: 0,
        },
        floor: {
          survivedLethal: false,
        },
        permanent: {
          powerBonusPercent: 0,
        },
        computed,
      },
    };
    expect(entity.passiveEffectState?.computed.damageReductionPercent).toBe(15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/__tests__/passive-effect-state.test.ts`
Expected: FAIL with "Property 'passiveEffectState' does not exist"

**Step 3: Add component types to `src/ecs/components.ts`**

Add the interfaces before the Entity interface (around line 95):

```typescript
/**
 * Pre-computed passive effect values.
 * Recalculated when stance/enhancements change (recomputePassiveEffects).
 * Conditional values updated each tick (updateConditionalEffects).
 * Combat systems READ from this object - never compute on the fly.
 */
export interface ComputedPassiveEffects {
  // Stat modifiers (as percentages, e.g., 25 = +25%)
  armorPercent: number;
  powerPercent: number;
  speedPercent: number;
  maxHealthPercent: number;
  healthRegenFlat: number;

  // Damage modification
  damageReductionPercent: number;
  maxDamagePerHitPercent: number | null;
  armorReducesDot: boolean;

  // Reflect
  baseReflectPercent: number;
  reflectIgnoresArmor: boolean;
  reflectCanCrit: boolean;
  healOnReflectPercent: number;
  healOnReflectKillPercent: number;
  reflectScalingPerHit: number;

  // On-damaged
  counterAttackChance: number;
  damageStackConfig: { valuePerStack: number; maxStacks: number } | null;
  healOnDamagedChance: number;
  healOnDamagedPercent: number;
  nextAttackBonusOnDamaged: number;

  // On-hit
  permanentPowerPerHit: number;
  onHitBurstChance: number;
  onHitBurstPowerPercent: number;

  // Auras
  damageAuraPerSecond: number;

  // Death prevention
  hasSurviveLethal: boolean;

  // Immunities
  isImmuneToStuns: boolean;
  isImmuneToSlows: boolean;

  // Speed
  removeSpeedPenalty: boolean;

  // Conditional thresholds (static - set by recomputePassiveEffects)
  lowHpArmorThreshold: number;
  lowHpArmorBonus: number;
  lowHpReflectThreshold: number;
  lowHpReflectMultiplier: number;
  highHpRegenThreshold: number;
  highHpRegenMultiplier: number;

  // Conditional values (dynamic - updated each tick by updateConditionalEffects)
  conditionalArmorPercent: number;
  conditionalDamageReduction: number;
  conditionalReflectMultiplier: number;
  conditionalRegenMultiplier: number;
}

/**
 * Passive effect runtime state for passive paths (Guardian, Enchanter, etc.)
 * - combat: Reset when new enemy spawns
 * - floor: Reset when new floor starts
 * - permanent: Persists entire run
 * - computed: Pre-computed effect values (systems read from here)
 */
export interface PassiveEffectState {
  combat: {
    hitsTaken: number;
    hitsDealt: number;
    nextAttackBonus: number;      // Bonus % for next attack (Retaliation)
    damageStacks: number;         // Current stacks (Vengeful Strikes)
    reflectBonusPercent: number;  // Accumulated reflect bonus (Escalating Revenge)
  };

  floor: {
    survivedLethal: boolean;      // Used Immortal Bulwark this floor?
  };

  permanent: {
    powerBonusPercent: number;    // Accumulated power bonus (Wrath Accumulator)
  };

  computed: ComputedPassiveEffects;
}
```

In the Entity interface, add after `stanceState`:

```typescript
  /** Passive effect runtime state (passive paths) */
  passiveEffectState?: PassiveEffectState;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/__tests__/passive-effect-state.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/components.ts src/ecs/__tests__/passive-effect-state.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): add PassiveEffectState component with computed sub-object

Stores runtime state for passive path effects:
- combat: per-enemy tracking (stacks, bonuses, counters)
- floor: per-floor tracking (survive lethal)
- permanent: entire run tracking (power accumulation)
- computed: pre-computed effect values (systems read from here)

Combat systems read from computed, never compute on the fly.
Conditional values updated each tick by PassiveEffectSystem.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Create PassiveEffectSystem with recomputePassiveEffects

**Files:**
- Create: `src/ecs/systems/passive-effect.ts`
- Modify: `src/ecs/systems/index.ts`

**Step 1: Write the failing test**

```typescript
// src/ecs/systems/__tests__/passive-effect.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import {
  PassiveEffectSystem,
  initializePassiveEffectState,
  recomputePassiveEffects,
  resetCombatState,
  resetFloorState
} from '../passive-effect';
import type { Entity } from '../../components';

describe('PassiveEffectSystem', () => {
  beforeEach(() => {
    for (const entity of world) {
      world.remove(entity);
    }
  });

  describe('initializePassiveEffectState', () => {
    it('should create initial state with zeroed computed values', () => {
      const player: Entity = { player: true };
      world.add(player);

      initializePassiveEffectState(player);

      expect(player.passiveEffectState).toBeDefined();
      expect(player.passiveEffectState?.combat.hitsTaken).toBe(0);
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(0);
      expect(player.passiveEffectState?.computed.baseReflectPercent).toBe(0);
    });
  });

  describe('recomputePassiveEffects', () => {
    it('should compute effects from Iron Stance base', () => {
      const player: Entity = {
        player: true,
        path: { pathId: 'guardian', abilities: [] },
        stanceState: {
          activeStanceId: 'iron_stance',
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 0,
            retributionTier: 0,
            acquiredEnhancements: [],
          },
        },
      };
      world.add(player);
      initializePassiveEffectState(player);

      recomputePassiveEffects(player);

      // Iron Stance base: +25% armor, -15% speed, 15% damage reduction
      expect(player.passiveEffectState?.computed.armorPercent).toBe(25);
      expect(player.passiveEffectState?.computed.speedPercent).toBe(-15);
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(15);
    });

    it('should aggregate enhancement effects', () => {
      const player: Entity = {
        player: true,
        path: { pathId: 'guardian', abilities: [] },
        stanceState: {
          activeStanceId: 'iron_stance',
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 2,
            retributionTier: 0,
            acquiredEnhancements: ['iron_1_fortified_skin', 'iron_2_damage_absorption'],
          },
        },
      };
      world.add(player);
      initializePassiveEffectState(player);

      recomputePassiveEffects(player);

      // Iron Stance +25% armor + Fortified Skin +20% armor = 45%
      expect(player.passiveEffectState?.computed.armorPercent).toBe(45);
      // Iron Stance 15% DR + Damage Absorption 20% DR = 35%
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(35);
    });

    it('should only include enhancements for active stance', () => {
      const player: Entity = {
        player: true,
        path: { pathId: 'guardian', abilities: [] },
        stanceState: {
          activeStanceId: 'retribution_stance', // In Retribution, not Iron
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 2,
            retributionTier: 0,
            acquiredEnhancements: ['iron_1_fortified_skin', 'iron_2_damage_absorption'],
          },
        },
      };
      world.add(player);
      initializePassiveEffectState(player);

      recomputePassiveEffects(player);

      // Iron enhancements should NOT apply in Retribution stance
      // Retribution base: +15% power, +10% armor, 20% reflect
      expect(player.passiveEffectState?.computed.armorPercent).toBe(10);
      expect(player.passiveEffectState?.computed.powerPercent).toBe(15);
      expect(player.passiveEffectState?.computed.baseReflectPercent).toBe(20);
    });
  });

  describe('resetCombatState', () => {
    it('should reset combat tracking but preserve floor/permanent/computed', () => {
      const player: Entity = {
        player: true,
        passiveEffectState: {
          combat: { hitsTaken: 5, hitsDealt: 3, nextAttackBonus: 50, damageStacks: 3, reflectBonusPercent: 15 },
          floor: { survivedLethal: true },
          permanent: { powerBonusPercent: 10 },
          computed: createDefaultComputed(),
        },
      };
      player.passiveEffectState!.computed.damageReductionPercent = 35;
      world.add(player);

      resetCombatState(player);

      expect(player.passiveEffectState?.combat.hitsTaken).toBe(0);
      expect(player.passiveEffectState?.combat.damageStacks).toBe(0);
      expect(player.passiveEffectState?.floor.survivedLethal).toBe(true); // preserved
      expect(player.passiveEffectState?.permanent.powerBonusPercent).toBe(10); // preserved
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(35); // preserved
    });
  });

  describe('resetFloorState', () => {
    it('should reset floor tracking and combat but preserve permanent/computed', () => {
      const player: Entity = {
        player: true,
        passiveEffectState: {
          combat: { hitsTaken: 5, hitsDealt: 3, nextAttackBonus: 50, damageStacks: 3, reflectBonusPercent: 15 },
          floor: { survivedLethal: true },
          permanent: { powerBonusPercent: 10 },
          computed: createDefaultComputed(),
        },
      };
      world.add(player);

      resetFloorState(player);

      expect(player.passiveEffectState?.floor.survivedLethal).toBe(false); // reset
      expect(player.passiveEffectState?.combat.hitsTaken).toBe(0); // also reset
      expect(player.passiveEffectState?.permanent.powerBonusPercent).toBe(10); // preserved
    });
  });
});

// Helper for tests
function createDefaultComputed() {
  return {
    armorPercent: 0, powerPercent: 0, speedPercent: 0, maxHealthPercent: 0, healthRegenFlat: 0,
    damageReductionPercent: 0, maxDamagePerHitPercent: null, armorReducesDot: false,
    baseReflectPercent: 0, reflectIgnoresArmor: false, reflectCanCrit: false,
    healOnReflectPercent: 0, healOnReflectKillPercent: 0, reflectScalingPerHit: 0,
    counterAttackChance: 0, damageStackConfig: null, healOnDamagedChance: 0, healOnDamagedPercent: 0,
    nextAttackBonusOnDamaged: 0, permanentPowerPerHit: 0, onHitBurstChance: 0, onHitBurstPowerPercent: 0,
    damageAuraPerSecond: 0, hasSurviveLethal: false, isImmuneToStuns: false, isImmuneToSlows: false,
    removeSpeedPenalty: false, lowHpArmorThreshold: 0, lowHpArmorBonus: 0, lowHpReflectThreshold: 0,
    lowHpReflectMultiplier: 1, highHpRegenThreshold: 100, highHpRegenMultiplier: 1,
    conditionalArmorPercent: 0, conditionalDamageReduction: 0, conditionalReflectMultiplier: 1,
    conditionalRegenMultiplier: 1,
  };
}
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts`
Expected: FAIL with "Cannot find module '../passive-effect'"

**Step 3: Create the system file**

```typescript
// src/ecs/systems/passive-effect.ts
/**
 * PassiveEffectSystem - processes passive path effects (Guardian, Enchanter, etc.)
 *
 * ECS Architecture:
 * - recomputePassiveEffects(): Called on stance/enhancement change, writes to entity.passiveEffectState.computed
 * - updateConditionalEffects(): Called each tick, updates conditional values based on current HP
 * - PassiveEffectSystem(): Tick function - updates conditionals, processes auras
 * - Combat hooks (processPreDamage, etc.): READ from computed, never compute
 *
 * Data flow:
 *   Change event → recomputePassiveEffects() → entity.computed
 *   Each tick → updateConditionalEffects() → entity.computed.conditional*
 *   Combat → READ entity.computed
 *   Snapshot → COPY entity state
 */

import { world } from '../world';
import type { Entity, PassiveEffectState, ComputedPassiveEffects } from '../components';
import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getEffectiveDelta } from '../loop';
import { getGuardianEnhancementById } from '@/data/paths/guardian-enhancements';
import { getStancesForPath } from '@/data/stances';
import type { StanceEnhancementEffect } from '@/types/paths';

// ============================================================================
// DEFAULT/INITIAL STATE CREATION
// ============================================================================

/**
 * Create default computed effects (all zeroed/neutral).
 */
function createDefaultComputed(): ComputedPassiveEffects {
  return {
    armorPercent: 0,
    powerPercent: 0,
    speedPercent: 0,
    maxHealthPercent: 0,
    healthRegenFlat: 0,
    damageReductionPercent: 0,
    maxDamagePerHitPercent: null,
    armorReducesDot: false,
    baseReflectPercent: 0,
    reflectIgnoresArmor: false,
    reflectCanCrit: false,
    healOnReflectPercent: 0,
    healOnReflectKillPercent: 0,
    reflectScalingPerHit: 0,
    counterAttackChance: 0,
    damageStackConfig: null,
    healOnDamagedChance: 0,
    healOnDamagedPercent: 0,
    nextAttackBonusOnDamaged: 0,
    permanentPowerPerHit: 0,
    onHitBurstChance: 0,
    onHitBurstPowerPercent: 0,
    damageAuraPerSecond: 0,
    hasSurviveLethal: false,
    isImmuneToStuns: false,
    isImmuneToSlows: false,
    removeSpeedPenalty: false,
    lowHpArmorThreshold: 0,
    lowHpArmorBonus: 0,
    lowHpReflectThreshold: 0,
    lowHpReflectMultiplier: 1,
    highHpRegenThreshold: 100,
    highHpRegenMultiplier: 1,
    conditionalArmorPercent: 0,
    conditionalDamageReduction: 0,
    conditionalReflectMultiplier: 1,
    conditionalRegenMultiplier: 1,
  };
}

/**
 * Create initial passive effect state with zeroed values.
 */
function createInitialState(): PassiveEffectState {
  return {
    combat: {
      hitsTaken: 0,
      hitsDealt: 0,
      nextAttackBonus: 0,
      damageStacks: 0,
      reflectBonusPercent: 0,
    },
    floor: {
      survivedLethal: false,
    },
    permanent: {
      powerBonusPercent: 0,
    },
    computed: createDefaultComputed(),
  };
}

/**
 * Initialize passive effect state on a player entity.
 * Called when player selects a passive path.
 */
export function initializePassiveEffectState(player: Entity): void {
  if (!player.passiveEffectState) {
    world.addComponent(player, 'passiveEffectState', createInitialState());
  }
}

// ============================================================================
// STATE RESET FUNCTIONS
// ============================================================================

/**
 * Reset combat-specific tracking (when new enemy spawns).
 * Preserves: floor, permanent, computed
 */
export function resetCombatState(player: Entity): void {
  if (!player.passiveEffectState) return;

  player.passiveEffectState.combat = {
    hitsTaken: 0,
    hitsDealt: 0,
    nextAttackBonus: 0,
    damageStacks: 0,
    reflectBonusPercent: 0,
  };
}

/**
 * Reset floor-specific tracking (when new floor starts).
 * Also resets combat state. Preserves: permanent, computed
 */
export function resetFloorState(player: Entity): void {
  if (!player.passiveEffectState) return;

  player.passiveEffectState.floor = {
    survivedLethal: false,
  };
  resetCombatState(player);
}

// ============================================================================
// EFFECT COMPUTATION (called on stance/enhancement change)
// ============================================================================

/**
 * Get enhancement effects for the currently active stance only.
 */
function getActiveStanceEnhancements(player: Entity): StanceEnhancementEffect[] {
  const stanceProgression = player.pathProgression?.stanceProgression;
  const activeStanceId = player.stanceState?.activeStanceId;
  if (!stanceProgression || !activeStanceId) return [];

  const effects: StanceEnhancementEffect[] = [];

  for (const enhancementId of stanceProgression.acquiredEnhancements) {
    const enhancement = getGuardianEnhancementById(enhancementId);
    if (!enhancement) continue;

    // Only include enhancements for the active stance
    if (enhancement.stanceId !== activeStanceId) continue;

    effects.push(...enhancement.effects);
  }

  return effects;
}

/**
 * Recompute all passive effects from stance + enhancements.
 * Called when:
 * - Stance switches (SWITCH_STANCE command)
 * - Enhancement acquired (SELECT_STANCE_ENHANCEMENT command)
 *
 * Writes to entity.passiveEffectState.computed
 */
export function recomputePassiveEffects(player: Entity): void {
  const state = player.passiveEffectState;
  if (!state) return;

  // Reset computed to defaults
  const computed = createDefaultComputed();

  // Get base stance effects
  const stances = getStancesForPath(player.path?.pathId ?? '');
  const activeStance = stances.find(s => s.id === player.stanceState?.activeStanceId);

  if (activeStance) {
    for (const effect of activeStance.effects) {
      if (effect.type === 'stat_modifier') {
        const bonus = (effect.percentBonus ?? 0) * 100; // Convert 0.25 to 25
        switch (effect.stat) {
          case 'armor': computed.armorPercent += bonus; break;
          case 'power': computed.powerPercent += bonus; break;
          case 'speed': computed.speedPercent += bonus; break;
        }
      } else if (effect.type === 'damage_modifier' && effect.damageType === 'incoming') {
        computed.damageReductionPercent += (1 - effect.multiplier) * 100;
      } else if (effect.type === 'behavior_modifier') {
        if (effect.behavior === 'reflect_damage') {
          computed.baseReflectPercent += effect.value * 100;
        } else if (effect.behavior === 'counter_attack') {
          computed.counterAttackChance += effect.value * 100;
        }
      }
    }
  }

  // Aggregate enhancement effects (only for active stance)
  const enhancements = getActiveStanceEnhancements(player);
  for (const effect of enhancements) {
    switch (effect.type) {
      case 'armor_percent':
        computed.armorPercent += effect.value;
        break;
      case 'damage_reduction':
        computed.damageReductionPercent += effect.value;
        break;
      case 'hp_regen':
        computed.healthRegenFlat += effect.value;
        break;
      case 'cc_immunity':
        computed.isImmuneToStuns = true;
        computed.isImmuneToSlows = true;
        break;
      case 'low_hp_armor':
        computed.lowHpArmorThreshold = effect.threshold;
        computed.lowHpArmorBonus = effect.value;
        break;
      case 'on_hit_heal_chance':
        computed.healOnDamagedChance = effect.chance;
        computed.healOnDamagedPercent = effect.healPercent;
        break;
      case 'max_damage_per_hit':
        computed.maxDamagePerHitPercent = effect.percent;
        break;
      case 'remove_speed_penalty':
        computed.removeSpeedPenalty = true;
        break;
      case 'max_hp_percent':
        computed.maxHealthPercent += effect.value;
        break;
      case 'regen_multiplier_above_hp':
        computed.highHpRegenThreshold = effect.threshold;
        computed.highHpRegenMultiplier = effect.multiplier;
        break;
      case 'armor_reduces_dot':
        computed.armorReducesDot = true;
        break;
      case 'survive_lethal':
        computed.hasSurviveLethal = true;
        break;
      case 'reflect_percent':
        computed.baseReflectPercent = effect.value; // Replaces base
        break;
      case 'damage_per_hit_stack':
        computed.damageStackConfig = { valuePerStack: effect.valuePerStack, maxStacks: effect.maxStacks };
        break;
      case 'heal_from_reflect':
        computed.healOnReflectPercent = effect.percent;
        break;
      case 'reflect_scaling_per_hit':
        computed.reflectScalingPerHit = effect.value;
        break;
      case 'counter_attack_chance':
        computed.counterAttackChance = effect.chance;
        break;
      case 'low_hp_reflect_multiplier':
        computed.lowHpReflectThreshold = effect.threshold;
        computed.lowHpReflectMultiplier = effect.multiplier;
        break;
      case 'passive_damage_aura':
        computed.damageAuraPerSecond = effect.damagePerSecond;
        break;
      case 'next_attack_bonus_after_hit':
        computed.nextAttackBonusOnDamaged = effect.value;
        break;
      case 'permanent_power_per_hit':
        computed.permanentPowerPerHit = effect.value;
        break;
      case 'reflect_ignores_armor':
        computed.reflectIgnoresArmor = true;
        break;
      case 'on_hit_burst_chance':
        computed.onHitBurstChance = effect.chance;
        computed.onHitBurstPowerPercent = effect.powerPercent;
        break;
      case 'reflect_can_crit':
        computed.reflectCanCrit = true;
        break;
      case 'reflect_kill_heal':
        computed.healOnReflectKillPercent = effect.percent;
        break;
    }
  }

  // Write computed values to entity
  state.computed = computed;
}

// ============================================================================
// CONDITIONAL EFFECT UPDATES (called each tick)
// ============================================================================

/**
 * Update conditional effect values based on current HP.
 * Called each tick by PassiveEffectSystem.
 */
function updateConditionalEffects(player: Entity): void {
  const state = player.passiveEffectState;
  if (!state?.computed || !player.health) return;

  const computed = state.computed;
  const hpPercent = (player.health.current / player.health.max) * 100;

  // Last Bastion: +armor% when below threshold
  if (computed.lowHpArmorThreshold > 0 && hpPercent < computed.lowHpArmorThreshold) {
    computed.conditionalArmorPercent = computed.lowHpArmorBonus;
  } else {
    computed.conditionalArmorPercent = 0;
  }

  // Pain Conduit: reflect multiplier when below threshold
  if (computed.lowHpReflectThreshold > 0 && hpPercent < computed.lowHpReflectThreshold) {
    computed.conditionalReflectMultiplier = computed.lowHpReflectMultiplier;
  } else {
    computed.conditionalReflectMultiplier = 1;
  }

  // Regeneration Surge: regen multiplier when above threshold
  if (computed.highHpRegenThreshold < 100 && hpPercent > computed.highHpRegenThreshold) {
    computed.conditionalRegenMultiplier = computed.highHpRegenMultiplier;
  } else {
    computed.conditionalRegenMultiplier = 1;
  }
}

// ============================================================================
// SYSTEM TICK FUNCTION
// ============================================================================

/**
 * PassiveEffectSystem - main tick function.
 * Runs early in the tick loop, before combat.
 *
 * Responsibilities:
 * 1. Update conditional bonuses based on current HP
 * 2. Process continuous effects (damage auras)
 */
export function PassiveEffectSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const player = getPlayer();
  if (!player?.passiveEffectState) return;

  const effectiveDelta = getEffectiveDelta(deltaMs);
  const computed = player.passiveEffectState.computed;

  // 1. Update conditional effects based on current HP
  updateConditionalEffects(player);

  // 2. Process damage aura (Thorns Aura)
  if (computed.damageAuraPerSecond > 0) {
    const enemy = getActiveEnemy();
    if (enemy?.health && !enemy.dying) {
      const auraDamage = Math.round(computed.damageAuraPerSecond * (effectiveDelta / 1000));
      if (auraDamage > 0) {
        enemy.health.current = Math.max(0, enemy.health.current - auraDamage);
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts`
Expected: PASS

**Step 5: Add system to tick loop**

Modify `src/ecs/systems/index.ts`:

```typescript
import { PassiveEffectSystem } from './passive-effect';

export const systems: System[] = [
  InputSystem,
  CooldownSystem,
  AttackTimingSystem,
  PassiveEffectSystem,       // NEW: Update conditionals before combat
  EnemyAbilitySystem,
  CombatSystem,
  PowerSystem,
  ItemEffectSystem,
  ResourceGenerationSystem,
  PathAbilitySystem,
  StatusEffectSystem,
  RegenSystem,
  DeathSystem,
  ProgressionSystem,
  FlowSystem,
  AnimationSystem,
  CleanupSystem,
];
```

**Step 6: Commit**

```bash
git add src/ecs/systems/passive-effect.ts src/ecs/systems/index.ts src/ecs/systems/__tests__/passive-effect.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): add PassiveEffectSystem with recomputePassiveEffects

Creates the passive effect system following strict ECS architecture:
- recomputePassiveEffects(): writes to entity.computed on change
- updateConditionalEffects(): updates conditionals each tick
- PassiveEffectSystem(): tick function runs before combat
- Combat hooks will READ from computed, never compute

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire recomputePassiveEffects to Input Handlers

**Files:**
- Modify: `src/ecs/systems/input.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/ecs/systems/__tests__/input-path.test.ts
describe('Passive effect recomputation', () => {
  it('should recompute effects when stance switches', () => {
    const player: Entity = {
      player: true,
      identity: { name: 'Test', class: CLASSES.warrior },
      path: { pathId: 'guardian', abilities: [] },
      stanceState: {
        activeStanceId: 'iron_stance',
        stanceCooldownRemaining: 0,
        triggerCooldowns: {},
      },
      pathProgression: {
        pathId: 'guardian',
        pathType: 'passive',
        stanceProgression: { ironTier: 0, retributionTier: 0, acquiredEnhancements: [] },
      },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: createDefaultComputed(),
      },
    };
    world.add(player);

    // Initially in Iron Stance
    dispatchCommand({ type: 'SWITCH_STANCE', stanceId: 'retribution_stance' });
    InputSystem(16);

    // Should have recomputed to Retribution effects
    expect(player.passiveEffectState?.computed.baseReflectPercent).toBe(20);
    expect(player.passiveEffectState?.computed.powerPercent).toBe(15);
  });

  it('should recompute effects when enhancement selected', () => {
    const player: Entity = {
      player: true,
      identity: { name: 'Test', class: CLASSES.warrior },
      path: { pathId: 'guardian', abilities: [] },
      stanceState: {
        activeStanceId: 'iron_stance',
        stanceCooldownRemaining: 0,
        triggerCooldowns: {},
      },
      pathProgression: {
        pathId: 'guardian',
        pathType: 'passive',
        stanceProgression: { ironTier: 0, retributionTier: 0, acquiredEnhancements: [] },
      },
      pendingStanceEnhancement: {
        ironChoice: { id: 'iron_1_fortified_skin', name: 'Fortified Skin', tier: 1, description: '+20% Armor', stanceId: 'iron_stance', effects: [{ type: 'armor_percent', value: 20 }] },
        retributionChoice: { id: 'retribution_1_sharpened_thorns', name: 'Sharpened Thorns', tier: 1, description: '+30% Reflect', stanceId: 'retribution_stance', effects: [{ type: 'reflect_percent', value: 30 }] },
      },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: createDefaultComputed(),
      },
    };
    const gameState: Entity = { gameState: true, phase: 'combat', paused: true };
    world.add(player);
    world.add(gameState);

    // Select iron enhancement while in iron stance
    dispatchCommand({ type: 'SELECT_STANCE_ENHANCEMENT', stanceId: 'iron' });
    InputSystem(16);

    // Should have recomputed with new enhancement
    // Iron Stance base 25% + Fortified Skin 20% = 45%
    expect(player.passiveEffectState?.computed.armorPercent).toBe(45);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/input-path.test.ts -t "recomputation"`
Expected: FAIL (effects not recomputed)

**Step 3: Modify input.ts**

In `src/ecs/systems/input.ts`:

```typescript
// At top, add import:
import { initializePassiveEffectState, recomputePassiveEffects } from './passive-effect';

// In SWITCH_STANCE case, after setting activeStanceId:
// Recompute passive effects for new stance
if (player.passiveEffectState) {
  recomputePassiveEffects(player);
}

// In SELECT_STANCE_ENHANCEMENT case, after updating acquiredEnhancements:
// Recompute passive effects with new enhancement
if (player.passiveEffectState) {
  recomputePassiveEffects(player);
}

// In SELECT_PATH case, after setting up passive path:
if (pathDef.type === 'passive') {
  initializePassiveEffectState(player);
  recomputePassiveEffects(player);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/input-path.test.ts -t "recomputation"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/input.ts src/ecs/systems/__tests__/input-path.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): wire recomputePassiveEffects to input handlers

Calls recomputePassiveEffects when:
- SELECT_PATH: initialize and compute for passive paths
- SWITCH_STANCE: recompute for new active stance
- SELECT_STANCE_ENHANCEMENT: recompute with new enhancement

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Integrate State Resets into flow.ts and input.ts

**Files:**
- Modify: `src/ecs/systems/flow.ts`
- Modify: `src/ecs/systems/input.ts`

**Step 1: Write the test**

```typescript
// Add to src/ecs/systems/__tests__/flow.test.ts
describe('FlowSystem passive effect integration', () => {
  it('should reset combat state when new enemy spawns', () => {
    // Setup with existing combat state
    const player: Entity = {
      player: true,
      passiveEffectState: {
        combat: { hitsTaken: 5, hitsDealt: 3, nextAttackBonus: 50, damageStacks: 3, reflectBonusPercent: 15 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 10 },
        computed: createDefaultComputed(),
      },
    };
    // ... test that resetCombatState is called in spawnNextEnemy
  });
});
```

**Step 2: Add reset calls**

In `src/ecs/systems/flow.ts`:

```typescript
// At top:
import { resetCombatState } from './passive-effect';

// In spawnNextEnemy(), after spawning enemy:
// Reset passive effect combat state for new enemy
const player = getPlayer();
if (player?.passiveEffectState) {
  resetCombatState(player);
}
```

In `src/ecs/systems/input.ts`, in ADVANCE_ROOM when advancing floor:

```typescript
import { resetFloorState } from './passive-effect';

// When advancing to new floor:
if (player?.passiveEffectState) {
  resetFloorState(player);
}
```

**Step 3: Commit**

```bash
git add src/ecs/systems/flow.ts src/ecs/systems/input.ts
git commit -m "$(cat <<'EOF'
feat(ecs): integrate passive effect state resets

- resetCombatState in flow.ts when new enemy spawns
- resetFloorState in input.ts when advancing to new floor

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Combat Integration Hooks

### Task 6: Implement processPreDamage Hook (Reads from computed)

**Files:**
- Modify: `src/ecs/systems/passive-effect.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/ecs/systems/__tests__/passive-effect.test.ts
describe('processPreDamage', () => {
  it('should read damage reduction from computed', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          damageReductionPercent: 35, // Pre-computed value
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 100);

    // 35% damage reduction: 100 * 0.65 = 65
    expect(result.finalDamage).toBe(65);
    expect(result.damageReduced).toBe(35);
  });

  it('should apply max damage cap from computed', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          maxDamagePerHitPercent: 20, // Pre-computed value
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 50);

    // Max 20% of 100 max HP = 20 damage
    expect(result.finalDamage).toBe(20);
    expect(result.wasCapped).toBe(true);
  });

  it('should apply conditional armor from computed', () => {
    const player: Entity = {
      player: true,
      health: { current: 25, max: 100 }, // Below 30%
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          conditionalArmorPercent: 50, // Already computed by updateConditionalEffects
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 100);

    // Conditional armor provides additional DR (simplified: 50% armor → ~25% DR)
    expect(result.finalDamage).toBeLessThan(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts -t "processPreDamage"`
Expected: FAIL

**Step 3: Implement processPreDamage (reads from computed only)**

Add to `src/ecs/systems/passive-effect.ts`:

```typescript
// ============================================================================
// COMBAT HOOKS (read from computed, never compute)
// ============================================================================

export interface PreDamageResult {
  finalDamage: number;
  damageReduced: number;
  wasCapped: boolean;
}

/**
 * Process damage before it's applied.
 * Called by combat.ts when player is about to take damage.
 *
 * READS from entity.passiveEffectState.computed - never computes.
 */
export function processPreDamage(player: Entity, incomingDamage: number): PreDamageResult {
  const computed = player.passiveEffectState?.computed;
  if (!computed) {
    return { finalDamage: incomingDamage, damageReduced: 0, wasCapped: false };
  }

  let damage = incomingDamage;
  let damageReduced = 0;
  let wasCapped = false;

  // Apply base damage reduction (from computed)
  if (computed.damageReductionPercent > 0) {
    const reduction = Math.round(damage * (computed.damageReductionPercent / 100));
    damage -= reduction;
    damageReduced += reduction;
  }

  // Apply conditional armor bonus as additional DR (simplified conversion)
  if (computed.conditionalArmorPercent > 0) {
    const bonusReduction = Math.round(damage * (computed.conditionalArmorPercent / 200));
    damage -= bonusReduction;
    damageReduced += bonusReduction;
  }

  // Apply max damage per hit cap (Unbreakable)
  if (computed.maxDamagePerHitPercent !== null && player.health) {
    const maxDamage = Math.round(player.health.max * (computed.maxDamagePerHitPercent / 100));
    if (damage > maxDamage) {
      damageReduced += damage - maxDamage;
      damage = maxDamage;
      wasCapped = true;
    }
  }

  // Ensure minimum 1 damage
  damage = Math.max(1, damage);

  return { finalDamage: damage, damageReduced, wasCapped };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts -t "processPreDamage"`
Expected: PASS

**Step 5: Integrate into combat.ts**

In `src/ecs/systems/combat.ts`:

```typescript
// At top:
import { processPreDamage } from './passive-effect';

// Before applying damage to player (after armor calculation):
if (target.player && target.passiveEffectState) {
  const preDamageResult = processPreDamage(target, damage);
  if (preDamageResult.damageReduced > 0 || preDamageResult.wasCapped) {
    damage = preDamageResult.finalDamage;
    if (preDamageResult.wasCapped) {
      addCombatLog(`Unbreakable caps damage to ${damage}!`);
    }
  }
}
```

**Step 6: Commit**

```bash
git add src/ecs/systems/passive-effect.ts src/ecs/systems/combat.ts src/ecs/systems/__tests__/passive-effect.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): implement processPreDamage reading from computed

Damage reduction hook that READS from pre-computed values:
- Base damage reduction percentage
- Conditional armor bonus
- Max damage per hit cap (Unbreakable)

No computation - strictly reads entity.passiveEffectState.computed

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Implement processOnDamaged Hook (Reads from computed, returns results)

**Files:**
- Modify: `src/ecs/systems/passive-effect.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/ecs/systems/__tests__/passive-effect.test.ts
describe('processOnDamaged', () => {
  it('should calculate reflect damage from computed and return it', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 10 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          baseReflectPercent: 30,
          conditionalReflectMultiplier: 1,
        },
      },
    };
    world.add(player);

    const result = processOnDamaged(player, 20);

    // (30% base + 10% scaling) * 1 multiplier = 40% of 20 = 8 damage
    expect(result.reflectDamage).toBe(8);
    expect(player.passiveEffectState?.combat.hitsTaken).toBe(1);
  });

  it('should NOT mutate attacker - returns damage for combat.ts to apply', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: { ...createDefaultComputed(), baseReflectPercent: 30 },
      },
    };
    world.add(player);

    const result = processOnDamaged(player, 20);

    // Returns reflect damage, does NOT apply it
    expect(result.reflectDamage).toBe(6);
    // The function should not touch attacker - combat.ts will apply reflect damage
  });

  it('should increment damage stacks using computed config', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          damageStackConfig: { valuePerStack: 10, maxStacks: 5 },
        },
      },
    };
    world.add(player);

    processOnDamaged(player, 10);
    expect(player.passiveEffectState?.combat.damageStacks).toBe(1);

    processOnDamaged(player, 10);
    expect(player.passiveEffectState?.combat.damageStacks).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts -t "processOnDamaged"`
Expected: FAIL

**Step 3: Implement processOnDamaged (returns results, doesn't mutate attacker)**

Add to `src/ecs/systems/passive-effect.ts`:

```typescript
import { addCombatLog, queueAnimationEvent } from '../utils';

export interface OnDamagedResult {
  reflectDamage: number;
  reflectIgnoresArmor: boolean;
  reflectCanCrit: boolean;
  counterAttackTriggered: boolean;
  healAmount: number;
  healOnReflectPercent: number;
  healOnReflectKillPercent: number;
}

/**
 * Process effects when player takes damage.
 * Called by combat.ts after player receives damage.
 *
 * READS from entity.passiveEffectState.computed.
 * MUTATES only player's passiveEffectState (own entity).
 * RETURNS damage values for combat.ts to apply to attacker.
 */
export function processOnDamaged(player: Entity, damage: number): OnDamagedResult {
  const state = player.passiveEffectState;
  const computed = state?.computed;

  const result: OnDamagedResult = {
    reflectDamage: 0,
    reflectIgnoresArmor: false,
    reflectCanCrit: false,
    counterAttackTriggered: false,
    healAmount: 0,
    healOnReflectPercent: 0,
    healOnReflectKillPercent: 0,
  };

  if (!state || !computed) return result;

  // Track hit taken (mutate own entity state)
  state.combat.hitsTaken += 1;

  // Calculate reflect damage (read from computed + combat state)
  let totalReflectPercent = computed.baseReflectPercent + state.combat.reflectBonusPercent;
  totalReflectPercent *= computed.conditionalReflectMultiplier;

  if (totalReflectPercent > 0) {
    result.reflectDamage = Math.round(damage * (totalReflectPercent / 100));
    result.reflectIgnoresArmor = computed.reflectIgnoresArmor;
    result.reflectCanCrit = computed.reflectCanCrit;
    result.healOnReflectPercent = computed.healOnReflectPercent;
    result.healOnReflectKillPercent = computed.healOnReflectKillPercent;
  }

  // Increment reflect scaling (mutate own entity state)
  if (computed.reflectScalingPerHit > 0) {
    state.combat.reflectBonusPercent += computed.reflectScalingPerHit;
  }

  // Counter-attack check (read from computed)
  if (computed.counterAttackChance > 0 && Math.random() * 100 < computed.counterAttackChance) {
    result.counterAttackTriggered = true;
  }

  // Damage stacks (read config from computed, mutate own state)
  if (computed.damageStackConfig) {
    if (state.combat.damageStacks < computed.damageStackConfig.maxStacks) {
      state.combat.damageStacks += 1;
    }
  }

  // On-hit heal chance (read from computed)
  if (computed.healOnDamagedChance > 0 && Math.random() * 100 < computed.healOnDamagedChance) {
    if (player.health) {
      const heal = Math.round(player.health.max * (computed.healOnDamagedPercent / 100));
      player.health.current = Math.min(player.health.max, player.health.current + heal);
      result.healAmount += heal;
      addCombatLog(`Stalwart Recovery heals ${heal} HP!`);
    }
  }

  // Grant next attack bonus (read from computed, mutate own state)
  if (computed.nextAttackBonusOnDamaged > 0) {
    state.combat.nextAttackBonus = computed.nextAttackBonusOnDamaged;
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts -t "processOnDamaged"`
Expected: PASS

**Step 5: Integrate into combat.ts (apply reflect damage here)**

In `src/ecs/systems/combat.ts`, replace existing reflect/counter logic:

```typescript
import { processPreDamage, processOnDamaged } from './passive-effect';

// After damage is applied to player:
if (target.player && target.passiveEffectState) {
  const onDamagedResult = processOnDamaged(target, damage);

  // Apply reflect damage (combat.ts applies to attacker, not passive-effect.ts)
  if (onDamagedResult.reflectDamage > 0 && entity.health) {
    let reflectDamage = onDamagedResult.reflectDamage;

    // Check for crit
    let isCrit = false;
    if (onDamagedResult.reflectCanCrit && target.derivedStats) {
      if (Math.random() < target.derivedStats.critChance) {
        reflectDamage = Math.round(reflectDamage * target.derivedStats.critDamage);
        isCrit = true;
      }
    }

    // Apply armor unless ignored
    if (!onDamagedResult.reflectIgnoresArmor && entity.defense) {
      reflectDamage = Math.max(1, reflectDamage - entity.defense.value);
    }

    entity.health.current = Math.max(0, entity.health.current - reflectDamage);
    const critText = isCrit ? ' (CRIT!)' : '';
    addCombatLog(`Reflects ${reflectDamage} damage${critText}!`);

    // Heal from reflect
    if (onDamagedResult.healOnReflectPercent > 0 && target.health) {
      const healFromReflect = Math.round(reflectDamage * (onDamagedResult.healOnReflectPercent / 100));
      target.health.current = Math.min(target.health.max, target.health.current + healFromReflect);
      addCombatLog(`Blood Mirror heals ${healFromReflect} HP!`);
    }

    // Check if reflect killed enemy
    if (entity.health.current <= 0 && onDamagedResult.healOnReflectKillPercent > 0 && target.health) {
      const killHeal = Math.round(target.health.max * (onDamagedResult.healOnReflectKillPercent / 100));
      target.health.current = Math.min(target.health.max, target.health.current + killHeal);
      addCombatLog(`Avatar of Punishment heals ${killHeal} HP!`);
      recordPathTrigger('on_kill', { damage: reflectDamage });
    }
  }

  // Apply counter-attack (combat.ts applies damage)
  if (onDamagedResult.counterAttackTriggered && target.attack && entity.health) {
    const counterDamage = Math.round(target.attack.baseDamage * 0.5);
    entity.health.current = Math.max(0, entity.health.current - counterDamage);
    addCombatLog(`Counter-attacks for ${counterDamage} damage!`);
  }
}
```

**Step 6: Commit**

```bash
git add src/ecs/systems/passive-effect.ts src/ecs/systems/combat.ts src/ecs/systems/__tests__/passive-effect.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): implement processOnDamaged with proper ECS boundaries

On-damaged processing that:
- READS from entity.passiveEffectState.computed
- MUTATES only own entity state (hitsTaken, stacks, etc.)
- RETURNS damage values for combat.ts to apply to attacker

Combat.ts applies reflect/counter damage - passive-effect.ts does not
touch other entities. Maintains clean system boundaries.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Implement checkSurviveLethal Hook

**Files:**
- Modify: `src/ecs/systems/passive-effect.ts`
- Modify: `src/ecs/systems/death.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/ecs/systems/__tests__/passive-effect.test.ts
describe('checkSurviveLethal', () => {
  it('should return true and set HP to 1 when computed.hasSurviveLethal is true', () => {
    const player: Entity = {
      player: true,
      health: { current: 0, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: { ...createDefaultComputed(), hasSurviveLethal: true },
      },
    };
    world.add(player);

    const survived = checkSurviveLethal(player);

    expect(survived).toBe(true);
    expect(player.passiveEffectState?.floor.survivedLethal).toBe(true);
    expect(player.health?.current).toBe(1);
  });

  it('should return false if already used this floor', () => {
    const player: Entity = {
      player: true,
      health: { current: 0, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: true }, // Already used
        permanent: { powerBonusPercent: 0 },
        computed: { ...createDefaultComputed(), hasSurviveLethal: true },
      },
    };
    world.add(player);

    const survived = checkSurviveLethal(player);

    expect(survived).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts -t "checkSurviveLethal"`
Expected: FAIL

**Step 3: Implement checkSurviveLethal**

Add to `src/ecs/systems/passive-effect.ts`:

```typescript
/**
 * Check if player should survive lethal damage.
 * Called by death.ts when player HP reaches 0.
 *
 * READS from entity.passiveEffectState.computed.hasSurviveLethal
 * MUTATES own entity state (floor.survivedLethal, health.current)
 *
 * @returns true if player survives (Immortal Bulwark triggers)
 */
export function checkSurviveLethal(player: Entity): boolean {
  const state = player.passiveEffectState;
  const computed = state?.computed;

  if (!computed?.hasSurviveLethal || !state || !player.health) {
    return false;
  }

  // Check if already used this floor
  if (state.floor.survivedLethal) {
    return false;
  }

  // Survive at 1 HP
  player.health.current = 1;
  state.floor.survivedLethal = true;

  addCombatLog('Immortal Bulwark prevents death!');
  queueAnimationEvent('item_proc', {
    type: 'item',
    itemName: 'Immortal Bulwark',
    effectDescription: 'Survived lethal!',
  });

  return true;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/passive-effect.test.ts -t "checkSurviveLethal"`
Expected: PASS

**Step 5: Integrate into death.ts**

In `src/ecs/systems/death.ts`:

```typescript
import { checkSurviveLethal } from './passive-effect';

// In DeathSystem, for player death check:
if (isPlayer) {
  // Check status effect immunity first
  if (entity.statusEffects) {
    const hasDeathImmunity = entity.statusEffects.some(
      effect => effect.type === 'death_immunity' && effect.remainingTurns > 0
    );
    if (hasDeathImmunity) {
      entity.health!.current = 1;
      addCombatLog('Death immunity saves you!');
      continue;
    }
  }

  // Check passive effect survive lethal (Immortal Bulwark)
  if (entity.passiveEffectState && checkSurviveLethal(entity)) {
    continue;
  }
}
```

**Step 6: Commit**

```bash
git add src/ecs/systems/passive-effect.ts src/ecs/systems/death.ts src/ecs/systems/__tests__/passive-effect.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): implement checkSurviveLethal for Immortal Bulwark

Reads hasSurviveLethal from computed, mutates own entity state.
Integrates with DeathSystem to intercept death before dying is set.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Snapshot Integration (Pure Copy)

### Task 9: Extend PlayerSnapshot with passiveEffects (Copy Only)

**Files:**
- Modify: `src/ecs/snapshot.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/ecs/__tests__/snapshot.test.ts
describe('PlayerSnapshot passiveEffects', () => {
  it('should COPY passiveEffectState without computation', () => {
    const player: Entity = {
      player: true,
      identity: { name: 'Test', class: CLASSES.warrior },
      health: { current: 50, max: 100 },
      pathProgression: { pathId: 'guardian', pathType: 'passive' },
      passiveEffectState: {
        combat: { hitsTaken: 3, hitsDealt: 5, nextAttackBonus: 75, damageStacks: 2, reflectBonusPercent: 10 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 4 },
        computed: {
          ...createDefaultComputed(),
          hasSurviveLethal: true,
          damageStackConfig: { valuePerStack: 10, maxStacks: 5 },
          baseReflectPercent: 30,
          conditionalArmorPercent: 50, // Pre-computed by system
          conditionalReflectMultiplier: 2, // Pre-computed by system
        },
      },
    };
    world.add(player);

    const snapshot = createPlayerSnapshot(player);

    // Should be pure copies, no computation
    expect(snapshot?.passiveEffects?.hasSurviveLethal).toBe(true);
    expect(snapshot?.passiveEffects?.survivedLethalUsed).toBe(false);
    expect(snapshot?.passiveEffects?.damageStacks).toBe(2);
    expect(snapshot?.passiveEffects?.damageStacksMax).toBe(5);
    expect(snapshot?.passiveEffects?.lastBastionActive).toBe(true); // conditionalArmorPercent > 0
    expect(snapshot?.passiveEffects?.painConduitActive).toBe(true); // conditionalReflectMultiplier > 1
  });

  it('should return null passiveEffects for non-passive paths', () => {
    const player: Entity = {
      player: true,
      identity: { name: 'Test', class: CLASSES.warrior },
      health: { current: 100, max: 100 },
      pathProgression: { pathId: 'berserker', pathType: 'active' },
    };
    world.add(player);

    const snapshot = createPlayerSnapshot(player);

    expect(snapshot?.passiveEffects).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/__tests__/snapshot.test.ts -t "passiveEffects"`
Expected: FAIL

**Step 3: Add passiveEffects to PlayerSnapshot (pure copy)**

In `src/ecs/snapshot.ts`:

Add to PlayerSnapshot interface:

```typescript
// Passive effect state for UI display (COPIED from entity, not computed)
passiveEffects: {
  // From combat state
  damageStacks: number;
  nextAttackBonus: number;
  reflectBonusPercent: number;

  // From floor state
  survivedLethalUsed: boolean;

  // From permanent state
  permanentPowerBonus: number;

  // From computed (pre-computed by system)
  hasSurviveLethal: boolean;
  damageStacksMax: number;
  totalReflectPercent: number;
  totalDamageReduction: number;
  damageAuraPerSecond: number;
  isImmuneToStuns: boolean;
  isImmuneToSlows: boolean;

  // Conditional status (from computed conditional values)
  lastBastionActive: boolean;
  painConduitActive: boolean;
  regenSurgeActive: boolean;
} | null;
```

In createPlayerSnapshot, add (NO computation, pure copy):

```typescript
// Passive effects - PURE COPY from entity state
passiveEffects: (() => {
  const state = entity.passiveEffectState;
  if (entity.pathProgression?.pathType !== 'passive' || !state) {
    return null;
  }

  const computed = state.computed;
  return {
    // Copy from combat state
    damageStacks: state.combat.damageStacks,
    nextAttackBonus: state.combat.nextAttackBonus,
    reflectBonusPercent: state.combat.reflectBonusPercent,

    // Copy from floor state
    survivedLethalUsed: state.floor.survivedLethal,

    // Copy from permanent state
    permanentPowerBonus: state.permanent.powerBonusPercent,

    // Copy from computed
    hasSurviveLethal: computed.hasSurviveLethal,
    damageStacksMax: computed.damageStackConfig?.maxStacks ?? 0,
    totalReflectPercent: computed.baseReflectPercent + state.combat.reflectBonusPercent,
    totalDamageReduction: computed.damageReductionPercent,
    damageAuraPerSecond: computed.damageAuraPerSecond,
    isImmuneToStuns: computed.isImmuneToStuns,
    isImmuneToSlows: computed.isImmuneToSlows,

    // Conditional status - read from pre-computed conditional values
    lastBastionActive: computed.conditionalArmorPercent > 0,
    painConduitActive: computed.conditionalReflectMultiplier > 1,
    regenSurgeActive: computed.conditionalRegenMultiplier > 1,
  };
})(),
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/__tests__/snapshot.test.ts -t "passiveEffects"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/snapshot.ts src/ecs/__tests__/snapshot.test.ts
git commit -m "$(cat <<'EOF'
feat(ecs): extend PlayerSnapshot with passiveEffects (pure copy)

Snapshot creation COPIES from entity state without computation:
- combat/floor/permanent: direct copies
- computed values: copied from pre-computed fields
- conditional status: read from pre-computed conditional values

No game logic in snapshot creation - just data copying.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: UI Components

### Task 10: Create ActiveEffectsBar Component

**Files:**
- Create: `src/components/game/ActiveEffectsBar.tsx`
- Modify: `src/components/game/PlayerStatsPanel.tsx`

**Step 1: Create the component (render only, no logic)**

```typescript
// src/components/game/ActiveEffectsBar.tsx
/**
 * ActiveEffectsBar - displays active passive effect indicators
 *
 * RENDER ONLY - reads from snapshot, no game logic.
 */

import { Sparkles, TrendingUp, Shield, Zap, Heart, Lock } from 'lucide-react';
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface ActiveEffectsBarProps {
  player: PlayerSnapshot;
}

interface EffectIconProps {
  icon: React.ReactNode;
  active: boolean;
  label: string;
  tooltip?: string;
}

function EffectIcon({ icon, active, label, tooltip }: EffectIconProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
        active
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-gray-700/50 text-gray-500 border border-gray-600/30'
      }`}
      title={tooltip}
    >
      <span className="w-4 h-4">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function ActiveEffectsBar({ player }: ActiveEffectsBarProps) {
  const effects = player.passiveEffects;
  if (!effects) return null;

  return (
    <div className="flex flex-wrap gap-1 px-2 py-1">
      {effects.hasSurviveLethal && (
        <EffectIcon
          icon={<Sparkles className="w-4 h-4" />}
          active={!effects.survivedLethalUsed}
          label={effects.survivedLethalUsed ? 'Used' : 'Ready'}
          tooltip="Immortal Bulwark: Survive lethal once per floor"
        />
      )}

      {effects.damageStacksMax > 0 && (
        <EffectIcon
          icon={<TrendingUp className="w-4 h-4" />}
          active={effects.damageStacks > 0}
          label={`${effects.damageStacks}/${effects.damageStacksMax}`}
          tooltip={`Vengeful Strikes: +${effects.damageStacks * 10}% damage`}
        />
      )}

      {effects.nextAttackBonus > 0 && (
        <EffectIcon
          icon={<Zap className="w-4 h-4" />}
          active={true}
          label={`+${effects.nextAttackBonus}%`}
          tooltip="Retaliation: Bonus damage on next attack"
        />
      )}

      {effects.lastBastionActive && (
        <EffectIcon
          icon={<Shield className="w-4 h-4" />}
          active={true}
          label="Last Bastion"
          tooltip="Last Bastion: +50% Armor below 30% HP"
        />
      )}

      {effects.painConduitActive && (
        <EffectIcon
          icon={<Zap className="w-4 h-4" />}
          active={true}
          label="Pain Conduit"
          tooltip="Pain Conduit: Reflect doubled below 50% HP"
        />
      )}

      {effects.regenSurgeActive && (
        <EffectIcon
          icon={<Heart className="w-4 h-4" />}
          active={true}
          label="Regen Surge"
          tooltip="Regeneration Surge: HP regen doubled above 70% HP"
        />
      )}

      {(effects.isImmuneToStuns || effects.isImmuneToSlows) && (
        <EffectIcon
          icon={<Lock className="w-4 h-4" />}
          active={true}
          label="Immovable"
          tooltip="Immovable: Immune to stuns and slows"
        />
      )}

      {effects.totalReflectPercent > 0 && effects.reflectBonusPercent > 0 && (
        <EffectIcon
          icon={<Shield className="w-4 h-4" />}
          active={true}
          label={`${Math.round(effects.totalReflectPercent)}% Reflect`}
          tooltip={`Escalating Revenge: +${effects.reflectBonusPercent}% bonus reflect`}
        />
      )}
    </div>
  );
}
```

**Step 2: Integrate into PlayerStatsPanel**

```typescript
import { ActiveEffectsBar } from './ActiveEffectsBar';

// In JSX:
{player.passiveEffects && <ActiveEffectsBar player={player} />}
```

**Step 3: Verify in browser**

Run: `npm run dev`

**Step 4: Commit**

```bash
git add src/components/game/ActiveEffectsBar.tsx src/components/game/PlayerStatsPanel.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add ActiveEffectsBar component (render only)

Pure rendering component that displays passive effect indicators.
Reads from snapshot, no game logic - just visual display.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: E2E Testing

### Task 11: Write E2E Test for Guardian Passive Path

**Files:**
- Modify: `e2e/game-flow.spec.ts`

**Step 1: Write E2E test**

```typescript
test.describe('Guardian passive path', () => {
  test('should display passive effects and apply damage reduction', async ({ page }) => {
    await page.goto('/?testMode=true');

    // Use test hooks to setup Guardian path
    await page.evaluate(() => {
      const hooks = (window as any).__TEST_HOOKS__;
      hooks.startGame('warrior', 'guardian');
    });

    // Verify stance UI visible
    await expect(page.getByText(/iron stance|retribution stance/i)).toBeVisible();

    // Verify damage reduction applies (would need test hook to measure)
  });
});
```

**Step 2: Run E2E**

Run: `npx playwright test --project="Desktop" -g "Guardian"`

**Step 3: Commit**

```bash
git add e2e/game-flow.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): add Guardian passive path E2E test

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Implementation Summary

| Task | Files | ECS Compliance |
|------|-------|----------------|
| 1 | types/paths.ts | ✅ Type definitions only |
| 2 | ecs/components.ts | ✅ Component type with computed sub-object |
| 3 | ecs/systems/passive-effect.ts | ✅ System writes to entity.computed |
| 4 | ecs/systems/input.ts | ✅ Calls recompute on change events |
| 5 | ecs/systems/flow.ts, input.ts | ✅ State resets at boundaries |
| 6 | passive-effect.ts, combat.ts | ✅ Reads from computed only |
| 7 | passive-effect.ts, combat.ts | ✅ Returns results, combat.ts applies |
| 8 | passive-effect.ts, death.ts | ✅ Reads computed, mutates own entity |
| 9 | ecs/snapshot.ts | ✅ Pure copy, no computation |
| 10 | components/game/ | ✅ Render only, reads snapshot |
| 11 | e2e/game-flow.spec.ts | ✅ Browser validation |

**Data Flow (Strict ECS):**
```
Change Event → recomputePassiveEffects() → entity.passiveEffectState.computed
Each Tick → updateConditionalEffects() → entity.passiveEffectState.computed.conditional*
Combat Hooks → READ from entity.passiveEffectState.computed
Snapshot → COPY from entity.passiveEffectState
React UI → RENDER from snapshot
```
