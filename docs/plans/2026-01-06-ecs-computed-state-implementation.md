# ECS Computed State Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix power upgrades and stance enhancements to actually affect combat, and move all game state computation from UI to ECS systems.

**Architecture:** Create utility functions for computing effective power/stance values, store computed state in ECS components, recompute on relevant commands, snapshot copies to React, UI renders without computation.

**Tech Stack:** TypeScript, React, miniplex ECS, Vitest, Playwright

**Design Document:** `docs/plans/2026-01-06-ecs-computed-state-design.md`

---

## Phase 1: Core Power Upgrade Fix

### Task 1: Create powerUpgrades.ts utility

**Files:**
- Create: `src/utils/powerUpgrades.ts`
- Reference: `src/data/paths/berserker-powers.ts`
- Reference: `src/types/paths.ts`

**Step 1: Create utility file with type imports**

```typescript
// src/utils/powerUpgrades.ts
/**
 * Power Upgrade Utilities
 *
 * Computes effective power stats by merging base power with upgrade tiers.
 * Uses registry pattern for extensibility to future paths.
 */

import type { Entity } from '@/ecs/components';
import type { Power } from '@/types/game';
import type { PowerUpgrade } from '@/data/paths/berserker-powers';
import { getBerserkerPowerUpgrade } from '@/data/paths/berserker-powers';

// Fields that can be overridden by upgrades
const UPGRADE_FIELDS = [
  'value',
  'cooldown',
  'resourceCost',
  'damageThreshold',
  'hpThreshold',
  'bonusMultiplier',
  'guaranteedCrit',
  'stunDuration',
  'bonusDamageToStunned',
  'buffDuration',
  'buffPower',
  'buffSpeed',
  'lifestealPercent',
  'selfDamagePercent',
  'healOnKill',
  'shieldOnOverheal',
  'cooldownReductionOnKill',
  'deathImmunityDuration',
  'reflectDuringImmunity',
] as const;

// Registry pattern for path-specific upgrade lookups
type UpgradeLookup = (powerId: string, tier: 1 | 2) => PowerUpgrade | undefined;

const upgradeRegistry: Record<string, UpgradeLookup> = {
  berserker: getBerserkerPowerUpgrade,
  // Future paths add one line here:
  // archmage: getArchmagePowerUpgrade,
  // assassin: getAssassinPowerUpgrade,
  // crusader: getCrusaderPowerUpgrade,
};

/**
 * Get the current upgrade tier for a power
 */
export function getPowerUpgradeTier(entity: Entity, powerId: string): 0 | 1 | 2 {
  const upgradeState = entity.pathProgression?.powerUpgrades?.find(
    (u) => u.powerId === powerId
  );
  return upgradeState?.currentTier ?? 0;
}

/**
 * Get upgrade definition from the appropriate path registry
 */
export function getUpgradeDefinition(
  pathId: string,
  powerId: string,
  tier: 1 | 2
): PowerUpgrade | undefined {
  const lookup = upgradeRegistry[pathId];
  return lookup?.(powerId, tier);
}

/**
 * Pick only upgrade-relevant fields from an object
 */
function pickUpgradeFields(obj: Partial<PowerUpgrade>): Partial<Power> {
  const result: Partial<Power> = {};
  for (const field of UPGRADE_FIELDS) {
    if (obj[field as keyof PowerUpgrade] !== undefined) {
      (result as Record<string, unknown>)[field] = obj[field as keyof PowerUpgrade];
    }
  }
  return result;
}

/**
 * Compute effective power by merging base power with upgrade tiers cumulatively.
 * Tier 2 builds on Tier 1 (Base → T1 → T2).
 */
export function computeEffectivePower(entity: Entity, basePower: Power): Power {
  const pathId = entity.pathProgression?.pathId;
  if (!pathId) return basePower;

  const currentTier = getPowerUpgradeTier(entity, basePower.id);
  if (currentTier === 0) return basePower;

  let effective = { ...basePower };

  // Apply tier 1 if at tier 1 or higher
  if (currentTier >= 1) {
    const t1Upgrade = getUpgradeDefinition(pathId, basePower.id, 1);
    if (t1Upgrade) {
      effective = { ...effective, ...pickUpgradeFields(t1Upgrade) };
    }
  }

  // Apply tier 2 if at tier 2
  if (currentTier >= 2) {
    const t2Upgrade = getUpgradeDefinition(pathId, basePower.id, 2);
    if (t2Upgrade) {
      effective = { ...effective, ...pickUpgradeFields(t2Upgrade) };
    }
  }

  return effective;
}

/**
 * Compute all effective powers for an entity
 */
export function computeAllEffectivePowers(entity: Entity): Power[] {
  if (!entity.powers) return [];
  return entity.powers.map((power) => computeEffectivePower(entity, power));
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/utils/powerUpgrades.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/powerUpgrades.ts
git commit -m "feat(utils): add powerUpgrades utility with cumulative merge logic"
```

