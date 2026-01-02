# Status Effect Centralization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize all status effect application into `statusEffectUtils.ts` following the `damageUtils.ts` pattern.

**Architecture:** Unified internal logic with typed wrapper functions (`applyStatusToPlayer`, `applyStatusToEnemy`). All effects refresh (no stacking). Deep cloning prevents mutation.

**Tech Stack:** TypeScript, Vitest, existing `stateUtils.ts` for deep cloning

**Design Doc:** `docs/plans/2026-01-02-status-effect-centralization-design.md`

---

## Task 1: Create Types and Helper Functions

**Files:**
- Create: `src/utils/statusEffectUtils.ts`
- Reference: `src/constants/enums.ts` (STATUS_EFFECT_TYPE)
- Reference: `src/constants/balance.ts` (COMBAT_BALANCE)

**Step 1: Create the file with types**

```typescript
import { Player, Enemy, StatusEffect } from '@/types/game';
import { STATUS_EFFECT_TYPE, StatusEffectType } from '@/constants/enums';
import { COMBAT_BALANCE } from '@/constants/balance';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Source of status effect for logging context.
 */
export type StatusEffectSource =
  | 'enemy_ability'
  | 'power'
  | 'path_ability'
  | 'item_effect';

/**
 * Configuration for applying a status effect.
 */
export interface StatusEffectConfig {
  type: StatusEffectType;
  duration?: number;  // Uses default from COMBAT_BALANCE if not provided
  damage?: number;    // For poison/bleed DoT
  value?: number;     // For slow percentage
}

/**
 * Result of applying status effect to player.
 */
export interface PlayerStatusResult {
  player: Player;
  logs: string[];
  applied: boolean;
}

/**
 * Result of applying status effect to enemy.
 */
export interface EnemyStatusResult {
  enemy: Enemy;
  logs: string[];
  applied: boolean;
}

// ============================================================================
// INTERNAL HELPERS (not exported)
// ============================================================================

const DEFAULT_DURATIONS: Record<StatusEffectType, number> = {
  [STATUS_EFFECT_TYPE.POISON]: COMBAT_BALANCE.DEFAULT_POISON_DURATION,
  [STATUS_EFFECT_TYPE.STUN]: COMBAT_BALANCE.DEFAULT_STUN_DURATION,
  [STATUS_EFFECT_TYPE.SLOW]: COMBAT_BALANCE.DEFAULT_BUFF_DURATION,
  [STATUS_EFFECT_TYPE.BLEED]: COMBAT_BALANCE.DEFAULT_POISON_DURATION,
};

const STATUS_ICONS: Record<StatusEffectType, string> = {
  [STATUS_EFFECT_TYPE.POISON]: 'status-poison',
  [STATUS_EFFECT_TYPE.STUN]: 'status-stun',
  [STATUS_EFFECT_TYPE.SLOW]: 'status-slow',
  [STATUS_EFFECT_TYPE.BLEED]: 'status-bleed',
};

function getDefaultDuration(type: StatusEffectType): number {
  return DEFAULT_DURATIONS[type] ?? COMBAT_BALANCE.DEFAULT_BUFF_DURATION;
}

function getStatusIcon(type: StatusEffectType): string {
  return STATUS_ICONS[type] ?? 'status-unknown';
}

function generateStatusId(type: StatusEffectType): string {
  return `${type}-${Date.now()}`;
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/utils/statusEffectUtils.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/statusEffectUtils.ts
git commit -m "feat(status): add types and helpers for status effect utils"
```

---

## Task 2: Implement Core Logic and hasStatusEffect

**Files:**
- Modify: `src/utils/statusEffectUtils.ts`

**Step 1: Add applyOrRefreshStatus internal function and hasStatusEffect export**

Add after the existing helpers in `statusEffectUtils.ts`:

