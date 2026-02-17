# Audit Fixes: Bugs + Visual Juice

**Date:** 2026-02-15
**Branch:** `feature/v2-rebuild`
**Scope:** Wave 1 (bug fixes) + Wave 2 (visual juice). No sound, no new game systems, no balance tuning.
**Source:** `tasks/full-audit-report.md`

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Game identity | Hybrid — evolve incrementally | Don't pivot, improve what exists |
| Sound | Deferred | Focus on visual juice first |
| Between-room HP recovery | No — keep attrition model | Sustain items (Vampiric Shroud, Regen Band) are the answer |
| Combat animations | Sprite reactions + screen effects via CSS | No new art needed, big visual impact |
| Combat info visibility | Key indicators only | Enrage bar, stack counts, proc counters — clean, not cluttered |

---

## Wave 1: Bug Fixes

### 1.1 Combat Pipeline HP Guards

**File:** `src/store/actions/combat.ts`

Add `if (enemy.hp <= 0)` and `if (player.hp <= 0)` guards after each damage-dealing phase in `tickCombat`. Prevents dead entities from attacking on the same tick they die. Currently the death check only runs at the bottom of the pipeline, so poison/reflect killing an entity mid-tick doesn't stop them from attacking.

### 1.2 Poison Fractional Accumulation

**File:** `src/store/actions/statusEffects.ts`

Replace per-tick `Math.round()` with fractional accumulation. Track a `poisonDamageAccumulator` on the entity and only subtract integer HP when it exceeds 1. Same pattern regen already uses. Without this, poison deals zero damage at low power levels (e.g., `result.final=10` → `0.053` per tick rounds to 0).

### 1.3 Flurry Ring Proc Fix

**File:** `src/store/actions/combat.ts:183-200`

The Flurry Ring bonus attack calculates and applies damage but never calls `processItemProcs('on_player_attack', ...)`. Lifesteal, poison, curse, and stun counting all skip the bonus hit. Fix: call `processItemProcs` after the bonus damage is applied.

### 1.4 Twin Fang Proc Fix

**File:** `src/store/actions/combat.ts:139-180`

Twin Fang hits twice in a loop, but `processItemProcs` is called once after the loop, using only the second hit's `lastPlayerHitDamage` (overwritten each iteration). Fix: call `processItemProcs` per hit inside the loop so each hit independently procs lifesteal, poison, etc.

### 1.5 Player Initiative

**File:** `src/store/actions/setup.ts`

Currently `player.attackTimer` starts at full interval (~2500ms) while `enemy.attackTimer` starts at 0. The enemy always gets the first hit. Fix: set player `attackTimer` to 0 (or a small fraction like 200-500ms) so the player attacks first or nearly simultaneously. This is a feel improvement — the player should have initiative.

### 1.6 Text Sizing

**Files:** 9 files with hardcoded `text-[8px]`

Replace all `text-[8px]` with `text-pixel-2xs` (the design token defined in `tailwind.config.ts`). 8px in Press Start 2P is illegible on mobile. Affected files: `ItemComparison.tsx`, `ItemCard.tsx`, `CharacterSheet.tsx`, `StatusBadges.tsx`, `DeathScreen.tsx`, `FloorComplete.tsx`.

### 1.7 State Duplication in Flow Actions

**File:** `src/store/gameStore.ts`

`advanceFloor`, `respawnAtCheckpoint`, and `startEndless` all mutate state fields directly AND pass the same fields to `set()`. Pick one pattern: mutate in-place then call `set({})` to trigger subscribers. Remove the redundant field assignments from the `set()` calls.

### 1.8 fightCount Initialization

**File:** `src/store/gameStore.ts`

`startRun` sets `fightCount: 1` but `advanceFloor` sets `fightCount: 0`. This causes a 1-fight discrepancy in draft trigger timing on floor 1 vs. subsequent floors. Fix: use 0 in both places.

### 1.9 Color Contrast

**File:** `src/components/screens/MainMenu.tsx`

`text-slate-600` on the dark background gives ~3.2:1 contrast ratio, below WCAG AA's 4.5:1 requirement. Replace with `text-slate-400` or similar.

