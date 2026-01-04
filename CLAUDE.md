# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CRITICAL: Branch Policy

**ALL WORK MUST BE DONE IN FEATURE BRANCHES. NEVER COMMIT DIRECTLY TO MAIN.**

- Create a feature branch before starting any work: `git checkout -b feature/your-feature-name`
- Commit all changes to the feature branch
- Main branch is protected - only updated via merged PRs
- If you find yourself on main with uncommitted work, create a branch immediately

---

## Build & Development Commands

```bash
npm run dev      # Start development server with HMR
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
npx vitest run   # Run unit tests
```

## Tech Stack

- **Framework**: React 18.3 + TypeScript 5.8 + Vite 5.4
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components (40+ components)
- **State**: ECS (Entity Component System) using miniplex + React Context for UI
- **Routing**: react-router-dom v6
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Testing**: Vitest + jsdom + Playwright E2E

## Project Structure

```
src/
├── ecs/                # ECS (Entity Component System) - CORE GAME LOGIC
│   ├── components.ts   # Component type definitions
│   ├── world.ts        # miniplex world instance
│   ├── queries.ts      # Entity queries (player, enemy, gameState)
│   ├── loop.ts         # Game loop (tick system, pause, speed)
│   ├── snapshot.ts     # Immutable snapshots for React
│   ├── systems/        # Game systems (combat, death, flow, etc.)
│   ├── factories/      # Entity creation functions
│   ├── context/        # GameContext.tsx - React bridge
│   └── hooks/          # useGameEngine, useGameActions
├── components/
│   ├── game/           # Game-specific UI components
│   └── ui/             # shadcn/ui component library
├── constants/          # Configuration, balance, animations, responsive
├── data/               # Game content (classes, enemies, powers, items)
├── hooks/              # Animation/UI hooks (useBattleAnimation, etc.)
├── lib/                # Utilities (utils.ts with cn())
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
docs/
└── plans/              # Design documents and implementation plans
e2e/
├── helpers/            # Test utilities (test-utils.ts, game-actions.ts)
└── *.spec.ts           # Playwright E2E tests
```

## Architecture

This is a roguelike browser game with auto-combat mechanics and a path-based progression system, built on an **Entity Component System (ECS)** architecture using miniplex.

### ECS Overview

The game uses ECS to separate data (components) from behavior (systems):

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Loop (loop.ts)                      │
│   Runs at ~60fps, calls systems in order, manages tick/pause     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Systems (systems/)                       │
│   AttackTiming → Combat → Power → StatusEffect → Death → Flow   │
│   Each system queries entities and modifies component data       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     World + Entities (world.ts)                  │
│   Player entity, Enemy entity, GameState entity                  │
│   Each entity is a bag of components (health, attack, speed...)  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Snapshots (snapshot.ts)                       │
│   Immutable copies of entity data for React rendering            │
│   Created each tick, passed via GameContext                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React UI (components/game/)                   │
│   Reads snapshots, dispatches actions via useGameActions()       │
└─────────────────────────────────────────────────────────────────┘
```

### Key ECS Files

| File | Purpose |
|------|---------|
| `ecs/world.ts` | miniplex World instance - stores all entities |
| `ecs/components.ts` | Component type definitions (Entity interface) |
| `ecs/queries.ts` | Entity queries (`getPlayer()`, `getActiveEnemy()`, etc.) |
| `ecs/loop.ts` | Game loop - tick management, pause, combat speed |
| `ecs/snapshot.ts` | Creates immutable snapshots for React |
| `ecs/context/GameContext.tsx` | React provider - bridges ECS to UI |
| `ecs/hooks/useGameActions.ts` | Action dispatchers for UI |

### ECS Systems (run order)

| System | Responsibility |
|--------|----------------|
| `input.ts` | Processes pending user actions (class select, power use) |
| `attack-timing.ts` | Accumulates attack timers, sets `attackReady` flag |
| `combat.ts` | Processes attacks when `attackReady`, applies damage |
| `power.ts` | Executes power casts, applies effects |
| `path-ability.ts` | Triggers path abilities on combat events |
| `status-effect.ts` | Ticks status effects (poison, stun, etc.) |
| `regen.ts` | Health/mana regeneration |
| `cooldown.ts` | Ticks down power cooldowns |
| `death.ts` | Handles entity death, rewards, phase transitions |
| `flow.ts` | Room advancement, enemy spawning, game phase changes |
| `cleanup.ts` | Clears one-frame flags, removes dead entities |

### ⚠️ CRITICAL: miniplex Reactivity

**Direct property assignment does NOT notify miniplex queries!**

```typescript
// ❌ WRONG - query won't update
entity.dying = { ... };
delete entity.attackReady;