```typescript
// ============================================================================
// CORE LOGIC
// ============================================================================

/**
 * Apply or refresh a status effect on an array.
 * If effect of same type exists, refresh it (taking higher damage/value).
 * Otherwise, add new effect.
 * Returns the new/updated effect and whether it was a refresh.
 */
function applyOrRefreshStatus(
  statusEffects: StatusEffect[],
  config: StatusEffectConfig
): { effect: StatusEffect; refreshed: boolean } {
  const duration = config.duration ?? getDefaultDuration(config.type);
  const existingIndex = statusEffects.findIndex(e => e.type === config.type);

  if (existingIndex >= 0) {
    // Refresh existing - take higher damage/value
    const existing = statusEffects[existingIndex];
    const newDamage = config.damage !== undefined
      ? Math.max(existing.damage ?? 0, config.damage)
      : existing.damage;
    const newValue = config.value !== undefined
      ? Math.max(existing.value ?? 0, config.value)
      : existing.value;

    const refreshedEffect: StatusEffect = {
      ...existing,
      damage: newDamage,
      value: newValue,
      remainingTurns: duration,
    };
    statusEffects[existingIndex] = refreshedEffect;
    return { effect: refreshedEffect, refreshed: true };
  }

  // Add new effect
  const newEffect: StatusEffect = {
    id: generateStatusId(config.type),
    type: config.type,
    damage: config.damage,
    value: config.value,
    remainingTurns: duration,
    icon: getStatusIcon(config.type),
  };
  statusEffects.push(newEffect);
  return { effect: newEffect, refreshed: false };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a status effect of a given type exists.
 */
export function hasStatusEffect(
  statusEffects: StatusEffect[],
  type: StatusEffectType
): boolean {
  return statusEffects.some(e => e.type === type);
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/utils/statusEffectUtils.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/statusEffectUtils.ts
git commit -m "feat(status): add core applyOrRefreshStatus logic and hasStatusEffect"
```

---

## Task 3: Implement applyStatusToPlayer

**Files:**
- Modify: `src/utils/statusEffectUtils.ts`

**Step 1: Add applyStatusToPlayer function**

Add after `hasStatusEffect`:

```typescript
/**
 * Apply a status effect to the player.
 *
 * Handles:
 * - Immunity checks (returns applied: false if immune)
 * - Duration defaults from COMBAT_BALANCE
 * - Effect refreshing (no stacking)
 * - Deep cloning (never mutates input)
 *
 * @example
 * ```typescript
 * const result = applyStatusToPlayer(player, {
 *   type: STATUS_EFFECT_TYPE.POISON,
 *   damage: 5,
 *   duration: 3,
 * }, 'enemy_ability', ['stun']); // player immune to stun
 * ```
 */
export function applyStatusToPlayer(
  player: Player,
  config: StatusEffectConfig,
  source: StatusEffectSource,
  immunities: StatusEffectType[] = []
): PlayerStatusResult {
  const updatedPlayer = deepClonePlayer(player);
  const logs: string[] = [];

  // Check immunity
  if (immunities.includes(config.type)) {
    logs.push(`Resisted ${config.type}!`);
    return { player: updatedPlayer, logs, applied: false };
  }

  // Apply or refresh the status
  const { effect, refreshed } = applyOrRefreshStatus(
    updatedPlayer.statusEffects,
    config
  );

  // Generate log message
  const logMessage = getStatusLogMessage('You', config.type, effect, refreshed);
  logs.push(logMessage);

  return { player: updatedPlayer, logs, applied: true };
}

/**
 * Generate a combat log message for status application.
 */
function getStatusLogMessage(
  targetName: string,
  type: StatusEffectType,
  effect: StatusEffect,
  refreshed: boolean
): string {
  const action = refreshed ? 'refreshed' : 'applied';

  switch (type) {
    case STATUS_EFFECT_TYPE.POISON:
      return `${targetName} ${refreshed ? 'are' : 'are'} poisoned! (${effect.damage} damage/turn for ${effect.remainingTurns} turns)`;
    case STATUS_EFFECT_TYPE.STUN:
      return `${targetName} ${refreshed ? 'are' : 'are'} stunned for ${effect.remainingTurns} turn(s)!`;
    case STATUS_EFFECT_TYPE.SLOW:
      const slowPercent = Math.round((effect.value ?? 0) * 100);
      return `${targetName} ${refreshed ? 'are' : 'are'} slowed by ${slowPercent}% for ${effect.remainingTurns} turns!`;
    case STATUS_EFFECT_TYPE.BLEED:
      return `${targetName} ${refreshed ? 'are' : 'are'} bleeding! (${effect.damage} damage/turn for ${effect.remainingTurns} turns)`;
    default:
      return `${targetName} ${action} ${type}!`;
  }
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/utils/statusEffectUtils.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/statusEffectUtils.ts
git commit -m "feat(status): implement applyStatusToPlayer with immunity checks"
```

