# Codebase Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a path registry to eliminate duplicate imports and path-specific branches, then split path-ability.ts into focused modules.

**Architecture:** Central registry exports all path data and lookup functions. Path definitions include their own lookup methods. Systems branch on path type (active/passive), not path ID. After registry is stable, split path-ability.ts following passive-effect/ module pattern.

**Tech Stack:** TypeScript, React, miniplex ECS

---

## Phase 1: Path Registry

### Task 1: Create Registry File

**Files:**
- Create: `src/data/paths/registry.ts`

**Step 1: Create the registry with all exports**

```typescript
// src/data/paths/registry.ts
/**
 * Path Registry - Single source of truth for all path definitions.
 *
 * All systems should import path data from here, never from individual path files.
 * This eliminates duplicate imports and provides consistent lookup functions.
 */

import type { PathDefinition, PathAbility } from '@/types/paths';
import type { Entity } from '@/ecs/components';
import { WARRIOR_PATHS } from './warrior';
import { MAGE_PATHS } from './mage';
// Rogue/Paladin will be added here when implemented

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All registered paths by class.
 * Add new classes here when implemented.
 */
const PATH_REGISTRY: Record<string, PathDefinition[]> = {
  warrior: Object.values(WARRIOR_PATHS),
  mage: Object.values(MAGE_PATHS),
  // rogue: Object.values(ROGUE_PATHS),
  // paladin: Object.values(PALADIN_PATHS),
};

/**
 * Flattened array of all paths for iteration.
 */
const ALL_PATHS: PathDefinition[] = Object.values(PATH_REGISTRY).flat();

// ============================================================================
// LOOKUPS
// ============================================================================

/**
 * Get all registered path definitions.
 */
export function getAllPaths(): PathDefinition[] {
  return ALL_PATHS;
}

/**
 * Get a path definition by ID.
 */
export function getPathById(pathId: string): PathDefinition | undefined {
  return ALL_PATHS.find(p => p.id === pathId);
}

/**
 * Get all paths for a specific class.
 */
export function getPathsForClass(classId: string): PathDefinition[] {
  return PATH_REGISTRY[classId] ?? [];
}

/**
 * Get all active-type paths.
 */
export function getActivePaths(): PathDefinition[] {
  return ALL_PATHS.filter(p => p.type === 'active');
}

/**
 * Get all passive-type paths.
 */
export function getPassivePaths(): PathDefinition[] {
  return ALL_PATHS.filter(p => p.type === 'passive');
}

/**
 * Get a specific ability definition by ID (searches all paths).
 */
export function getAbilityById(abilityId: string): PathAbility | undefined {
  for (const path of ALL_PATHS) {
    const ability = path.abilities.find(a => a.id === abilityId);
    if (ability) return ability;
  }
  return undefined;
}

/**
 * Get multiple ability definitions by their IDs.
 */
export function getAbilitiesByIds(abilityIds: string[]): PathAbility[] {
  return abilityIds
    .map(id => getAbilityById(id))
    .filter((ability): ability is PathAbility => ability !== undefined);
}

/**
 * Get the active abilities for a player entity.
 * Returns abilities from the player's path that they have chosen.
 */
export function getPlayerActiveAbilities(player: Entity): PathAbility[] {
  if (!player.path) return [];

  const pathDef = getPathById(player.path.pathId);
  if (!pathDef) return [];

  return pathDef.abilities.filter(ability =>
    player.path!.abilities.includes(ability.id)
  );
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/data/paths/registry.ts 2>&1 | head -20`
Expected: No errors (or only unrelated errors from imports)

**Step 3: Commit**

```bash
git add src/data/paths/registry.ts
git commit -m "feat(data): add path registry as single source of truth"
```

---

### Task 2: Extend PathDefinition Type

**Files:**
- Modify: `src/types/paths.ts:173-184`

**Step 1: Add lookup function types to PathDefinition**

Find the `PathDefinition` interface (around line 173) and add optional lookup functions:

```typescript
/**
 * Complete path definition
 * Each class has 2 paths (active vs passive)
 */
export interface PathDefinition {
  id: string;                       // Unique identifier (e.g., 'warrior_rage')
  name: string;                     // Display name (e.g., 'Path of Rage')
  type: PathType;                   // Active or passive playstyle
  description: string;              // Flavor text and overview
  icon: string;                     // Lucide icon name
  abilities: PathAbility[];         // All abilities in this path
  subpaths: SubpathDefinition[];    // Subpath branches (available at level 4+)
  theme?: string;                   // Optional: thematic tag for the overall path
  className?: string;               // Optional: class name for reference
  hasComboMechanic: boolean;        // Whether this path uses the combo system

  // === Lookup Functions (active paths) ===
  /** Get power choices for a level (levels 2,4,6,8). Returns empty array if none. */
  getPowerChoices?: (level: number) => import('@/types/game').Power[];
  /** Get the power granted by a subpath at level 8. */
  getSubpathPower?: (subpathId: string) => import('@/types/game').Power | undefined;
  /** Get a power upgrade definition. */
  getPowerUpgrade?: (powerId: string, tier: number) => import('./paths').PowerUpgrade | undefined;

  // === Lookup Functions (passive paths) ===
  /** Get stance enhancement choices for current tier. */
  getEnhancementChoices?: (tier1: number, tier2: number) => { stance1: StanceEnhancement; stance2: StanceEnhancement } | undefined;
  /** Get a stance enhancement by ID. */
  getEnhancementById?: (id: string) => StanceEnhancement | undefined;
}
```

