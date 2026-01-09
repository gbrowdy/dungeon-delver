# Passive Effect System Design

## Overview

A data-driven system for processing passive path effects (Guardian, Enchanter, Duelist, Protector). Effects are defined as typed data structures and processed by generic handlers, allowing new paths to be added without new system code.

### ECS Architecture Principles

This design strictly follows the project's ECS architecture:

1. **All game logic in Systems** - Effect processing happens in `PassiveEffectSystem` and hooks into other systems (combat, death, flow)
2. **State on Entities** - `PassiveEffectState` component stores all runtime data on player entity
3. **Snapshots for UI** - `createPlayerSnapshot()` copies relevant state to `PlayerSnapshot.passiveEffects`
4. **UI renders state only** - React components read from snapshots, never from entities, never compute game logic
5. **Events for feedback** - Visual feedback uses `addCombatLog()` and `queueAnimationEvent()` which write to GameState entity

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECS Data Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PassiveEffectSystem ──→ Player Entity (passiveEffectState)     │
│         │                        │                               │
│         │                        ▼                               │
│         │               createPlayerSnapshot()                   │
│         │                        │                               │
│         │                        ▼                               │
│         │               PlayerSnapshot.passiveEffects            │
│         │                        │                               │
│         │                        ▼                               │
│         │               React UI (render only)                   │
│         │                                                        │
│         └──→ addCombatLog() ──→ GameState.combatLog             │
│         └──→ queueAnimationEvent() ──→ GameState.animationEvents│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Goals

1. Implement all 26 Guardian stance enhancement effects
2. Create a generic framework extensible to other passive paths
3. Provide clear visual feedback for all effects
4. Keep passive paths truly passive - no player management required

### Non-Goals

- Player info popup (separate feature)
- Active path effects (handled by existing PowerSystem)
- Combo/manual stack management (passive paths are hands-off)

---

## Effect Type Definitions

All passive effects are expressed as a discriminated union. New paths add new effect instances, not new code.

```typescript
type StatType = 'power' | 'armor' | 'speed' | 'fortune' | 'maxHealth' | 'healthRegen';

type Condition =
  | { type: 'hp_below_percent'; value: number }
  | { type: 'hp_above_percent'; value: number };

type PassiveEffect =
  // === STAT MODIFIERS (continuous) ===
  | { type: 'stat_percent'; stat: StatType; value: number }
  | { type: 'stat_flat'; stat: StatType; value: number }
  | { type: 'stat_percent_when'; stat: StatType; value: number; condition: Condition }

  // === DAMAGE MODIFIERS ===
  | { type: 'damage_reduction_percent'; value: number }
  | { type: 'damage_reduction_percent_when'; value: number; condition: Condition }
  | { type: 'max_damage_per_hit_percent'; value: number }
  | { type: 'armor_reduces_dot' }

  // === REFLECT SYSTEM ===
  | { type: 'reflect_percent'; value: number }
  | { type: 'reflect_percent_when'; value: number; condition: Condition }
  | { type: 'reflect_scaling_per_hit'; value: number }
  | { type: 'reflect_ignores_armor' }
  | { type: 'reflect_can_crit' }
  | { type: 'heal_on_reflect_percent'; value: number }
  | { type: 'heal_on_reflect_kill_percent'; value: number }

  // === ON-DAMAGED PROCS ===
  | { type: 'counter_attack_percent'; value: number }
  | { type: 'damage_stack'; valuePerStack: number; maxStacks: number }
  | { type: 'heal_on_damaged_chance'; chance: number; healPercent: number }
  | { type: 'grant_next_attack_bonus'; value: number }

  // === ON-HIT PROCS ===
  | { type: 'permanent_power_per_hit'; value: number }
  | { type: 'on_hit_burst_chance'; chance: number; powerPercent: number }

  // === AURAS ===
  | { type: 'damage_aura_per_second'; value: number }

  // === DEATH PREVENTION ===
  | { type: 'survive_lethal_once_per_floor' }

  // === IMMUNITIES ===
  | { type: 'cc_immunity'; ccTypes: ('stun' | 'slow')[] }

  // === SPEED MODIFICATIONS ===
  | { type: 'remove_speed_penalty' };
```

---

## Player Effect State

Runtime state stored on player entity as `passiveEffectState` component.

**ECS Architecture Note:** This state lives on the Entity. The `createPlayerSnapshot()` function must copy relevant fields to `PlayerSnapshot` so UI components can render it. UI components NEVER read directly from entities.

```
Entity (passiveEffectState) → Snapshot (passiveEffects) → React UI
```