---

## Task 4: Implement applyStatusToEnemy

**Files:**
- Modify: `src/utils/statusEffectUtils.ts`

**Step 1: Add applyStatusToEnemy function**

Add after `applyStatusToPlayer`:

```typescript
/**
 * Apply a status effect to an enemy.
 *
 * Handles:
 * - Duration defaults from COMBAT_BALANCE
 * - Effect refreshing (no stacking)
 * - Initializes statusEffects array if undefined
 * - Deep cloning (never mutates input)
 *
 * @example
 * ```typescript
 * const result = applyStatusToEnemy(enemy, {
 *   type: STATUS_EFFECT_TYPE.SLOW,
 *   value: 0.3,
 *   duration: 4,
 * }, 'power');
 * ```
 */
export function applyStatusToEnemy(
  enemy: Enemy,
  config: StatusEffectConfig,
  source: StatusEffectSource
): EnemyStatusResult {
  const updatedEnemy = deepCloneEnemy(enemy);
  const logs: string[] = [];

  // Initialize statusEffects array if needed
  if (!updatedEnemy.statusEffects) {
    updatedEnemy.statusEffects = [];
  }

  // Apply or refresh the status
  const { effect, refreshed } = applyOrRefreshStatus(
    updatedEnemy.statusEffects,
    config
  );

  // Generate log message
  const logMessage = getEnemyStatusLogMessage(
    updatedEnemy.name,
    config.type,
    effect,
    refreshed
  );
  logs.push(logMessage);

  return { enemy: updatedEnemy, logs, applied: true };
}

/**
 * Generate a combat log message for enemy status application.
 */
function getEnemyStatusLogMessage(
  enemyName: string,
  type: StatusEffectType,
  effect: StatusEffect,
  refreshed: boolean
): string {
  switch (type) {
    case STATUS_EFFECT_TYPE.POISON:
      return `${enemyName} is poisoned! (${effect.damage} damage/turn for ${effect.remainingTurns} turns)`;
    case STATUS_EFFECT_TYPE.STUN:
      return `${enemyName} is stunned for ${effect.remainingTurns} turn(s)!`;
    case STATUS_EFFECT_TYPE.SLOW:
      const slowPercent = Math.round((effect.value ?? 0) * 100);
      return `${enemyName} is slowed by ${slowPercent}% for ${effect.remainingTurns} turns!`;
    case STATUS_EFFECT_TYPE.BLEED:
      return `${enemyName} is bleeding! (${effect.damage} damage/turn for ${effect.remainingTurns} turns)`;
    default:
      return `${enemyName} affected by ${type}!`;
  }
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/utils/statusEffectUtils.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/statusEffectUtils.ts
git commit -m "feat(status): implement applyStatusToEnemy"
```

---

## Task 5: Write Unit Tests

**Files:**
- Create: `src/utils/__tests__/statusEffectUtils.test.ts`
- Reference: `src/utils/__tests__/damageUtils.test.ts` (for mock patterns)

**Step 1: Create test file with mock factories**

