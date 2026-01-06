# ECS Phase 5 & 6 Design: Component Migration & Cleanup

## Overview

This document details the migration of React components from the old hook-based architecture (`useGameState`, `CombatContext`) to the new ECS-based system (`GameContext`, `useGame`), followed by cleanup of deprecated code.

**Approach:** Big Bang migration - all components migrated at once, old system removed entirely.

---

## Architecture Decisions

### 1. Provider Location
`GameProvider` mounted at App level (wraps entire app).
- Single source of truth for ECS world and game loop
- Simpler Game.tsx becomes pure phase router
- Consistent with standard React patterns

### 2. State Access
Keep snapshot approach (already implemented).
- Components receive immutable `PlayerSnapshot`, `EnemySnapshot`, `GameStateSnapshot`
- Clean boundary prevents accidental ECS mutation
- Already built and tested

### 3. Context Strategy
Single `GameContext` replaces both `useGameState` and `CombatContext`.
- Granular hooks available: `usePlayer()`, `useEnemy()`, `useGameState()`, `useGameActions()`
- Fewer contexts = simpler mental model

### 4. Battle Phase State
`battlePhase` stays as local React state in CombatScreen.
- Purely presentation/animation logic
- Doesn't affect game mechanics
- Avoids polluting ECS with UI concerns

---

## Component Structure (Post-Migration)

```
App.tsx
└── GameProvider (ECS world, game loop, snapshots)
    └── Game.tsx (phase router, uses useGame())
        ├── MainMenu
        ├── ClassSelect
        ├── PathSelectionScreen
        ├── CombatScreen (local battlePhase state)
        │   ├── CombatHeader (uses useGame())
        │   ├── BattleArena
        │   ├── PowersPanel (uses usePlayer(), useGameActions())
        │   ├── PlayerStatsPanel (uses usePlayer())
        │   └── CombatLog
        ├── FloorCompleteScreen
        ├── ShopScreen
        ├── DeathScreen
        └── VictoryScreen
```

---

## State Mapping

| Old (useGameState) | New (useGame) |
|---|---|
| `state.player` | `player` (PlayerSnapshot) |
| `state.currentEnemy` | `enemy` (EnemySnapshot) |
| `state.gamePhase` | `gameState.phase` |
| `state.currentFloor` | `gameState.floor` |
| `state.currentRoom` | `gameState.room` |
| `state.isPaused` | `gameState.isPaused` |
| `state.combatLog` | `gameState.combatLog` |
| `state.pendingLevelUp` | `gameState.pendingLevelUp` |
| `heroProgress` | `heroProgress` |
| `enemyProgress` | `enemyProgress` |
| `actions.*` | `actions.*` |

| Old (useCombat) | New |
|---|---|
| `useCombat()` | `useGame()` |
| `useCombatPlayer()` | `usePlayer()` |
| `gameState` | `useGameState()` |
| `actions` | `useGameActions()` |

---

## Non-Combat Screens

### Shop System
Shop is NOT a tick-driven system. Approach:
- Generate shop items via utility function (deterministic from floor/class seed)
- `ShopScreen` receives computed `shopState` as prop from `Game.tsx`
- Purchases dispatch commands that modify player inventory

**Commands to add:**
- `PURCHASE_ITEM { itemId, cost }`
- `ENHANCE_ITEM { itemId }`

### DeathScreen
Props from Game.tsx:
- `player` (PlayerSnapshot)
- `gameState.floor`
- Actions: `retryFloor`, `restartGame`, `openShop`

### FloorCompleteScreen
Props from Game.tsx:
- `player` (PlayerSnapshot)
- `gameState.floor`
- Actions: `continueFromFloorComplete`, `openShop`

**Note:** Power-learning at floor complete is being removed.

---

## Feature Removal: Power Learning at Floor Complete

Removing the `availablePowers` / `onLearnPower` system from floor completion.

**Remove from FloorCompleteScreen:**
- `availablePowers` prop
- `onLearnPower` prop
- Power choice UI section

**Remove from commands.ts:**
- `CLAIM_POWER`
- `CLAIM_POWER_UPGRADE`
- `SKIP_POWER_REWARD`

**Remove from GameContext:**
- `learnPower` action

---

## Phase 5: Migration Steps

### Step 1: Mount GameProvider
- Add `<GameProvider>` wrapper in App.tsx
- ECS loop starts running