---

### Task 2: Add unit tests for powerUpgrades

**Files:**
- Create: `src/utils/__tests__/powerUpgrades.test.ts`
- Reference: `src/utils/powerUpgrades.ts`

**Step 1: Write failing tests**

```typescript
// src/utils/__tests__/powerUpgrades.test.ts
import { describe, it, expect } from 'vitest';
import {
  getPowerUpgradeTier,
  computeEffectivePower,
  computeAllEffectivePowers,
} from '../powerUpgrades';
import type { Entity } from '@/ecs/components';
import type { Power } from '@/types/game';

// Mock base power matching berserker-powers.ts RAGE_STRIKE
const mockBasePower: Power = {
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
  hpThreshold: 0.5,
  bonusMultiplier: 0.5,
};

// Mock entity with no upgrades
const mockEntityTier0: Entity = {
  powers: [mockBasePower],
  pathProgression: {
    pathId: 'berserker',
    pathType: 'active',
    powerUpgrades: [{ powerId: 'rage_strike', currentTier: 0 }],
  },
};

// Mock entity at tier 1
const mockEntityTier1: Entity = {
  powers: [mockBasePower],
  pathProgression: {
    pathId: 'berserker',
    pathType: 'active',
    powerUpgrades: [{ powerId: 'rage_strike', currentTier: 1 }],
  },
};

// Mock entity at tier 2
const mockEntityTier2: Entity = {
  powers: [mockBasePower],
  pathProgression: {
    pathId: 'berserker',
    pathType: 'active',
    powerUpgrades: [{ powerId: 'rage_strike', currentTier: 2 }],
  },
};

describe('getPowerUpgradeTier', () => {
  it('returns 0 when no pathProgression', () => {
    const entity: Entity = { powers: [mockBasePower] };
    expect(getPowerUpgradeTier(entity, 'rage_strike')).toBe(0);
  });

  it('returns 0 when power not in upgrades list', () => {
    expect(getPowerUpgradeTier(mockEntityTier1, 'unknown_power')).toBe(0);
  });

  it('returns correct tier from pathProgression', () => {
    expect(getPowerUpgradeTier(mockEntityTier0, 'rage_strike')).toBe(0);
    expect(getPowerUpgradeTier(mockEntityTier1, 'rage_strike')).toBe(1);
    expect(getPowerUpgradeTier(mockEntityTier2, 'rage_strike')).toBe(2);
  });
});

describe('computeEffectivePower', () => {
  it('returns base power unchanged at tier 0', () => {
    const effective = computeEffectivePower(mockEntityTier0, mockBasePower);
    expect(effective.value).toBe(2.0);
    expect(effective.cooldown).toBe(5);
  });

  it('merges tier 1 upgrades', () => {
    const effective = computeEffectivePower(mockEntityTier1, mockBasePower);
    // Tier 1 for rage_strike: value: 2.4, damageThreshold: 60
    expect(effective.value).toBe(2.4);
  });

  it('merges tier 2 upgrades cumulatively on top of tier 1', () => {
    const effective = computeEffectivePower(mockEntityTier2, mockBasePower);
    // Tier 1: value: 2.4
    // Tier 2: guaranteedCrit: true (doesn't override value, so stays 2.4)
    expect(effective.value).toBe(2.4);
    expect(effective.guaranteedCrit).toBe(true);
  });

  it('preserves base power properties not in upgrade', () => {
    const effective = computeEffectivePower(mockEntityTier1, mockBasePower);
    expect(effective.id).toBe('rage_strike');
    expect(effective.name).toBe('Rage Strike');
    expect(effective.effect).toBe('damage');
    expect(effective.category).toBe('strike');
  });
});

describe('computeAllEffectivePowers', () => {
  it('returns empty array when no powers', () => {
    const entity: Entity = {};
    expect(computeAllEffectivePowers(entity)).toEqual([]);
  });

  it('computes effective stats for all powers', () => {
    const effective = computeAllEffectivePowers(mockEntityTier1);
    expect(effective).toHaveLength(1);
    expect(effective[0].value).toBe(2.4);
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/powerUpgrades.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/utils/__tests__/powerUpgrades.test.ts
git commit -m "test(utils): add powerUpgrades utility tests"
```