```typescript
import { describe, it, expect } from 'vitest';
import {
  applyStatusToPlayer,
  applyStatusToEnemy,
  hasStatusEffect,
  StatusEffectConfig,
} from '../statusEffectUtils';
import { Player, Enemy, StatusEffect } from '@/types/game';
import { STATUS_EFFECT_TYPE } from '@/constants/enums';
import { COMBAT_BALANCE } from '@/constants/balance';

const createMockPlayer = (overrides?: Partial<Player>): Player => ({
  name: 'Test Player',
  class: 'warrior',
  level: 1,
  experience: 0,
  experienceToNext: 100,
  gold: 0,
  baseStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  currentStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  powers: [],
  inventory: [],
  equippedItems: [],
  activeBuffs: [],
  statusEffects: [],
  isBlocking: false,
  comboCount: 0,
  lastPowerUsed: null,
  isDying: false,
  path: null,
  pendingAbilityChoice: false,
  shield: 0,
  shieldMaxDuration: 0,
  shieldRemainingDuration: 0,
  usedCombatAbilities: [],
  usedFloorAbilities: [],
  enemyAttackCounter: 0,
  abilityCounters: {},
  attackModifiers: [],
  hpRegen: 0,
  ...overrides,
});

const createMockEnemy = (overrides?: Partial<Enemy>): Enemy => ({
  id: 'test-enemy',
  name: 'Test Enemy',
  health: 100,
  maxHealth: 100,
  power: 10,
  armor: 5,
  speed: 10,
  tier: 'common',
  abilities: [],
  statusEffects: [],
  ...overrides,
});

describe('hasStatusEffect', () => {
  it('returns true when effect exists', () => {
    const effects: StatusEffect[] = [
      { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: 'status-poison' },
    ];
    expect(hasStatusEffect(effects, STATUS_EFFECT_TYPE.POISON)).toBe(true);
  });

  it('returns false when effect does not exist', () => {
    const effects: StatusEffect[] = [
      { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: 'status-poison' },
    ];
    expect(hasStatusEffect(effects, STATUS_EFFECT_TYPE.STUN)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasStatusEffect([], STATUS_EFFECT_TYPE.POISON)).toBe(false);
  });
});

describe('applyStatusToPlayer', () => {
  it('applies poison with correct duration and icon', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'enemy_ability'
    );

    expect(result.applied).toBe(true);
    expect(result.player.statusEffects).toHaveLength(1);
    expect(result.player.statusEffects[0].type).toBe('poison');
    expect(result.player.statusEffects[0].damage).toBe(5);
    expect(result.player.statusEffects[0].remainingTurns).toBe(COMBAT_BALANCE.DEFAULT_POISON_DURATION);
    expect(result.player.statusEffects[0].icon).toBe('status-poison');
  });

  it('applies stun with default duration from COMBAT_BALANCE', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.STUN },
      'enemy_ability'
    );

    expect(result.applied).toBe(true);
    expect(result.player.statusEffects[0].type).toBe('stun');
    expect(result.player.statusEffects[0].remainingTurns).toBe(COMBAT_BALANCE.DEFAULT_STUN_DURATION);
  });

  it('respects immunity - returns applied: false', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.STUN },
      'enemy_ability',
      [STATUS_EFFECT_TYPE.STUN]
    );

    expect(result.applied).toBe(false);
    expect(result.player.statusEffects).toHaveLength(0);
    expect(result.logs[0]).toContain('Resisted');
  });

  it('refreshes existing effect instead of stacking', () => {
    const existingEffect: StatusEffect = {
      id: 'poison-old',
      type: 'poison',
      damage: 3,
      remainingTurns: 1,
      icon: 'status-poison',
    };
    const player = createMockPlayer({ statusEffects: [existingEffect] });

    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5, duration: 3 },
      'enemy_ability'
    );

    expect(result.player.statusEffects).toHaveLength(1);
    expect(result.player.statusEffects[0].remainingTurns).toBe(3);
  });

  it('takes higher damage when refreshing poison', () => {
    const existingEffect: StatusEffect = {
      id: 'poison-old',
      type: 'poison',
      damage: 10,
      remainingTurns: 1,
      icon: 'status-poison',
    };
    const player = createMockPlayer({ statusEffects: [existingEffect] });

    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'enemy_ability'
    );

    // Should keep the higher damage (10)
    expect(result.player.statusEffects[0].damage).toBe(10);
  });

  it('does not mutate original player', () => {
    const player = createMockPlayer();
    const originalEffectsLength = player.statusEffects.length;

    applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'enemy_ability'
    );

    expect(player.statusEffects.length).toBe(originalEffectsLength);
  });
});

describe('applyStatusToEnemy', () => {
  it('applies status effect to enemy', () => {
    const enemy = createMockEnemy();
    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.SLOW, value: 0.3, duration: 4 },
      'power'
    );

    expect(result.applied).toBe(true);
    expect(result.enemy.statusEffects).toHaveLength(1);
    expect(result.enemy.statusEffects![0].type).toBe('slow');
    expect(result.enemy.statusEffects![0].value).toBe(0.3);
    expect(result.enemy.statusEffects![0].remainingTurns).toBe(4);
  });

  it('initializes statusEffects array if undefined', () => {
    const enemy = createMockEnemy({ statusEffects: undefined });
    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.STUN, duration: 2 },
      'power'
    );

    expect(result.enemy.statusEffects).toBeDefined();
    expect(result.enemy.statusEffects).toHaveLength(1);
  });

  it('refreshes existing effect', () => {
    const existingEffect: StatusEffect = {
      id: 'slow-old',
      type: 'slow',
      value: 0.2,
      remainingTurns: 1,
      icon: 'status-slow',
    };
    const enemy = createMockEnemy({ statusEffects: [existingEffect] });

    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.SLOW, value: 0.3, duration: 4 },
      'power'
    );

    expect(result.enemy.statusEffects).toHaveLength(1);
    expect(result.enemy.statusEffects![0].value).toBe(0.3); // Higher value
    expect(result.enemy.statusEffects![0].remainingTurns).toBe(4);
  });

  it('does not mutate original enemy', () => {
    const enemy = createMockEnemy();
    const originalEffectsLength = enemy.statusEffects?.length ?? 0;

    applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'power'
    );

    expect(enemy.statusEffects?.length ?? 0).toBe(originalEffectsLength);
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/statusEffectUtils.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/utils/__tests__/statusEffectUtils.test.ts
git commit -m "test(status): add unit tests for statusEffectUtils"
```

