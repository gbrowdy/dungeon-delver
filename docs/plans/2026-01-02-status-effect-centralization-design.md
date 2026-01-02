# Status Effect Centralization Design

## Overview

Centralize status effect application across the codebase, following the pattern established by `applyDamageToPlayer` and `applyDamageToEnemy` in `damageUtils.ts`.

**Primary goal**: Code hygiene - consistency with damage utils pattern
**Secondary goals**: Bug prevention, future extensibility

## API Design

### File Location

`src/utils/statusEffectUtils.ts`

### Public Exports

```typescript
// Core functions
export function applyStatusToPlayer(
  player: Player,
  config: StatusEffectConfig,
  source: StatusEffectSource,
  immunities?: StatusEffectType[]
): PlayerStatusResult;

export function applyStatusToEnemy(
  enemy: Enemy,
  config: StatusEffectConfig,
  source: StatusEffectSource
): EnemyStatusResult;

// Utility for checking status
export function hasStatusEffect(
  statusEffects: StatusEffect[],
  type: StatusEffectType
): boolean;
```

### Types

```typescript
type StatusEffectSource =
  | 'enemy_ability'
  | 'power'
  | 'path_ability'
  | 'item_effect';

interface StatusEffectConfig {
  type: StatusEffectType;
  duration?: number;  // Uses default from COMBAT_BALANCE if not provided
  damage?: number;    // For poison/bleed DoT
  value?: number;     // For slow percentage
}

interface PlayerStatusResult {
  player: Player;     // Deep cloned, never mutates input
  logs: string[];     // Combat log messages (plain text, no emojis)
  applied: boolean;   // False if immunity blocked it
}

interface EnemyStatusResult {
  enemy: Enemy;       // Deep cloned
  logs: string[];
  applied: boolean;   // Always true (enemies have no immunity system)
}
```

## Behavior

### Refresh-Only (No Stacking)

All status effects refresh instead of stacking:
- New effect of same type replaces existing
- Takes higher damage/value if different (stronger effect wins)
- Duration resets to new effect's duration

### Defaults

Durations pulled from `COMBAT_BALANCE` when not specified:
- Poison: `DEFAULT_POISON_DURATION` (3)
- Stun: `DEFAULT_STUN_DURATION` (1)
- Slow: `DEFAULT_BUFF_DURATION` (3)
- Bleed: `DEFAULT_POISON_DURATION` (3)

### Caller Responsibilities

- Poison scaling by floor is caller's responsibility (not built into utility)
- Immunity array must be passed by caller for player status effects

## Internal Structure

Unified core with typed wrappers:

```
applyStatusToPlayer() ──┐
                        ├──> applyOrRefreshStatus() (shared logic)
applyStatusToEnemy() ───┘
```

Internal helpers (not exported):
- `applyOrRefreshStatus(statusEffects[], config)` - core add/refresh logic
- `getDefaultDuration(type)` - pulls from COMBAT_BALANCE
- `getStatusIcon(type)` - returns icon string
- `generateStatusId(type)` - returns `'{type}-{timestamp}'`

## Migration Scope

### Call Sites (8 total)

| File | Line | Current | After |
|------|------|---------|-------|
| `useCombatActions.ts` | 764-774 | Enemy poison inline | `applyStatusToPlayer` |
| `useCombatActions.ts` | 776-789 | Enemy stun inline | `applyStatusToPlayer` |
| `usePowerActions.ts` | 551-559 | Frost Nova slow | `applyStatusToEnemy` |
| `usePowerActions.ts` | 575-581 | Stunning Blow stun | `applyStatusToEnemy` |
| `usePathAbilities.ts` | 564-578 | Path ability status | `applyStatusToEnemy` |
| `useCombatActions.ts` | 285-289 | Apply trigger result | `applyStatusToEnemy` |
| `useCombatActions.ts` | 351-353 | On-crit trigger | `applyStatusToEnemy` |
| `useCombat.ts` | 215-240 | Legacy poison/stun | `applyStatusToPlayer` |

### Bugs Fixed

1. **Missing immunity check**: `usePowerActions.ts` stun doesn't check immunity
2. **Hardcoded durations**: Several locations ignore `COMBAT_BALANCE` constants
3. **String literals**: Some use `'poison'` instead of `STATUS_EFFECT_TYPE.POISON`

## Testing

### Unit Tests

`src/utils/__tests__/statusEffectUtils.test.ts`:

```typescript
describe('applyStatusToPlayer', () => {
  it('applies poison with correct duration and icon');
  it('applies stun with default duration from COMBAT_BALANCE');
  it('respects immunity - returns applied: false');
  it('refreshes existing effect instead of stacking');
  it('takes higher damage when refreshing poison');
  it('does not mutate original player');
});

describe('applyStatusToEnemy', () => {
  it('applies status effect to enemy');
  it('initializes statusEffects array if undefined');
  it('refreshes existing effect');
  it('does not mutate original enemy');
});

describe('hasStatusEffect', () => {
  it('returns true when effect exists');
  it('returns false when not present');
});
```

## Implementation Plan

Single PR containing:
1. Create `src/utils/statusEffectUtils.ts` (~100-120 lines)
2. Create `src/utils/__tests__/statusEffectUtils.test.ts`
3. Migrate all 8 call sites
4. Run full test suite to verify no regressions

## File Structure

```
src/utils/
├── damageUtils.ts              # Existing
├── statusEffectUtils.ts        # NEW
├── stateUtils.ts               # Existing (deep clone helpers)
└── __tests__/
    ├── statusEffectUtils.test.ts   # NEW
    └── ...existing tests
```
