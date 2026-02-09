# Foundation: Migration Scaffolding + Math Layer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the v2 project structure (rename `src/` to `src-legacy/`, create new `src/`), install Zustand, copy all reusable visual/UI files, implement the pure math layer (damage, stats, scaling, balance constants), and verify the dev server runs.

**Architecture:** The math layer is pure functions with zero dependencies — they take numbers in and return numbers out. These are the foundation that every other layer builds on. The scaffolding tasks copy ~11K lines of proven visual/UI code from the existing codebase that needs zero changes.

**Tech Stack:** TypeScript, Vitest (unit tests), Zustand (installed but not used until Doc 3), Vite (dev server verification)

**Design doc reference:** Sections 2 (Stats & Combat Math) and 9 (Architecture — tech stack, project structure) of `docs/plans/2026-02-08-game-redesign-v2.md`

---

## Task 1: Mark CLAUDE.md as Migration-in-Progress

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add migration banner after the `# CLAUDE.md` heading**

Insert this block immediately after the `# CLAUDE.md` heading, before the `## Branch Policy` section:

```markdown
## MIGRATION IN PROGRESS: v2 Rebuild

**Status:** Active rebuild. The game is being rewritten from scratch.

**Source of truth:** `docs/plans/2026-02-08-game-redesign-v2.md`

**Key changes:**
- `src/` = NEW codebase (Zustand store, simple game loop, new UI)
- `src-legacy/` = OLD codebase (miniplex ECS, 16 systems, snapshots) — REFERENCE ONLY, DO NOT MODIFY
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

## Task 2: Rename `src/` to `src-legacy/`

**Step 1: Rename the directory**

```bash
git mv src src-legacy
```

**Step 2: Create the new `src/` directory structure**

```bash
mkdir -p src/{store/actions,game,data,math,components/{ui,screens,game/battle-effects},hooks,types,constants,utils,lib}
```

**Step 3: Verify both directories exist**

```bash
ls -d src src-legacy
```

Expected output:
```
src		src-legacy
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: rename src to src-legacy, create new src directory structure"
```

---

## Task 3: Update Dependencies

**Step 1: Install Zustand**

```bash
npm install zustand
```

**Step 2: Remove miniplex**

```bash
npm uninstall miniplex @miniplex/react
```

**Step 3: Verify package.json**

Run: `grep -E '"zustand"|"miniplex"' package.json`

Expected: `zustand` appears, `miniplex` does not.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install zustand, remove miniplex"
```

---

## Task 4: Copy Reusable Infrastructure

Copy files that need ZERO changes from `src-legacy/` into new `src/`. These are all self-contained — they depend only on `@/lib/utils` (which we also copy) and Tailwind classes.

**Step 1: Copy foundation files**

```bash
# Entry point and CSS
cp src-legacy/main.tsx src/main.tsx
cp src-legacy/index.css src/index.css

# Utility (cn function for Tailwind class merging)
cp src-legacy/lib/utils.ts src/lib/utils.ts
```

**Step 2: Copy all shadcn/ui components**

```bash
cp -r src-legacy/components/ui/* src/components/ui/
```

**Step 3: Copy constants**

```bash
cp src-legacy/constants/combatTiming.ts src/constants/combatTiming.ts
cp src-legacy/constants/responsive.ts src/constants/responsive.ts
```

**Step 4: Copy hooks**

```bash
cp src-legacy/hooks/useReducedMotion.ts src/hooks/useReducedMotion.ts
cp src-legacy/hooks/use-mobile.tsx src/hooks/use-mobile.tsx
```

**Step 5: Copy visual components**

```bash
# PixelSprite (renders pixel art via CSS box-shadow — zero game logic dependency)
cp src-legacy/components/game/PixelSprite.tsx src/components/game/PixelSprite.tsx

# HealthBar (takes current/max props — zero game logic dependency)
cp src-legacy/components/game/HealthBar.tsx src/components/game/HealthBar.tsx

# Battle effects (all take simple prop objects — zero game logic dependency)
cp src-legacy/components/game/battle-effects/FloatingNumbers.tsx src/components/game/battle-effects/FloatingNumbers.tsx
cp src-legacy/components/game/battle-effects/AttackEffects.tsx src/components/game/battle-effects/AttackEffects.tsx
cp src-legacy/components/game/battle-effects/DefenseEffects.tsx src/components/game/battle-effects/DefenseEffects.tsx
cp src-legacy/components/game/battle-effects/SpellEffects.tsx src/components/game/battle-effects/SpellEffects.tsx
cp src-legacy/components/game/battle-effects/BossEffects.tsx src/components/game/battle-effects/BossEffects.tsx
cp src-legacy/components/game/battle-effects/index.ts src/components/game/battle-effects/index.ts
```

