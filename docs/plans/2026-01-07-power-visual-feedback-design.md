# Power Visual Feedback Design

## Overview

Add visual feedback for power usage to make abilities feel impactful and inform players of effects. Covers damage powers, self-buffs, and secondary effects (healing, death immunity, etc.).

## Design Decisions

- **Damage powers**: Distinct impact effects on enemy (fire/rage + shockwave themes)
- **Buff display**: Status icons with timers above player + persistent aura glow
- **Secondary effects**: Visual flash + floating text for instant effects, status icons for timed effects
- **Architecture**: Strict ECS data flow (Systems → Components → Snapshots → React)

---

## 1. Power Impact Effects (Damage Powers)

When a damage power hits an enemy, a distinct visual effect plays ON the enemy.

### Effect Mapping (Berserker)

| Power | Visual Effect |
|-------|---------------|
| Rage Strike | Fiery burst - red/orange explosion particles, brief flame linger |
| Savage Slam | Shockwave - white/yellow concentric rings, ground crack effect |
| Reckless Charge | Impact force - horizontal slash trail with ember particles |

### Implementation

- `PowerSystem` queues `spell_cast` event with `powerId` in payload
- `AnimationSystem` processes event, sets `enemy.visualEffects.powerImpact = { type, untilTick }`
- `Snapshot` copies `visualEffects.powerImpact` to enemy snapshot
- `CharacterSprite` reads snapshot, renders `PowerImpactEffect` component
- Duration: ~400-500ms

---

## 2. Buff Display (Status Icons + Aura)

When player gains a timed buff, two visual elements appear:

### A) Status Icons Above Player Head

- Positioned above sprite, centered (same layout as enemy status effects)
- Icon representing buff type + remaining seconds counter
- Multiple buffs stack horizontally
- Icons: flame (power), wind lines (speed), shield (defensive)

### B) Persistent Character Aura

- Subtle pulsing glow outline around hero sprite while buff active
- Color-coded:
  - Power buff → Red/orange glow
  - Speed buff → Yellow/white glow
  - Multiple buffs → Blended or dominant color
- Fades out when buff expires (not instant)

### Implementation

- Player already has `buffs[]` array with `remainingTurns` in snapshot
- `CharacterSprite` reads `buffs` and renders:
  - `PlayerBuffBar` component (icons + timers)
  - `BuffAura` component (glow effect)
- Reuses `STATUS_ICONS` mapping pattern from enemy status display
- Player buffs styled positive (green/gold), enemy debuffs styled negative (red)

---

## 3. Secondary Effect Feedback

### A) Instant Effects (Lifesteal, One-time Heal)

- `PowerSystem` queues: `queueAnimationEvent('player_heal', { value: healAmount })`
- `AnimationSystem` sets `player.visualEffects.flash = { color: 'green', untilTick }`
- `AnimationSystem` pushes to `gameState.floatingEffects[]`: `{ type: 'heal', value, targetEntity: 'player' }`
- React renders green flash + floating "+15 HP" text

### B) Timed Effects (Death Immunity, Damage Reduction)

- `PowerSystem` already pushes to `player.statusEffects[]` with `remainingTurns`
- `StatusEffectSystem` ticks down duration each second
- Snapshot includes `statusEffects` array
- React renders status icon + timer via `PlayerBuffBar`

### C) Proc Effects (Cooldown Reset on Kill)

- `PowerSystem` queues: `queueAnimationEvent('power_proc', { type: 'cooldown_reset' })`
- `AnimationSystem` pushes floating text: "Cooldowns Reset!"
- Brief golden flash via `visualEffects`

---

## 4. ECS Architecture (Strict)

### Data Flow

```
User clicks power button
  → useGameActions().usePower(id)
    → dispatches command to queue
      → InputSystem processes ACTIVATE_POWER
        → adds 'casting' component to player

PowerSystem runs
  → reads 'casting' component
  → applies damage to enemy.health
  → pushes to player.statusEffects[] (for buffs)
  → pushes to player.buffs[] (for stat buffs)
  → calls queueAnimationEvent() → pushes to gameState.animationEvents[]
  → removes 'casting' component

AnimationSystem runs
  → reads gameState.animationEvents[]
  → for 'spell_cast' event: sets entity.visualEffects
  → for 'player_heal' event: sets visualEffects.flash, pushes floatingEffects
  → marks events consumed when displayUntilTick reached

CleanupSystem runs
  → removes consumed animation events
  → removes expired floatingEffects

Snapshot runs (every frame)
  → copies entity.visualEffects → snapshot.visualEffects
  → copies entity.buffs → snapshot.buffs
  → copies entity.statusEffects → snapshot.statusEffects
  → copies gameState.floatingEffects → snapshot.floatingEffects

React renders (reads snapshot ONLY)
  → CharacterSprite reads snapshot.visualEffects → applies CSS classes
  → CharacterSprite reads snapshot.buffs → renders aura
  → PlayerBuffBar reads snapshot.buffs/statusEffects → renders icons
  → EffectsLayer reads snapshot.floatingEffects → renders floating text
  → PowerImpactEffect reads snapshot → renders burst effect
```

### React Constraints

React components NEVER:
- Modify entity state
- Call world.addComponent/removeComponent
- Dispatch commands directly (only through useGameActions hook)
- Track their own animation state (all timing in ECS)

### Timing Control

- All durations use `untilTick` fields
- Systems check `getTick()` to expire effects
- React just asks "is this effect active in the snapshot?"

---

## 5. Component Changes

### ECS Components (components.ts)

```typescript
// Extend visualEffects
visualEffects?: {
  flash?: { color?: 'white' | 'red' | 'green' | 'gold'; untilTick: number };
  shake?: { untilTick: number };
  hitStop?: { untilTick: number };
  aura?: { color: string; untilTick: number };
  powerImpact?: { type: string; untilTick: number };  // For enemy
}

// Extend floatingEffects (already in gameState)
floatingEffects: Array<{
  id: string;
  type: 'damage' | 'heal' | 'proc_text';
  value?: number;
  text?: string;
  targetEntity: 'player' | 'enemy';
  createdAtTick: number;
}>
```

### New React Components

1. `PowerImpactEffect` - Renders fire burst / shockwave on enemy
2. `PlayerBuffBar` - Status icons + timers above player
3. `BuffAura` - Pulsing glow effect around player sprite

### Modified Systems

1. `PowerSystem` - Queue animation events for each effect type
2. `AnimationSystem` - Process new event types, set visualEffects/floatingEffects
3. `Snapshot` - Copy new visualEffects fields

### Modified UI

1. `CharacterSprite` - Integrate BuffAura, PowerImpactEffect
2. `BattleArena` - Render PlayerBuffBar

---

## 6. Implementation Order

1. **Player buff bar** - Display existing buffs with icons/timers (data already exists)
2. **Buff aura** - Add glow effect when buffs active
3. **Power impact effects** - Create effect components, wire up AnimationSystem
4. **Secondary effect feedback** - Heal flash, floating text, proc notifications
5. **Polish** - Timing, colors, particle counts
