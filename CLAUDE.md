# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **State**: React hooks + Context API (`useGameState` orchestrates, `CombatContext` for UI)
- **Routing**: react-router-dom v6
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Testing**: Vitest + jsdom

## Project Structure

```
src/
├── components/
│   ├── game/           # Game-specific components
│   └── ui/             # shadcn/ui component library
├── contexts/           # React Context providers
├── constants/          # Configuration, balance, animations, responsive
├── data/               # Game content (classes, enemies, powers, items)
├── hooks/              # Custom React hooks
├── lib/                # Utilities (utils.ts with cn())
├── pages/              # Page-level components
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
docs/
└── plans/              # Design documents and implementation plans
e2e/
├── helpers/            # Test utilities (test-utils.ts)
└── *.spec.ts           # Playwright E2E tests
```

## Architecture

This is a roguelike browser game with auto-combat mechanics and a path-based progression system.

### Game Flow

Phases defined in `GameState.gamePhase`:
```
menu → class-select → path-select (at level 2) → combat → floor-complete → combat → ... → victory/defeat
```

- At **level 2**: Player chooses a path (active or passive playstyle)
- At **levels 3+**: Player chooses abilities from their path
- On death: `defeat` screen, then retry (same floor) or abandon (restart)
- On Floor 10 boss defeat: `victory` screen

### State Management

**Central State**: `useGameState()` hook orchestrates all game logic by composing smaller hooks. Key hooks include:
- `useCombatLoop` - Attack timing with separate hero/enemy timers
- `useCombatActions` - Hero attack, enemy attack, block actions
- `usePowerActions` - Power activation and cooldown management
- `usePathAbilities` - Path ability trigger processing
- `useRoomTransitions` - Floor/room progression, death handling
- `useRewardCalculation` - XP, gold, level-up processing

**Combat Context**: `CombatContext.tsx` provides typed access to combat state for UI components:
```tsx
const { player, enemy, combatState, actions } = useCombat();
```

### Key Files

| File | Purpose |
|------|---------|
| `hooks/useGameState.ts` | Central game state orchestration |
| `hooks/useCombatActions.ts` | Hero/enemy attack logic |
| `hooks/usePowerActions.ts` | Power activation |
| `hooks/usePathAbilities.ts` | Path ability trigger processing |
| `hooks/combatActionHelpers.ts` | Combat calculation helpers |
| `contexts/CombatContext.tsx` | Combat UI state provider |
| `types/game.ts` | All TypeScript interfaces |
| `components/game/Game.tsx` | Phase router |
| `components/game/BattleArena.tsx` | Battle visualization |

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

## Utility Functions

### Centralized Utilities Pattern (`utils/`)
Combat utilities follow a consistent pattern:
- Deep clone input to prevent mutation
- Return result object with updated entity + logs + metadata
- See `damageUtils.ts` or `statusEffectUtils.ts` as canonical examples

```typescript
// Example: applying damage
import { applyDamageToPlayer } from '@/utils/damageUtils';

const result = applyDamageToPlayer(player, 25, 'enemy_attack');
// result.player - updated player (cloned)
// result.logs - combat log messages
// result.actualDamage - damage after shields
```

### State Cloning (`utils/stateUtils.ts`)
Always use deep clone utilities when modifying player/enemy state:
```typescript
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

const updatedPlayer = deepClonePlayer(player);
updatedPlayer.currentStats.health -= damage;
```

### Combat Log (`utils/circularBuffer.ts`)
Combat log uses a circular buffer (100 entries max):
```typescript
state.combatLog.add('Player attacks for 25 damage!');
const logs = state.combatLog.toArray(); // For rendering
```

## Testing

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
```

**Test Hooks**: Add `?testMode=true` URL param to expose `window.__TEST_HOOKS__` for state manipulation during tests. See `e2e/helpers/test-utils.ts` for utilities.

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

