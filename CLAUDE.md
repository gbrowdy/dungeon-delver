# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Branch Policy

**ALL WORK MUST BE DONE IN FEATURE BRANCHES. NEVER COMMIT DIRECTLY TO MAIN.**

- Create a feature branch before starting any work: `git checkout -b feature/your-feature-name`
- Commit all changes to the feature branch
- Main branch is protected -- only updated via merged PRs

---

## Build & Development Commands

```bash
npm run dev          # Start development server with HMR
npm run build        # Production build
npm run lint         # Run ESLint
npx vitest run       # Run unit tests
npx playwright test --project="Desktop"  # Run E2E tests (desktop)
npx playwright test --project="Mobile Portrait (320px)"  # Run E2E tests (mobile)
```

## Tech Stack

- **Framework**: React 18.3 + TypeScript 5.8 + Vite 5.4
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components
- **State**: Zustand with persist middleware
- **Game Loop**: requestAnimationFrame + fixed timestep accumulator
- **Testing**: Vitest + jsdom (unit), Playwright (E2E)

## Project Structure

```
src/
├── main.tsx                          # Entry point + test hooks init
├── App.tsx                           # Phase router + game loop
├── index.css                         # Tailwind + pixel art styles
│
├── store/                            # Zustand store — all game state
│   ├── gameStore.ts                  # GameState shape + actions + persist
│   ├── index.ts                      # Re-export
│   └── actions/                      # Action logic by domain
│       ├── combat.ts                 # tickCombat() — full combat pipeline
│       ├── setup.ts                  # createInitialPlayer()
│       ├── flow.ts                   # handleEnemyDeath, handlePlayerDeath, spawnEnemy
│       ├── draft.ts                  # generateDraftCards
│       ├── shop.ts                   # generateShopCards
│       ├── statusEffects.ts          # addStatusEffect, tickStatusEffects, hasEffect
│       ├── enrage.ts                 # tickEnrage — 45s timer, power ramp
│       ├── modifiers.ts             # tickModifierBehaviors (berserker, regen, shielded)
│       └── itemProcs.ts             # processItemProcs — generic data-driven dispatcher
│
├── math/                            # Pure functions, zero dependencies
│   ├── balance.ts                   # ALL tuning constants (single source of truth)
│   ├── damage.ts                    # calculateEffectiveness, calculateDamage
│   ├── stats.ts                     # getMaxHp, getAttackInterval, getCritChance, getDodgeChance
│   ├── scaling.ts                   # getGrowthMultiplier, getDraftPickValue, getRoomsPerFloor
│   └── index.ts                     # Barrel export
│
├── data/                            # Game content definitions
│   ├── classes.ts                   # 3 classes (stat weights + innate)
│   ├── items.ts                     # 15 items (5 weapons, 5 armors, 5 accessories)
│   ├── enemies.ts                   # 4 tiers, 6 modifiers, generateEnemy()
│   └── sprites.ts                   # Pixel sprite definitions
│
├── types/
│   └── game.ts                      # CombatEntity, GameState, Item, StatusEffect, phases
│
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── screens/                     # Phase screens (one per game phase)
│   │   ├── MainMenu.tsx
│   │   ├── ClassSelect.tsx
│   │   ├── CombatScreen.tsx
│   │   ├── DraftScreen.tsx
│   │   ├── ShopScreen.tsx
│   │   ├── FloorComplete.tsx
│   │   ├── DeathScreen.tsx
│   │   ├── EndlessIntro.tsx
│   │   └── EndlessDefeat.tsx
│   └── game/                        # Reusable game UI components
│       ├── HealthBar.tsx
│       ├── AttackBar.tsx
│       ├── CombatHeader.tsx
│       ├── CharacterSheet.tsx
│       ├── DraftCard.tsx, StatIcon.tsx
│       ├── ItemCard.tsx, ItemComparison.tsx
│       ├── StatusBadges.tsx
│       ├── ItemSlots.tsx
│       ├── PixelSprite.tsx
│       └── battle-effects/          # FloatingNumbers, AttackEffects, etc.
│
├── hooks/
│   ├── useGameLoop.ts              # rAF + fixed timestep accumulator
│   └── useReducedMotion.ts
│
├── constants/
│   ├── combatTiming.ts             # Animation timing
│   └── responsive.ts              # Breakpoints
│
├── lib/
│   └── utils.ts                    # cn() className merge helper
│
└── utils/
    ├── spriteMapping.ts            # Sprite lookup helpers
    └── testHooks.ts                # window.__TEST_HOOKS__ for Playwright
```

## Architecture

