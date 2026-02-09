# Game Redesign v2: Full Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the auto-battler roguelike from scratch using Zustand instead of ECS, implementing the design from `docs/plans/2026-02-08-game-redesign-v2.md`.

**Architecture:** Zustand store with direct mutation + version counter for the game loop. Fixed-timestep `requestAnimationFrame` loop. React components subscribe to store slices. All game math in pure functions. Visual layer reused from current codebase.

**Tech Stack:** React 18 + TypeScript + Vite + Zustand + Tailwind CSS + shadcn/ui + Vitest + Playwright

**Design Doc:** `docs/plans/2026-02-08-game-redesign-v2.md` (the source of truth for all game mechanics, formulas, and UI specs)

---

## Phase 0: Migration Scaffolding

### Task 0.1: Create Feature Branch

**Step 1: Create branch**
```bash
git checkout -b feature/v2-rebuild
```

**Step 2: Commit**
No commit needed yet.

---

### Task 0.2: Update CLAUDE.md for Migration State

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add migration banner to top of CLAUDE.md**

Add this block immediately after the `# CLAUDE.md` heading, before the branch policy section:

```markdown
## MIGRATION IN PROGRESS: v2 Rebuild

**Status:** Active rebuild. The game is being rewritten from scratch.

**Source of truth:** `docs/plans/2026-02-08-game-redesign-v2.md`

**Key changes:**
- `src/` = NEW codebase (Zustand store, simple game loop, new UI)
- `src-legacy/` = OLD codebase (miniplex ECS, 16 systems, snapshots) — **REFERENCE ONLY, DO NOT MODIFY**
- The old ECS architecture, systems, snapshots, commands, and GameContext are GONE
- New architecture: Zustand store + requestAnimationFrame + fixed timestep tick()
- No paths, no powers, no stances, no active abilities — this is a pure auto-battler

**DO NOT:**
- Import anything from `src-legacy/` into `src/`
- Use ECS patterns (world.addComponent, queries, snapshots) in new code
- Reference old component names or patterns as examples for new code

**DO:**
- Reference `src-legacy/` visually to understand sprite/effect/UI patterns before adapting
- Follow the design doc for all game mechanics and formulas
- Use Zustand patterns (store.getState(), set(), selectors) for state management
```