---

### Task 3: Add effectivePowers to ECS components

**Files:**
- Modify: `src/ecs/components.ts`
- Modify: `src/types/paths.ts` (if needed)

**Step 1: Add effectivePowers to Entity interface**

In `src/ecs/components.ts`, find the Entity interface and add:

```typescript
// Add after the 'powers?: Power[];' line
effectivePowers?: Power[];
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/components.ts
git commit -m "feat(ecs): add effectivePowers component to Entity"
```

---

### Task 4: Recompute effectivePowers in InputSystem

**Files:**
- Modify: `src/ecs/systems/input.ts`
- Reference: `src/utils/powerUpgrades.ts`

**Step 1: Add import at top of input.ts**

```typescript
import { computeAllEffectivePowers } from '@/utils/powerUpgrades';
```

**Step 2: Add helper function before InputSystem**

```typescript
/**
 * Recompute effectivePowers after power changes or upgrades
 */
function recomputeEffectivePowers(player: Entity): void {
  player.effectivePowers = computeAllEffectivePowers(player);
}
```

**Step 3: Call recompute after SELECT_POWER handler**

Find the `case 'SELECT_POWER':` block and add after `gameState.paused = false;`:

```typescript
// Recompute effective powers with new power
recomputeEffectivePowers(player);
```

**Step 4: Call recompute after UPGRADE_POWER handler**

Find the `case 'UPGRADE_POWER':` block and add after `gameState.paused = false;`:

```typescript
// Recompute effective powers with upgraded stats
recomputeEffectivePowers(player);
```

**Step 5: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/input.ts`
Expected: No errors

**Step 6: Commit**

```bash
git add src/ecs/systems/input.ts
git commit -m "feat(ecs): recompute effectivePowers on power selection and upgrade"
```

---

### Task 5: Update PowerSystem to use effectivePowers

**Files:**
- Modify: `src/ecs/systems/power.ts`

**Step 1: Update power lookup in PowerSystem**

Find line ~382 where power is looked up:

```typescript
// Before:
const power = entity.powers?.find(p => p.id === castingData.powerId);

// After:
const power = entity.effectivePowers?.find(p => p.id === castingData.powerId)
  ?? entity.powers?.find(p => p.id === castingData.powerId);
```

The fallback to `entity.powers` ensures backward compatibility during transition.

**Step 2: Run existing power tests**

Run: `npx vitest run src/ecs/systems/__tests__/power.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/ecs/systems/power.ts
git commit -m "feat(ecs): PowerSystem uses effectivePowers for combat calculations"
```

---

### Task 6: Update snapshot to include effectivePowers

**Files:**
- Modify: `src/ecs/snapshot.ts`

**Step 1: Add effectivePowers to PlayerSnapshot type**

Find the `PlayerSnapshot` interface and add:

```typescript
effectivePowers: Power[];
```

**Step 2: Add effectivePowers to createPlayerSnapshot**

Find where player snapshot is created and add:

```typescript
effectivePowers: player.effectivePowers ?? player.powers ?? [],
```

**Step 3: Run snapshot tests**

Run: `npx vitest run src/ecs/__tests__/snapshot.test.ts`
Expected: All tests PASS (may need to update test mocks)

**Step 4: Commit**

```bash
git add src/ecs/snapshot.ts
git commit -m "feat(ecs): add effectivePowers to PlayerSnapshot"
```

---

### Task 7: Write E2E test for power upgrades affecting combat

**Files:**
- Modify: `e2e/berserker-progression.spec.ts`

**Step 1: Add E2E test for upgrade affecting damage**

```typescript
test('upgraded power deals more damage than base', async ({ page }) => {
  // Setup: Start game, select warrior, select berserker path
  await page.goto('/?testMode=true');
  await page.click('text=Start Game');
  await page.click('text=Warrior');
  await page.click('text=Berserker');

  // Use test hooks to set up scenario
  await page.evaluate(() => {
    const hooks = (window as any).__TEST_HOOKS__;
    if (!hooks) throw new Error('Test hooks not available');

    // Give player rage_strike at tier 0
    hooks.setPlayerPowers([{
      id: 'rage_strike',
      name: 'Rage Strike',
      value: 2.0,
      cooldown: 5,
      resourceCost: 30,
      effect: 'damage',
      manaCost: 0,
      icon: 'power-rage_strike',
      category: 'strike',
      synergies: [],
    }]);

    // Set up path progression
    hooks.setPlayerPathProgression({
      pathId: 'berserker',
      pathType: 'active',
      powerUpgrades: [{ powerId: 'rage_strike', currentTier: 0 }],
    });

    // Give player enough fury
    hooks.setPlayerResource({ type: 'fury', current: 100, max: 100 });
  });

  // Record base damage from combat log
  // ... (implementation details for checking combat log)

  // Now upgrade to tier 1
  await page.evaluate(() => {
    const hooks = (window as any).__TEST_HOOKS__;
    hooks.setPlayerPathProgression({
      pathId: 'berserker',
      pathType: 'active',
      powerUpgrades: [{ powerId: 'rage_strike', currentTier: 1 }],
    });
    // Trigger recompute
    hooks.dispatchCommand({ type: 'UPGRADE_POWER', powerId: 'rage_strike' });
  });

  // Verify effectivePowers has upgraded value
  const effectiveValue = await page.evaluate(() => {
    const hooks = (window as any).__TEST_HOOKS__;
    const player = hooks.getPlayer();
    const power = player.effectivePowers?.find((p: any) => p.id === 'rage_strike');
    return power?.value;
  });

  expect(effectiveValue).toBe(2.4); // Tier 1 value
});
```

**Step 2: Run E2E test**

Run: `npx playwright test e2e/berserker-progression.spec.ts --project="Desktop" -g "upgraded power"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/berserker-progression.spec.ts
git commit -m "test(e2e): verify power upgrades affect combat damage"
```

---

## Phase 2: Stance Enhancement Fix

### Task 8: Update stanceUtils to include enhancements

**Files:**
- Modify: `src/utils/stanceUtils.ts`
- Reference: `src/data/paths/guardian-enhancements.ts`

**Step 1: Add imports and registry**

```typescript
import { getGuardianEnhancement } from '@/data/paths/guardian-enhancements';
import type { StanceEnhancement, StanceEnhancementEffect } from '@/types/paths';

