# Centralize Enemy Damage Application

## Overview

Create an `applyDamageToEnemy()` function mirroring the existing `applyDamageToPlayer()` pattern to centralize all enemy damage application logic.

## Motivation

- **Consistency** - Symmetric API for both damage targets
- **Future-proofing** - Easy to add enemy shields, damage reduction, or invulnerability phases
- **Logging** - Centralized combat log entries for all enemy damage
- **Validation** - Prevent negative health, handle edge cases consistently

## Design

### Types

```typescript
export type EnemyDamageSource =
  | 'hero_attack'    // Standard hero auto-attack
  | 'power'          // Player power/ability damage
  | 'status_effect'  // DoT from poison, bleed, etc.
  | 'reflect'        // Reflected damage from items/path abilities
  | 'path_ability'   // Damage from path ability triggers
  | 'execute';       // Instant kill (Assassin momentum, etc.)

export interface EnemyDamageResult {
  enemy: Enemy;           // Updated enemy (cloned, not mutated)
  logs: string[];         // Combat log messages generated
  actualDamage: number;   // Actual damage dealt (0 if blocked)
  blocked: boolean;       // Whether blocked by enemy shield
  killed: boolean;        // Whether this damage killed the enemy
}
```

### Function

Location: `src/utils/damageUtils.ts`

```typescript
export function applyDamageToEnemy(
  enemy: Enemy,
  damage: number,
  source: EnemyDamageSource
): EnemyDamageResult
```

Behavior:
- Returns cloned enemy (immutable pattern)
- Checks enemy shield first (blocks all damage except execute)
- Execute source bypasses shields and sets health to 0
- Generates standardized combat logs based on source
- Returns `killed: true` when health reaches 0

### Log Messages

| Source | Message Format |
|--------|----------------|
| `hero_attack` | "{name} takes {damage} damage!" |
| `power` | "{name} takes {damage} damage!" |
| `status_effect` | "{name} takes {damage} damage from status effect!" |
| `reflect` | "{name} takes {damage} reflected damage!" |
| `path_ability` | "{name} takes {damage} damage!" |
| `execute` | "{name} executed!" |

## Migration

### Files to Update

| File | Call Sites | Sources |
|------|------------|---------|
| `useCombatActions.ts` | ~10 | hero_attack, reflect, path_ability |
| `usePowerActions.ts` | ~7 | power, execute |
| `combatActionHelpers.ts` | ~3 | path_ability, execute |
| `usePowers.ts` | ~1 | power |

### Pattern

```typescript
// Before
enemy.health -= finalDamage;
state.combatLog.add(`${enemy.name} takes ${finalDamage} damage!`);

// After
const damageResult = applyDamageToEnemy(enemy, finalDamage, 'hero_attack');
enemy = damageResult.enemy;
damageResult.logs.forEach(log => state.combatLog.add(log));
```

## Implementation Plan

1. Add `applyDamageToEnemy` function and types to `damageUtils.ts`
2. Add unit tests in `src/utils/__tests__/damageUtils.test.ts`
3. Migrate `useCombatActions.ts` call sites
4. Migrate `usePowerActions.ts` call sites
5. Migrate `combatActionHelpers.ts` call sites
6. Migrate `usePowers.ts` call sites
7. Remove any dead code, run tests