```typescript
interface PassiveEffectState {
  // Per-combat tracking (reset when new enemy spawns)
  combat: {
    hitsTaken: number;
    hitsDealt: number;
    nextAttackBonus: number;
    damageStacks: number;
    reflectBonusPercent: number;
  };

  // Per-floor tracking (reset when floor changes)
  floor: {
    survivedLethal: boolean;
  };

  // Permanent tracking (persists entire run)
  permanent: {
    powerBonusPercent: number;
  };

  // Computed values - recalculated when stance/enhancements change
  // Combat systems read ONLY from this object
  computed: {
    // Stat modifiers (as multipliers, e.g., 1.25 = +25%)
    powerMultiplier: number;
    armorMultiplier: number;
    speedMultiplier: number;
    maxHealthMultiplier: number;
    healthRegenFlat: number;

    // Damage modification
    damageReductionPercent: number;
    maxDamagePerHitPercent: number | null;
    armorReducesDot: boolean;

    // Reflect
    baseReflectPercent: number;
    reflectIgnoresArmor: boolean;
    reflectCanCrit: boolean;
    healOnReflectPercent: number;
    healOnReflectKillPercent: number;
    reflectScalingPerHit: number;

    // On-damaged
    counterAttackPercent: number;
    damageStackConfig: { valuePerStack: number; maxStacks: number } | null;
    healOnDamagedChance: number;
    healOnDamagedPercent: number;
    nextAttackBonusOnDamaged: number;

    // On-hit
    permanentPowerPerHit: number;
    onHitBurstChance: number;
    onHitBurstPowerPercent: number;

    // Auras
    damageAuraPerSecond: number;

    // Death prevention
    hasSurviveLethal: boolean;

    // Immunities
    isImmuneToStuns: boolean;
    isImmuneToSlows: boolean;

    // Speed
    removeSpeedPenalty: boolean;

    // Conditional effects (computed based on current HP)
    conditionalArmorMultiplier: number;
    conditionalDamageReduction: number;
    conditionalReflectMultiplier: number;
  };
}
```

### PlayerSnapshot Extension

The `PlayerSnapshot` interface must expose passive effect data for UI rendering:

```typescript
// Added to PlayerSnapshot interface in src/ecs/snapshot.ts
interface PlayerSnapshot {
  // ... existing fields ...

  // Passive effect state for UI display
  passiveEffects: {
    // Active effect indicators (for Active Effects Bar)
    hasSurviveLethal: boolean;
    survivedLethalUsed: boolean;
    damageStacks: number;
    damageStacksMax: number;
    reflectBonusPercent: number;
    nextAttackBonus: number;
    permanentPowerBonus: number;

    // Conditional effect status (active or not based on HP)
    lastBastionActive: boolean;      // HP < 30%
    painConduitActive: boolean;      // HP < 50%
    regenSurgeActive: boolean;       // HP > 70%

    // Computed totals for tooltip display
    totalReflectPercent: number;
    totalDamageReduction: number;
    damageAuraPerSecond: number;

    // CC immunity status
    isImmuneToStuns: boolean;
    isImmuneToSlows: boolean;
  } | null;  // null if no passive path selected
}
```

---

## System Architecture

### ECS Mutation Rules

**CRITICAL:** Never mutate entity components directly when adding/removing components. Use world methods:

```typescript
// WRONG - miniplex queries won't update
player.passiveEffectState = { ... };
delete player.passiveEffectState;

// CORRECT - queries update properly
world.addComponent(player, 'passiveEffectState', { ... });
world.removeComponent(player, 'passiveEffectState');
```

**Exception:** Mutating properties WITHIN an existing component is allowed:

```typescript
// OK - component already exists, just updating internal values
player.passiveEffectState.combat.hitsTaken += 1;
player.passiveEffectState.computed.powerMultiplier = 1.25;
player.health.current -= damage;
```

### New File: `src/ecs/systems/passive-effect.ts`

```typescript
export function PassiveEffectSystem(deltaMs: number): void {
  // Runs early in tick, before combat
  // 1. Process continuous effects (auras deal damage)
  // 2. Update conditional bonuses based on current HP
}

// Called when stance changes or enhancement acquired
export function recomputePassiveEffects(player: Entity): void {
  // 1. Gather all active effects from current stance + acquired enhancements
  // 2. Aggregate into computed values
  // 3. Update player.passiveEffectState.computed (component already exists)
}

// Called by combat system at specific trigger points
export function processOnDamaged(player: Entity, damage: number, attacker: Entity): OnDamagedResult;
export function processOnHitEnemy(player: Entity, damage: number, target: Entity): OnHitResult;
export function processPreDamage(player: Entity, incomingDamage: number): PreDamageResult;
export function processOnReflect(player: Entity, reflectDamage: number, target: Entity): OnReflectResult;
export function processOnKill(player: Entity, killed: Entity): void;
export function checkSurviveLethal(player: Entity): boolean;

// State reset functions
export function resetCombatState(player: Entity): void;
export function resetFloorState(player: Entity): void;
```

### Integration Points