**Step 2: Add PowerUpgrade re-export for type reference**

At the top of `src/types/paths.ts`, after the existing imports, we need to import PowerUpgrade from where it's defined. However, PowerUpgrade is currently defined in `berserker-powers.ts`. For now, let's use a simplified approach - the lookup functions return `unknown` for upgrades:

Actually, let's check if PowerUpgrade should be moved to types. For simplicity in this task, we'll make the lookup functions return generic types and let the callers cast.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit src/types/paths.ts 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types/paths.ts
git commit -m "feat(types): add lookup functions to PathDefinition interface"
```

---

### Task 3: Update Warrior Path with Lookup Functions

**Files:**
- Modify: `src/data/paths/warrior.ts:549-559`

**Step 1: Import the lookup functions**

At the top of `warrior.ts`, add imports for the power lookup functions:

```typescript
import {
  getBerserkerPowerChoices,
  getBerserkerSubpathPower,
  getBerserkerPowerUpgrade,
} from './berserker-powers';
import {
  getGuardianEnhancementChoices,
  getGuardianEnhancementById,
} from './guardian-enhancements';
```

**Step 2: Update BERSERKER_PATH to include lookup functions**

Find `BERSERKER_PATH` (around line 304) and add the lookup functions:

```typescript
const BERSERKER_PATH: PathDefinition = {
  id: 'berserker',
  name: 'Berserker',
  description: 'Risk and reward. Gain power as you take damage, enhanced abilities at low HP.',
  type: 'active',
  icon: 'ability-paths-warrior-berserker',
  abilities: BERSERKER_ABILITIES,
  subpaths: [WARLORD_SUBPATH, EXECUTIONER_SUBPATH],
  hasComboMechanic: true,
  // Lookup functions
  getPowerChoices: getBerserkerPowerChoices,
  getSubpathPower: getBerserkerSubpathPower,
  getPowerUpgrade: getBerserkerPowerUpgrade,
};
```

**Step 3: Update GUARDIAN_PATH to include lookup functions**

Find `GUARDIAN_PATH` (around line 534) and add the lookup functions:

```typescript
const GUARDIAN_PATH: PathDefinition = {
  id: 'guardian',
  name: 'Guardian',
  description: 'Passive survivability. Outlast your enemies with regeneration and damage reduction.',
  type: 'passive',
  icon: 'ability-paths-warrior-guardian',
  abilities: GUARDIAN_ABILITIES,
  subpaths: [FORTRESS_SUBPATH, AVENGER_SUBPATH],
  hasComboMechanic: false,
  // Lookup functions
  getEnhancementChoices: (ironTier, retTier) => {
    const choices = getGuardianEnhancementChoices(ironTier, retTier);
    if (!choices.iron || !choices.retribution) return undefined;
    return { stance1: choices.iron, stance2: choices.retribution };
  },
  getEnhancementById: getGuardianEnhancementById,
};
```

**Step 4: Verify file compiles**

Run: `npx tsc --noEmit src/data/paths/warrior.ts 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add src/data/paths/warrior.ts
git commit -m "feat(warrior): add lookup functions to path definitions"
```

---

### Task 4: Update Mage Path with Lookup Functions

**Files:**
- Modify: `src/data/paths/mage.ts`

**Step 1: Import the lookup functions**

At the top of `mage.ts`, add imports:

```typescript
import {
  getArchmagePowerChoices,
  getArchmageSubpathPower,
  getArchmagePowerUpgrade,
} from './archmage-powers';
import {
  getEnchanterEnhancementChoices,
  getEnchanterEnhancementById,
} from './enchanter-enhancements';
```

**Step 2: Find and update ARCHMAGE_PATH**

Search for where ARCHMAGE_PATH is exported (likely near bottom of file). Add lookup functions similar to Berserker:

```typescript
// Add to ARCHMAGE_PATH definition:
getPowerChoices: getArchmagePowerChoices,
getSubpathPower: getArchmageSubpathPower,
getPowerUpgrade: getArchmagePowerUpgrade,
```

**Step 3: Find and update ENCHANTER_PATH**

Add lookup functions similar to Guardian:

```typescript
// Add to ENCHANTER_PATH definition:
getEnhancementChoices: (surgeTier, veilTier) => {
  const choices = getEnchanterEnhancementChoices(surgeTier, veilTier);
  if (!choices.arcaneSurge || !choices.hexVeil) return undefined;
  return { stance1: choices.arcaneSurge, stance2: choices.hexVeil };
},
getEnhancementById: getEnchanterEnhancementById,
```

**Step 4: Verify file compiles**

Run: `npx tsc --noEmit src/data/paths/mage.ts 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add src/data/paths/mage.ts
git commit -m "feat(mage): add lookup functions to path definitions"
```

---

### Task 5: Migrate pathUtils.ts to Use Registry

**Files:**
- Modify: `src/utils/pathUtils.ts`

**Step 1: Replace imports and getAllPaths**

Replace lines 1-26 with:

```typescript
/**
 * Path Utility Functions
 *
 * Re-exports from registry plus additional utility functions.
 */