// ✅ CORRECT - query updates properly
world.addComponent(entity, 'dying', { ... });
world.removeComponent(entity, 'attackReady');
```

This is critical for queries like `world.with('health').without('dying')`.

### Game Flow

Phases defined in `GameState.phase`:
```
menu → class-select → path-select (at level 2) → combat → floor-complete → combat → ... → victory/defeat
```

- At **level 2**: Player chooses a path (active or passive playstyle)
- At **levels 3+**: Player chooses abilities from their path
- On death: `defeat` screen, then retry (same floor) or abandon (restart)
- On Floor 10 boss defeat: `victory` screen

### UI Key Files

| File | Purpose |
|------|---------|
| `components/game/Game.tsx` | Phase router, connects to GameContext |
| `components/game/BattleArena.tsx` | Battle visualization with sprites |
| `components/game/CombatScreen.tsx` | Combat UI container |
| `hooks/useBattleAnimation.ts` | Animation state machine for combat |
| `types/game.ts` | TypeScript interfaces for game types |

### Data Files

| File | Contents |
|------|----------|
| `data/classes.ts` | 4 classes: Warrior, Mage, Rogue, Paladin |
| `data/enemies.ts` | Enemy generation with tier/ability system |
| `data/powers.ts` | Unlockable powers with upgrade system |
| `data/items.ts` | Equipment generation by type/rarity |
| `data/paths/` | Path definitions per class (warrior.ts, mage.ts, rogue.ts, paladin.ts) |

### Constants Files

| File | Contents |
|------|----------|
| `constants/game.ts` | Combat timing, level scaling, floor config |
| `constants/balance.ts` | Combat balance, rewards, item effects |
| `constants/enums.ts` | Game phases, status effects, rarities |
| `constants/animation.ts` | Animation timing (30+ values as CSS vars) |
| `constants/responsive.ts` | Breakpoints, layouts, touch targets |
| `constants/paths.ts` | Path selection stat bonuses |

## Combat System

### Timing
- Base attack interval: 2500ms at 1x speed (divided by speed multiplier)
- Speed stat converts to attack intervals (base 10 = reference)
- Hero gets 50ms jitter advantage for speed ties
- Combat speeds: 1x, 2x, 3x

### Mechanics
- **Auto-attack**: Automatic with manual power activation
- **Damage**: `(ATK - DEF) * variance(0.85-1.15) * crit(2.5x if applies)`
- **Blocking**: 40% damage reduction, costs 15 mana
- **Powers**: Mana cost + cooldown, upgradeable to level 3
- **Status Effects**: Poison, Stun, Slow, Bleed

### Enemy System
- **Tiers**: Common, Uncommon, Rare, Boss
- **Abilities**: Multi-hit, Poison, Stun, Heal, Enrage, Shield
- **Intent**: Displayed before enemy acts
- **Scaling**: +45% stats per floor, +8% per room

## Character Classes

| Class | HP | ATK | DEF | SPD | Starting Power | Special |
|-------|-----|-----|-----|-----|----------------|---------|
| Warrior | 55 | 8 | 4 | 8 | Berserker Rage | High health |
| Mage | 38 | 10 | 2 | 10 | Fireball | High damage |
| Rogue | 42 | 9 | 3 | 15 | Shadow Strike | +10% gold find |
| Paladin | 50 | 7 | 5 | 7 | Divine Heal | +0.5 HP regen |

## Progression Systems

### Leveling
- Base XP: 100 (scales 1.5x per level)
- Level-up bonuses: +8 HP, +2 ATK, +5 Mana

### Path System
- **Level 2**: Choose a path (active or passive playstyle)
- **Levels 3-6**: Choose one of two abilities from your path
- **Level 4**: Choose a subpath specialization
- **Level 6**: Unlock capstone ability

Each class has 2 paths:
- **Warrior**: Berserker (active burst) / Guardian (passive defense)
- **Mage**: Archmage (spell timing) / Enchanter (auto-magic)
- **Rogue**: Assassin (active burst) / Shadow (passive procs)
- **Paladin**: Crusader (active smite) / Templar (passive auras)

### Items
- **Types**: Weapon, Armor, Accessory
- **Rarities**: Common → Uncommon → Rare → Epic → Legendary
- **Effects**: Rare+ items have special triggers (on_hit, on_crit, on_kill, etc.)
- **Acquisition**: Shop only (no enemy drops)

### Powers
- Earned at floor completion (every 2 floors)
- Upgradeable to level 3
- Per level: +25% value, -0.5s cooldown, -10% mana cost

## UI Components

### Main Screens
- `MainMenu.tsx` - Start screen
- `ClassSelect.tsx` - Character selection
- `CombatScreen.tsx` - Battle container (wraps with CombatProvider)
- `FloorCompleteScreen.tsx` - Rewards selection
- `DeathScreen.tsx` - Retry/abandon options

### Combat Components
- `BattleArena.tsx` - Sprites, effects, accessibility announcements
- `CombatHeader.tsx` - Floor info, pause/speed controls
- `PlayerStatsPanel.tsx` - Stats grid, equipment display
- `PowersPanel.tsx` - Power buttons with cooldowns
- `CombatLog.tsx` - Combat event history
- `BattleEffects.tsx` - Visual effects layer (shake, damage floats, spells)

### Popups
- `LevelUpPopup.tsx` - Level up notification
- `ItemDropPopup.tsx` - Item claiming
- `AbilityChoicePopup.tsx` - Path ability selection

## Accessibility Features

- **Keyboard shortcuts**: Space (pause), 1-5 (powers), B (block), [/]/\ (speed)
- **Screen reader**: ARIA labels, live regions for combat events
- **Reduced motion**: `useReducedMotion()` hook + CSS `prefers-reduced-motion`
- **Touch targets**: 44px minimum (WCAG 2.5)
- **Focus indicators**: 3px ring with high contrast mode support
- **Responsive**: Mobile-first design with breakpoints at 640/768/1024/1280px

## shadcn/ui

UI components in `src/components/ui/`. Add new components:
```bash
npx shadcn@latest add <component-name>
```

Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/data`, `@/constants`, `@/contexts`, `@/utils`