| System | Hook Point | Function Called |
|--------|------------|-----------------|
| `input.ts` | SWITCH_STANCE, SELECT_STANCE_ENHANCEMENT | `recomputePassiveEffects()` |
| `combat.ts` | Before applying damage to player | `processPreDamage()` |
| `combat.ts` | After player takes damage | `processOnDamaged()` |
| `combat.ts` | After player deals damage | `processOnHitEnemy()` |
| `combat.ts` | After reflect damage applied | `processOnReflect()` |
| `death.ts` | When player HP would hit 0 | `checkSurviveLethal()` |
| `death.ts` | When enemy dies | `processOnKill()` |
| `flow.ts` | New enemy spawns | `resetCombatState()` |
| `flow.ts` | New floor starts | `resetFloorState()` |
| tick loop | Every tick (early) | `PassiveEffectSystem()` |

---

## Visual Feedback

**ECS Architecture:** All visual feedback flows through proper ECS channels:
- Combat log → `addCombatLog()` → GameState entity → Snapshot → CombatLog component
- Floating numbers → `queueAnimationEvent()` → GameState entity → Snapshot → BattleEffects component
- UI indicators → Entity state → Snapshot → React components (render only, no logic)

### 1. Combat Log Messages

Use `addCombatLog()` from `src/ecs/utils/combat-log.ts`. Called from PassiveEffectSystem:

```typescript
// In passive-effect.ts
addCombatLog(`Reflects ${reflectDamage} damage back to ${enemyName}!`);
addCombatLog(`Counter-attacks for ${counterDamage} damage!`);
addCombatLog(`Stalwart Recovery heals ${healAmount} HP!`);
addCombatLog(`Unbreakable caps damage to ${cappedDamage}!`);
addCombatLog(`Last Bastion prevents death!`);
addCombatLog(`Thorns Aura deals ${auraDamage} damage!`);
```

### 2. Floating Combat Numbers

Use existing `queueAnimationEvent()` with `item_proc` type (reuse existing pattern):

```typescript
// In passive-effect.ts - for reflect damage
queueAnimationEvent('item_proc', {
  type: 'item',
  itemName: 'Reflect',
  effectDescription: `${reflectDamage} damage`,
});

// For heal effects
queueAnimationEvent('item_proc', {
  type: 'item',
  itemName: 'Stalwart Recovery',
  effectDescription: `+${healAmount} HP`,
});
```

UI renders these via existing `BattleEffects` component which reads from `gameState.animationEvents` in snapshot.

| Effect | Displayed As |
|--------|--------------|
| Reflect damage | "Reflect: 15 damage" (purple) |
| Counter-attack | "Counter: 8 damage" (orange) |
| Heal from effect | "Stalwart Recovery: +12 HP" (green) |
| Damage capped | "Unbreakable: capped to 20" (blue) |
| Survive lethal | "Last Bastion!" (gold) |
| Aura damage | "Thorns: 5 damage" (red) |

### 3. Stats Panel Enhancements

`PlayerStatsPanel` reads from `PlayerSnapshot`:
- `effectiveStats` for current stat values with modifiers
- `passiveEffects` for stack counts and conditional status

```typescript
// PlayerStatsPanel reads from snapshot only
function StatsGrid({ player }: { player: PlayerSnapshot }) {
  const stacks = player.passiveEffects?.damageStacks ?? 0;
  const stacksMax = player.passiveEffects?.damageStacksMax ?? 0;

  // Render stack badge if stacks > 0
  // Flash detection: compare current snapshot to previous (React state)
}
```

### 4. Active Effects Bar (New UI Component)

New component `ActiveEffectsBar` placed between health bar and powers panel.

**Data source:** Reads ONLY from `PlayerSnapshot.passiveEffects`:

```typescript
function ActiveEffectsBar({ player }: { player: PlayerSnapshot }) {
  const effects = player.passiveEffects;
  if (!effects) return null;

  return (
    <div className="flex gap-1">
      {effects.hasSurviveLethal && (
        <EffectIcon
          icon="Sparkles"
          active={!effects.survivedLethalUsed}
          label={effects.survivedLethalUsed ? "Used" : "Ready"}
        />
      )}
      {effects.damageStacksMax > 0 && (
        <EffectIcon
          icon="TrendingUp"
          label={`${effects.damageStacks}/${effects.damageStacksMax}`}
        />
      )}
      {effects.lastBastionActive && (
        <EffectIcon icon="Shield" active={true} label="Last Bastion" />
      )}
      {/* etc */}
    </div>
  );
}
```

**No game logic in this component** - it purely renders snapshot state.

---

## Guardian Effect Mapping

How each Guardian enhancement maps to the new effect types:

### Iron Path