---

## Task 6: Migrate useCombatActions.ts - Enemy Poison/Stun

**Files:**
- Modify: `src/hooks/useCombatActions.ts:764-789`

**Step 1: Add import at top of file**

Find the imports section and add:

```typescript
import { applyStatusToPlayer } from '@/utils/statusEffectUtils';
```

**Step 2: Replace poison case (lines 764-774)**

Find:
```typescript
case 'poison': {
  const poisonDamage = Math.floor(ability.value * (1 + (prev.currentFloor - 1) * COMBAT_BALANCE.POISON_SCALING_PER_FLOOR));
  player.statusEffects.push({
    id: `poison-${Date.now()}`,
    type: STATUS_EFFECT_TYPE.POISON,
    damage: poisonDamage,
    remainingTurns: COMBAT_BALANCE.DEFAULT_POISON_DURATION,
    icon: 'status-poison',
  });
  logs.push(`☠️ You are poisoned! (${poisonDamage} damage/turn for ${COMBAT_BALANCE.DEFAULT_POISON_DURATION} turns)`);
  break;
}
```

Replace with:
```typescript
case 'poison': {
  const poisonDamage = Math.floor(ability.value * (1 + (prev.currentFloor - 1) * COMBAT_BALANCE.POISON_SCALING_PER_FLOOR));
  const immunities = getStatusImmunities(player);
  const poisonResult = applyStatusToPlayer(
    player,
    { type: STATUS_EFFECT_TYPE.POISON, damage: poisonDamage },
    'enemy_ability',
    immunities
  );
  player = poisonResult.player;
  logs.push(...poisonResult.logs);
  break;
}
```