// Re-export all lookup functions from registry
export {
  getAllPaths,
  getPathById,
  getPathsForClass,
  getActivePaths,
  getPassivePaths,
  getAbilityById,
  getAbilitiesByIds,
  getPlayerActiveAbilities,
} from '@/data/paths/registry';

import { getPathById } from '@/data/paths/registry';
import type { PathDefinition, PathAbility, PlayerPath } from '@/types/paths';
import { PATH_RESOURCES } from '@/data/pathResources';
import { isFeatureEnabled } from '@/constants/features';
```

**Step 2: Remove the duplicate getAllPaths function**

Delete the old `getAllPaths()` function (was lines 18-26) since it's now re-exported from registry.

**Step 3: Update getPathById calls to handle undefined**

The registry returns `undefined` instead of `null`. Update any usages:

```typescript
// Change: getPathById(...)  || null
// To: getPathById(...) ?? null (if null is still needed by callers)
```

**Step 4: Verify file compiles**

Run: `npx tsc --noEmit src/utils/pathUtils.ts 2>&1 | head -20`
Expected: No errors

**Step 5: Run tests**

Run: `npx vitest run src/utils --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/utils/pathUtils.ts
git commit -m "refactor(utils): migrate pathUtils to use registry"
```

---

### Task 6: Migrate path-ability.ts to Use Registry

**Files:**
- Modify: `src/ecs/systems/path-ability.ts:31-34, 88-126`

**Step 1: Replace path imports with registry imports**

Replace lines 31-34:

```typescript
// OLD:
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';

// NEW:
import { getPathById, getPlayerActiveAbilities } from '@/data/paths/registry';
```

**Step 2: Delete the duplicate helper functions**

Delete the `normalizePaths`, `getAllPaths`, `getPathById`, and `getActiveAbilities` functions (lines 88-126). These are now in the registry.

**Step 3: Update usages**

Replace `getActiveAbilities(player)` with `getPlayerActiveAbilities(player)`:

Find around line 592 (will shift after deletions):
```typescript
// OLD:
const abilities = getActiveAbilities(player);

// NEW:
const abilities = getPlayerActiveAbilities(player);
```

**Step 4: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/path-ability.ts 2>&1 | head -20`
Expected: No errors

**Step 5: Run path-ability tests**

Run: `npx vitest run src/ecs/systems/__tests__/path-ability.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/ecs/systems/path-ability.ts
git commit -m "refactor(ecs): migrate path-ability to use registry"
```

---

### Task 7: Migrate PathSelectionScreen.tsx to Use Registry

**Files:**
- Modify: `src/components/game/PathSelectionScreen.tsx:14-17`

**Step 1: Replace path imports**

Replace lines 14-17:

```typescript
// OLD:
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';

// NEW:
import { getPathsForClass } from '@/data/paths/registry';
```

**Step 2: Update path lookup logic**

Find where paths are selected by class (search for `WARRIOR_PATHS` usage). Replace with:

```typescript
// OLD:
const paths = classId === 'warrior' ? WARRIOR_PATHS :
              classId === 'mage' ? MAGE_PATHS : ...

// NEW:
const paths = getPathsForClass(classId);
```

**Step 3: Verify file compiles**

Run: `npx tsc --noEmit src/components/game/PathSelectionScreen.tsx 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/game/PathSelectionScreen.tsx
git commit -m "refactor(ui): migrate PathSelectionScreen to use registry"
```

---

### Task 8: Refactor pathHandlers.ts to Use Path Lookup Functions

**Files:**
- Modify: `src/ecs/systems/input-handlers/pathHandlers.ts`

**Step 1: Remove direct power import**

Replace imports at top (lines 14-15):

```typescript
// OLD:
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { getArchmagePowerChoices } from '@/data/paths/archmage-powers';

// NEW:
import { getPathById } from '@/data/paths/registry';
```

**Step 2: Refactor handleSelectPath power choice logic**

Find the power choice logic (around lines 129-148). Replace:

