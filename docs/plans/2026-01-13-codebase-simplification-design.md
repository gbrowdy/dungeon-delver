# Codebase Simplification Design

**Date:** 2026-01-13
**Goal:** Reduce complexity to make implementing Rogue/Paladin paths straightforward

## Problem Statement

Implementing Warrior and Mage paths was painful because:
1. **Shotgun surgery** - Adding a path requires changes in 8+ files
2. **Duplicate imports** - 3 files have identical path imports with their own `getAllPaths()`
3. **Path-specific branches** - `if (pathId === 'berserker')` scattered across 5+ files
4. **Large files** - `path-ability.ts` is 605 lines, hard to hold in your head

## Success Criteria

When implementing Rogue/Paladin paths:
- Add path definition in ONE location (registry)
- No hunting for branches to update
- Systems work automatically via type-based logic

---

## Phase 1: Path Registry

### 1.1 Create Registry

**New file:** `src/data/paths/registry.ts`

```typescript
import { WARRIOR_PATHS } from './warrior';
import { MAGE_PATHS } from './mage';
// import { ROGUE_PATHS } from './rogue';    // When ready
// import { PALADIN_PATHS } from './paladin'; // When ready

// Single source of truth
const PATH_REGISTRY: Record<string, PathDefinition[]> = {
  warrior: Object.values(WARRIOR_PATHS),
  mage: Object.values(MAGE_PATHS),
};

const ALL_PATHS: PathDefinition[] = Object.values(PATH_REGISTRY).flat();

// === Lookups ===
export const getAllPaths = (): PathDefinition[] => ALL_PATHS;

export const getPathById = (id: string): PathDefinition | undefined =>
  ALL_PATHS.find(p => p.id === id);

export const getPathsForClass = (classId: string): PathDefinition[] =>
  PATH_REGISTRY[classId] ?? [];

export const getActivePaths = (): PathDefinition[] =>
  ALL_PATHS.filter(p => p.type === 'active');

export const getPassivePaths = (): PathDefinition[] =>
  ALL_PATHS.filter(p => p.type === 'passive');

// === Player-specific lookups ===
export const getPlayerActiveAbilities = (player: Entity): PathAbility[] => {
  if (!player.path) return [];
  const pathDef = getPathById(player.path.pathId);
  if (!pathDef) return [];
  return pathDef.abilities.filter(a => player.path!.abilities.includes(a.id));
};
```

### 1.2 Extend PathDefinition Type

**Update:** `src/types/paths.ts`

Add optional lookup functions to PathDefinition:

```typescript
export interface PathDefinition {
  // ... existing fields ...

  // Active path lookups (optional - only for active paths)
  getPowerChoices?: (level: number) => Power[];
  getSubpathPower?: (subpathId: string) => Power | undefined;
  getPowerUpgrade?: (powerId: string, tier: number) => PowerUpgrade | undefined;

  // Passive path lookups (optional - only for passive paths)
  getEnhancementChoices?: (tier1: number, tier2: number) => { stance1: StanceEnhancement; stance2: StanceEnhancement };
  getEnhancementById?: (id: string) => StanceEnhancement | undefined;
}
```

### 1.3 Update Path Definitions

**Update:** `src/data/paths/warrior.ts`

```typescript
export const BERSERKER_PATH: PathDefinition = {
  // ... existing fields ...
  getPowerChoices: getBerserkerPowerChoices,
  getSubpathPower: getBerserkerSubpathPower,
  getPowerUpgrade: getBerserkerPowerUpgrade,
};

export const GUARDIAN_PATH: PathDefinition = {
  // ... existing fields ...
  getEnhancementChoices: getGuardianEnhancementChoices,
  getEnhancementById: getGuardianEnhancementById,
};
```

Same pattern for `src/data/paths/mage.ts` (Archmage/Enchanter).

### 1.4 Migrate Consumers

**Delete duplicate code from:**

| File | Remove |
|------|--------|
| `src/utils/pathUtils.ts` | `getAllPaths()`, path imports - use registry instead |
| `src/ecs/systems/path-ability.ts` | `getAllPaths()`, `getPathById()`, `getActiveAbilities()`, path imports |
| `src/components/game/PathSelectionScreen.tsx` | Direct path imports - use registry |

**Refactor branches in:**