**Step 3: Replace stun case (lines 776-789)**

Find:
```typescript
case 'stun': {
  const immunities = getStatusImmunities(player);
  if (immunities.includes('stun')) {
    logs.push(`🛡️ Immovable Object! You resist the stun!`);
  } else {
    player.statusEffects.push({
      id: `stun-${Date.now()}`,
      type: STATUS_EFFECT_TYPE.STUN,
      remainingTurns: ability.value,
      icon: 'status-stun',
    });
    logs.push(`💫 You are stunned for ${ability.value} turn(s)!`);
  }
  break;
}
```

Replace with:
```typescript
case 'stun': {
  const immunities = getStatusImmunities(player);
  const stunResult = applyStatusToPlayer(
    player,
    { type: STATUS_EFFECT_TYPE.STUN, duration: ability.value },
    'enemy_ability',
    immunities
  );
  player = stunResult.player;
  logs.push(...stunResult.logs);
  break;
}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/hooks/useCombatActions.ts
git commit -m "refactor(combat): migrate enemy poison/stun to statusEffectUtils"
```

---

## Task 7: Migrate useCombatActions.ts - Path Trigger Status

**Files:**
- Modify: `src/hooks/useCombatActions.ts:285-289` and `351-353`

**Step 1: Add applyStatusToEnemy import**

Update the import to include both functions:

```typescript
import { applyStatusToPlayer, applyStatusToEnemy } from '@/utils/statusEffectUtils';
```

**Step 2: Replace on_hit status application (lines 285-289)**

Find:
```typescript
// Apply status effect to enemy if triggered
if (onHitResult.statusToApply) {
  enemy.statusEffects = enemy.statusEffects || [];
  enemy.statusEffects.push(onHitResult.statusToApply);
```

Replace with:
```typescript
// Apply status effect to enemy if triggered
if (onHitResult.statusToApply) {
  const statusResult = applyStatusToEnemy(
    enemy,
    {
      type: onHitResult.statusToApply.type,
      damage: onHitResult.statusToApply.damage,
      value: onHitResult.statusToApply.value,
      duration: onHitResult.statusToApply.remainingTurns,
    },
    'path_ability'
  );
  enemy = statusResult.enemy;
```

**Step 3: Replace on_crit status application (lines 351-353)**

Find:
```typescript
// Apply status effect to enemy if triggered
if (onCritResult.statusToApply) {
  enemy.statusEffects = enemy.statusEffects || [];
  enemy.statusEffects.push(onCritResult.statusToApply);
```

Replace with:
```typescript
// Apply status effect to enemy if triggered
if (onCritResult.statusToApply) {
  const critStatusResult = applyStatusToEnemy(
    enemy,
    {
      type: onCritResult.statusToApply.type,
      damage: onCritResult.statusToApply.damage,
      value: onCritResult.statusToApply.value,
      duration: onCritResult.statusToApply.remainingTurns,
    },
    'path_ability'
  );
  enemy = critStatusResult.enemy;
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/hooks/useCombatActions.ts
git commit -m "refactor(combat): migrate path trigger status to statusEffectUtils"
```

---

## Task 8: Migrate usePowerActions.ts - Frost Nova and Stunning Blow

**Files:**
- Modify: `src/hooks/usePowerActions.ts:550-586`

**Step 1: Add import at top of file**

```typescript
import { applyStatusToEnemy } from '@/utils/statusEffectUtils';
import { STATUS_EFFECT_TYPE } from '@/constants/enums';
```

