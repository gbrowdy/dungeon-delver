# ECS Architecture Cleanup Design

**Date:** 2026-01-05
**Status:** Approved
**Goal:** Eliminate ECS architecture violations - UI should purely render from snapshots with zero local game state.

---

## Problem Statement

Several React hooks and components violate ECS principles by maintaining local state that duplicates or shadows ECS data:

| Severity | File | Issue |
|----------|------|-------|
| HIGH | `useBattleAnimation.ts` | 16 useState, setTimeout/setInterval, accepts legacy `Enemy` |
| MEDIUM | `usePathResource.ts` | useState + setInterval for decay, accepts legacy `Player` |
| MEDIUM | `useStanceSystem.ts` | useState + Date.now() timer for cooldowns |
| DEAD | `PlayerCard.tsx` | Never used, imports legacy `Player` |
| DEAD | `EnemyCard.tsx` | Never used, imports legacy `Enemy` |
| LOW | `BattleOverlay.tsx` | Imports legacy `Enemy` type |

**Core principle:** UI should be a pure render of ECS snapshots with zero game state.

---

## Solution: Hybrid Event-Driven + Component Architecture

Events are the INPUT, components are the STATE, UI is the OUTPUT.

```
┌─────────────────────────────────────────────────────────────────┐
│  Combat/Power Systems                                           │
│  Queue events: { type: 'enemy_hit', damage: 25, isCrit: true } │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AnimationSystem (NEW)                                          │
│  Reads queue → Sets components on entities                      │
│  "enemy_hit event" → enemy.combatAnimation = { type: 'hit' }   │
│                    → enemy.visualEffects = { flash: true }      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Components (Approach B)                                        │
│  player.combatAnimation: { type, startedAtTick, duration }     │
│  player.visualEffects: { flash?, shake? }                       │
│  gameState.battlePhase: { phase, startedAtTick }               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Snapshots                                                      │
│  Include animation component data                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI (Pure render)                                               │
│  Reads snapshot.combatAnimation.type → applies CSS class        │
│  Zero useState, zero timers                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## New ECS Components

Add to `ecs/components.ts`:

```typescript
// Combat animation state (attacks, hits, casts)
combatAnimation?: {
  type: CombatAnimationType;  // 'attack' | 'hit' | 'cast' | 'die'
  startedAtTick: number;
  duration: number;           // in ms
  powerId?: string;           // for cast animations
  anticipation?: number;      // wind-up time before attack lands (ms)
};

// Visual effects (layered on top of combat animation)
visualEffects?: {
  flash?: { untilTick: number };
  shake?: { untilTick: number };
  hitStop?: { untilTick: number };
  aura?: { color: 'red' | 'blue' | 'green'; untilTick: number };
};

// Floating damage/text effects (moved from React state)
floatingEffects?: Array<{
  id: string;
  type: 'damage' | 'heal' | 'miss' | 'crit';
  value?: number;
  x: number;
  y: number;
  createdAtTick: number;
  duration: number;
}>;

// Battle phase (on gameState entity)
battlePhase?: {
  phase: BattlePhaseType;  // 'entering' | 'combat' | 'transitioning' | 'defeat'
  startedAtTick: number;
  duration?: number;
};

// Ground scrolling flag
groundScrolling?: boolean;
```

---

## AnimationSystem

New file `ecs/systems/animation.ts`:

```typescript
export function AnimationSystem(deltaMs: number): void {
  const gameState = getGameState();
  const player = getPlayer();
  const enemy = getActiveEnemy();
  const currentTick = getTick();

  // 1. Process pending animation events → set components
  for (const event of gameState.animationEvents ?? []) {
    if (event.consumed) continue;

    switch (event.type) {
      case 'enemy_hit':
        if (enemy) {
          player.combatAnimation = {
            type: COMBAT_ANIMATION.ATTACK,
            startedAtTick: currentTick,
            duration: ANIMATION_TIMING.HERO_ATTACK_DURATION,
            anticipation: ANIMATION_TIMING.HERO_ATTACK_ANTICIPATION,
          };
          enemy.combatAnimation = {
            type: COMBAT_ANIMATION.HIT,
            startedAtTick: currentTick,
            duration: 200
          };
          enemy.visualEffects = {
            flash: { untilTick: currentTick + msToTicks(100) },
            hitStop: { untilTick: currentTick + msToTicks(50) },
          };
          addFloatingEffect(enemy, event.payload);
        }
        event.consumed = true;
        break;
      // ... other event types
    }
  }

  // 2. Expire finished animations → clear components
  for (const entity of [player, enemy].filter(Boolean)) {
    if (entity.combatAnimation) {
      const elapsed = ticksToMs(currentTick - entity.combatAnimation.startedAtTick);
      if (elapsed >= entity.combatAnimation.duration) {
        delete entity.combatAnimation;
      }
    }
    // Clear expired visual effects
    clearExpiredEffects(entity, currentTick);
  }

  // 3. Expire floating effects
  // 4. Handle battle phase transitions
}
```

**System order:** Runs after Combat, Power, Death; before Cleanup.

---

## Snapshot Changes

**PlayerSnapshot additions:**
```typescript
combatAnimation: {
  type: CombatAnimationType;
  progress: number;  // 0-1
  powerId?: string;
} | null;

