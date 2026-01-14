# Codebase Simplification - Phase 2: Component Decomposition

**Date:** 2026-01-13
**Status:** Draft
**Goal:** Split 3 large UI components into focused files so Claude Code can navigate and modify them without losing context.

---

## Problem Statement

Three UI components exceed 600 lines each, causing Claude Code to lose context when making modifications:

| Component | Lines | Issue |
|-----------|-------|-------|
| ShopScreen | 846 | Multiple components + helpers in one file |
| ClassSelect | 651 | One monolithic component with inline sections |
| PlayerStatsPanel | 624 | 10 sub-components defined inline |

## Success Criteria

- No file over 300 lines
- Each file has a single, clear purpose
- Backwards-compatible exports via index.ts
- All tests pass (unit + E2E)

---

## Part 1: PlayerStatsPanel Split

**Current:** 624 lines, 10 sub-components defined inline

**After:**
```
src/components/game/PlayerStatsPanel/
├── index.ts                 # Re-exports PlayerStatsPanel
├── PlayerStatsPanel.tsx     # Main component (~120 lines)
├── PlayerInfo.tsx           # Name, class, level + getClassIcon (~80 lines)
├── EquipmentDisplay.tsx     # Equipment grid (~150 lines)
│                            # includes: EquipmentSlot, EmptyEquipmentSlot
├── StatsGrid.tsx            # Stats display (~120 lines)
│                            # includes: StatItemWithTooltip
├── AbilitiesDisplay.tsx     # Abilities section (~100 lines)
│                            # includes: AbilitySlot
├── XPProgressBar.tsx        # XP bar (~30 lines)
└── constants.ts             # RARITY_BORDER_COLORS, RARITY_BG_COLORS, TYPE_LABELS
```

**Grouping rationale:**
- Tightly coupled components stay together (EquipmentSlot with EquipmentDisplay)
- Constants extracted to avoid duplication across files
- Helper functions stay with their only consumer (getClassIcon in PlayerInfo)

**index.ts:**
```typescript
export { PlayerStatsPanel } from './PlayerStatsPanel';
```

---

## Part 2: ShopScreen Split

**Current:** 846 lines, 3 components + helpers

**After:**
```
src/components/game/ShopScreen/
├── index.ts                 # Re-exports ShopScreen
├── ShopScreen.tsx           # Main layout + tabs (~200 lines)
├── ItemCard.tsx             # Shop item display + purchase (~220 lines)
├── EquippedItemCard.tsx     # Equipped item + enhance (~210 lines)
├── helpers.ts               # shopItemToItem, getItemIcon, isDowngrade (~80 lines)
└── constants.ts             # TIER_COLORS, TIER_TO_RARITY (~40 lines)
```

**Extraction points:**
- `ItemCard` (lines 134-355) - Self-contained shop item component
- `EquippedItemCard` (lines 355-564) - Self-contained equipped item component
- Helpers are pure functions, rarely modified

**index.ts:**
```typescript
export { ShopScreen } from './ShopScreen';
```

---

## Part 3: ClassSelect Split

**Current:** 651 lines, one monolithic component

**After:**
```
src/components/game/ClassSelect/
├── index.ts                 # Re-exports ClassSelect
├── ClassSelect.tsx          # Main layout + state (~150 lines)
├── ClassCard.tsx            # Individual class selection card (~120 lines)
├── ClassDetailsPanel.tsx    # Selected class info + stats + power (~180 lines)
├── BackgroundDecor.tsx      # Torches, stars, gradients (~60 lines)
├── hooks.ts                 # useClassNavigation keyboard handler (~40 lines)
└── constants.ts             # classIcons, statLabels (~30 lines)
```

**Extraction logic:**
- `ClassCard` - The card rendered in the grid (lines 117-200)
- `ClassDetailsPanel` - The bottom panel showing selected class details (lines 201-338)
- `BackgroundDecor` - Purely decorative elements (lines 61-86)
- `hooks.ts` - Complex keyboard navigation logic

**index.ts:**
```typescript
export { ClassSelect } from './ClassSelect';
```

---

## Implementation Order

Sequential, easiest first (validates pattern before harder work):

### PR 1: PlayerStatsPanel
- **Risk:** Low - components already defined, just extracting
- **Effort:** ~1 hour
- **Validates:** Directory + index.ts pattern for components

### PR 2: ShopScreen
- **Risk:** Medium - components defined but more complex
- **Effort:** ~1 hour
- **Pattern:** Already validated by PR 1

### PR 3: ClassSelect
- **Risk:** Medium - need to extract inline JSX into components
- **Effort:** ~2 hours
- **Pattern:** Validated twice

---

## Verification Checklist

After each PR:

- [ ] `npm run build` passes
- [ ] `npx vitest run` - all tests pass
- [ ] `npx playwright test --project="Desktop"` - E2E tests pass
- [ ] No file over 300 lines
- [ ] Imports using `@/components/game/X` still work

---

## Files Changed Summary

### New Directories
- `src/components/game/PlayerStatsPanel/` (7 files)
- `src/components/game/ShopScreen/` (5 files)
- `src/components/game/ClassSelect/` (6 files)

### Deleted Files
- `src/components/game/PlayerStatsPanel.tsx` (becomes directory)
- `src/components/game/ShopScreen.tsx` (becomes directory)
- `src/components/game/ClassSelect.tsx` (becomes directory)

### Total
- 18 new files
- 3 deleted files
- ~2,100 lines reorganized (no logic changes)

---

## Future Phases (Out of Scope)

**Phase 3: System Cleanup**
- Split power.ts system (517 lines)
- Split combat.ts system (455 lines)

**Phase 4: Type Refinement**
- Restructure Entity interface (50+ properties)