**Step 2: Replace Frost Nova slow (lines 550-559)**

Find:
```typescript
// Apply slow effect
enemy.statusEffects = enemy.statusEffects || [];
enemy.statusEffects.push({
  id: `slow-${Date.now()}`,
  type: 'slow',
  value: 0.3, // 30% slow
  remainingTurns: 4,
  icon: 'status-slow',
});
logs.push(`❄️ Enemy slowed by 30% for 4 turns!`);
```

Replace with:
```typescript
// Apply slow effect
const slowResult = applyStatusToEnemy(
  enemy,
  { type: STATUS_EFFECT_TYPE.SLOW, value: 0.3, duration: 4 },
  'power'
);
enemy = slowResult.enemy;
logs.push(...slowResult.logs);
```

**Step 3: Replace Stunning Blow stun (lines 574-583)**

Find:
```typescript
// 40% chance to stun
const stunChance = 0.4;
if (Math.random() < stunChance) {
  enemy.statusEffects = enemy.statusEffects || [];
  enemy.statusEffects.push({
    id: `stun-${Date.now()}`,
    type: 'stun',
    remainingTurns: 2,
    icon: 'status-stun',
  });
  logs.push(`💫 Enemy stunned for 2 turns!`);
  statusApplied = true;
} else {
  logs.push(`Stun failed!`);
}
```

Replace with:
```typescript
// 40% chance to stun
const stunChance = 0.4;
if (Math.random() < stunChance) {
  const stunResult = applyStatusToEnemy(
    enemy,
    { type: STATUS_EFFECT_TYPE.STUN, duration: 2 },
    'power'
  );
  enemy = stunResult.enemy;
  logs.push(...stunResult.logs);
  statusApplied = true;
} else {
  logs.push(`Stun failed!`);
}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/hooks/usePowerActions.ts
git commit -m "refactor(powers): migrate Frost Nova and Stunning Blow to statusEffectUtils"
```

---

## Task 9: Migrate useCombat.ts - Legacy Poison/Stun

**Files:**
- Modify: `src/hooks/useCombat.ts:215-240`

**Step 1: Add imports at top of file**

```typescript
import { applyStatusToPlayer } from '@/utils/statusEffectUtils';
import { STATUS_EFFECT_TYPE } from '@/constants/enums';
import { COMBAT_BALANCE } from '@/constants/balance';
```

**Step 2: Replace poison case (lines 215-225)**

Find:
```typescript
case 'poison': {
  const poisonDamage = Math.floor(ability.value * (1 + (floor - 1) * 0.1));
  updatedPlayer.statusEffects.push({
    id: `poison-${Date.now()}`,
    type: 'poison',
    damage: poisonDamage,
    remainingTurns: 3,
    icon: 'status-poison',
  });
  logs.push(`☠️ You are poisoned! (${poisonDamage} damage/turn for 3 turns)`);
  break;
}
```

Replace with:
```typescript
case 'poison': {
  const poisonDamage = Math.floor(ability.value * (1 + (floor - 1) * COMBAT_BALANCE.POISON_SCALING_PER_FLOOR));
  const immunities = getStatusImmunities(player);
  const poisonResult = applyStatusToPlayer(
    updatedPlayer,
    { type: STATUS_EFFECT_TYPE.POISON, damage: poisonDamage },
    'enemy_ability',
    immunities
  );
  updatedPlayer = poisonResult.player;
  logs.push(...poisonResult.logs);
  break;
}
```

**Step 3: Replace stun case (lines 227-240)**

Find:
```typescript
case 'stun': {
  const immunities = getStatusImmunities(player);
  if (immunities.includes('stun')) {
    logs.push(`🛡️ Immovable Object! You resist the stun!`);
  } else {
    updatedPlayer.statusEffects.push({
      id: `stun-${Date.now()}`,
      type: 'stun',
      remainingTurns: ability.value,
      icon: 'status-stun',
    });
    logs.push(`💫 You are stunned for ${ability.value} turn(s)!`);
  }
  break;
}
```