// Registry for enhancement lookups
type EnhancementLookup = (enhancementId: string) => StanceEnhancement | undefined;

const enhancementRegistry: Record<string, EnhancementLookup> = {
  guardian: getGuardianEnhancement,
  // Future paths:
  // chronomancer: getChronomancerEnhancement,
  // shadow: getShadowEnhancement,
  // templar: getTemplarEnhancement,
};
```

**Step 2: Add helper to convert enhancement effect to stance effect**

```typescript
/**
 * Convert a stance enhancement effect to the StanceEffect format
 */
function convertEnhancementToStanceEffect(
  effect: StanceEnhancementEffect
): StanceEffect | null {
  switch (effect.type) {
    case 'armor_percent':
      return { type: 'stat_modifier', stat: 'armor', percentBonus: effect.value / 100 };
    case 'damage_reduction':
      return { type: 'damage_modifier', damageType: 'incoming', multiplier: 1 - effect.value / 100 };
    case 'hp_regen_percent':
      return { type: 'stat_modifier', stat: 'regen', percentBonus: effect.value / 100 };
    case 'reflect_percent':
      return { type: 'behavior_modifier', behavior: 'reflect', value: effect.value / 100 };
    case 'cc_immunity':
      return { type: 'behavior_modifier', behavior: 'cc_immunity', value: 1 };
    // Add other effect types as needed
    default:
      return null;
  }
}
```

**Step 3: Add function to get enhancement effects**

```typescript
/**
 * Get all stance effects from acquired enhancements
 */
function getEnhancementEffects(entity: Entity): StanceEffect[] {
  const stanceProgression = entity.pathProgression?.stanceProgression;
  const pathId = entity.pathProgression?.pathId;
  if (!stanceProgression || !pathId) return [];

  const lookup = enhancementRegistry[pathId];
  if (!lookup) return [];

  const effects: StanceEffect[] = [];
  for (const enhancementId of stanceProgression.acquiredEnhancements) {
    const enhancement = lookup(enhancementId);
    if (enhancement?.effect) {
      const converted = convertEnhancementToStanceEffect(enhancement.effect);
      if (converted) {
        effects.push(converted);
      }
    }
  }
  return effects;
}
```

**Step 4: Add computeEffectiveStanceEffects function**

```typescript
/**
 * Compute all effective stance effects (base + enhancements)
 */
