# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CRITICAL: Branch Policy

**ALL WORK MUST BE DONE IN FEATURE BRANCHES. NEVER COMMIT DIRECTLY TO MAIN.**

- Create a feature branch before starting any work: `git checkout -b feature/your-feature-name`
- Commit all changes to the feature branch
- Main branch is protected - only updated via merged PRs

---

## Build & Development Commands

```bash
npm run dev      # Start development server with HMR
npm run build    # Production build
npm run lint     # Run ESLint
npx vitest run   # Run unit tests
npx playwright test --project="Desktop"  # Run E2E tests
```

## Tech Stack

- **Framework**: React 18.3 + TypeScript 5.8 + Vite 5.4
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components
- **State**: ECS (Entity Component System) using miniplex + React Context for UI
- **Testing**: Vitest + jsdom + Playwright E2E

## Project Structure

```
src/
├── ecs/                # ECS (Entity Component System) - CORE GAME LOGIC
│   ├── components.ts   # Component type definitions (Entity interface)
│   ├── world.ts        # miniplex world instance
│   ├── queries.ts      # Entity queries (getPlayer, getActiveEnemy, etc.)
│   ├── loop.ts         # Game loop (tick system, pause, speed)
│   ├── commands.ts     # Command types and dispatch queue
│   ├── snapshot.ts     # Immutable snapshots for React rendering
│   ├── systems/        # Game systems (16 systems, run in order each tick)
│   ├── factories/      # Entity creation functions
│   └── context/        # GameContext.tsx - React bridge
├── components/
│   ├── game/           # Game-specific UI components
│   └── ui/             # shadcn/ui component library
├── constants/          # Configuration, balance, animations
├── data/               # Game content (classes, enemies, powers, items, paths)
├── hooks/              # UI hooks (useGameKeyboard, useReducedMotion)
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## ECS Architecture

This is a roguelike browser game with auto-combat mechanics, built on an **Entity Component System (ECS)** architecture using miniplex.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Loop (loop.ts)                      │
│   Runs at ~60fps, calls systems in order, manages tick/pause     │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Systems (systems/)                       │
│   Input → AttackTiming → Combat → Power → Death → Flow → ...    │
│   Each system queries entities and modifies component data       │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     World + Entities (world.ts)                  │
│   Player entity, Enemy entity, GameState entity                  │
│   Each entity is a bag of components (health, attack, speed...)  │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Snapshots (snapshot.ts)                       │
│   Immutable copies of entity data for React rendering            │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React UI (components/game/)                   │
│   Reads snapshots, dispatches actions via useGameActions()       │
└─────────────────────────────────────────────────────────────────┘
```

### ECS Systems (execution order)

| System | Responsibility |
|--------|----------------|
| `input.ts` | Processes user commands (class select, power use, etc.) |
| `cooldown.ts` | Ticks down power cooldowns |
| `attack-timing.ts` | Accumulates attack timers, sets `attackReady` flag |
| `enemy-ability.ts` | Processes enemy abilities before combat |
| `combat.ts` | Processes attacks when `attackReady`, applies damage |
| `power.ts` | Executes power casts, applies effects |
| `item-effect.ts` | Processes item proc effects (on_hit, on_crit, etc.) |
| `path-ability.ts` | Triggers path abilities on combat events |
| `status-effect.ts` | Ticks status effects (poison, stun, etc.) |
| `regen.ts` | Health/mana regeneration |
| `death.ts` | Handles entity death, rewards, phase transitions |
| `progression.ts` | XP, level-ups |
| `flow.ts` | Room advancement, enemy spawning, game phase changes |
| `animation.ts` | Processes animation event lifecycle |
| `cleanup.ts` | Clears one-frame flags, removes dead entities |

### ⚠️ CRITICAL: miniplex Reactivity

**Direct property assignment does NOT notify miniplex queries!**

```typescript
// ❌ WRONG - query won't update
entity.dying = { ... };
delete entity.attackReady;

// ✅ CORRECT - query updates properly
world.addComponent(entity, 'dying', { startedAtTick: getTick() });
world.removeComponent(entity, 'attackReady');
```

This is critical for queries like `world.with('health').without('dying')`.

### ⚠️ CRITICAL: Query Filtering for UI vs Game Logic

**Filtered queries can hide entities that should still be visible for animations.**

```typescript
// queries.ts defines two enemy queries:
export const enemyQuery = world.with('enemy', 'health');           // ALL enemies
export const activeEnemyQuery = world.with('enemy', 'health').without('dying');  // Excludes dying
```

| Context | Query to Use | Reason |
|---------|--------------|--------|
| **React snapshots** | `enemyQuery.first` | Dying enemies need to be visible for death animation |
| **Combat targeting** | `getActiveEnemy()` | Don't attack/target dying enemies |
| **Cleanup/removal** | `world.with('enemy')` | Remove ALL enemies including dying ones |