This is a roguelike auto-battler browser game. The player selects a class, fights through floors of enemies, and upgrades stats/items between fights. All combat is automatic -- no active abilities.

### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│              useGameLoop (hooks/useGameLoop.ts)               │
│  requestAnimationFrame → fixed timestep → store.tick(dt)     │
└─────────────────────────────┬────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Zustand Store (store/gameStore.ts)               │
│  tick() → tickCombat(state, dt) → set({ renderVersion++ })  │
└─────────────────────────────┬────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Combat Pipeline (store/actions/combat.ts)        │
│  enrage → modifiers → curse reduction → passives → regen    │
│  → timers → attacks → item procs → status ticks → death     │
└─────────────────────────────┬────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              React UI (components/screens/ + game/)           │
│  useGameStore(selector) reads state, renders phase screen    │
└──────────────────────────────────────────────────────────────┘
```

### Game Loop

The game loop lives in `useGameLoop.ts`:
- **Fixed timestep**: 16ms per tick (~60fps logic)
- **Accumulator pattern**: delta time accumulates, ticks fire in 16ms increments
- **Speed multiplier**: 1x / 2x / 4x (scales effective delta)
- **Catchup cap**: MAX_CATCHUP_TICKS prevents spiral after tab backgrounding
- **renderVersion**: bumped after each tick batch so React re-renders

### Phase Flow

```
menu → class-select → combat ←→ draft → combat → ... → floor-complete
                        |                                     |
                        |                              (boss) shop
                        |                                     |
                        |                              floor-complete
                        ↓
                      death (or endless-defeat)
```

Phases are defined in `GamePhase` type in `src/types/game.ts`. The phase router in `App.tsx` renders the appropriate screen component.

### State Management Patterns

```typescript
// Reading state in React components (selector pattern)
const phase = useGameStore(s => s.phase);
const playerHp = useGameStore(s => s.player.hp);

// Per-frame components subscribe to renderVersion for tick updates
const rv = useGameStore(s => s.renderVersion);

// Calling actions
useGameStore.getState().togglePause();
useGameStore.getState().selectClass('warrior');