Replace with:
```typescript
case 'stun': {
  const immunities = getStatusImmunities(player);
  const stunResult = applyStatusToPlayer(
    updatedPlayer,
    { type: STATUS_EFFECT_TYPE.STUN, duration: ability.value },
    'enemy_ability',
    immunities
  );
  updatedPlayer = stunResult.player;
  logs.push(...stunResult.logs);
  break;
}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add src/hooks/useCombat.ts
git commit -m "refactor(combat): migrate legacy poison/stun to statusEffectUtils"
```

---

## Task 10: Migrate usePathAbilities.ts

**Files:**
- Modify: `src/hooks/usePathAbilities.ts:564-578`

**Step 1: Check if applyStatusToEnemy import is needed**

If not already present, add:

```typescript
import { applyStatusToEnemy } from '@/utils/statusEffectUtils';
```

**Step 2: Review path ability status creation (lines 564-578)**

The current code creates a `statusToApply` object that gets returned and applied elsewhere. Since this is returned via `TriggerResult.statusToApply` and applied in `useCombatActions.ts` (which we already migrated), we can leave this as-is.

The status creation here is just building the config object - the actual application happens in the call sites we already migrated.

**No changes needed for this file.**

**Step 3: Commit (skip if no changes)**

If any changes were made:
```bash
git add src/hooks/usePathAbilities.ts
git commit -m "refactor(paths): update status creation for statusEffectUtils compatibility"
```

---

## Task 11: Run Full Test Suite and Lint

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run unit tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Run build**

Run: `npm run build`
Expected: No errors

**Step 4: Fix any issues found**

If any errors, fix them and commit:
```bash
git add -A
git commit -m "fix: address lint/test issues from status effect migration"
```

---

## Task 12: Final Commit and Summary

**Step 1: Verify all changes**

Run: `git log --oneline -10`

Expected commits (newest first):
- fix: address lint/test issues (if needed)
- refactor(combat): migrate legacy poison/stun to statusEffectUtils
- refactor(powers): migrate Frost Nova and Stunning Blow to statusEffectUtils
- refactor(combat): migrate path trigger status to statusEffectUtils
- refactor(combat): migrate enemy poison/stun to statusEffectUtils
- test(status): add unit tests for statusEffectUtils
- feat(status): implement applyStatusToEnemy
- feat(status): implement applyStatusToPlayer with immunity checks
- feat(status): add core applyOrRefreshStatus logic and hasStatusEffect
- feat(status): add types and helpers for status effect utils

**Step 2: Run full validation one more time**

Run: `npm run build && npm run lint && npx vitest run`
Expected: All pass

**Done!**

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Types and helpers | `statusEffectUtils.ts` (create) |
| 2 | Core logic + hasStatusEffect | `statusEffectUtils.ts` |
| 3 | applyStatusToPlayer | `statusEffectUtils.ts` |
| 4 | applyStatusToEnemy | `statusEffectUtils.ts` |
| 5 | Unit tests | `statusEffectUtils.test.ts` (create) |
| 6 | Migrate enemy poison/stun | `useCombatActions.ts` |
| 7 | Migrate path trigger status | `useCombatActions.ts` |
| 8 | Migrate Frost Nova/Stunning Blow | `usePowerActions.ts` |
| 9 | Migrate legacy poison/stun | `useCombat.ts` |
| 10 | Review path abilities | `usePathAbilities.ts` (no change needed) |
| 11 | Full test suite | Validation |
| 12 | Final verification | Summary |

**Bugs fixed:**
- `useCombat.ts` now uses `COMBAT_BALANCE.POISON_SCALING_PER_FLOOR` instead of hardcoded `0.1`
- All locations now use `STATUS_EFFECT_TYPE` enum instead of string literals
- All locations use `COMBAT_BALANCE` duration constants