**Step 6: Copy sprite data**

```bash
cp src-legacy/data/sprites.ts src/data/sprites.ts
```

**Step 7: Copy MainMenu (will adapt for Zustand later in Doc 4)**

```bash
cp src-legacy/components/game/MainMenu.tsx src/components/screens/MainMenu.tsx
```

**Step 8: Commit**

```bash
git add src/
git commit -m "chore: copy reusable visual layer and infrastructure from src-legacy"
```

---

## Task 5: Create Minimal App Shell and Verify Dev Server

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx` (strip any old imports)

**Step 1: Write `src/main.tsx`**

This should be a clean entry point — no old game context imports:

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

(This matches the existing `main.tsx` — it's already clean. Verify it matches and leave as-is.)

**Step 2: Write `src/App.tsx`**

```tsx
// src/App.tsx
function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <h1 className="text-2xl font-bold font-['Press_Start_2P']">
        Dungeon Delver v2
      </h1>
    </div>
  );
}

export default App;
```

**Step 3: Run dev server**

```bash
npm run dev
```

Expected: Page loads at `http://localhost:5173/dungeon-delver/` with "Dungeon Delver v2" text in pixel font, dark background. No console errors about missing modules.

**Note:** The copied files (PixelSprite, battle-effects, MainMenu, etc.) have `@/` imports that may reference files not yet in the new `src/`. This is fine — `App.tsx` doesn't import them yet, so Vite only compiles what's actually imported. They'll resolve when we build the screens in Doc 4.

**Step 4: Kill the dev server (Ctrl+C)**

**Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "chore: minimal app shell — dev server verified"
```

---

## Task 6: Delete Old E2E Tests

The old E2E tests reference the old game flow, screens, and selectors. They won't work with the v2 architecture. New E2E tests will be written in Doc 5.

**Step 1: Remove old E2E spec files**

```bash
rm e2e/*.spec.ts
```

**Step 2: Keep helpers and config**

Keep `e2e/helpers/` (test utility patterns are reusable) and `playwright.config.ts`.

**Step 3: Verify**

```bash
ls e2e/
```

Expected: Only `helpers/` and `screenshots/` directories remain (no `.spec.ts` files).

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old E2E tests (will write new ones for v2)"
```

---

## Task 7: Damage Formula — Write Failing Tests

**Files:**
- Create: `src/math/__tests__/damage.test.ts`

**Step 1: Write the test file**

```typescript
// src/math/__tests__/damage.test.ts
import { describe, it, expect } from 'vitest';
import { calculateEffectiveness, calculateDamage } from '../damage';

describe('calculateEffectiveness', () => {
  it('returns 50% when power equals fortitude', () => {
    expect(calculateEffectiveness(100, 100)).toBeCloseTo(0.5);
  });

  it('returns higher when power exceeds fortitude', () => {
    // 200 / (200 + 100) = 0.6667
    expect(calculateEffectiveness(200, 100)).toBeCloseTo(0.667, 2);
  });

  it('returns lower when fortitude exceeds power', () => {
    // 100 / (100 + 200) = 0.3333
    expect(calculateEffectiveness(100, 200)).toBeCloseTo(0.333, 2);
  });

  it('returns 1.0 when fortitude is 0 (100% effectiveness)', () => {
    expect(calculateEffectiveness(100, 0)).toBe(1);
  });

  it('returns 0 when power is 0', () => {
    expect(calculateEffectiveness(0, 100)).toBe(0);
  });

  it('returns 0 when both are 0 (no division by zero)', () => {
    expect(calculateEffectiveness(0, 0)).toBe(0);
  });

  it('stays bounded at extreme values (floor 25K+)', () => {
    // At very high floors, values can be in the billions
    const hugePower = 4_000_000_000;
    const hugeFort = 3_500_000_000;
    const result = calculateEffectiveness(hugePower, hugeFort);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
    // 4B / (4B + 3.5B) = 0.5333
    expect(result).toBeCloseTo(0.533, 2);
  });
});

describe('calculateDamage', () => {
  it('returns correct damage at equal power/fortitude with no crit', () => {
    // effectiveness = 100/(100+100) = 0.5
    // raw = 100 * 0.5 * 1.0 = 50
    const result = calculateDamage(100, 100, 1.0);
    expect(result.final).toBe(50);
    expect(result.effectiveness).toBeCloseTo(0.5);
    expect(result.isCrit).toBe(false);
  });

  it('applies crit multiplier correctly', () => {
    // effectiveness = 0.5, raw = 100 * 0.5 * 2.0 = 100
    const result = calculateDamage(100, 100, 2.0);
    expect(result.final).toBe(100);
    expect(result.isCrit).toBe(true);
  });

  it('never deals less than 1 damage', () => {
    const result = calculateDamage(1, 100_000, 1.0);
    expect(result.final).toBe(1);
  });

  it('rounds correctly', () => {
    // 80 / (80 + 100) = 0.4444
    // 80 * 0.4444 * 1.0 = 35.556 -> rounds to 36
    const result = calculateDamage(80, 100, 1.0);
    expect(result.final).toBe(36);
  });

  it('handles zero power (always minimum 1)', () => {
    const result = calculateDamage(0, 100, 1.0);
    expect(result.final).toBe(1);
  });

  it('handles zero fortitude (full damage)', () => {
    // effectiveness = 100/100 = 1.0
    // damage = 100 * 1.0 = 100
    const result = calculateDamage(100, 0, 1.0);
    expect(result.final).toBe(100);
  });
});

describe('calculateDotDamage', () => {
  it('treats defender as having half fortitude', () => {
    // Normal: 100/(100+100) = 0.5, damage = 50
    const normal = calculateDamage(100, 100, 1.0);
    // DoT: 100/(100+50) = 0.667, damage = 67
    const dot = calculateDamage(100, 100, 1.0, true);
    expect(dot.final).toBeGreaterThan(normal.final);
    expect(dot.final).toBe(67);
  });

  it('half fortitude of zero is still zero', () => {
    const dot = calculateDamage(100, 0, 1.0, true);
    expect(dot.final).toBe(100);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/math/__tests__/damage.test.ts
```

Expected: FAIL — `Cannot find module '../damage'`

---

## Task 8: Damage Formula — Implement

**Files:**
- Create: `src/math/damage.ts`

**Step 1: Write the implementation**

```typescript
// src/math/damage.ts
//
// Core damage formula: X/(X+K) effectiveness ratio.
// Design doc Section 2: "Two operations: effectiveness ratio, then multiply."
//
// OVERFLOW SAFETY: Always compute effectiveness first (result is 0-1),
// then multiply by power. Never compute power*power as intermediate —
// at floor 25K+, that exceeds Number.MAX_SAFE_INTEGER.

export interface DamageResult {
  /** Raw (unrounded) damage */
  raw: number;
  /** Final damage after rounding and min-1 clamp */
  final: number;
  /** Effectiveness ratio (0-1) */
  effectiveness: number;
  /** Whether this was a critical hit */
  isCrit: boolean;
}