## Code Patterns

### Adding a New Power
1. Add to `data/powers.ts` with id, name, icon, manaCost, cooldown, effect
2. Power automatically appears in floor-complete rewards

### Adding a New Enemy
1. Add to enemy name arrays in `data/enemies.ts` by tier
2. Configure abilities in `ENEMY_ABILITIES`

### Modifying Combat Balance
1. Check `constants/balance.ts` for combat mechanics
2. Check `constants/game.ts` for timing and scaling
3. Enemy scaling in `data/enemies.ts` `generateEnemy()`

### Adding UI Components
1. Use shadcn/ui base components from `components/ui/`
2. Game components go in `components/game/`
3. Use `cn()` from `@/lib/utils` for conditional classes
4. Follow responsive patterns from `constants/responsive.ts`

## Code Patterns

### Adding/Modifying ECS Components

When adding new game functionality:

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

## Testing

### ⚠️ CRITICAL: Browser Validation Required

**ALL functionality changes MUST be validated in the browser using Playwright before being considered complete.**

- Unit tests alone are NOT sufficient for game functionality
- You MUST run Playwright tests or write new ones to verify changes work in the actual browser
- Screenshots and console logs from Playwright tests serve as proof of functionality
- If you cannot demonstrate the fix works in a browser test, the fix is NOT done

```bash
# Start dev server (required for E2E tests)
npm run dev

# Run E2E tests in another terminal
npx playwright test --project="Desktop"
```

### Unit Tests
Unit tests are in `__tests__/` directories adjacent to the code they test.

```bash
npx vitest run    # Run all unit tests
npx vitest        # Watch mode
```

### E2E Tests
E2E tests use Playwright with test hooks for state manipulation.

```bash
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Interactive mode
npx playwright test --project="Desktop"  # Run specific project
```

**Test Hooks**: Add `?testMode=true` URL param to expose `window.__TEST_HOOKS__` for state manipulation during tests. See `e2e/helpers/test-utils.ts` for utilities.

**Game Action Helpers**: `e2e/helpers/game-actions.ts` provides reusable functions for common test flows (starting combat, waiting for phases, etc.).

## Task Documents

**IMPORTANT**: Task planning documents, code reviews, and improvement tracking files should be stored in the `tasks/` directory, which is gitignored.

```
tasks/                           # Local only - NOT committed to git
├── CODE_ROBUSTNESS_TASKS.md    # Refactoring task tracking
├── MOBILE_IMPROVEMENTS.md       # Mobile UI improvements
├── typescript-review.md         # Code review documents
└── ...                          # Other planning/review docs
```

## Git Conventions

This project uses **conventional commits**. Format: `type(scope): description`

### Commit Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring (no functional change)
- `docs` - Documentation changes
- `chore` - Build, config, dependencies
- `test` - Adding or updating tests
- `style` - Code style/formatting (no functional change)

### Examples:
```bash
feat(combat): add poison status effect
fix(ui): prevent button double-click
refactor(hooks): extract useCombatActions from useGameState
docs: update CLAUDE.md with new architecture
chore: add vitest testing dependencies
test(hooks): add useItemEffects unit tests
```

### Scope (optional):
- `hooks` - React hooks
- `ui` - UI components
- `combat` - Combat system
- `utils` - Utility functions
- `types` - TypeScript types