### Game Flow

Phases defined in `GameState.phase`:
```
menu → class-select → path-select → combat → floor-complete → combat → ... → victory/defeat
```

### Key Files

| File | Purpose |
|------|---------|
| `ecs/context/GameContext.tsx` | React provider - bridges ECS to UI |
| `components/game/Game.tsx` | Phase router, uses `useGame()` hook |
| `components/game/CombatScreen.tsx` | Combat UI container |
| `components/game/BattleArena.tsx` | Battle visualization with sprites |

## Code Patterns

### Adding/Modifying ECS Components

1. **Add component type** to `ecs/components.ts` (Entity interface)
2. **Create/update systems** in `ecs/systems/` to process the component
3. **Update snapshots** in `ecs/snapshot.ts` if UI needs the data
4. **Add queries** to `ecs/queries.ts` if systems need to find entities

### Entity Modification in Systems

```typescript
// Get entities via queries
const player = getPlayer();
const enemy = getActiveEnemy();

// Modify component data directly (for existing components)
player.health.current -= damage;

// Add/remove components (MUST use world methods for query reactivity)
world.addComponent(entity, 'dying', { startedAtTick: getTick() });
world.removeComponent(entity, 'attackReady');
```

### Dispatching Actions from UI

```typescript
// In React components
const actions = useGameActions();

// Dispatch actions (processed by InputSystem next tick)
actions.selectClass('warrior');
actions.usePower('fireball');
actions.togglePause();
```

### Adding Game Content

| To Add | Location |
|--------|----------|
| New power | `data/powers.ts` |
| New enemy | `data/enemies.ts` |
| Combat balance | `constants/balance.ts` |
| Timing/scaling | `constants/game.ts` |

## Testing

### ⚠️ CRITICAL: Browser Validation Required

**ALL functionality changes MUST be validated in the browser using Playwright before being considered complete.**

- Unit tests alone are NOT sufficient for game functionality
- You MUST run Playwright tests or write new ones to verify changes work in the actual browser
- If you cannot demonstrate the fix works in a browser test, the fix is NOT done

### Running Tests

```bash
npx vitest run              # All unit tests
npx vitest run src/ecs      # ECS tests only (314 tests)
npx playwright test --ui    # E2E tests with interactive UI
```

**Test Hooks**: Add `?testMode=true` URL param to expose `window.__TEST_HOOKS__` for state manipulation during tests.

## Debugging Principles

### ⚠️ CRITICAL: Observe Before Fixing

**Add console.logs FIRST, before writing any fix.** Mental code tracing is not debugging - runtime observation is debugging.

| Wrong | Right |
|-------|-------|
| "Combat runs before Death, so..." | "Add logs - what actually happens?" |
| "Tests pass so it's fixed" | Write a test for the specific failure case |
| "The fix worked on first try" | Be suspicious - verify with logging |

## Git Conventions

This project uses **conventional commits**: `type(scope): description`

**Types**: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`

**Scopes**: `ecs`, `ui`, `combat`, `hooks`, `utils`, `types`

```bash
feat(ecs): add poison status effect
fix(ui): prevent button double-click
refactor(ecs): extract combat damage calculation
```

## Task Documents

Task planning documents should be stored in the `tasks/` directory (gitignored).

## Adding Path Powers

Each class has two paths available at level 2. Paths are either **Active** (power-based gameplay) or **Passive** (stance-based, auto-mechanics).

### Path Types Overview

| Type | Example | Gameplay | UI | Key System |
|------|---------|----------|----|----|
| **Active** | Berserker | Powers with cooldowns, resource costs | PowerButton grid | `power.ts` |
| **Passive** | Guardian | Stance toggle, auto-triggering effects | StanceToggle UI | `passive-effect.ts` |

### File Structure

```
src/data/paths/
├── warrior.ts              # Path definitions (PathDefinition, abilities)
├── berserker-powers.ts     # Active path: Power definitions with upgrades
├── guardian-enhancements.ts # Passive path: Stance enhancement definitions
├── mage.ts                 # Mage paths (Archmage=active, Enchanter=passive)
├── rogue.ts                # Rogue paths (Assassin=active, Duelist=passive)
└── paladin.ts              # Paladin paths
```

### Adding an Active Path (like Berserker)

**1. Define Powers in `src/data/paths/{class}-powers.ts`:**

```typescript
// Example: src/data/paths/assassin-powers.ts
import type { Power } from '@/types/game';

export interface AssassinPower extends Power {
  upgrades: [PowerUpgrade, PowerUpgrade]; // T1, T2 upgrades
}