**Step 2: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: mark CLAUDE.md as migration-in-progress for v2 rebuild"
```

---

### Task 0.3: Restructure Source Directory

**Step 1: Rename src to src-legacy**
```bash
mv src src-legacy
```

**Step 2: Create new src directory structure**
```bash
mkdir -p src/{store/actions,game,data,math,components/{ui,screens,game/battle-effects},hooks,types,constants,utils,lib}
```

**Step 3: Install zustand**
```bash
npm install zustand
```

**Step 4: Remove miniplex from dependencies**
```bash
npm uninstall miniplex @miniplex/react
```

**Step 5: Commit**
```bash
git add -A
git commit -m "chore: restructure for v2 rebuild — src→src-legacy, install zustand"
```

---

### Task 0.4: Copy Reusable Infrastructure

Copy files that need ZERO changes from src-legacy into new src.

**Step 1: Copy config-level files** (these stay at project root, no changes)
- `vite.config.ts` — no changes needed
- `tsconfig.json`, `tsconfig.app.json` — no changes needed
- `tailwind.config.ts` — no changes needed
- `index.html` — no changes needed

**Step 2: Copy entry points**
```bash
cp src-legacy/main.tsx src/main.tsx
cp src-legacy/index.css src/index.css
cp src-legacy/lib/utils.ts src/lib/utils.ts
```

**Step 3: Copy shadcn/ui components (all 52+)**
```bash
cp -r src-legacy/components/ui/* src/components/ui/
```

**Step 4: Copy constants**
```bash
cp src-legacy/constants/combatTiming.ts src/constants/combatTiming.ts
cp src-legacy/constants/responsive.ts src/constants/responsive.ts
```

**Step 5: Copy hooks**
```bash
cp src-legacy/hooks/useReducedMotion.ts src/hooks/useReducedMotion.ts
cp src-legacy/hooks/use-mobile.tsx src/hooks/use-mobile.tsx
```

**Step 6: Copy visual components**
```bash
cp src-legacy/components/game/HealthBar.tsx src/components/game/HealthBar.tsx
cp src-legacy/components/game/PixelSprite.tsx src/components/game/PixelSprite.tsx
cp src-legacy/components/game/battle-effects/AttackEffects.tsx src/components/game/battle-effects/AttackEffects.tsx
cp src-legacy/components/game/battle-effects/DefenseEffects.tsx src/components/game/battle-effects/DefenseEffects.tsx
cp src-legacy/components/game/battle-effects/FloatingNumbers.tsx src/components/game/battle-effects/FloatingNumbers.tsx
cp src-legacy/components/game/battle-effects/BossEffects.tsx src/components/game/battle-effects/BossEffects.tsx
cp src-legacy/components/game/battle-effects/SpellEffects.tsx src/components/game/battle-effects/SpellEffects.tsx
cp src-legacy/components/game/battle-effects/index.ts src/components/game/battle-effects/index.ts
```

**Step 7: Copy sprite data**
```bash
cp src-legacy/data/sprites.ts src/data/sprites.ts
```

**Step 8: Copy MainMenu (will need minor adaptation later)**
```bash
cp src-legacy/components/game/MainMenu.tsx src/components/screens/MainMenu.tsx
```

**Step 9: Commit**
```bash
git add src/
git commit -m "chore: copy reusable visual layer and infrastructure from src-legacy"
```

---

### Task 0.5: Create Minimal App Shell and Verify Dev Server

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx` (strip ECS imports if any)

**Step 1: Create minimal App.tsx**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <h1 className="text-2xl font-bold">Dungeon Delver v2 — Rebuilding</h1>
    </div>
  );
}

export default App;
```

**Step 2: Update main.tsx to remove old imports**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 3: Run dev server**
```bash
npm run dev
```
Expected: Page loads with "Dungeon Delver v2 — Rebuilding" text. No console errors about missing modules.

**Step 4: Fix any broken imports in copied files**
The copied files may import from paths that don't exist yet (e.g., `@/data/sprites` in PixelSprite.tsx). These will be resolved when we build those modules. For now, the App.tsx doesn't import them, so the dev server should work.

**Step 5: Commit**
```bash
git add src/App.tsx src/main.tsx
git commit -m "chore: minimal app shell — dev server verified"
```

---

### Task 0.6: Delete Old E2E Tests

**Step 1: Remove old test files**
```bash
rm -rf e2e/*.spec.ts
```

**Step 2: Keep test helpers and config**
Keep `e2e/helpers/` and `playwright.config.ts` — the patterns are reusable.

**Step 3: Commit**
```bash
git add -A
git commit -m "chore: remove old E2E tests (will write new ones for v2)"
```

---

## Phase 1: Math Layer (Pure Functions, TDD)

All game math as pure functions with zero dependencies. These are the foundation everything else builds on.

### Task 1.1: Damage Formula

**Files:**
- Create: `src/math/damage.ts`
- Test: `src/math/__tests__/damage.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateEffectiveness, calculateDamage } from '../damage';

describe('calculateEffectiveness', () => {
  it('returns 50% at equal power and fortitude', () => {
    expect(calculateEffectiveness(100, 100)).toBeCloseTo(0.5);
  });

  it('returns higher effectiveness when power exceeds fortitude', () => {
    expect(calculateEffectiveness(200, 100)).toBeCloseTo(0.667, 2);
  });

  it('returns lower effectiveness when fortitude exceeds power', () => {
    expect(calculateEffectiveness(100, 200)).toBeCloseTo(0.333, 2);
  });

  it('handles zero fortitude (100% effectiveness)', () => {
    expect(calculateEffectiveness(100, 0)).toBe(1);
  });

  it('handles zero power (0% effectiveness)', () => {
    expect(calculateEffectiveness(0, 100)).toBe(0);
  });
});

describe('calculateDamage', () => {
  it('deals expected damage at equal stats', () => {
    const result = calculateDamage({ power: 100, fortitude: 0, luck: 0 }, { fortitude: 100 }, 1.0);
    // effectiveness = 100/200 = 0.5, damage = 100 * 0.5 * 1.0 = 50
    expect(result.final).toBe(50);
  });

  it('applies crit multiplier', () => {
    const result = calculateDamage({ power: 100, fortitude: 0, luck: 0 }, { fortitude: 100 }, 2.0);
    // 100 * 0.5 * 2.0 = 100
    expect(result.final).toBe(100);
  });

  it('never deals less than 1 damage', () => {
    const result = calculateDamage({ power: 1, fortitude: 0, luck: 0 }, { fortitude: 10000 }, 1.0);
    expect(result.final).toBe(1);
  });

  it('uses DoT formula when isDot is true', () => {
    // DoT treats defender as having half fortitude
    const normal = calculateDamage({ power: 100, fortitude: 0, luck: 0 }, { fortitude: 100 }, 1.0);
    const dot = calculateDamage({ power: 100, fortitude: 0, luck: 0 }, { fortitude: 100 }, 1.0, true);
    expect(dot.final).toBeGreaterThan(normal.final);
    // DoT: 100 / (100 + 50) = 0.667, damage = 100 * 0.667 = 67
    expect(dot.final).toBe(67);
  });
});
```

**Step 2: Run test to verify it fails**
```bash
npx vitest run src/math/__tests__/damage.test.ts
```
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/math/damage.ts

export interface AttackerStats {
  power: number;
  fortitude: number;
  luck: number;
}

export interface DefenderStats {
  fortitude: number;
}

export interface DamageResult {
  raw: number;
  final: number;
  effectiveness: number;
  isCrit: boolean;
}

/**
 * X/(X+K) effectiveness ratio. Always 0-1.
 * Computed FIRST to avoid overflow (power*power exceeds safe integers at high floors).
 */