| File | Before | After |
|------|--------|-------|
| `progression.ts` | `if (pathId === 'berserker')` | `if (path.getPowerChoices)` |
| `pathHandlers.ts` | `if (pathId === 'guardian')` | `if (path.getEnhancementChoices)` |
| `playerSnapshot.ts` | Guardian-specific logic | `if (path.type === 'passive')` |

### 1.5 Verification

- [ ] `npm run build` passes
- [ ] `npx vitest run` passes
- [ ] E2E: Warrior Berserker path works (power selection, combat)
- [ ] E2E: Warrior Guardian path works (stance selection, combat)
- [ ] E2E: Mage Archmage path works
- [ ] E2E: Mage Enchanter path works

---

## Phase 2: Split path-ability.ts

### 2.1 Target Structure

```
src/ecs/systems/path-ability/
├── index.ts       # Main system, re-exports (~80 lines)
├── triggers.ts    # Trigger tracking (~50 lines)
├── conditions.ts  # Condition checking (~60 lines)
├── effects.ts     # Effect application (~250 lines)
```

### 2.2 File Contents

**`triggers.ts`**
```typescript
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

let pendingTriggers: PathTriggerEvent[] = [];

export function recordPathTrigger(trigger: PathAbilityTrigger, context: TriggerContext): void;
export function clearPathTriggerTracking(): void;
export function getPendingTriggers(): readonly PathTriggerEvent[];
```

**`conditions.ts`**
```typescript
export function checkCondition(
  condition: PathAbilityCondition,
  player: Entity,
  enemy: Entity | undefined
): boolean;
// Handles: hp_below, hp_above, hp_threshold, enemy_hp_below,
// combo_count, attack_count, enemy_has_status
```

**`effects.ts`**
```typescript
export function processEffect(
  effect: PathAbilityEffect,
  ability: PathAbility,
  player: Entity,
  enemy: Entity | undefined,
  context: TriggerContext
): void;

// Internal helpers (not exported)
function applyHeal(player: Entity, amount: number, abilityName: string, isPercentage?: boolean): void;
function applyDamageToEnemy(enemy: Entity, amount: number, abilityName: string, isReflect?: boolean): void;
function applyStatusToEnemy(enemy: Entity, status: StatusApplication, abilityName: string, baseDamage?: number): void;
function applyShield(player: Entity, amount: number, duration: number, abilityName: string): void;
function applyBuff(player: Entity, stat: string, percentBonus: number, duration: number, ...): void;
function applyDebuffToEnemy(enemy: Entity, stat: string, percentReduction: number, duration: number, ...): void;
```

**`index.ts`**
```typescript
// Re-exports for external consumers
export { recordPathTrigger, clearPathTriggerTracking, getPendingTriggers } from './triggers';
export type { TriggerContext, PathTriggerEvent } from './triggers';

// Main system
export function PathAbilitySystem(deltaMs: number): void;

// Internal (not exported)
function processTrigger(trigger, context, player, enemy, abilities): void;
function updateCooldowns(player: Entity, deltaMs: number): void;
```

### 2.3 Verification

- [ ] `npm run build` passes
- [ ] `npx vitest run src/ecs/systems/__tests__/path-ability.test.ts` passes
- [ ] E2E: Path abilities still trigger correctly

---

## Phase 3: Future Cleanup (Optional)

Lower priority items to address later:

1. **UI component size** - `ShopScreen.tsx` (846 lines), `ClassSelect.tsx` (651 lines)
2. **Test organization** - Large test files could be split by concern
3. **Remaining path-specific UI** - `StanceEnhancementPopup.tsx` has isGuardian/isEnchanter

---

## Implementation Order

1. **Phase 1.1-1.2**: Create registry and extend types (foundation)
2. **Phase 1.3**: Update Warrior/Mage path definitions with lookup functions
3. **Phase 1.4**: Migrate consumers one file at a time, test after each
4. **Phase 1.5**: Full verification
5. **Phase 2**: Split path-ability.ts (only after registry is stable)

---

## Adding Rogue/Paladin After This Refactor

With the registry in place, adding Assassin path becomes:

1. Create `src/data/paths/assassin-powers.ts` with power definitions
2. Update `src/data/paths/rogue.ts`:
   - Define `ASSASSIN_PATH` with `getPowerChoices`, `getSubpathPower`
   - Export in `ROGUE_PATHS`
3. Add to registry: `rogue: Object.values(ROGUE_PATHS)`
4. Done - no system changes needed

Compare to current state: 8+ files with branch hunting.