### 1.10 Focus Management & Keyboard Handlers

**Files:** `src/App.tsx`, `src/components/game/CharacterSheet.tsx`, `src/components/game/ItemComparison.tsx`

- Phase transitions: move focus to the primary heading or first interactive element when each screen mounts (via `useEffect` + `ref.focus()`).
- Modals: add `onKeyDown` handler for Escape to close. Add focus trap (prevent tabbing behind the backdrop). Use `focus-trap-react` or a lightweight custom implementation.

### 1.11 CombatScreen Module-Level State

**File:** `src/components/screens/CombatScreen.tsx`

`lastProcessedTick` and `floatingNumId` are module-level mutable variables that persist across mount/unmount cycles and break in React StrictMode. Move both into `useRef`.

---

## Wave 2: Visual Juice

### 2.1 Sprite Combat Animations

**Files:** `src/components/screens/CombatScreen.tsx`, `src/index.css` (new animation classes)

CSS-transform-based animations on existing sprites. No new art.

**States per sprite:** `idle | attacking | hit | critting | dodging | dying`

| State | Animation | Duration |
|-------|-----------|----------|
| `attacking` | Translate toward opponent (~20-30px), return | ~200ms |
| `hit` | Translate away (~8px) + `filter: brightness(2)` flash | ~100ms |
| `critting` | Larger recoil (15px) + scale pulse (1.1x → 1.0x) | ~150ms |
| `dodging` | Quick sidestep (±15px and back) | ~150ms |
| `dying` | Red tint + translateY(+20px) + fade opacity to 0 | ~400ms |

**Implementation:** Read `state.combatEvents` (already consumed for floating numbers). Map event types to sprite animation states. Apply CSS class to sprite container, remove on `animationend`. Small state machine per sprite tracked in a ref.

### 2.2 Screen Shake

**File:** `src/components/screens/CombatScreen.tsx`, `src/index.css`

A `.screen-shake` CSS class on the combat arena container: random small offsets (±3px) via keyframes over ~150ms. Triggered on crit hits and boss entrances. Disabled when `prefers-reduced-motion` matches — wire up the existing `useReducedMotion` hook (currently unused).

### 2.3 Enrage Timer Bar

**File:** `src/components/screens/CombatScreen.tsx` (new sub-component)

Thin horizontal bar positioned below the combat arena. Reads `state.combatElapsedMs` (already in store).

| Time | Color | State |
|------|-------|-------|
| 0-30s | Green | Calm |
| 30-40s | Yellow | Warning |
| 40-45s | Orange | Danger |
| 45s+ | Pulsing Red | Enraged |

When enraged, the enemy sprite gets a subtle red glow overlay (CSS `box-shadow: 0 0 10px red` or similar). No new state fields — purely derived from existing `combatElapsedMs` and `ENRAGE_THRESHOLD_MS`.

### 2.4 Status Effect Stack Counts

**File:** `src/components/game/StatusBadges.tsx`

Extend each status badge to show a stack count number in the corner. Poison: "x3", Curse: "x7", Shield: show remaining HP. Uses `text-pixel-2xs`. Data already available on `entity.statusEffects[].stacks`.

### 2.5 Proc Item Counters

**File:** `src/components/screens/CombatScreen.tsx`

Small counters near the player's attack bar, only visible when relevant items are equipped:
- Shocking Edge: "2/4" (hits until next stun)
- Flurry Ring: "3/5" (hits until bonus attack)

Reads from existing `state.combatCounters` (`shockHitCount`, `playerAttackCount`). Unobtrusive — informed players glance, casual players ignore.

### 2.6 Phase Transitions

**File:** `src/App.tsx`, `src/index.css`

Fade out old screen (opacity 1→0, ~150ms), fade in new screen (opacity 0→1, ~200ms). Total ~350ms.

Implementation: apply `animate-fade-in` CSS class (already defined but unused) on mount via a key change on the phase. Track previous phase in a ref to trigger the transition. Instant cut when `prefers-reduced-motion` is active.

### 2.7 Pixel-Style Bars