export function calculateEffectiveness(attackerPower: number, defenderFortitude: number): number {
  if (attackerPower <= 0) return 0;
  return attackerPower / (attackerPower + defenderFortitude);
}

/**
 * Core damage formula. See design doc Section 2.
 * DoT attacks treat defender as having half fortitude.
 */
export function calculateDamage(
  attacker: AttackerStats,
  defender: DefenderStats,
  critMultiplier: number,
  isDot = false
): DamageResult {
  const effectiveFortitude = isDot ? defender.fortitude * 0.5 : defender.fortitude;
  const effectiveness = calculateEffectiveness(attacker.power, effectiveFortitude);
  const raw = attacker.power * effectiveness * critMultiplier;
  const final = Math.max(1, Math.round(raw));

  return {
    raw,
    final,
    effectiveness,
    isCrit: critMultiplier > 1,
  };
}
```

**Step 4: Run test to verify it passes**
```bash
npx vitest run src/math/__tests__/damage.test.ts
```
Expected: ALL PASS

**Step 5: Commit**
```bash
git add src/math/
git commit -m "feat(math): damage formula with effectiveness ratio and DoT variant"
```

---

### Task 1.2: Derived Stats (HP, Attack Interval, Crit, Dodge)

**Files:**
- Create: `src/math/stats.ts`
- Test: `src/math/__tests__/stats.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { getMaxHp, getAttackInterval, getCritChance, getCritDamage, getDodgeChance } from '../stats';

describe('getMaxHp', () => {
  it('calculates HP from base + fortitude', () => {
    expect(getMaxHp(50, 10)).toBe(100); // 50 + 10*5
  });
});

describe('getAttackInterval', () => {
  it('returns 2500ms at speed 10', () => {
    expect(getAttackInterval(10)).toBe(2500);
  });

  it('clamps speed to minimum 3', () => {
    expect(getAttackInterval(0)).toBe(getAttackInterval(3));
    expect(getAttackInterval(1)).toBe(getAttackInterval(3));
  });

  it('returns ~1250ms at speed 20 (halved)', () => {
    expect(getAttackInterval(20)).toBe(1250);
  });
});

describe('getCritChance', () => {
  it('returns base 5% at luck 0', () => {
    expect(getCritChance(0)).toBeCloseTo(0.05);
  });

  it('hard caps at 60%', () => {
    expect(getCritChance(1000)).toBe(0.60);
  });

  it('scales linearly with luck', () => {
    expect(getCritChance(10)).toBeCloseTo(0.25); // 0.05 + 10*0.02
  });
});

describe('getCritDamage', () => {
  it('returns 1.5x at luck 0', () => {
    expect(getCritDamage(0)).toBe(1.5);
  });

  it('caps at 2.5x', () => {
    expect(getCritDamage(1000)).toBe(2.5);
  });
});