### Step 2: Wire Entity Creation
- `selectClass` action creates player entity via `createPlayerEntity()`
- Combat phase entry creates enemy entity via `createEnemyEntity()`
- Phase transitions handled by FlowSystem

### Step 3: Migrate Game.tsx
- Replace `useGameState()` with `useGame()`
- Update phase routing to use `gameState.phase`
- Compute `shopState` when needed via utility
- Remove `availablePowers` usage

### Step 4: Migrate CombatScreen.tsx
- Remove `<CombatProvider>` wrapper
- Keep local `battlePhase` useState
- Pass `battlePhase`/`setBattlePhase` to BattleArena as props
- Update imports

### Step 5: Migrate Combat Child Components
- **CombatHeader:** `useCombat()` → `useGame()`
- **PowersPanel:** `useCombat()` → `usePlayer()`, `useGameActions()`
- **PlayerStatsPanel:** `useCombatPlayer()` → `usePlayer()`

### Step 6: Migrate BattleArena
- Update to use ECS `animationEvents` from snapshot
- Receive `battlePhase` as prop instead of from context

### Step 7: Migrate Remaining Screens
- FloorCompleteScreen: remove power choice UI, update props
- ShopScreen: receive `shopState` as prop, add purchase/enhance commands
- DeathScreen: update props from `useGame()`
- VictoryScreen: update props from `useGame()`

### Step 8: Add Missing Commands
- `PURCHASE_ITEM { itemId, cost }` in commands.ts
- `ENHANCE_ITEM { itemId }` in commands.ts
- Handle in InputSystem

---

## Phase 6: Cleanup Steps

### Step 1: Delete Old Hooks
```
src/hooks/
├── useCombatLoop.ts
├── useCombatTimers.ts
├── useEventQueue.ts
├── useCombatActions.ts
├── usePowerActions.ts
├── useRewardCalculation.ts
├── useItemEffects.ts
├── useRoomTransitions.ts
├── useGameFlow.ts
├── usePathActions.ts
├── usePathAbilities.ts
├── usePauseControl.ts
├── useCharacterSetup.ts
├── useItemActions.ts
├── useShopState.ts (convert to utility first)
└── useGameState.ts
```

### Step 2: Delete CombatContext
```
src/contexts/CombatContext.tsx
```

### Step 3: Remove Dead Power-Choice Code
- Commands: `CLAIM_POWER`, `CLAIM_POWER_UPGRADE`, `SKIP_POWER_REWARD`
- Related types and utilities

### Step 4: Update Tests
- Fix any imports referencing deleted files
- Update component tests to use GameProvider

### Step 5: Verify
- `npx tsc --noEmit` - no type errors
- `npx vitest run` - all tests pass
- Manual playtest: all classes through 5 floors
- Verify: shop works, combat timing correct, level-ups trigger

---

## Success Criteria

1. **All existing game behavior preserved** (except removed power-learning)
2. **No race conditions** - death handling works correctly
3. **Timing feels identical** - attack speeds, cooldowns, regen unchanged
4. **Performance acceptable** - 60fps maintained
5. **Tests pass** - full test suite green
6. **Old code removed** - no dead hooks or contexts
7. **Shop fully functional** - purchases and enhancements work

---

## Files Summary

**New/Modified:**
- `src/App.tsx` - add GameProvider wrapper
- `src/components/game/Game.tsx` - use useGame()
- `src/components/game/CombatScreen.tsx` - remove CombatProvider
- `src/components/game/CombatHeader.tsx` - use useGame()
- `src/components/game/PowersPanel.tsx` - use usePlayer(), useGameActions()
- `src/components/game/PlayerStatsPanel.tsx` - use usePlayer()
- `src/components/game/BattleArena.tsx` - props for battlePhase
- `src/components/game/FloorCompleteScreen.tsx` - remove power UI
- `src/components/game/ShopScreen.tsx` - props from Game.tsx
- `src/ecs/commands.ts` - add PURCHASE_ITEM, ENHANCE_ITEM
- `src/ecs/systems/input.ts` - handle new commands

**Deleted:**
- `src/contexts/CombatContext.tsx`
- ~15 hooks in `src/hooks/`

---

## Dependencies

Existing ECS infrastructure (Phases 1-4) must be complete:
- ✅ miniplex installed
- ✅ Components, world, queries defined
- ✅ All systems implemented
- ✅ GameContext and hooks
- ✅ Snapshot functions
- ✅ Entity factories
