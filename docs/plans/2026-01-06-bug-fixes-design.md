# Bug Fixes Design Document

**Date**: 2026-01-06
**Branch**: `fix/bugs`

## Overview

This document outlines fixes for 6 identified bugs in the roguelike game. All bugs have verified root causes and straightforward fixes.

---

## Bug #1: Level-up Popup Never Clears at Level 3+

### Problem
When leveling up at level 3+, the popup remains visible because `gameState.pendingLevelUp` is never cleared.

### Root Cause
In `input.ts` (DISMISS_POPUP case), `pendingLevelUp = null` only executes inside a condition that checks for path selection:

```typescript
if (level >= 2 && !hasPath) {
  gameState.phase = 'path-select';
  gameState.pendingLevelUp = null;  // Only cleared here!
}
gameState.paused = false;
```

At level 3+, the player already has a path, so `!hasPath` is false and `pendingLevelUp` is never cleared.

### Fix
**File**: `src/ecs/systems/input.ts` (lines ~107-122)

Move `pendingLevelUp = null` outside the path-select condition:

```typescript
if (cmd.popupType === 'levelUp' && player) {
  const level = player.progression?.level ?? 1;
  const hasPath = !!player.path;

  if (level >= 2 && !hasPath) {
    gameState.phase = 'path-select';
  }

  // Always clear pendingLevelUp after dismissing level-up popup
  gameState.pendingLevelUp = null;
  gameState.paused = false;
}
```

---

## Bug #2: Enemy Uses Same Attack Repeatedly

### Problem
Enemies only use one attack type repeatedly instead of varying their attacks.

### Root Cause
Enemy intent is calculated once at spawn (`enemies.ts:595`) and never recalculated. After an ability is used in `enemy-ability.ts`, only `attackReady` is removed - the stale intent remains.

### Fix
**File**: `src/ecs/systems/enemy-ability.ts` (after line 231)

Import `calculateEnemyIntent` and recalculate intent after ability use:

```typescript
import { calculateEnemyIntent } from '@/data/enemies';

// After: world.removeComponent(enemy, 'attackReady');
// Add:
if (enemy.enemy) {
  enemy.enemy.intent = calculateEnemyIntent(enemy.enemy);
}
```

---

## Bug #3: Status Effect Counters Show High Precision Decimals

### Problem
Poison and stun counters display as `4.987654321` instead of clean integers.

### Root Cause
`CharacterSprite.tsx` displays `effect.remainingTurns` without rounding, while active buffs correctly use `Math.ceil()`.

### Fix
**File**: `src/components/game/CharacterSprite.tsx` (line 270)

```typescript
// Change:
<span className="text-accent/90">{effect.remainingTurns}</span>

// To:
<span className="text-accent/90">{Math.ceil(effect.remainingTurns)}</span>
```

---

## Bug #4: Poison Does No Damage

### Problem
Poison status effect doesn't deal damage and may not display correctly.

### Root Cause
When enemies apply poison/stun in `enemy-ability.ts`, the StatusEffect objects are missing required `id` and `icon` fields:

```typescript
// Current (incomplete):
player.statusEffects.push({
  type: 'poison',
  remainingTurns: 3,
  damage: poisonDamage,
  // Missing: id, icon
});
```

The `id` field is used as a React key in `CharacterSprite.tsx`, and both fields are required by the `StatusEffect` interface.

### Fix
**File**: `src/ecs/systems/enemy-ability.ts`

**Poison** (lines 82-86):
```typescript
player.statusEffects.push({
  id: crypto.randomUUID(),
  type: 'poison',
  remainingTurns: 3,
  damage: poisonDamage,
  icon: 'Skull',
});
```

**Stun** (lines 107-110):
```typescript
player.statusEffects.push({
  id: crypto.randomUUID(),
  type: 'stun',
  remainingTurns: ability.value,
  icon: 'Zap',
});
```

---

## Bug #5: Fury Resource Binary Threshold

### Problem
Fury uses a binary threshold (0% bonus below 80, +30% at 80+) which encourages hoarding rather than continuous resource use.

### Root Cause
Fury's threshold config in `pathResources.ts` uses a single threshold at 80, unlike Arcane Charges which scales per-point from 1.

### Fix

**File 1**: `src/data/pathResources.ts` (lines 48-57)

Change Fury thresholds to per-point scaling:

```typescript
thresholds: [
  {
    value: 1,
    effect: {
      type: 'damage_bonus',
      value: 0.005,  // +0.5% per Fury = +50% at 100
      description: '+0.5% power damage per Fury',
    },
  },
],
```

**File 2**: `src/utils/pathResourceUtils.ts` (lines 43-47)

Add Fury to the per-point scaling logic:

```typescript
if (resource.type === 'arcane_charges' || resource.type === 'fury') {
  const chargeBonus = damageEffects.find(t => t.effect.value);
  if (chargeBonus) {
    multiplier += (chargeBonus.effect.value ?? 0) * resource.current;
  }
}
```

---

## Bug #6: Phase Changes Show in Combat Log

### Problem
Phase transitions (e.g., "Phase: combat -> floor-complete") appear in the combat log, which is noisy and not useful to players.

### Root Cause
`flow.ts` explicitly logs phase transitions:

```typescript
addCombatLog(`Phase: ${fromPhase} -> ${toPhase}`);
```

### Fix
**File**: `src/ecs/systems/flow.ts` (line 63)

Remove the phase transition log line:

```typescript
// Remove this line:
addCombatLog(`Phase: ${fromPhase} -> ${toPhase}`);
```

---

## Implementation Summary

| Bug | File(s) | Change Type |
|-----|---------|-------------|
| #1 | `input.ts` | Move line outside if block |
| #2 | `enemy-ability.ts` | Add import + 3 lines |
| #3 | `CharacterSprite.tsx` | Wrap in `Math.ceil()` |
| #4 | `enemy-ability.ts` | Add 2 fields to 2 objects |
| #5 | `pathResources.ts`, `pathResourceUtils.ts` | Change threshold config + add condition |
| #6 | `flow.ts` | Remove 1 line |

## Testing

All fixes should be validated with Playwright browser tests to confirm:
1. Level-up popup dismisses correctly at all levels
2. Enemies vary their attacks
3. Status effect counters show integers
4. Poison deals damage and displays correctly
5. Fury scales linearly with resource amount
6. Phase changes don't appear in combat log