describe('getDodgeChance', () => {
  it('returns 0% at luck 0', () => {
    expect(getDodgeChance(0)).toBe(0);
  });

  it('caps at 30%', () => {
    expect(getDodgeChance(1000)).toBe(0.30);
  });
});
```

**Step 2: Run test to verify it fails**
```bash
npx vitest run src/math/__tests__/stats.test.ts
```

**Step 3: Write implementation**

```typescript
// src/math/stats.ts

const MIN_SPEED = 3;
const CRIT_CHANCE_CAP = 0.60;
const CRIT_DAMAGE_CAP = 2.5;
const DODGE_CHANCE_CAP = 0.30;

export function getMaxHp(baseHp: number, fortitude: number): number {
  return baseHp + fortitude * 5;
}

export function getAttackInterval(speed: number): number {
  const effectiveSpeed = Math.max(speed, MIN_SPEED);
  return Math.round(25000 / effectiveSpeed);
}

export function getCritChance(luck: number): number {
  return Math.min(0.05 + luck * 0.02, CRIT_CHANCE_CAP);
}

export function getCritDamage(luck: number): number {
  return 1.5 + Math.min(luck * 0.04, 1.0);
}

export function getDodgeChance(luck: number): number {
  return Math.min(luck * 0.008, DODGE_CHANCE_CAP);
}
```

**Step 4: Run tests, verify pass**
```bash
npx vitest run src/math/__tests__/stats.test.ts
```

**Step 5: Commit**
```bash
git add src/math/
git commit -m "feat(math): derived stats — HP, attack interval, crit, dodge"
```

---

### Task 1.3: Scaling Functions (Enemy Growth, Draft Pick Values)

**Files:**
- Create: `src/math/scaling.ts`
- Test: `src/math/__tests__/scaling.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { getGrowthMultiplier, getDraftPickValue } from '../scaling';

describe('getGrowthMultiplier', () => {
  it('returns 1 at floor 1', () => {
    expect(getGrowthMultiplier(1, 0.065)).toBe(1);
  });

  it('grows exponentially before floor 100', () => {
    const floor50 = getGrowthMultiplier(50, 0.065);
    const floor51 = getGrowthMultiplier(51, 0.065);
    expect(floor51 / floor50).toBeCloseTo(1.065, 2);
  });

  it('grows slower after floor 100 (damping)', () => {
    const rate100to101 = getGrowthMultiplier(101, 0.065) / getGrowthMultiplier(100, 0.065);
    const rate50to51 = getGrowthMultiplier(51, 0.065) / getGrowthMultiplier(50, 0.065);
    expect(rate100to101).toBeLessThan(rate50to51);
  });

  it('stays within safe integer range at floor 50000', () => {
    const val = getGrowthMultiplier(50000, 0.065);
    expect(val).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(val).toBeGreaterThan(0);
  });
});

describe('getDraftPickValue', () => {
  it('returns small values at floor 1 for power/fortitude', () => {
    const val = getDraftPickValue(1, 'power');
    expect(val).toBeGreaterThanOrEqual(3);
    expect(val).toBeLessThanOrEqual(8);
  });

  it('returns flat +1 or +2 for speed regardless of floor', () => {
    const floor1 = getDraftPickValue(1, 'speed');
    const floor100 = getDraftPickValue(100, 'speed');
    expect(floor1).toBeLessThanOrEqual(2);
    expect(floor100).toBeLessThanOrEqual(2);
  });

  it('returns flat +1 or +2 for luck regardless of floor', () => {
    const floor100 = getDraftPickValue(100, 'luck');
    expect(floor100).toBeLessThanOrEqual(2);
  });

  it('scales power/fortitude picks with floor', () => {
    const floor1 = getDraftPickValue(1, 'power');
    const floor100 = getDraftPickValue(100, 'power');
    expect(floor100).toBeGreaterThan(floor1 * 2);
  });
});
```

**Step 2: Run test, verify fail**
**Step 3: Write implementation** (use the damped growth formula from design doc Section 5)

```typescript
// src/math/scaling.ts

const DAMPING_START = 100;