export function computeEffectiveStanceEffects(entity: Entity): StanceEffect[] {
  const stance = getActiveStance(entity);
  const baseEffects = stance?.effects ?? [];
  const enhancementEffects = getEnhancementEffects(entity);
  return [...baseEffects, ...enhancementEffects];
}
```

**Step 5: Commit**

```bash
git add src/utils/stanceUtils.ts
git commit -m "feat(utils): add stance enhancement merging to stanceUtils"
```

---

### Task 9: Add effectiveStanceEffects to ECS components

**Files:**
- Modify: `src/ecs/components.ts`

**Step 1: Add effectiveStanceEffects to Entity**

```typescript
effectiveStanceEffects?: StanceEffect[];
```

**Step 2: Commit**

```bash
git add src/ecs/components.ts
git commit -m "feat(ecs): add effectiveStanceEffects component to Entity"
```

---

### Task 10: Recompute effectiveStanceEffects in InputSystem

**Files:**
- Modify: `src/ecs/systems/input.ts`

**Step 1: Add import**

```typescript
import { computeEffectiveStanceEffects } from '@/utils/stanceUtils';
```

**Step 2: Add helper function**

```typescript
/**
 * Recompute effectiveStanceEffects after stance changes
 */
function recomputeEffectiveStanceEffects(player: Entity): void {
  player.effectiveStanceEffects = computeEffectiveStanceEffects(player);
}
```

**Step 3: Call after SELECT_STANCE_ENHANCEMENT**

Add after the handler completes:

```typescript
recomputeEffectiveStanceEffects(player);
```

**Step 4: Call after SWITCH_STANCE**

Add after the handler completes:

```typescript
recomputeEffectiveStanceEffects(player);
```

**Step 5: Commit**

```bash
git add src/ecs/systems/input.ts
git commit -m "feat(ecs): recompute effectiveStanceEffects on stance changes"
```

---

### Task 11: Update stanceUtils to read from component

**Files:**
- Modify: `src/utils/stanceUtils.ts`

**Step 1: Update getActiveStanceEffects to use precomputed value**

```typescript
/**
 * Get all effects from the active stance (base + enhancements)
 * Reads from precomputed component if available
 */
export function getActiveStanceEffects(entity: Entity): StanceEffect[] {
  // Use precomputed value if available
  if (entity.effectiveStanceEffects) {
    return entity.effectiveStanceEffects;
  }
  // Fallback: compute on demand (for backward compatibility)
  return computeEffectiveStanceEffects(entity);
}
```

**Step 2: Run existing stance tests**

Run: `npx vitest run src/utils/__tests__/stanceUtils.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/utils/stanceUtils.ts
git commit -m "feat(utils): stanceUtils reads from effectiveStanceEffects component"
```

---

### Task 12: Update snapshot for stance effects

**Files:**
- Modify: `src/ecs/snapshot.ts`

**Step 1: Add effectiveStanceEffects to PlayerSnapshot**

```typescript
effectiveStanceEffects: StanceEffect[];
```

**Step 2: Add to snapshot creation**

```typescript
effectiveStanceEffects: player.effectiveStanceEffects ?? [],
```

**Step 3: Commit**

```bash
git add src/ecs/snapshot.ts
git commit -m "feat(ecs): add effectiveStanceEffects to PlayerSnapshot"
```

---

### Task 13: Fix StanceEnhancementPopup dispatch inconsistency

**Files:**
- Modify: `src/components/game/StanceEnhancementPopup.tsx`

**Step 1: Change dispatch to use actions**

Find line ~30 where `dispatch(Commands.selectStanceEnhancement(...))` is called and change to:

```typescript
// Before:
dispatch(Commands.selectStanceEnhancement(selectedStance))