/**
 * Calculates the effectiveness ratio: attacker_power / (attacker_power + defender_fortitude).
 * Always returns 0-1. Returns 0 if both inputs are 0 (avoids NaN).
 */
export function calculateEffectiveness(attackerPower: number, defenderFortitude: number): number {
  if (attackerPower <= 0) return 0;
  return attackerPower / (attackerPower + defenderFortitude);
}

/**
 * Core damage calculation.
 *
 * @param attackerPower - Attacker's Power stat
 * @param defenderFortitude - Defender's Fortitude stat
 * @param critMultiplier - Crit damage multiplier (1.0 for non-crit)
 * @param isDot - If true, treats defender as having half fortitude (DoT special rule)
 */
export function calculateDamage(
  attackerPower: number,
  defenderFortitude: number,
  critMultiplier: number,
  isDot = false,
): DamageResult {
  const effectiveFortitude = isDot ? defenderFortitude * 0.5 : defenderFortitude;
  const effectiveness = calculateEffectiveness(attackerPower, effectiveFortitude);
  const raw = attackerPower * effectiveness * critMultiplier;
  const final = Math.max(1, Math.round(raw));

  return {
    raw,
    final,
    effectiveness,
    isCrit: critMultiplier > 1,
  };
}
```

**Step 2: Run tests to verify they pass**

```bash
npx vitest run src/math/__tests__/damage.test.ts
```

Expected: ALL PASS (11 tests)

**Step 3: Commit**

```bash
git add src/math/damage.ts src/math/__tests__/damage.test.ts
git commit -m "feat(math): damage formula with effectiveness ratio and DoT variant"
```

---

## Task 9: Derived Stats — Write Failing Tests

**Files:**
- Create: `src/math/__tests__/stats.test.ts`

**Step 1: Write the test file**

```typescript
// src/math/__tests__/stats.test.ts
import { describe, it, expect } from 'vitest';
import {
  getMaxHp,
  getAttackInterval,
  getCritChance,
  getCritDamage,
  getDodgeChance,
} from '../stats';