export function getGrowthMultiplier(floor: number, baseRate: number): number {
  if (floor <= 1) return 1;

  if (floor <= DAMPING_START) {
    return Math.pow(1 + baseRate, floor - 1);
  }

  const thresholdMult = Math.pow(1 + baseRate, DAMPING_START - 1);
  const beyondFloors = floor - DAMPING_START;
  const dampingFactor = DAMPING_START / (DAMPING_START + beyondFloors * 0.5);
  const dampedRate = baseRate * dampingFactor;

  return thresholdMult * Math.pow(1 + dampedRate, beyondFloors);
}

export type StatType = 'power' | 'fortitude' | 'speed' | 'luck';

export function getDraftPickValue(floor: number, stat: StatType): number {
  if (stat === 'speed' || stat === 'luck') {
    return Math.random() < 0.5 ? 1 : 2;
  }
  // Power/Fortitude scale with floor
  const base = 3 + Math.floor(floor * 0.24);
  const variance = Math.floor(base * 0.3);
  return base + Math.floor(Math.random() * (variance + 1)) - Math.floor(variance / 2);
}
```

**Step 4: Run tests, verify pass**
**Step 5: Commit**
```bash
git add src/math/
git commit -m "feat(math): scaling functions — growth multiplier, draft pick values"
```

---

### Task 1.4: Balance Constants

**Files:**
- Create: `src/math/balance.ts`

**Step 1: Create balance constants file**

```typescript
// src/math/balance.ts
// All tuning constants in one place. See design doc Section 2.

// Stat floors — stats cannot be reduced below these values
export const MIN_POWER = 1;
export const MIN_FORTITUDE = 0;
export const MIN_SPEED = 3;
export const MIN_LUCK = 0;

// Derived stat caps
export const CRIT_CHANCE_CAP = 0.60;
export const CRIT_DAMAGE_CAP = 2.5;
export const DODGE_CHANCE_CAP = 0.30;

// Combat timing
export const TICK_MS = 16;              // fixed timestep (~60 ticks/sec)
export const MAX_CATCHUP_TICKS = 10;    // cap rAF catchup after tab-background

// Enrage
export const ENRAGE_THRESHOLD_MS = 45000; // 45 seconds
export const ENRAGE_POWER_RAMP = 0.05;   // 5% per second after enrage

// Enemy scaling growth rates
export const GROWTH_RATES = {
  hp: 0.065,
  power: 0.058,
  fortitude: 0.050,
  speed: 0.020,
} as const;

// Boss HP multiplier: 2.5 + floor * 0.005
export const BOSS_HP_MULT_BASE = 2.5;
export const BOSS_HP_MULT_PER_FLOOR = 0.005;

// Status effects
export const MAX_POISON_STACKS = 5;
export const POISON_DURATION_MS = 3000;
export const STUN_DURATION_MS = 1000;
export const STUN_IMMUNITY_MS = 2000;
export const MAX_CURSE_STACKS = 10;
export const CURSE_DECAY_INTERVAL_MS = 3000;

