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

## Additional References

- Design documents in `docs/plans/`
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/data`, `@/constants`, `@/ecs`, `@/utils`
- shadcn/ui components: `npx shadcn@latest add <component-name>`