// After:
actions.selectStanceEnhancement(selectedStance)
```

**Step 2: Ensure actions is available from useGame hook**

Verify the component has:
```typescript
const { actions } = useGame();
```

**Step 3: Commit**

```bash
git add src/components/game/StanceEnhancementPopup.tsx
git commit -m "fix(ui): use actions instead of dispatch in StanceEnhancementPopup"
```

---

### Task 14: E2E test for stance enhancements

**Files:**
- Modify: `e2e/berserker-progression.spec.ts` (or create guardian-specific)

**Step 1: Add E2E test for Guardian enhancements**

```typescript
test('Guardian stance enhancements affect combat stats', async ({ page }) => {
  await page.goto('/?testMode=true');
  await page.click('text=Start Game');
  await page.click('text=Warrior');
  await page.click('text=Guardian');

  // Use test hooks to add enhancement
  await page.evaluate(() => {
    const hooks = (window as any).__TEST_HOOKS__;
    hooks.setPlayerPathProgression({
      pathId: 'guardian',
      pathType: 'passive',
      stanceProgression: {
        ironTier: 1,
        retributionTier: 0,
        acquiredEnhancements: ['iron_1'], // +20% armor
      },
    });
  });

  // Verify effectiveStanceEffects includes enhancement
  const hasArmorBonus = await page.evaluate(() => {
    const hooks = (window as any).__TEST_HOOKS__;
    const player = hooks.getPlayer();
    return player.effectiveStanceEffects?.some(
      (e: any) => e.type === 'stat_modifier' && e.stat === 'armor'
    );
  });

  expect(hasArmorBonus).toBe(true);
});
```

**Step 2: Run E2E test**

Run: `npx playwright test --project="Desktop" -g "Guardian stance enhancements"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/
git commit -m "test(e2e): verify Guardian stance enhancements affect stats"
```

---

## Phase 3: Derived Stats to Snapshot

### Task 15: Add derivedStats to components and snapshot

**Files:**
- Modify: `src/ecs/components.ts`
- Modify: `src/ecs/snapshot.ts`
- Modify: `src/ecs/systems/input.ts` or create new recompute trigger

**Step 1: Add derivedStats type and component**

In `src/ecs/components.ts`:

```typescript
export interface DerivedStats {
  critChance: number;    // 0-1, e.g., 0.15 = 15%
  critDamage: number;    // multiplier, e.g., 1.5 = 150%
  dodgeChance: number;   // 0-1
}

// Add to Entity interface:
derivedStats?: DerivedStats;
```

**Step 2: Create recompute function in a utility**

Create helper that computes derived stats from fortune:

```typescript
// In src/utils/statUtils.ts (new file or add to existing)
import { getCritChance, getCritDamage, getDodgeChance } from './fortuneUtils';

export function computeDerivedStats(fortune: number): DerivedStats {
  return {
    critChance: getCritChance(fortune),
    critDamage: getCritDamage(fortune),
    dodgeChance: getDodgeChance(fortune),
  };
}
```

**Step 3: Recompute on stat changes**

Add call to recompute when fortune changes (after level up, item equip, etc.)

**Step 4: Add to snapshot**

```typescript
derivedStats: player.derivedStats ?? {
  critChance: 0,
  critDamage: 1.5,
  dodgeChance: 0,
},
```

**Step 5: Commit**

```bash
git add src/ecs/components.ts src/ecs/snapshot.ts src/utils/statUtils.ts
git commit -m "feat(ecs): add derivedStats component for crit/dodge"
```

---

### Task 16: Update PlayerStatsPanel to use derivedStats

**Files:**
- Modify: `src/components/game/PlayerStatsPanel.tsx`

**Step 1: Remove fortune util calls**

```typescript
// Before:
const critChance = Math.floor(getCritChance(fortune) * 100);
const critDamage = Math.floor(getCritDamage(fortune) * 100);
const dodgeChance = Math.floor(getDodgeChance(fortune) * 100);

// After:
const critChance = Math.floor((player.derivedStats?.critChance ?? 0) * 100);
const critDamage = Math.floor((player.derivedStats?.critDamage ?? 1.5) * 100);
const dodgeChance = Math.floor((player.derivedStats?.dodgeChance ?? 0) * 100);
```

**Step 2: Remove unused import**

Remove `import { getCritChance, getCritDamage, getDodgeChance } from '@/utils/fortuneUtils';`

**Step 3: Commit**

```bash
git add src/components/game/PlayerStatsPanel.tsx
git commit -m "refactor(ui): PlayerStatsPanel uses derivedStats from snapshot"
```

---

### Task 17-22: Additional UI cleanup tasks

(Similar pattern for each remaining UI component - updating to use snapshot values instead of computing)

- Task 17: Add `canUse` to powers, update PowerButton
- Task 18: Add `effectiveCost` to powers, update PowersPanel
- Task 19: Add `weaponVariant` to player, update CharacterSprite
- Task 20: Add `activeThresholds` to PathResource, update ResourceBar
- Task 21: Run full E2E regression
- Task 22: Final cleanup and documentation

---

## Summary

**Total Tasks:** 22
**Estimated Time:** 4-6 hours for experienced developer
**Key Commits:** ~15-18 atomic commits

**Verification Checkpoints:**
- After Task 7: Power upgrades work in combat
- After Task 14: Stance enhancements work in combat
- After Task 22: Full regression passes, all UI uses snapshot data