visualEffects: {
  flash: boolean;
  shake: boolean;
  hitStop: boolean;
};
```

**EnemySnapshot additions:**
```typescript
combatAnimation: {
  type: CombatAnimationType;
  progress: number;
  abilityType?: string;
} | null;

visualEffects: {
  flash: boolean;
  aura: 'red' | 'blue' | 'green' | null;
};
```

**GameStateSnapshot additions:**
```typescript
battlePhase: BattlePhaseType;
groundScrolling: boolean;
floatingEffects: ReadonlyArray<{
  id: string;
  type: 'damage' | 'heal' | 'miss';
  value?: number;
  x: number;
  y: number;
  isCrit?: boolean;
}>;
```

---

## UI Refactoring

**BattleArena.tsx becomes pure render:**
```typescript
function BattleArena({ player, enemy, gameState }: CombatSnapshot) {
  // Pure derivation - NO useState, NO timers
  const heroSpriteState = player?.combatAnimation?.type ?? COMBAT_ANIMATION.IDLE;
  const enemySpriteState = enemy?.combatAnimation?.type ?? COMBAT_ANIMATION.IDLE;

  const heroClasses = cn(
    'hero-sprite',
    heroSpriteState === COMBAT_ANIMATION.ATTACK && 'attacking',
    player?.visualEffects.flash && 'flash',
    player?.visualEffects.shake && 'shake',
  );

  return (
    <div className={cn(gameState.groundScrolling && 'ground-scrolling')}>
      <Sprite className={heroClasses} state={heroSpriteState} />
      <Sprite className={enemyClasses} state={enemySpriteState} />
      {gameState.floatingEffects.map(effect => (
        <FloatingText key={effect.id} {...effect} />
      ))}
    </div>
  );
}
```

**CSS handles:** Sprite animations, flash/shake effects, ground scrolling.
**ECS handles:** When to apply/remove states, timing, lifecycle.

---

## PathResource Migration

**Delete `usePathResource.ts`.** Move logic to ECS:

1. **Resource decay** → Add to `RegenSystem`:
```typescript
if (player.pathResource?.decay && !inCombat) {
  player.pathResource.current = Math.max(0,
    player.pathResource.current - player.pathResource.decay.rate
  );
}
```

2. **Threshold effects** → Pure functions in `utils/pathResourceUtils.ts`:
```typescript
export function getEffectiveCost(resource: PathResource, baseCost: number): number;
export function getDamageMultiplier(resource: PathResource): number;
```

3. **UI** → Reads `player.pathResource` from snapshot directly.

---

## StanceSystem Migration

**Delete `useStanceSystem.ts`.** Move logic to ECS:

1. **Cooldown ticking** → Add to `CooldownSystem`:
```typescript
if (player.stanceState?.stanceCooldownRemaining > 0) {
  player.stanceState.stanceCooldownRemaining -= deltaMs;
}
```

2. **Stance switching** → Command dispatched to InputSystem.

3. **UI** → Reads `player.stanceState` from snapshot.

---

## Constants

Add to `constants/enums.ts`:
```typescript
export const COMBAT_ANIMATION = {
  ATTACK: 'attack',
  HIT: 'hit',
  CAST: 'cast',
  DIE: 'die',
  IDLE: 'idle',
} as const;

export const VISUAL_EFFECT = {
  FLASH: 'flash',
  SHAKE: 'shake',
  HIT_STOP: 'hitStop',
  AURA: 'aura',
} as const;

export type CombatAnimationType = typeof COMBAT_ANIMATION[keyof typeof COMBAT_ANIMATION];
```

---

## File Changes Summary

**Delete:**
- `src/components/game/PlayerCard.tsx` (dead code)
- `src/components/game/EnemyCard.tsx` (dead code)
- `src/hooks/useBattleAnimation.ts` (replaced by ECS)
- `src/hooks/usePathResource.ts` (logic moved to systems)
- `src/hooks/useStanceSystem.ts` (logic moved to systems)
- `src/hooks/useTrackedTimeouts.ts` (no longer needed)

**Create:**
- `src/ecs/systems/animation.ts` (AnimationSystem)
- `src/utils/pathResourceUtils.ts` (pure threshold functions)

**Modify:**
- `src/ecs/components.ts` (add animation components)
- `src/ecs/snapshot.ts` (add animation fields)
- `src/ecs/loop.ts` (add AnimationSystem to order)
- `src/ecs/systems/regen.ts` (add resource decay)
- `src/ecs/systems/cooldown.ts` (add stance cooldown)
- `src/ecs/systems/flow.ts` (set battlePhase/groundScrolling)
- `src/components/game/BattleArena.tsx` (pure render)
- `src/components/game/BattleOverlay.tsx` (fix type: Enemy → EnemySnapshot)
- `src/constants/enums.ts` (add animation constants)

---

## Testing Strategy

1. **Unit tests for AnimationSystem** - verify events → components
2. **Snapshot tests** - verify animation data included correctly
3. **E2E tests** - verify animations still play in browser
4. **Delete old hook tests** - no longer applicable

---

## Success Criteria

- [ ] Zero useState in game components for animation/game state
- [ ] Zero setInterval/setTimeout in hooks for game timing
- [ ] All timing driven by ECS ticks
- [ ] UI components only receive snapshot types (not legacy Player/Enemy)
- [ ] All tests pass
- [ ] E2E confirms animations work in browser