| Tier | Enhancement | Effect Type(s) |
|------|-------------|----------------|
| 1 | Fortified Skin | `stat_percent: armor +20` |
| 2 | Damage Absorption | `damage_reduction_percent: 20` |
| 3 | Regenerating Bulwark | `stat_flat: healthRegen +2` |
| 4 | Immovable | `cc_immunity: ['stun', 'slow']` |
| 5 | Armor Scaling | `damage_reduction_scaling_armor: { perArmor: 5, drPercent: 1 }` |
| 6 | Last Bastion | `stat_percent_when: armor +50, hp_below 30` |
| 7 | Stalwart Recovery | `heal_on_damaged_chance: 15%, heal 5%` |
| 8 | Unbreakable | `max_damage_per_hit_percent: 20` |
| 9 | Stone Form | `remove_speed_penalty` |
| 10 | Living Fortress | `stat_percent: maxHealth +25` |
| 11 | Regeneration Surge | `stat_percent_when: healthRegen +100, hp_above 70` |
| 12 | Juggernaut | `armor_reduces_dot` |
| 13 | Immortal Bulwark | `survive_lethal_once_per_floor` |

### Retribution Path

| Tier | Enhancement | Effect Type(s) |
|------|-------------|----------------|
| 1 | Sharpened Thorns | `reflect_percent: 30` (replaces base 20) |
| 2 | Vengeful Strikes | `damage_stack: +10% per hit, max 5` |
| 3 | Blood Mirror | `heal_on_reflect_percent: 25` |
| 4 | Escalating Revenge | `reflect_scaling_per_hit: 5` |
| 5 | Counter Strike | `counter_attack_percent: 20` |
| 6 | Pain Conduit | `reflect_percent_when: +100%, hp_below 50` |
| 7 | Thorns Aura | `damage_aura_per_second: 5` |
| 8 | Retaliation | `grant_next_attack_bonus: 75` |
| 9 | Wrath Accumulator | `permanent_power_per_hit: 2` |
| 10 | Death Reflection | `reflect_ignores_armor` |
| 11 | Explosive Thorns | `on_hit_burst_chance: 25%, power 50%` |
| 12 | Vengeance Incarnate | `reflect_can_crit` |
| 13 | Avatar of Punishment | `heal_on_reflect_kill_percent: 30` |

---

## Implementation Order

### Phase 0: Documentation
Update `CLAUDE.md` to make ECS architecture rules explicit. Add to the "ECS Architecture" section:

```markdown
### ECS Rules (CRITICAL)

**Component Mutation:**
- ADD/REMOVE components → Use `world.addComponent()` / `world.removeComponent()`
- UPDATE properties within existing component → Direct mutation OK

**Data Flow:**
- Game logic → ECS Systems only (never in React components)
- UI rendering → Read from Snapshots only (never from Entities)
- Visual feedback → Use `addCombatLog()` and `queueAnimationEvent()`
```

### Phase 1: Foundation
1. Create `PassiveEffect` type definitions in `src/types/paths.ts`
2. Create `PassiveEffectState` component type in `src/ecs/components.ts`
3. Create `passive-effect.ts` system with `recomputePassiveEffects()`
4. Add system to tick loop
5. Initialize component when passive path selected (in `input.ts` SELECT_PATH handler):
   ```typescript
   // Use world.addComponent to add new component
   world.addComponent(player, 'passiveEffectState', createInitialPassiveEffectState());
   ```

### Phase 2: Core Effects
5. Implement stat modifiers (power, armor, speed, maxHealth, regen)
6. Implement damage reduction
7. Implement reflect system (base + scaling + modifiers)
8. Integrate with combat.ts

### Phase 3: Advanced Effects
9. Implement on-damaged procs (counter-attack, heal chance, stacks)
10. Implement on-hit procs (permanent power, burst)
11. Implement death prevention (survive lethal)
12. Implement auras
13. Implement CC immunity
14. Integrate with death.ts and flow.ts

### Phase 4: Visual Feedback
15. Add combat log messages for all effects
16. Add floating numbers for damage/healing from effects
17. Build Active Effects Bar component
18. Update stats panel with stack display

### Phase 5: Testing
19. Unit tests for effect aggregation
20. Unit tests for each trigger point
21. E2E test for Guardian progression with effects

---

## Future Path Considerations

The system is designed to support effects likely needed by other passive paths:

| Future Effect Type | Likely Path |
|--------------------|-------------|
| `dodge_percent` | Duelist |
| `crit_chance_percent` | Duelist |
| `crit_damage_percent` | Duelist |
| `execute_damage_vs_low_hp` | Duelist |
| `healing_received_percent` | Protector |
| `overheal_to_shield_percent` | Protector |
| `shield_on_hit` | Protector |
| `shield_on_kill` | Protector |
| `debuff_amplification` | Enchanter |
| `spell_echo_chance` | Enchanter |

These can be added to the `PassiveEffect` union as needed without architectural changes.