**Files:** `src/components/game/HealthBar.tsx`, `src/components/game/AttackBar.tsx`

Replace `rounded-full` with existing `pixel-progress-bar` / `pixel-progress-fill` CSS classes from `index.css:948-958`. These have proper pixel borders and flat rendering, matching the game's aesthetic.

### 2.8 Combat Screen Info Fixes

**File:** `src/components/screens/CombatScreen.tsx`

- Display enemy name from definition instead of just tier
- Display player class via `CLASSES[classId].name` (proper capitalization) instead of raw ID

**File:** `src/components/screens/DraftScreen.tsx`

- Add floor/room context to header: "Floor 7 — Choose a stat boost"

### 2.9 Shop "Choose 2" Enforcement

**File:** `src/components/screens/ShopScreen.tsx`

Disable confirm button until exactly 2 selections are made. Currently enabled at ≥1 selection, which contradicts the "Choose 2 Rewards" header.

### 2.10 FloorComplete Countdown Bar

**File:** `src/components/screens/FloorComplete.tsx`

Replace invisible `text-[8px]` timer text with a visible countdown bar that drains over 5 seconds. Clear visual affordance that auto-advance is coming. Continue button skips immediately.

### 2.11 Speed/Pause Visual Indicators

**File:** `src/components/game/CombatHeader.tsx`

- Active speed level gets a filled/highlighted button variant instead of all-outline
- When paused, dim the combat arena (opacity ~0.6) so the frozen state is obvious

### 2.12 MainMenu Style Cleanup

**File:** `src/components/screens/MainMenu.tsx`, `src/index.css`

Move the inline `<style>` block (~300 lines of JSX-embedded CSS) into `index.css` where duplicate definitions already exist. Delete the JSX-embedded styles entirely. Deduplicate any conflicts.

---

## Explicitly Deferred

| Item | Reason |
|------|--------|
| Sound design | User decision — visual first |
| Between-room HP recovery | Intentional attrition model |
| Meta-progression (currencies, unlocks) | Wave 3 — game depth |
| Random events between fights | Wave 3 |
| Item synergies / named bosses | Wave 3 |
| Balance tuning (Mage, Bloodstone, Speed/Luck) | Wave 3 |
| New component tests | Not blocking; 483 logic tests cover core |
| ARIA live region for combat | Lower priority than visual juice |
| Responsive constants adoption | Code hygiene, not player-facing |
| CSS animation timing reconnection | CSS fallbacks work fine |

---

## File Impact Summary

| File | Changes |
|------|---------|
| `src/store/actions/combat.ts` | HP guards, Flurry Ring procs, Twin Fang procs |
| `src/store/actions/statusEffects.ts` | Poison fractional accumulation |
| `src/store/actions/setup.ts` | Player initiative (attackTimer) |
| `src/store/gameStore.ts` | State duplication cleanup, fightCount fix |
| `src/components/screens/CombatScreen.tsx` | Module refs, sprite animations, screen shake, enrage bar, proc counters, enemy name, class name |
| `src/components/screens/MainMenu.tsx` | Color contrast, remove inline styles |
| `src/components/screens/DraftScreen.tsx` | Floor/room context |
| `src/components/screens/ShopScreen.tsx` | Choose 2 enforcement |
| `src/components/screens/FloorComplete.tsx` | Countdown bar |
| `src/components/game/HealthBar.tsx` | Pixel-style bars |
| `src/components/game/AttackBar.tsx` | Pixel-style bars |
| `src/components/game/StatusBadges.tsx` | Stack counts |
| `src/components/game/CombatHeader.tsx` | Speed/pause indicators |
| `src/components/game/CharacterSheet.tsx` | Focus trap, Escape handler |
| `src/components/game/ItemComparison.tsx` | Focus trap, Escape handler |
| `src/components/game/ItemCard.tsx` | Text sizing |
| `src/components/game/DraftCard.tsx` | Text sizing |
| `src/App.tsx` | Phase transitions, focus management |
| `src/index.css` | Animation classes, MainMenu styles migration |
| `src/hooks/useReducedMotion.ts` | Finally wired up (screen shake) |
