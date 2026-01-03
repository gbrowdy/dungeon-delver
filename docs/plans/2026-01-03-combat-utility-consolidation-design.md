# Combat Utility Consolidation Design

## Overview

Consolidate duplicative combat logic spread across multiple files into centralized utility functions. Each consolidation will be implemented as a separate PR with unit and E2E tests.

## Consolidations

### 1. Health/Mana Restoration

**Files**: `src/utils/statsUtils.ts` (new)

**Problem**: `Math.min(current + amount, max)` pattern appears 20+ times across 6 files.

**API**:
```typescript
interface RestoreResult {
  player: Player;
  actualAmount: number;
  log?: string;
}

function restorePlayerHealth(
  player: Player,
  amount: number,
  options?: { source?: string }
): RestoreResult

function restorePlayerMana(
  player: Player,
  amount: number,
  options?: { source?: string }
): RestoreResult
```

**Log formats**:
- With source: `"Divine Heal restores 15 HP"`
- Without source: `"Restored 15 HP"`
- At cap: `"Restored 8 HP (full health)"`

**Files to update**:
- `src/hooks/combatActionHelpers.ts`
- `src/hooks/useCombat.ts`
- `src/hooks/useItemEffects.ts`
- `src/hooks/usePathAbilities.ts`
- `src/hooks/usePowerActions.ts`
- `src/hooks/usePowers.ts`

---

### 2. Path Resource Generation

**Files**: `src/utils/statsUtils.ts`

**Problem**: Path resource increment + capping logic appears 5+ times.

**API**:
```typescript
interface ResourceGenResult {
  player: Player;
  amountGenerated: number;
  log?: string;
}

function generatePathResource(
  player: Player,
  triggerType: 'onHit' | 'onCrit' | 'onKill' | 'onBlock' | 'onDamaged' | 'onPowerUse',
  options?: { source?: string }
): ResourceGenResult
```

**Files to update**:
- `src/hooks/useCombatActions.ts` (4 locations)
- `src/hooks/usePowerActions.ts` (1 location)

---

### 3. Trigger Result Application

**Files**: `src/utils/combatUtils.ts` (new)

**Problem**: Applying path trigger results (damage, reflection, status) appears 10+ times.

**API**:
```typescript
interface ApplyTriggerResult {
  enemy: Enemy;
  logs: string[];
}

function applyPathTriggerToEnemy(
  enemy: Enemy,
  triggerResult: PathTriggerResult
): ApplyTriggerResult
```

**Files to update**:
- `src/hooks/useCombatActions.ts` (8 locations)
- `src/hooks/usePowerActions.ts` (2 locations)

---

### 4. Buff Creation

**Files**: `src/utils/statsUtils.ts`

**Problem**: Buff creation + push pattern appears 15+ times.

**API**:
```typescript
interface AddBuffResult {
  player: Player;
  log?: string;
}

interface BuffConfig {
  name: string;
  stat: BuffStat;
  multiplier: number;
  duration: number;
  icon?: string;
  source?: string;
}

function addBuffToPlayer(
  player: Player,
  config: BuffConfig
): AddBuffResult
```

**Files to update**:
- `src/hooks/useCombat.ts`
- `src/hooks/useCombatActions.ts`
- `src/hooks/usePathAbilities.ts`
- `src/hooks/usePowerActions.ts`
- `src/hooks/usePowers.ts`
- `src/hooks/useRoomTransitions.ts`

---

### 5. Scaled Delay Calculation

**Files**: `src/utils/combatUtils.ts`

**Problem**: Delay scaling calculation repeated 4+ times.

**API**:
```typescript
function getScaledDelay(baseDelay: number, combatSpeed: number): number
```

**Files to update**:
- `src/hooks/useCombatActions.ts` (4 locations)

---

## File Organization

| File | Purpose |
|------|---------|
| `src/utils/statsUtils.ts` | Player state modifications (health, mana, resources, buffs) |
| `src/utils/combatUtils.ts` | Combat-specific utilities (trigger results, delays) |

---

## Implementation Plan

Each consolidation is a separate PR:

1. **PR 1**: Health/Mana Restoration (`refactor(utils): centralize health/mana restoration`)
2. **PR 2**: Path Resource Generation (`refactor(utils): centralize path resource generation`)
3. **PR 3**: Trigger Result Application (`refactor(combat): centralize trigger result application`)
4. **PR 4**: Buff Creation (`refactor(utils): centralize buff creation`)
5. **PR 5**: Scaled Delay Calculation (`refactor(combat): centralize delay scaling`)

---

## Testing Strategy

### Unit Tests

Each utility function gets unit tests in `src/utils/__tests__/`:
- `statsUtils.test.ts`
- `combatUtils.test.ts`

Test cases:
- Normal operation
- Edge cases (at cap, zero amount, negative values)
- Log message formatting
- Immutability (original objects unchanged)

### E2E Tests

Use existing E2E infrastructure (test hooks from `c3eca5a`) to verify:
- Health restoration works during combat (healing powers, items)
- Mana restoration works (regen, items)
- Path resources generate correctly on triggers
- Buffs apply and expire correctly
- Combat timing remains correct after delay refactor

---

## Acceptance Criteria

For each PR:
- [ ] New utility function(s) created
- [ ] All call sites updated to use new utility
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] No functional changes to game behavior