describe('getMaxHp', () => {
  it('returns base + fortitude * 5', () => {
    expect(getMaxHp(50, 10)).toBe(100); // 50 + 10*5
  });

  it('handles zero fortitude', () => {
    expect(getMaxHp(50, 0)).toBe(50);
  });

  it('handles large fortitude values', () => {
    expect(getMaxHp(100, 1000)).toBe(5100); // 100 + 1000*5
  });
});

describe('getAttackInterval', () => {
  it('returns 2500ms at speed 10', () => {
    expect(getAttackInterval(10)).toBe(2500); // 25000/10
  });

  it('returns 1250ms at speed 20', () => {
    expect(getAttackInterval(20)).toBe(1250); // 25000/20
  });

  it('clamps to minimum speed of 3', () => {
    // 25000/3 = 8333.33 -> 8333
    expect(getAttackInterval(0)).toBe(getAttackInterval(3));
    expect(getAttackInterval(1)).toBe(getAttackInterval(3));
    expect(getAttackInterval(2)).toBe(getAttackInterval(3));
  });

  it('minimum speed gives ~8333ms interval', () => {
    expect(getAttackInterval(3)).toBe(8333);
  });

  it('handles high speed (diminishing returns visible)', () => {
    // Going 10->20 saves 1250ms. Going 100->110 saves only ~23ms.
    const diff10to20 = getAttackInterval(10) - getAttackInterval(20);
    const diff100to110 = getAttackInterval(100) - getAttackInterval(110);
    expect(diff10to20).toBeGreaterThan(diff100to110 * 10);
  });
});

describe('getCritChance', () => {
  it('returns 5% base at luck 0', () => {
    expect(getCritChance(0)).toBeCloseTo(0.05);
  });

  it('scales linearly: 25% at luck 10', () => {
    // 0.05 + 10*0.02 = 0.25
    expect(getCritChance(10)).toBeCloseTo(0.25);
  });

  it('hard caps at 60%', () => {
    expect(getCritChance(100)).toBe(0.60);
    expect(getCritChance(1000)).toBe(0.60);
  });

  it('hits cap at luck 27.5 (rounds to 60%)', () => {
    // 0.05 + 27.5*0.02 = 0.60
    expect(getCritChance(28)).toBe(0.60); // 0.05 + 28*0.02 = 0.61 -> capped to 0.60
  });
});

describe('getCritDamage', () => {
  it('returns 1.5x at luck 0', () => {
    expect(getCritDamage(0)).toBe(1.5);
  });

  it('scales with luck: 1.9x at luck 10', () => {
    // 1.5 + min(10*0.04, 1.0) = 1.5 + 0.4 = 1.9
    expect(getCritDamage(10)).toBeCloseTo(1.9);
  });

  it('caps at 2.5x', () => {
    // 1.5 + min(25*0.04, 1.0) = 1.5 + 1.0 = 2.5
    expect(getCritDamage(25)).toBe(2.5);
    expect(getCritDamage(1000)).toBe(2.5);
  });
});