const SHADOW_STRIKE: AssassinPower = {
  id: 'shadow_strike',
  name: 'Shadow Strike',
  description: 'Deal 180% damage from stealth. Guaranteed crit.',
  icon: 'power-shadow_strike',
  resourceCost: 40,        // Path resource cost (Momentum for Assassin)
  cooldown: 6,
  effect: 'damage',
  value: 1.8,
  category: 'strike',
  synergies: [],
  guaranteedCrit: true,    // Special mechanic
  upgrades: [
    { tier: 1, description: '220% damage', value: 2.2 },
    { tier: 2, description: 'Refund 50% cost on kill', costRefundOnKill: 0.5 },
  ],
};

export const ASSASSIN_POWERS = {
  level2: [SHADOW_STRIKE, POISON_BLADE],
  level4: [...],
  level6: [...],
};
```

**2. Add Power Processing in `src/ecs/systems/power.ts`:**

```typescript
// In processPowerEffect(), add case for new mechanics:
if (power.guaranteedCrit) {
  // Force crit logic
}
```

**3. Register in `src/data/powers.ts`:**

```typescript
import { ASSASSIN_POWERS } from './paths/assassin-powers';
// Add to POWER_DATA or appropriate lookup
```

**4. Add Resource Type in `src/data/pathResources.ts`:**

```typescript
export const PATH_RESOURCES: Record<string, PathResourceConfig> = {
  assassin: {
    type: 'momentum',
    max: 100,
    startingValue: 0,
    generation: { passive: 5, onHit: 15, onCrit: 25 },
    resourceBehavior: 'spend',
  },
};
```

### Adding a Passive Path (like Guardian)

**1. Define Enhancements in `src/data/paths/{class}-enhancements.ts`:**

```typescript
// Example: src/data/paths/enchanter-enhancements.ts
import type { StanceEnhancement } from '@/types/paths';

export const ENCHANTER_AURA_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'aura_1_magic_shield',
    name: 'Magic Shield',
    tier: 1,
    description: '+15% spell damage reduction',
    stanceId: 'aura_stance',
    effects: [{ type: 'damage_reduction', value: 15 }],
  },
  // ... more enhancements
];
```

**2. Map Effects to PassiveEffectState in `src/ecs/systems/passive-effect.ts`:**

The `recomputePassiveEffects()` function maps enhancement effects to computed values:

```typescript
// In recomputePassiveEffects(), add cases for new effect types:
case 'spell_damage_reduction':
  computed.spellDamageReductionPercent += effect.value;
  break;
```

**3. Add Computed Fields to `src/ecs/components.ts`:**

```typescript
export interface ComputedPassiveEffects {
  // ... existing fields
  spellDamageReductionPercent: number;  // New field for Enchanter
}
```

**4. Define Stances in `src/data/stances.ts`:**

```typescript
export const ENCHANTER_STANCES: PassiveStance[] = [
  {
    id: 'aura_stance',
    name: 'Aura Stance',
    description: 'Protective magical aura',
    effects: [{ behavior: 'spell_shield', value: 0.1 }],
  },
];
```

**5. Update Snapshot in `src/ecs/snapshot.ts`:**

```typescript
// In createPlayerSnapshot(), add new computed values:
passiveEffects: {
  // ... existing
  spellDamageReduction: computed.spellDamageReductionPercent,
},
```

### Key Integration Points

| System | Active Paths | Passive Paths |
|--------|--------------|---------------|
| `input.ts` | `USE_POWER` command | `CHANGE_STANCE` command |
| `power.ts` | Executes power effects | — |
| `passive-effect.ts` | — | `recomputePassiveEffects()`, combat hooks |
| `combat.ts` | — | Reads from `passiveEffectState.computed` |
| `resource-generation.ts` | Generates path resource | — |
| `snapshot.ts` | Powers, cooldowns | `passiveEffects` object |

### ECS Boundaries for Passive Effects

**CRITICAL:** Passive effect hooks must respect ECS boundaries:

```typescript
// ✅ CORRECT: Hook returns values, system applies them
export function processOnDamaged(player, damage): OnDamagedResult {
  // Read from computed, mutate only passiveEffectState
  // RETURN values for combat.ts to apply
  return { reflectDamage: 10, healAmount: 5 };
}

// ❌ WRONG: Hook directly mutates other entities
export function processOnDamaged(player, damage, enemy) {
  enemy.health.current -= 10;  // NO! Return value instead
}
```

### Testing Path Powers

1. **Unit tests** in `src/data/paths/__tests__/` for data validation
2. **ECS tests** in `src/ecs/systems/__tests__/` for system behavior
3. **E2E tests** in `e2e/` for full integration (required for completion)

See `docs/plans/2026-01-08-passive-effect-system-implementation.md` for the Guardian implementation as a reference.

## Additional References

- Design documents in `docs/plans/`
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/data`, `@/constants`, `@/ecs`, `@/utils`
- shadcn/ui components: `npx shadcn@latest add <component-name>`