// Floor structure
export const FIRST_BOSS_FLOOR = 3;
export const BOSS_INTERVAL = 5;
export const BREAKPOINT_INTERVAL = 25;
export const BREAKPOINT_STAT_BOOST = 0.20; // 20% stat boost at breakpoints
```

**Step 2: Commit**
```bash
git add src/math/balance.ts
git commit -m "feat(math): balance constants — all tuning values in one place"
```

---

## Phase 2: Game Data

### Task 2.1: Type Definitions

**Files:**
- Create: `src/types/game.ts`

**Step 1: Create core type definitions**

Define all types from design doc Section 9 (GameState interface). This is the single source of truth for the game's data shape. Include: `CombatEntity`, `StatusEffect`, `GameState`, `Item`, `DraftCard`, `EnemyModifier`, `CombatEvent`, `DeathSummary`, `GamePhase`.

Reference the updated GameState interface from the design doc — it includes `combatElapsed`, `combatEvents`, `speedMultiplier`, `paused`, `lastDeathStats`, `basePower`, etc.

**Step 2: Commit**
```bash
git add src/types/
git commit -m "feat(types): core game type definitions"
```

---

### Task 2.2: Class Definitions

**Files:**
- Create: `src/data/classes.ts`
- Test: `src/data/__tests__/classes.test.ts`

Define the 3 classes from design doc Section 3: Warrior, Rogue, Mage. Each is a stat weight object + innate formula ID. Write a validation test that all classes have valid stat weights and an innate.

**Commit:** `feat(data): class definitions — Warrior, Rogue, Mage`

---

### Task 2.3: Item Definitions

**Files:**
- Create: `src/data/items.ts`
- Test: `src/data/__tests__/items.test.ts`

Define all 15 items from design doc Section 6: 5 weapons, 5 armors, 5 accessories. Each item has: id, name, slot, description, effect type, effect values, tier (default 1). Write validation tests.

**Commit:** `feat(data): item definitions — 15 items across 3 slots`

---

### Task 2.4: Enemy Definitions

**Files:**
- Create: `src/data/enemies.ts`
- Test: `src/data/__tests__/enemies.test.ts`

Define enemy tiers from design doc Section 5 (Common, Uncommon, Rare, Boss base stats) and modifier tags (Swift, Armored, Berserker, Regenerating, Venomous, Shielded). Include enemy generation function that takes floor + room and returns a scaled enemy.

**Commit:** `feat(data): enemy generation — tiers, modifiers, floor scaling`

---

## Phase 3: Zustand Store + Game Loop

### Task 3.1: Core Zustand Store

**Files:**
- Create: `src/store/gameStore.ts`
- Test: `src/store/__tests__/gameStore.test.ts`

Create the Zustand store with the full `GameState` interface. Include:
- Initial state (menu phase)
- `renderVersion` counter
- Basic actions: `selectClass()`, `setPhase()`, `togglePause()`, `setSpeed()`
- Test that store initializes correctly and actions work

**Commit:** `feat(store): core Zustand store with game state`

---

### Task 3.2: Combat Actions (tick logic)

**Files:**
- Create: `src/store/actions/combat.ts`
- Test: `src/store/actions/__tests__/combat.test.ts`

Implement the core `tick()` function from design doc Section 9:
- Attack timer accumulation
- Damage calculation (using math/damage.ts)
- Weapon proc application
- Armor proc application
- Status effect ticking
- Enrage timer
- Death checking
- Combat event emission

Tests should cover: basic attack cycle, damage application, enrage activation, death detection, stun preventing attacks.

**Commit:** `feat(combat): core tick function with attack cycle and status effects`

---

### Task 3.3: Flow Actions (room/floor advancement)

**Files:**
- Create: `src/store/actions/flow.ts`
- Test: `src/store/actions/__tests__/flow.test.ts`

Implement phase transitions from design doc Section 9 state flow:
- `advanceRoom()` — next room or trigger draft/boss/floor-complete
- `advanceFloor()` — increment floor, reset room
- `handleEnemyDeath()` — spawn next enemy or advance
- `handlePlayerDeath()` — checkpoint logic (floors 1-100) or endless defeat
- `spawnEnemy()` — generate enemy for current floor/room

**Commit:** `feat(flow): room/floor advancement and death handling`

---

### Task 3.4: Draft Actions

**Files:**
- Create: `src/store/actions/draft.ts`
- Test: `src/store/actions/__tests__/draft.test.ts`

Implement draft pick system from design doc Section 4:
- `generateDraftPicks()` — 3 cards biased by class stat weights
- `selectDraft(index)` — apply stat boost
- Impact preview calculation (% damage change, ms interval change)

**Commit:** `feat(draft): draft pick generation and selection`

---

### Task 3.5: Shop Actions

**Files:**
- Create: `src/store/actions/shop.ts`
- Test: `src/store/actions/__tests__/shop.test.ts`

Implement boss shop from design doc Section 4:
- `generateShopCards()` — 5 cards, at least 1 item guaranteed
- `selectShopCard(index)` / `deselectShopCard(index)` — toggle selection (max 2)
- `equipItem(slot, item)` — equip new item
- `confirmShop()` — apply all selections

**Commit:** `feat(shop): boss shop card generation and item equipping`

---

### Task 3.6: Game Loop

**Files:**
- Create: `src/game/loop.ts`
- Create: `src/hooks/useGameLoop.ts`

Implement the fixed-timestep rAF loop from design doc Section 9:
- Accumulator pattern with `TICK_MS = 16`
- `MAX_CATCHUP_TICKS = 10` for tab backgrounding
- Speed multiplier (1x/2x/4x)
- `renderVersion` bump after each tick batch
- React hook that starts/stops the loop

**Commit:** `feat(game): fixed-timestep game loop with speed control`

---

## Phase 4: UI Screens

### Task 4.1: Phase Router (App.tsx)

**Files:**
- Modify: `src/App.tsx`

Replace placeholder with phase router that reads `phase` from Zustand store and renders the appropriate screen component. Stub screens as placeholder `<div>` elements initially.

**Commit:** `feat(ui): phase router in App.tsx`

---

### Task 4.2: Main Menu Screen

**Files:**
- Modify: `src/components/screens/MainMenu.tsx`

Adapt the copied MainMenu to work with Zustand. Replace the `onStart` prop with a direct store action call. Keep the pixel art aesthetic.

**Commit:** `feat(ui): main menu screen with Zustand integration`

---

### Task 4.3: Class Select Screen

**Files:**
- Create: `src/components/screens/ClassSelect.tsx`

Build class selection from design doc Section 8. Show 3 classes with:
- Class name and innate description (plain language)
- Stat weight visualization (simple bar chart or radar)
- "What this means" tooltip
- Select + confirm flow

**Commit:** `feat(ui): class selection screen with stat previews`

---

### Task 4.4: Combat Screen

**Files:**
- Create: `src/components/screens/CombatScreen.tsx`
- Create: `src/components/game/AttackBar.tsx`

Build the main combat view from design doc Section 8:
- Side-view layout (player left, enemy right)
- Health bars (reuse HealthBar.tsx)
- Attack timer bars (new AttackBar component — blue to yellow to white fill)
- Speed controls (1x/2x/4x toggle)
- Pause button
- Floor/room indicator
- Floating damage numbers (reuse FloatingNumbers.tsx)
- Item slots display

This is the largest single UI task. Subscribe to `renderVersion` for per-frame updates.

**Commit:** `feat(ui): combat screen with attack bars, health bars, speed controls`

---

### Task 4.5: Draft Pick Screen

**Files:**
- Create: `src/components/screens/DraftScreen.tsx`
- Create: `src/components/game/DraftCard.tsx`

Build draft overlay from design doc Section 8 (updated with impact preview):
- Current stats bar at top
- 3 cards with stat icon, value, and impact preview
- Select/deselect on tap
- Confirm button

**Commit:** `feat(ui): draft pick screen with impact preview`

---

### Task 4.6: Boss Shop Screen

**Files:**
- Create: `src/components/screens/ShopScreen.tsx`
- Create: `src/components/game/ItemCard.tsx`
- Create: `src/components/game/ItemComparison.tsx`

Build shop from design doc Section 8:
- 5 cards (stat boosts + items)
- Select up to 2
- Item cards open comparison overlay
- Mobile: horizontal scroll for cards
- Confirm button

**Commit:** `feat(ui): boss shop with item comparison`

---

### Task 4.7: Floor Complete Screen

**Files:**
- Create: `src/components/screens/FloorComplete.tsx`

Brief pause screen from design doc Section 8:
- Floor depth, stat summary, equipped items with effects
- "Continue to Floor N" button
- Auto-advance after 3s (click to skip)

**Commit:** `feat(ui): floor complete screen`

---

### Task 4.8: Death & Endless Screens

**Files:**
- Create: `src/components/screens/DeathScreen.tsx`
- Create: `src/components/screens/EndlessIntro.tsx`
- Create: `src/components/screens/EndlessDefeat.tsx`

Death screen from design doc Section 8 (death summary):
- Enemy info, stat comparison, damage per hit, weakest link hint
- Respawn button (floors 1-100) or return to menu (endless)

Endless intro: "no more checkpoints" warning screen.
Endless defeat: high score display.

**Commit:** `feat(ui): death summary, endless intro, endless defeat screens`

---

### Task 4.9: Character Sheet

**Files:**
- Create: `src/components/game/CharacterSheet.tsx`

Persistent overlay from design doc Section 8:
- All 4 stats + derived values
- Equipped items with full effect descriptions
- Accessible from any phase via stats button

**Commit:** `feat(ui): character sheet overlay`

---

## Phase 5: Integration & Polish

### Task 5.1: Wire Everything Together

Connect all screens to the store. Verify the full flow works:
menu -> class-select -> combat -> draft -> combat -> ... -> floor-complete -> boss shop -> next floor

Test manually in browser.

**Commit:** `feat: full game flow integration`

---

### Task 5.2: Save/Load

**Files:**
- Modify: `src/store/gameStore.ts`

Add Zustand `persist` middleware. Auto-save on phase transitions. Resume on page load.
Endless mode NOT saved (closing browser = run over).

**Commit:** `feat(store): save/load via localStorage`

---

### Task 5.3: Test Hooks for E2E

**Files:**
- Create: `src/utils/testHooks.ts`
- Modify: `src/main.tsx`

Expose `window.__TEST_HOOKS__` when `?testMode=true` URL param is present.
Hooks read/write directly to Zustand store.

**Commit:** `feat(test): test hooks for E2E via Zustand store`

---

## Phase 6: Testing

### Task 6.1: Unit Tests for Store Actions

Write comprehensive unit tests for all store actions (combat tick, flow, draft, shop). Target the edge cases identified in the design reviews:
- Enrage timer activation
- Status effect stacking limits
- Curse decay
- Stun immunity window
- Stat floor clamping
- Checkpoint death logic

**Commit:** `test: comprehensive store action tests`

---

### Task 6.2: E2E — Game Flow

**Files:**
- Create: `e2e/game-flow.spec.ts`

Test full game lifecycle: start -> class select -> combat -> draft -> floor complete -> boss shop -> continue.

**Commit:** `test(e2e): game flow — start to floor completion`

---

### Task 6.3: E2E — Combat Mechanics

**Files:**
- Create: `e2e/combat.spec.ts`

Test combat visuals: damage numbers appear, health bars decrease, attack bars fill, speed controls work.

**Commit:** `test(e2e): combat mechanics and visual feedback`

---

### Task 6.4: E2E — Death & Progression

**Files:**
- Create: `e2e/death-progression.spec.ts`

Test death flow: player dies -> death summary shown -> respawn at checkpoint -> stats preserved.

**Commit:** `test(e2e): death and checkpoint progression`

---

### Task 6.5: E2E — Mobile Responsiveness

**Files:**
- Create: `e2e/responsive.spec.ts`

Test all screens at 320px width. Verify touch targets, boss shop layout, draft cards.

**Commit:** `test(e2e): mobile responsive layouts`

---

## Phase 7: Cleanup

### Task 7.1: Remove src-legacy

```bash
rm -rf src-legacy
git add -A
git commit -m "chore: remove src-legacy — migration complete"
```

---

### Task 7.2: Update CLAUDE.md for New Architecture

**Files:**
- Modify: `CLAUDE.md`

**This is a full rewrite.** Replace ALL ECS documentation with:
- New project structure (Zustand store, math layer, data layer, screens)
- New architecture diagram (store -> tick -> React)
- New "how to add content" guides (adding items, classes, enemies)
- New code patterns (Zustand selectors, direct mutation, version counter)
- New testing patterns (Zustand store tests, E2E test hooks)
- Remove ALL references to: miniplex, ECS, systems, snapshots, commands, queries, GameContext, paths, powers, stances
- Remove the migration banner from Task 0.2
- Keep: git conventions, branch policy, build commands, tech stack description

**Commit:** `docs: rewrite CLAUDE.md for v2 Zustand architecture`

---

### Task 7.3: Clean Up package.json

Remove unused dependencies that were only needed for the ECS architecture:
- `@tanstack/react-query`
- `react-hook-form`, `@hookform/resolvers`
- Any other packages no longer imported

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused dependencies from package.json"
```

---

## Verification

After all tasks complete:

1. **Dev server:** `npm run dev` — game loads, full flow works
2. **Build:** `npm run build` — no TypeScript or build errors
3. **Unit tests:** `npx vitest run` — all pass
4. **E2E tests:** `npx playwright test --project="Desktop"` — all pass
5. **Mobile E2E:** `npx playwright test --project="Mobile Portrait (320px)"` — all pass
6. **Lint:** `npm run lint` — no errors
7. **Manual play-through:** Start as each class, reach at least floor 5, die, respawn, continue