```typescript
// OLD:
if (pathId === 'berserker') {
  choices = getBerserkerPowerChoices(currentLevel);
} else if (pathId === 'archmage') {
  choices = getArchmagePowerChoices(currentLevel);
}
// TODO: Add assassin, crusader when implemented

// NEW:
const pathDef = getPathById(pathId);
if (pathDef?.getPowerChoices) {
  choices = pathDef.getPowerChoices(currentLevel);
}
```

**Step 3: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/input-handlers/pathHandlers.ts 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ecs/systems/input-handlers/pathHandlers.ts
git commit -m "refactor(ecs): use path lookup functions in pathHandlers"
```

---

### Task 9: Refactor progression.ts to Use Path Lookup Functions

**Files:**
- Modify: `src/ecs/systems/progression.ts`

**Step 1: Replace imports**

Replace lines 19-22:

```typescript
// OLD:
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { getArchmagePowerChoices } from '@/data/paths/archmage-powers';
import { getGuardianEnhancementChoices } from '@/data/paths/guardian-enhancements';
import { getEnchanterEnhancementChoices } from '@/data/paths/enchanter-enhancements';

// NEW:
import { getPathById } from '@/data/paths/registry';
```

**Step 2: Refactor active path power choice logic**

Find around lines 100-116. Replace:

```typescript
// OLD:
if (pathId === 'berserker') {
  choices = getBerserkerPowerChoices(newLevel);
} else if (pathId === 'archmage') {
  choices = getArchmagePowerChoices(newLevel);
}
// TODO: Add assassin, crusader when implemented

// NEW:
const pathDef = getPathById(pathId);
if (pathDef?.getPowerChoices) {
  choices = pathDef.getPowerChoices(newLevel);
}
```

**Step 3: Refactor passive path enhancement choice logic**

Find around lines 136-162. Replace:

```typescript
// OLD:
if (pathId === 'guardian' && stanceState) {
  const choices = getGuardianEnhancementChoices(...);
  // ...
} else if (pathId === 'enchanter' && stanceState) {
  const choices = getEnchanterEnhancementChoices(...);
  // ...
}

// NEW:
const pathDef = getPathById(pathId);
if (pathDef?.getEnhancementChoices && stanceState) {
  // Determine tier values based on path type
  let tier1 = 0, tier2 = 0;
  if (pathId === 'guardian') {
    tier1 = stanceState.ironTier ?? 0;
    tier2 = stanceState.retributionTier ?? 0;
  } else if (pathId === 'enchanter') {
    tier1 = stanceState.arcaneSurgeTier ?? 0;
    tier2 = stanceState.hexVeilTier ?? 0;
  }

  const choices = pathDef.getEnhancementChoices(tier1, tier2);
  if (choices) {
    world.addComponent(player, 'pendingStanceEnhancement', {
      pathId,
      // Map to expected field names based on path
      ...(pathId === 'guardian'
        ? { ironChoice: choices.stance1, retributionChoice: choices.stance2 }
        : { arcaneSurgeChoice: choices.stance1, hexVeilChoice: choices.stance2 }
      ),
    });
  }
}
```

**Step 4: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/progression.ts 2>&1 | head -20`
Expected: No errors

**Step 5: Run progression tests**

Run: `npx vitest run src/ecs/systems/__tests__/progression.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/ecs/systems/progression.ts
git commit -m "refactor(ecs): use path lookup functions in progression"
```

---

### Task 10: Full Test and Build Verification

**Step 1: Run full build**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds

**Step 2: Run all unit tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -50`
Expected: All tests pass

**Step 3: Run E2E tests for path functionality**

Run: `npx playwright test --project="Desktop" -g "path" 2>&1 | tail -30`
Expected: Path-related E2E tests pass

**Step 4: Commit phase completion**

```bash
git add -A
git commit -m "chore: complete Phase 1 - path registry implementation"
```

---

## Phase 2: Split path-ability.ts

### Task 11: Create path-ability Directory Structure

**Files:**
- Create: `src/ecs/systems/path-ability/` directory

**Step 1: Create directory**

```bash
mkdir -p src/ecs/systems/path-ability
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(ecs): create path-ability module directory"
```

---

### Task 12: Extract Triggers Module

**Files:**
- Create: `src/ecs/systems/path-ability/triggers.ts`

**Step 1: Create triggers.ts with extracted code**

```typescript
// src/ecs/systems/path-ability/triggers.ts
/**
 * Trigger tracking for path abilities.
 * Records combat events that may activate path ability effects.
 */

import type { PathAbilityTrigger } from '@/types/paths';

/**
 * Context for trigger processing
 */
export interface TriggerContext {
  damage?: number;
  isCrit?: boolean;
  powerId?: string;
  isDodge?: boolean;
}

export interface PathTriggerEvent {
  trigger: PathAbilityTrigger;
  context: TriggerContext;
}