describe('getDodgeChance', () => {
  it('returns 0% at luck 0', () => {
    expect(getDodgeChance(0)).toBe(0);
  });

  it('scales with luck: 8% at luck 10', () => {
    // 10 * 0.008 = 0.08
    expect(getDodgeChance(10)).toBeCloseTo(0.08);
  });

  it('caps at 30%', () => {
    expect(getDodgeChance(100)).toBe(0.30);
    expect(getDodgeChance(1000)).toBe(0.30);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/math/__tests__/stats.test.ts
```

Expected: FAIL — `Cannot find module '../stats'`

---

## Task 10: Derived Stats — Implement

**Files:**
- Create: `src/math/stats.ts`

**Step 1: Write the implementation**

```typescript
// src/math/stats.ts
//
// Derived stats from the 4 core stats.
// Design doc Section 2: HP, attack interval, crit chance, crit damage, dodge chance.
// All formulas are pure — no side effects, no dependencies.

/** Minimum speed value. Prevents division by zero in attack interval. */
const MIN_SPEED = 3;

/**
 * HP = base_hp + (fortitude * 5)
 */
export function getMaxHp(baseHp: number, fortitude: number): number {
  return baseHp + fortitude * 5;
}

/**
 * attack_interval = 25000 / max(speed, 3) ms
 *
 * Speed has natural diminishing returns: going 10->20 halves the interval,
 * but 100->110 barely moves it. This is why Speed draft picks stay flat (+1/+2).
 */
export function getAttackInterval(speed: number): number {
  const effectiveSpeed = Math.max(speed, MIN_SPEED);
  return Math.round(25000 / effectiveSpeed);
}

/**
 * crit_chance = min(0.05 + luck * 0.02, 0.60)
 * Hard cap: 60%
 */
export function getCritChance(luck: number): number {
  return Math.min(0.05 + luck * 0.02, 0.60);
}

/**
 * crit_damage = 1.5 + min(luck * 0.04, 1.0)
 * Cap: 2.5x (at luck 25+)
 */
export function getCritDamage(luck: number): number {
  return 1.5 + Math.min(luck * 0.04, 1.0);
}

/**
 * dodge_chance = min(luck * 0.008, 0.30)
 * Hard cap: 30%. Player-only (enemies cannot dodge).
 */
export function getDodgeChance(luck: number): number {
  return Math.min(luck * 0.008, 0.30);
}
```

**Step 2: Run tests to verify they pass**

```bash
npx vitest run src/math/__tests__/stats.test.ts
```

Expected: ALL PASS (14 tests)

**Step 3: Commit**

```bash
git add src/math/stats.ts src/math/__tests__/stats.test.ts
git commit -m "feat(math): derived stats — HP, attack interval, crit, dodge"
```

---

## Task 11: Scaling Functions — Write Failing Tests

**Files:**
- Create: `src/math/__tests__/scaling.test.ts`

**Step 1: Write the test file**

```typescript
// src/math/__tests__/scaling.test.ts
import { describe, it, expect } from 'vitest';
import { getGrowthMultiplier, getDraftPickValue, getRoomsPerFloor, getBossHpMultiplier } from '../scaling';

describe('getGrowthMultiplier', () => {
  it('returns 1 at floor 1', () => {
    expect(getGrowthMultiplier(1, 0.065)).toBe(1);
  });

  it('returns 1 at floor 0 (edge case)', () => {
    expect(getGrowthMultiplier(0, 0.065)).toBe(1);
  });

  it('grows exponentially before floor 100', () => {
    const floor50 = getGrowthMultiplier(50, 0.065);
    const floor51 = getGrowthMultiplier(51, 0.065);
    expect(floor51 / floor50).toBeCloseTo(1.065, 2);
  });

  it('at floor 100, matches pure exponential', () => {
    const expected = Math.pow(1.065, 99);
    expect(getGrowthMultiplier(100, 0.065)).toBeCloseTo(expected, 0);
  });

  it('grows slower after floor 100 (damping kicks in)', () => {
    // Growth rate between consecutive floors should decrease beyond 100
    const rate100to101 = getGrowthMultiplier(101, 0.065) / getGrowthMultiplier(100, 0.065);
    const rate50to51 = getGrowthMultiplier(51, 0.065) / getGrowthMultiplier(50, 0.065);
    expect(rate100to101).toBeLessThan(rate50to51);
  });

  it('stays within safe integer range at floor 50000', () => {
    const val = getGrowthMultiplier(50000, 0.065);
    expect(val).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(val).toBeGreaterThan(0);
    expect(Number.isFinite(val)).toBe(true);
  });

  it('works with different growth rates', () => {
    const hp = getGrowthMultiplier(50, 0.065);    // HP growth
    const power = getGrowthMultiplier(50, 0.058);  // Power growth
    const fort = getGrowthMultiplier(50, 0.050);   // Fortitude growth
    const speed = getGrowthMultiplier(50, 0.020);  // Speed growth

    // Higher rates produce higher multipliers
    expect(hp).toBeGreaterThan(power);
    expect(power).toBeGreaterThan(fort);
    expect(fort).toBeGreaterThan(speed);
  });
});

describe('getDraftPickValue', () => {
  it('returns flat 1 or 2 for speed at any floor', () => {
    // Run multiple times and verify range
    for (let i = 0; i < 20; i++) {
      const val = getDraftPickValue(1, 'speed');
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(2);
    }
    for (let i = 0; i < 20; i++) {
      const val = getDraftPickValue(100, 'speed');
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(2);
    }
  });

  it('returns flat 1 or 2 for luck at any floor', () => {
    for (let i = 0; i < 20; i++) {
      const val = getDraftPickValue(100, 'luck');
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(2);
    }
  });

  it('returns positive values for power at floor 1', () => {
    for (let i = 0; i < 10; i++) {
      const val = getDraftPickValue(1, 'power');
      expect(val).toBeGreaterThanOrEqual(1);
    }
  });

  it('power picks scale with floor depth', () => {
    // Collect average over many samples to reduce randomness
    let sum1 = 0;
    let sum100 = 0;
    const samples = 50;
    for (let i = 0; i < samples; i++) {
      sum1 += getDraftPickValue(1, 'power');
      sum100 += getDraftPickValue(100, 'power');
    }
    expect(sum100 / samples).toBeGreaterThan((sum1 / samples) * 2);
  });

  it('fortitude picks also scale with floor depth', () => {
    let sum1 = 0;
    let sum100 = 0;
    const samples = 50;
    for (let i = 0; i < samples; i++) {
      sum1 += getDraftPickValue(1, 'fortitude');
      sum100 += getDraftPickValue(100, 'fortitude');
    }
    expect(sum100 / samples).toBeGreaterThan((sum1 / samples) * 2);
  });

  it('floor 100 power picks are approximately ~27 (design doc reference)', () => {
    let sum = 0;
    const samples = 100;
    for (let i = 0; i < samples; i++) {
      sum += getDraftPickValue(100, 'power');
    }
    const avg = sum / samples;
    // Design doc says "+27 at floor 100" — allow 20-35 range for average
    expect(avg).toBeGreaterThan(20);
    expect(avg).toBeLessThan(35);
  });
});

describe('getRoomsPerFloor', () => {
  it('returns 2 for floors 1 and 2', () => {
    expect(getRoomsPerFloor(1)).toBe(2);
    expect(getRoomsPerFloor(2)).toBe(2);
  });

  it('returns 4 for floor 3', () => {
    expect(getRoomsPerFloor(3)).toBe(4);
  });

  it('returns 4 for floor 49', () => {
    expect(getRoomsPerFloor(49)).toBe(4);
  });

  it('returns 5 for floor 50 (gains 1 room per 50 floors)', () => {
    expect(getRoomsPerFloor(50)).toBe(5);
  });

  it('returns 6 for floor 100', () => {
    expect(getRoomsPerFloor(100)).toBe(6);
  });

  it('keeps growing past 100', () => {
    expect(getRoomsPerFloor(150)).toBe(7);
  });
});

describe('getBossHpMultiplier', () => {
  it('returns 2.5 at floor 1', () => {
    expect(getBossHpMultiplier(1)).toBeCloseTo(2.505); // 2.5 + 1*0.005
  });

  it('scales with floor', () => {
    // floor 100: 2.5 + 100*0.005 = 3.0
    expect(getBossHpMultiplier(100)).toBeCloseTo(3.0);
  });

  it('reaches 7.5 at floor 1000', () => {
    // 2.5 + 1000*0.005 = 7.5
    expect(getBossHpMultiplier(1000)).toBeCloseTo(7.5);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/math/__tests__/scaling.test.ts
```

Expected: FAIL — `Cannot find module '../scaling'`

---

## Task 12: Scaling Functions — Implement

**Files:**
- Create: `src/math/scaling.ts`

**Step 1: Write the implementation**

```typescript
// src/math/scaling.ts
//
// Enemy scaling, draft pick values, and floor structure formulas.
// Design doc Sections 4 (floor structure) and 5 (enemy scaling).

/** Floor where exponential growth starts damping. */
const DAMPING_START = 100;

/**
 * Damped exponential growth multiplier for enemy stats.
 *
 * Floors 1-100: pure exponential (1 + baseRate)^(floor-1)
 * Floors 100+: growth rate gradually decreases via logarithmic damping.
 * This prevents enemy stats from outpacing player stats at extreme depths.
 */
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

export type ScalingStat = 'power' | 'fortitude' | 'speed' | 'luck';

/**
 * Returns the value of a draft pick for the given stat and floor depth.
 *
 * Speed and Luck: always flat +1 or +2 (doesn't scale with floor).
 * Power and Fortitude: scale with floor depth. Design doc says "+27 at floor 100".
 */
export function getDraftPickValue(floor: number, stat: ScalingStat): number {
  if (stat === 'speed' || stat === 'luck') {
    return Math.random() < 0.5 ? 1 : 2;
  }

  // Power/Fortitude scale with floor.
  // Base value grows linearly. Variance adds +-30% spread.
  const base = 3 + Math.floor(floor * 0.24);
  const variance = Math.max(1, Math.floor(base * 0.3));
  return base + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
}

/**
 * Rooms per floor.
 *
 * Design doc Section 4:
 * - Floors 1-2: 2 rooms (compressed intro)
 * - Floor 3+: 4 rooms, gaining 1 room every 50 floors
 */
export function getRoomsPerFloor(floor: number): number {
  if (floor <= 2) return 2;
  return 4 + Math.floor((floor - 3) / 50);
}

/**
 * Boss HP multiplier: 2.5 + floor * 0.005
 *
 * Design doc Section 5: "Early bosses are 2.5x a common enemy.
 * Floor 1000 bosses are 7.5x."
 */
export function getBossHpMultiplier(floor: number): number {
  return 2.5 + floor * 0.005;
}
```

**Step 2: Run tests to verify they pass**

```bash
npx vitest run src/math/__tests__/scaling.test.ts
```

Expected: ALL PASS (15 tests)

**Step 3: Commit**

```bash
git add src/math/scaling.ts src/math/__tests__/scaling.test.ts
git commit -m "feat(math): scaling functions — growth multiplier, draft picks, rooms per floor"
```

---

## Task 13: Balance Constants

**Files:**
- Create: `src/math/balance.ts`
- Create: `src/math/__tests__/balance.test.ts`

**Step 1: Write the balance constants**

```typescript
// src/math/balance.ts
//
// All tuning constants in one place. See design doc Section 2.
// Every magic number in the game traces back to here.

// ── Stat floors ──────────────────────────────────────────────────
// Stats cannot be reduced below these values by curses, debuffs, or penalties.
export const MIN_POWER = 1;
export const MIN_FORTITUDE = 0;
export const MIN_SPEED = 3;       // Prevents division-by-zero in attack interval
export const MIN_LUCK = 0;

// ── Derived stat formulas ────────────────────────────────────────
export const HP_PER_FORTITUDE = 5;
export const ATTACK_INTERVAL_NUMERATOR = 25000; // ms
export const CRIT_CHANCE_BASE = 0.05;
export const CRIT_CHANCE_PER_LUCK = 0.02;
export const CRIT_CHANCE_CAP = 0.60;
export const CRIT_DAMAGE_BASE = 1.5;
export const CRIT_DAMAGE_PER_LUCK = 0.04;
export const CRIT_DAMAGE_CAP = 2.5;
export const DODGE_PER_LUCK = 0.008;
export const DODGE_CHANCE_CAP = 0.30;

// ── Combat timing ────────────────────────────────────────────────
export const TICK_MS = 16;                 // Fixed timestep (~60 ticks/sec)
export const MAX_CATCHUP_TICKS = 10;       // Cap rAF catchup after tab-background

// ── Enrage ───────────────────────────────────────────────────────
export const ENRAGE_THRESHOLD_MS = 45_000; // 45 seconds
export const ENRAGE_POWER_RAMP = 0.05;    // 5% per second after enrage

// ── Enemy scaling growth rates ───────────────────────────────────
export const GROWTH_RATES = {
  hp: 0.065,
  power: 0.058,
  fortitude: 0.050,
  speed: 0.020,
} as const;

// ── Boss HP multiplier ───────────────────────────────────────────
export const BOSS_HP_MULT_BASE = 2.5;
export const BOSS_HP_MULT_PER_FLOOR = 0.005;

// ── Status effects ───────────────────────────────────────────────
export const MAX_POISON_STACKS = 5;
export const POISON_DURATION_MS = 3_000;
export const STUN_DURATION_MS = 1_000;
export const STUN_IMMUNITY_MS = 2_000;
export const MAX_CURSE_STACKS = 10;
export const CURSE_DECAY_INTERVAL_MS = 3_000;

// ── Floor structure ──────────────────────────────────────────────
export const FIRST_BOSS_FLOOR = 3;
export const BOSS_INTERVAL = 5;            // Boss every 5 floors after first
export const DRAFT_FIGHT_INTERVAL = 3;     // Draft pick every 3 fights
export const BREAKPOINT_INTERVAL = 25;
export const BREAKPOINT_STAT_BOOST = 0.20; // 20% stat boost at breakpoints

// ── Player starting stats ────────────────────────────────────────
export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_POWER = 10;
export const PLAYER_BASE_FORTITUDE = 8;
export const PLAYER_BASE_SPEED = 10;
export const PLAYER_BASE_LUCK = 5;

// ── Endless mode ─────────────────────────────────────────────────
export const ENDLESS_START_FLOOR = 101;
export const FINAL_BOSS_FLOOR = 100;
```

**Step 2: Write a validation test**

```typescript
// src/math/__tests__/balance.test.ts
import { describe, it, expect } from 'vitest';
import * as balance from '../balance';

describe('balance constants', () => {
  it('MIN_SPEED prevents division by zero in attack interval', () => {
    expect(balance.MIN_SPEED).toBeGreaterThan(0);
    expect(balance.ATTACK_INTERVAL_NUMERATOR / balance.MIN_SPEED).toBeLessThan(10000);
  });

  it('crit caps are above their base values', () => {
    expect(balance.CRIT_CHANCE_CAP).toBeGreaterThan(balance.CRIT_CHANCE_BASE);
    expect(balance.CRIT_DAMAGE_CAP).toBeGreaterThan(balance.CRIT_DAMAGE_BASE);
  });

  it('growth rates are positive and ordered', () => {
    expect(balance.GROWTH_RATES.hp).toBeGreaterThan(balance.GROWTH_RATES.power);
    expect(balance.GROWTH_RATES.power).toBeGreaterThan(balance.GROWTH_RATES.fortitude);
    expect(balance.GROWTH_RATES.fortitude).toBeGreaterThan(balance.GROWTH_RATES.speed);
  });

  it('enrage threshold is reasonable (30-120 seconds)', () => {
    expect(balance.ENRAGE_THRESHOLD_MS).toBeGreaterThanOrEqual(30_000);
    expect(balance.ENRAGE_THRESHOLD_MS).toBeLessThanOrEqual(120_000);
  });

  it('tick timing is compatible with 60fps', () => {
    expect(balance.TICK_MS).toBe(16); // ~62.5 ticks/sec
  });

  it('boss floor schedule makes sense', () => {
    expect(balance.FIRST_BOSS_FLOOR).toBeLessThanOrEqual(5);
    expect(balance.BOSS_INTERVAL).toBeGreaterThanOrEqual(3);
  });

  it('player starts with positive stats', () => {
    expect(balance.PLAYER_BASE_HP).toBeGreaterThan(0);
    expect(balance.PLAYER_BASE_POWER).toBeGreaterThan(0);
    expect(balance.PLAYER_BASE_FORTITUDE).toBeGreaterThan(0);
    expect(balance.PLAYER_BASE_SPEED).toBeGreaterThanOrEqual(balance.MIN_SPEED);
    expect(balance.PLAYER_BASE_LUCK).toBeGreaterThanOrEqual(0);
  });

  it('endless mode starts after final boss', () => {
    expect(balance.ENDLESS_START_FLOOR).toBe(balance.FINAL_BOSS_FLOOR + 1);
  });
});
```

**Step 3: Run tests**

```bash
npx vitest run src/math/__tests__/balance.test.ts
```

Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/math/balance.ts src/math/__tests__/balance.test.ts
git commit -m "feat(math): balance constants — all tuning values in one place"
```

---

## Task 14: Math Barrel Export + Full Test Run

**Files:**
- Create: `src/math/index.ts`

**Step 1: Create barrel export**

```typescript
// src/math/index.ts
export { calculateEffectiveness, calculateDamage } from './damage';
export type { DamageResult } from './damage';

export {
  getMaxHp,
  getAttackInterval,
  getCritChance,
  getCritDamage,
  getDodgeChance,
} from './stats';

export {
  getGrowthMultiplier,
  getDraftPickValue,
  getRoomsPerFloor,
  getBossHpMultiplier,
} from './scaling';
export type { ScalingStat } from './scaling';

export * from './balance';
```

**Step 2: Run ALL math tests**

```bash
npx vitest run src/math/
```

Expected: ALL PASS (40+ tests across 4 test files)

**Step 3: Run the build to verify no TypeScript errors**

```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds or only has warnings about unused files (the copied files that aren't imported yet).

**Step 4: Commit**

```bash
git add src/math/index.ts
git commit -m "feat(math): barrel export for math module"
```

---

## Verification Checklist

After all tasks are complete, verify:

1. **Directory structure exists:**
   ```bash
   ls src/math/ src/components/ui/ src/components/game/battle-effects/ src/constants/ src/hooks/
   ```

2. **All math tests pass:**
   ```bash
   npx vitest run src/math/
   ```

3. **Dev server starts without errors:**
   ```bash
   npm run dev
   ```
   (Visit `http://localhost:5173/dungeon-delver/`, see "Dungeon Delver v2")

4. **Git log shows clean commit history:**
   ```bash
   git log --oneline
   ```
   Should show ~10 commits from this doc.

5. **Old E2E tests are removed:**
   ```bash
   ls e2e/*.spec.ts 2>&1
   ```
   Expected: "No such file or directory"

---

## What's Next

This doc established:
- Project structure with `src-legacy/` (reference) and `src/` (new)
- Zustand installed, miniplex removed
- ~11K lines of visual/UI code copied and ready
- Complete math layer: damage, stats, scaling, balance constants
- Dev server running

**Doc 2 (Data + Types)** builds on this by defining the TypeScript types (`CombatEntity`, `GameState`, `Item`, etc.) and all game content data (3 classes, 15 items, enemy tiers/modifiers). It will import from `src/math/` for its tests.