// Reading state outside React (in action files, tests)
const state = useGameStore.getState();
```

### Combat Pipeline

`tickCombat(state, dt)` in `store/actions/combat.ts` runs every tick during the `combat` phase. It mutates `state` in place (Zustand Immer-style direct mutation within `set()`):

1. **Enrage** -- 45s timer, scales enemy power
2. **Modifier behaviors** -- berserker, regen, shielded enemy behaviors
3. **Curse reduction** -- decays enemy speed based on curse stacks
4. **Passive innates** -- class innate effects (fortitude heal, crit boost, luck amplify)
5. **Regen** -- ticks regen status effect
6. **Attack timers** -- accumulates both player and enemy attack timers
7. **Attacks** -- when timer reaches threshold, execute attack (damage calc, crit, dodge)
8. **Item procs** -- data-driven item effects trigger on hit/crit/dodge/etc.
9. **Status effect ticks** -- poison damage, stun expiry, etc.
10. **Death check** -- calls `handleEnemyDeath` or `handlePlayerDeath` from flow.ts

### Save/Load

Zustand persist middleware saves to localStorage (`rogue-game-state` key):
- Saves on stable phase transitions (draft, shop, floor-complete)
- Does NOT save during combat, menu, class-select
- Does NOT save endless mode (floor > 100)
- Excludes transient combat state (events, counters, enemy, renderVersion)

### Balance Constants

**All magic numbers live in `src/math/balance.ts`.** This is the single source of truth for tuning. Implementation files import from here -- never hardcode balance values.

Key formulas:
- **Damage**: `X / (X + K)` effectiveness ratio
- **HP scaling**: base HP + fortitude bonus
- **Enemy scaling**: damped exponential (pure expo floors 1-100, then damping kicks in)

## Game Content

| Content | Count | File |
|---------|-------|------|
| Classes | 3 (Warrior, Rogue, Mage) | `src/data/classes.ts` |
| Items | 15 (5 weapon, 5 armor, 5 accessory) | `src/data/items.ts` |
| Enemy tiers | 4 (Common, Uncommon, Rare, Boss) | `src/data/enemies.ts` |
| Enemy modifiers | 6 (Swift, Armored, Berserker, Regen, Venomous, Shielded) | `src/data/enemies.ts` |
| Status effects | 5 (Poison, Stun, Shield, Curse, Regen) | `src/types/game.ts` + `store/actions/statusEffects.ts` |

## How to Add Content

### Adding a New Item

1. **Define the item** in `src/data/items.ts`:
   ```typescript
   export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
     // Add your item here
     my_new_sword: {
       id: 'my_new_sword',
       name: 'My New Sword',
       slot: 'weapon',
       description: 'A sharp blade.',
       tier1: { effect: 'on_hit', type: 'damage_bonus', value: 0.15 },
       tier2: { effect: 'on_hit', type: 'damage_bonus', value: 0.25 },
       tier3: { effect: 'on_hit', type: 'damage_bonus', value: 0.35 },
     },
   };
   ```

2. **Add the ItemId** to the union type in `src/types/game.ts`

3. **If new effect type**: add processing in `src/store/actions/itemProcs.ts`

4. **Write tests** in `src/data/__tests__/` and `src/store/__tests__/`

Items are data-driven: `{ trigger, effect, value }`. The generic `processItemProcs` dispatcher handles them -- no per-item code paths needed for standard effect types.

### Adding a New Class

1. **Define the class** in `src/data/classes.ts`:
   ```typescript
   export const CLASSES: Record<string, ClassDefinition> = {
     my_class: {
       id: 'my_class',
       name: 'My Class',
       description: '...',
       statWeights: { power: 1.2, fortitude: 0.8, speed: 1.0, luck: 1.0 },
       innate: { type: 'some_innate', value: 0.1 },
     },
   };
   ```

2. **Add innate processing** in `tickCombat` (passive innate section)

3. **Add class sprite** in `src/data/sprites.ts`

4. **Write tests** and verify in browser

### Adding a New Enemy Modifier

1. **Add modifier type** to the modifier list in `src/data/enemies.ts`

2. **Add behavior** in `src/store/actions/modifiers.ts`:
   ```typescript
   // In tickModifierBehaviors():
   case 'my_modifier':
     // Apply modifier effect to enemy
     break;
   ```

3. **Write tests** in `src/store/__tests__/`

### Adding a New Status Effect

1. **Add type** to `StatusEffectType` union in `src/types/game.ts`

2. **Add tick behavior** in `src/store/actions/statusEffects.ts`

3. **Add application logic** (where/when the effect is applied in combat)

4. **Add UI badge** in `src/components/game/StatusBadges.tsx`

## Testing

### Browser Validation Required

**ALL functionality changes MUST be validated in the browser using Playwright before being considered complete.** Unit tests alone are NOT sufficient for game functionality.

### Unit Tests (Vitest)

```bash
npx vitest run                    # All tests
npx vitest run src/store          # Store tests only
npx vitest run src/math           # Math tests only
npx vitest run src/data           # Data tests only
```

Test files live alongside their source in `__tests__/` directories.

**Store test pattern:**
```typescript
import { useGameStore } from '@/store/gameStore';

beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
});

test('some behavior', () => {
  const store = useGameStore.getState();
  store.selectClass('warrior');
  store.startRun();
  // Assert state
  expect(useGameStore.getState().phase).toBe('combat');
});
```

### E2E Tests (Playwright)

```bash
npx playwright test --project="Desktop"                  # Desktop
npx playwright test --project="Mobile Portrait (320px)"  # Mobile
npx playwright test --ui                                 # Interactive UI
```

**Test hooks**: Add `?testMode=true` URL param to expose `window.__TEST_HOOKS__` for direct state manipulation during E2E tests. See `src/utils/testHooks.ts` for available hooks (getState, setState, setPhase, setupRun, killEnemy, etc.).

**E2E helpers**: `e2e/helpers/game-actions.ts` provides high-level actions like `startGame()`, `waitForCombat()`, etc.

## Debugging Principles

**Add console.logs FIRST, before writing any fix.** Mental code tracing is not debugging -- runtime observation is debugging.

| Wrong | Right |
|-------|-------|
| "Combat runs before death, so..." | "Add logs -- what actually happens?" |
| "Tests pass so it's fixed" | Write a test for the specific failure case |
| "The fix worked on first try" | Be suspicious -- verify with logging |

## Git Conventions

This project uses **conventional commits**: `type(scope): description`

**Types**: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`

**Scopes**: `store`, `ui`, `combat`, `math`, `data`, `hooks`, `utils`, `types`

```bash
feat(store): add new shop action
fix(ui): prevent button double-click during draft
refactor(combat): extract status effect tick logic
docs: update CLAUDE.md for v2
```

## Task Documents

Task planning documents should be stored in the `tasks/` directory (gitignored).

## Additional References

- Design doc: `docs/plans/2026-02-08-game-redesign-v2.md`
- v2 implementation plans: `docs/plans/v2/`
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/data`, `@/constants`, `@/store`, `@/math`, `@/utils`
- shadcn/ui components: `npx shadcn@latest add <component-name>`