// Module-level tracking for path triggers (reset each tick)
let pendingTriggers: PathTriggerEvent[] = [];

/**
 * Record that a path ability trigger occurred this tick.
 * Called by CombatSystem or other systems when relevant events happen.
 */
export function recordPathTrigger(trigger: PathAbilityTrigger, context: TriggerContext): void {
  pendingTriggers.push({ trigger, context });
}

/**
 * Clear all recorded triggers.
 */
export function clearPathTriggerTracking(): void {
  pendingTriggers = [];
}

/**
 * Get pending triggers for this tick (read-only access).
 * Used by ResourceGenerationSystem to process resource gains.
 */
export function getPendingTriggers(): readonly PathTriggerEvent[] {
  return pendingTriggers;
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/path-ability/triggers.ts 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/systems/path-ability/triggers.ts
git commit -m "refactor(ecs): extract path-ability triggers module"
```

---

### Task 13: Extract Conditions Module

**Files:**
- Create: `src/ecs/systems/path-ability/conditions.ts`

**Step 1: Create conditions.ts with extracted code**

```typescript
// src/ecs/systems/path-ability/conditions.ts
/**
 * Condition checking for path abilities.
 * Evaluates whether ability conditions are met.
 */

import type { Entity } from '@/ecs/components';
import type { PathAbilityCondition } from '@/types/paths';

/**
 * Check if a condition is met.
 */
export function checkCondition(
  condition: PathAbilityCondition,
  player: Entity,
  enemy: Entity | undefined
): boolean {
  switch (condition.type) {
    case 'hp_below': {
      if (!player.health) return false;
      const hpPercent = (player.health.current / player.health.max) * 100;
      return hpPercent < condition.value;
    }
    case 'hp_above': {
      if (!player.health) return false;
      const hpPercent = (player.health.current / player.health.max) * 100;
      return hpPercent > condition.value;
    }
    case 'hp_threshold': {
      if (!player.health) return false;
      const hpRatio = player.health.current / player.health.max;
      return hpRatio <= condition.value;
    }
    case 'enemy_hp_below': {
      if (!enemy?.health) return false;
      const enemyHpPercent = (enemy.health.current / enemy.health.max) * 100;
      return enemyHpPercent < condition.value;
    }
    case 'combo_count': {
      const comboCount = player.combo?.count ?? 0;
      return comboCount >= condition.value;
    }
    case 'attack_count': {
      const attackCount = player.abilityTracking?.abilityCounters?.[condition.counterId] ?? 0;
      return attackCount >= condition.value;
    }
    case 'enemy_has_status': {
      if (!enemy?.statusEffects) return false;
      return enemy.statusEffects.length > 0;
    }
    default:
      return false;
  }
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/path-ability/conditions.ts 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/systems/path-ability/conditions.ts
git commit -m "refactor(ecs): extract path-ability conditions module"
```

---

### Task 14: Extract Effects Module

**Files:**
- Create: `src/ecs/systems/path-ability/effects.ts`

**Step 1: Create effects.ts with extracted code**

This is the largest extraction (~250 lines). Extract all the `apply*` functions and `processEffect`:

```typescript
// src/ecs/systems/path-ability/effects.ts
/**
 * Effect processing for path abilities.
 * Applies heals, damage, status effects, buffs, debuffs, shields.
 */

import type { Entity } from '@/ecs/components';
import type {
  PathAbility,
  PathAbilityEffect,
  StatusApplication,
} from '@/types/paths';
import type { StatusEffect, EnemyStatDebuff, ActiveBuff } from '@/types/game';
import { queueAnimationEvent, addCombatLog } from '@/ecs/utils';
import { checkCondition } from './conditions';
import type { TriggerContext } from './triggers';

// ============================================================================
// HELPERS
// ============================================================================

function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getStatusIcon(type: 'poison' | 'stun' | 'slow' | 'bleed'): string {
  switch (type) {
    case 'poison': return 'status-poison';
    case 'stun': return 'status-stun';
    case 'slow': return 'status-slow';
    case 'bleed': return 'status-bleed';
    default: return 'status-unknown';
  }
}

// ============================================================================
// EFFECT APPLICATIONS
// ============================================================================

function applyHeal(player: Entity, amount: number, abilityName: string, isPercentage: boolean = false): void {
  if (!player.health) return;

  let healAmount = amount;
  if (isPercentage || (amount > 0 && amount < 100)) {
    healAmount = Math.floor(player.health.max * (amount / 100));
  }

  const oldHealth = player.health.current;
  const newHealth = Math.min(player.health.max, oldHealth + healAmount);
  const actualHeal = newHealth - oldHealth;

  if (actualHeal > 0) {
    player.health.current = newHealth;
    addCombatLog(`${abilityName}: Healed ${actualHeal} HP`);
    queueAnimationEvent('item_proc', {
      type: 'heal',
      value: actualHeal,
      source: abilityName,
    });
  }
}

function applyDamageToEnemy(enemy: Entity, amount: number, abilityName: string, isReflect: boolean = false): void {
  if (!enemy.health || enemy.dying) return;

  enemy.health.current = Math.max(0, enemy.health.current - amount);

  const logMessage = isReflect
    ? `${abilityName}: Reflected ${amount} damage`
    : `${abilityName}: +${amount} bonus damage`;

  addCombatLog(logMessage);
  queueAnimationEvent('item_proc', {
    type: 'item',
    itemName: abilityName,
    effectDescription: `${amount} damage`,
  });
}

function applyStatusToEnemy(enemy: Entity, status: StatusApplication, abilityName: string, baseDamage?: number): void {
  if (!enemy || enemy.dying) return;
  if (Math.random() > status.chance) return;

  if (!enemy.statusEffects) {
    enemy.statusEffects = [];
  }

  let statusDamage = status.damage;
  if (status.statusType === 'bleed' && baseDamage && status.damage) {
    statusDamage = Math.floor(baseDamage * (status.damage / 100));
  }

  const newStatus: StatusEffect = {
    id: `${status.statusType}_${Date.now()}`,
    type: status.statusType,
    damage: statusDamage,
    remainingTurns: status.duration,
    icon: getStatusIcon(status.statusType),
  };

  enemy.statusEffects.push(newStatus);
  addCombatLog(`${abilityName}: Applied ${status.statusType}!`);
  queueAnimationEvent('status_applied', {
    type: 'status',
    effectType: status.statusType,
    applied: true,
  });
}

function applyShield(player: Entity, amount: number, duration: number, abilityName: string): void {
  if (!player.shield) {
    player.shield = { value: 0, remaining: 0, maxDuration: 0 };
  }

  player.shield.value = (player.shield.value || 0) + amount;
  player.shield.remaining = Math.max(player.shield.remaining || 0, duration);
  player.shield.maxDuration = Math.max(player.shield.maxDuration || 0, duration);

  addCombatLog(`${abilityName}: Gained ${amount} shield`);
}

function applyBuff(
  player: Entity,
  stat: 'power' | 'armor' | 'speed' | 'fortune',
  percentBonus: number,
  duration: number,
  abilityName: string,
  abilityId: string,
  icon: string
): void {
  if (!player.buffs) {
    player.buffs = [];
  }

  const existingBuffIndex = player.buffs.findIndex(b => {
    const parts = b.id.split('_');
    return parts.length >= 2 && parts[0] === abilityId && parts[1] === stat;
  });

  if (existingBuffIndex >= 0) {
    player.buffs[existingBuffIndex] = {
      ...player.buffs[existingBuffIndex],
      remainingTurns: duration,
    };
    const percentDisplay = Math.round(percentBonus * 100);
    addCombatLog(`${abilityName}: ${stat} buff refreshed (+${percentDisplay}%) for ${duration}s`);
  } else {
    const buff: ActiveBuff = {
      id: generateUniqueId(`${abilityId}_${stat}`),
      name: abilityName,
      stat,
      multiplier: 1 + percentBonus,
      remainingTurns: duration,
      icon: icon || 'buff',
    };
    player.buffs.push(buff);
    const percentDisplay = Math.round(percentBonus * 100);
    addCombatLog(`${abilityName}: ${stat} increased by ${percentDisplay}% for ${duration}s`);
  }
}

function applyDebuffToEnemy(
  enemy: Entity,
  stat: 'power' | 'armor' | 'speed',
  percentReduction: number,
  duration: number,
  abilityName: string,
  abilityId: string
): void {
  if (!enemy || enemy.dying) return;

  if (!enemy.statDebuffs) {
    enemy.statDebuffs = [];
  }

  const debuff: EnemyStatDebuff = {
    id: generateUniqueId(`${abilityId}_${stat}`),
    stat,
    percentReduction,
    remainingDuration: duration,
    sourceName: abilityName,
  };

  enemy.statDebuffs.push(debuff);
  const percentDisplay = Math.round(percentReduction * 100);
  addCombatLog(`${abilityName}: Enemy ${stat} reduced by ${percentDisplay}% for ${duration}s`);
}

// ============================================================================
// MAIN EFFECT PROCESSOR
// ============================================================================

/**
 * Process a single effect for an ability.
 */
export function processEffect(
  effect: PathAbilityEffect,
  ability: PathAbility,
  player: Entity,
  enemy: Entity | undefined,
  context: TriggerContext
): void {
  // Process heal effect
  if (effect.heal !== undefined && effect.heal > 0) {
    applyHeal(player, effect.heal, ability.name, true);
  }

  // Process damage effect (bonus damage)
  if (effect.damage !== undefined && effect.damage > 0 && enemy) {
    applyDamageToEnemy(enemy, effect.damage, ability.name);
  }

  // Process damage modifier
  if (effect.damageModifier) {
    const mod = effect.damageModifier;

    if (mod.condition && !checkCondition(mod.condition, player, enemy)) {
      return;
    }

    switch (mod.type) {
      case 'reflect': {
        if (context.damage && enemy) {
          const reflectRatio = mod.value < 1 ? mod.value : mod.value / 100;
          const reflected = Math.floor(context.damage * reflectRatio);
          applyDamageToEnemy(enemy, reflected, ability.name, true);
        }
        break;
      }
      case 'lifesteal': {
        if (context.damage) {
          const lifestealAmount = Math.floor(context.damage * (mod.value / 100));
          applyHeal(player, lifestealAmount, ability.name, false);
        }
        break;
      }
      case 'bonus_damage': {
        if (enemy) {
          const baseDamage = context.damage || player.attack?.baseDamage || 0;
          const bonusDmg = Math.floor(baseDamage * mod.value);
          applyDamageToEnemy(enemy, bonusDmg, ability.name);
        }
        break;
      }
      case 'convert_heal': {
        if (context.damage) {
          const converted = Math.floor(context.damage * (mod.value / 100));
          applyHeal(player, converted, ability.name, false);
        }
        break;
      }
    }
  }

  // Process status application
  if (effect.statusApplication && enemy) {
    applyStatusToEnemy(enemy, effect.statusApplication, ability.name, context.damage);
  }

  // Process stat modifiers (buffs and debuffs)
  if (effect.statModifiers) {
    effect.statModifiers.forEach(mod => {
      if (mod.target === 'enemy' && enemy) {
        const stat = mod.stat;
        if (stat === 'power' || stat === 'armor' || stat === 'speed') {
          const reduction = Math.abs(mod.percentBonus || 0);
          if (reduction > 0) {
            applyDebuffToEnemy(enemy, stat, reduction, effect.duration || 5, ability.name, ability.id);
          }
        }
      } else if (!mod.target || mod.target === 'self') {
        const stat = mod.stat;
        if ((stat === 'power' || stat === 'armor' || stat === 'speed' || stat === 'fortune') && effect.duration) {
          const bonus = mod.percentBonus || 0;
          if (bonus > 0) {
            applyBuff(player, stat, bonus, effect.duration, ability.name, ability.id, ability.icon);
          }
        }
      }
    });
  }

  // Process cleanse
  if (effect.cleanse && player.statusEffects) {
    player.statusEffects = [];
    addCombatLog(`${ability.name}: Cleansed all status effects`);
  }

  // Process shield
  if (effect.shield && effect.shield > 0) {
    applyShield(player, effect.shield, effect.duration || 5, ability.name);
  }
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/path-ability/effects.ts 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/systems/path-ability/effects.ts
git commit -m "refactor(ecs): extract path-ability effects module"
```

---

### Task 15: Create Index Module with Main System

**Files:**
- Create: `src/ecs/systems/path-ability/index.ts`

**Step 1: Create index.ts with main system**

```typescript
// src/ecs/systems/path-ability/index.ts
/**
 * PathAbilitySystem - processes path ability triggers during combat.
 *
 * This system processes path ability effects based on combat events:
 * - on_hit: When player attacks
 * - on_crit: When player lands a critical hit
 * - on_kill: When player kills an enemy
 * - on_damaged: When player takes damage
 * - on_dodge: When player dodges an attack
 * - on_power_use: When player uses a power
 * - combat_start: At the start of combat
 * - turn_start: At the start of each combat turn
 *
 * Runs after ItemEffectSystem and before StatusEffectSystem.
 */

import { getPlayer, getActiveEnemy, getGameState } from '@/ecs/queries';
import { getEffectiveDelta } from '@/ecs/loop';
import { getPathById, getPlayerActiveAbilities } from '@/data/paths/registry';
import type { Entity } from '@/ecs/components';
import type { PathAbility, PathAbilityTrigger } from '@/types/paths';

// Re-export submodules
export {
  recordPathTrigger,
  clearPathTriggerTracking,
  getPendingTriggers,
  type TriggerContext,
  type PathTriggerEvent,
} from './triggers';

export { checkCondition } from './conditions';
export { processEffect } from './effects';

import {
  getPendingTriggers,
  clearPathTriggerTracking,
  type TriggerContext,
} from './triggers';
import { checkCondition } from './conditions';
import { processEffect } from './effects';

// ============================================================================
// TRIGGER PROCESSING
// ============================================================================

/**
 * Process all abilities for a given trigger.
 */
function processTrigger(
  trigger: PathAbilityTrigger,
  context: TriggerContext,
  player: Entity,
  enemy: Entity | undefined,
  abilities: PathAbility[]
): void {
  for (const ability of abilities) {
    for (const effect of ability.effects) {
      if (effect.trigger !== trigger) continue;

      if (effect.condition && !checkCondition(effect.condition, player, enemy)) {
        continue;
      }

      if (player.path?.abilityCooldowns?.[ability.id] && player.path.abilityCooldowns[ability.id] > 0) {
        continue;
      }

      let shouldSetCooldown = false;
      if (effect.cooldown && effect.cooldown > 0) {
        shouldSetCooldown = true;
      }

      if (effect.chance !== undefined && Math.random() > effect.chance) {
        continue;
      }

      processEffect(effect, ability, player, enemy, context);

      if (shouldSetCooldown && player.path) {
        if (!player.path.abilityCooldowns) {
          player.path.abilityCooldowns = {};
        }
        player.path.abilityCooldowns[ability.id] = effect.cooldown! * 1000;
      }
    }
  }
}

/**
 * Update cooldowns for all abilities.
 */
function updateCooldowns(player: Entity, deltaMs: number): void {
  if (!player.path?.abilityCooldowns) return;

  const cooldowns = player.path.abilityCooldowns;
  for (const abilityId of Object.keys(cooldowns)) {
    const remaining = cooldowns[abilityId];
    if (remaining > 0) {
      cooldowns[abilityId] = Math.max(0, remaining - deltaMs);
    }
  }
}

// ============================================================================
// SYSTEM
// ============================================================================

/**
 * PathAbilitySystem - processes path ability triggers during combat.
 */
export function PathAbilitySystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') {
    clearPathTriggerTracking();
    return;
  }

  const player = getPlayer();
  if (!player) {
    clearPathTriggerTracking();
    return;
  }

  if (!player.path) {
    clearPathTriggerTracking();
    return;
  }

  const enemy = getActiveEnemy();
  const effectiveDelta = getEffectiveDelta(deltaMs);

  updateCooldowns(player, effectiveDelta);

  const abilities = getPlayerActiveAbilities(player);
  if (abilities.length === 0) {
    clearPathTriggerTracking();
    return;
  }

  for (const event of getPendingTriggers()) {
    processTrigger(event.trigger, event.context, player, enemy, abilities);
  }

  clearPathTriggerTracking();
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/systems/path-ability/index.ts 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/systems/path-ability/index.ts
git commit -m "refactor(ecs): create path-ability index with main system"
```

---

### Task 16: Update Imports Throughout Codebase

**Files:**
- Modify: All files that import from `path-ability.ts`

**Step 1: Find all imports**

Run: `grep -r "from.*path-ability" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"`

**Step 2: Update each import**

Change imports from:
```typescript
import { ... } from '../path-ability';
// or
import { ... } from '@/ecs/systems/path-ability';
```

To:
```typescript
import { ... } from '../path-ability';  // Still works - index.ts re-exports
// or
import { ... } from '@/ecs/systems/path-ability';  // Still works
```

The index.ts re-exports everything, so most imports should still work. Verify each file compiles.

**Step 3: Verify all imports work**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(ecs): update path-ability imports to use module"
```

---

### Task 17: Delete Old path-ability.ts

**Files:**
- Delete: `src/ecs/systems/path-ability.ts`

**Step 1: Verify module works**

Run: `npx vitest run src/ecs/systems/__tests__/path-ability.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass

**Step 2: Delete old file**

```bash
rm src/ecs/systems/path-ability.ts
```

**Step 3: Verify build still works**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(ecs): remove old path-ability.ts (now a module)"
```

---

### Task 18: Final Verification

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -50`
Expected: All tests pass

**Step 2: Run E2E tests**

Run: `npx playwright test --project="Desktop" 2>&1 | tail -30`
Expected: All E2E tests pass

**Step 3: Manual browser check**

Run: `npm run dev`
Verify: Play through Warrior Berserker and Mage Archmage paths - powers and abilities work correctly.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete Phase 2 - path-ability module split

Codebase simplification complete:
- Phase 1: Path registry as single source of truth
- Phase 2: path-ability.ts split into focused modules

Adding new paths now requires:
1. Define path in data/paths/<class>.ts with lookup functions
2. Add to registry
3. Done - no system changes needed"
```

---

## Summary

After completing this plan:

**Phase 1 Results:**
- Single registry at `src/data/paths/registry.ts`
- All paths have lookup functions (`getPowerChoices`, `getEnhancementChoices`)
- Systems branch on `path.type` or check for lookup functions, not path IDs
- Eliminated 3 duplicate import blocks
- Eliminated 10+ path-specific branches

**Phase 2 Results:**
- `path-ability/` module with 4 focused files (~100-250 lines each)
- Clear separation: triggers, conditions, effects, system
- Follows established `passive-effect/` pattern

**Adding Rogue/Paladin Paths:**
1. Create `src/data/paths/assassin-powers.ts` (or similar)
2. Update `src/data/paths/rogue.ts` with `getPowerChoices` etc.
3. Add to registry: `rogue: Object.values(ROGUE_PATHS)`
4. Done - systems discover automatically
