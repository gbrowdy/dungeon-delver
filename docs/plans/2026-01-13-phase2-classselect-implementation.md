# ClassSelect Split - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split ClassSelect.tsx (651 lines) into 6 focused files under a directory structure.

**Architecture:** Extract ClassCard and ClassDetailsPanel components to separate files, move constants and keyboard hook to dedicated files. BackgroundDecor extracts the decorative elements. CSS stays with ShopScreen (main component) as inline styles. Create index.ts for backwards-compatible export.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## Task 1: Create Directory and Constants

**Files:**
- Create: `src/components/game/ClassSelect/` (directory)
- Create: `src/components/game/ClassSelect/constants.ts`

**Step 1: Create directory and constants file**

```bash
mkdir -p src/components/game/ClassSelect
```

Create `src/components/game/ClassSelect/constants.ts`:

```typescript
import type { CharacterClass } from '@/types/game';
import type { IconType } from '@/components/ui/PixelIcon';

// Map class IDs to PixelIcon types
export const CLASS_ICONS: Record<CharacterClass, IconType> = {
  warrior: 'class-warrior',
  mage: 'class-mage',
  rogue: 'class-rogue',
  paladin: 'class-paladin',
};

// Stat label full names for accessibility
export const STAT_LABELS: Record<string, string> = {
  HP: 'Health Points',
  PWR: 'Power',
  ARM: 'Armor',
  SPD: 'Speed',
  FOR: 'Fortune',
};
```

---

## Task 2: Create hooks.ts

**Files:**
- Create: `src/components/game/ClassSelect/hooks.ts`

**Step 1: Create hooks file**

Create `src/components/game/ClassSelect/hooks.ts`:

```typescript
import { useCallback } from 'react';
import type { CharacterClass } from '@/types/game';

/**
 * Custom hook for keyboard navigation between class cards.
 * Implements arrow key navigation with wrap-around (Issue #4).
 */
export function useClassNavigation(classIds: CharacterClass[]) {
  return useCallback((e: React.KeyboardEvent, classId: CharacterClass) => {
    const currentIndex = classIds.indexOf(classId);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % classIds.length;
      const nextElement = document.querySelector(`[data-class="${classIds[nextIndex]}"]`) as HTMLElement;
      nextElement?.focus();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + classIds.length) % classIds.length;
      const prevElement = document.querySelector(`[data-class="${classIds[prevIndex]}"]`) as HTMLElement;
      prevElement?.focus();
    }
  }, [classIds]);
}
```

---

## Task 3: Create BackgroundDecor.tsx

**Files:**
- Create: `src/components/game/ClassSelect/BackgroundDecor.tsx`

**Step 1: Create BackgroundDecor component**

Create `src/components/game/ClassSelect/BackgroundDecor.tsx` with the decorative elements (torches, stars, gradient glow, bottom accent). This component handles:
- Dark atmospheric background glow
- Pixel art torches (left and right)
- Pixel stars scattered in background
- Bottom decorative accent

Extract lines 61-86 and 359-363 from original.

---

## Task 4: Create ClassCard.tsx

**Files:**
- Create: `src/components/game/ClassSelect/ClassCard.tsx`

**Step 1: Create ClassCard component**

Create `src/components/game/ClassSelect/ClassCard.tsx` with the class selection button component (lines 117-198 from original). This component (~80 lines) handles:
- Class card button with hover/selected states
- Corner decorations
- Class icon display
- Stats preview grid
- Selection indicator checkmark

The component should:
- Import CLASS_ICONS from `./constants`
- Import CLASS_COLORS from `@/constants/icons`
- Accept props: classId, classData, isSelected, isHovered, onSelect, onHover, onKeyDown, colors

---

## Task 5: Create ClassDetailsPanel.tsx

**Files:**
- Create: `src/components/game/ClassSelect/ClassDetailsPanel.tsx`

**Step 1: Create ClassDetailsPanel component**

Create `src/components/game/ClassSelect/ClassDetailsPanel.tsx` with the details panel component (lines 201-337 from original). This component (~140 lines) handles:
- Class info with icon and description
- Full stats grid (5 stats)
- Starting power display box
- Placeholder content when no class selected

The component should:
- Import CLASS_ICONS, STAT_LABELS from `./constants`
- Import CLASS_COLORS from `@/constants/icons`
- Import CLASS_DATA from `@/data/classes`
- Accept props: activeClass (CharacterClass | null)

---

## Task 6: Create Main ClassSelect.tsx

**Files:**
- Create: `src/components/game/ClassSelect/ClassSelect.tsx`

**Step 1: Create main component**

Create `src/components/game/ClassSelect/ClassSelect.tsx` with the main ClassSelect component. This component (~250 lines) handles:
- State management (selectedClass, hoveredClass)
- Header with title and divider
- Class selection grid using ClassCard
- ClassDetailsPanel integration
- Start button
- All CSS styles (inline style tag)

Import ClassCard, ClassDetailsPanel, BackgroundDecor from local files, and useClassNavigation from hooks.

---

## Task 7: Create index.ts

**Files:**
- Create: `src/components/game/ClassSelect/index.ts`

**Step 1: Create index file**

Create `src/components/game/ClassSelect/index.ts`:

```typescript
export { ClassSelect } from './ClassSelect';
```

---

## Task 8: Delete Original and Verify

**Files:**
- Delete: `src/components/game/ClassSelect.tsx`

**Step 1: Delete original file**

```bash
rm src/components/game/ClassSelect.tsx
```

**Step 2: Run build**

```bash
npm run build
```

**Step 3: Run tests**

```bash
npx vitest run
npx playwright test --project="Desktop"
```

---

## Task 9: Commit

**Step 1: Commit changes**

```bash
git add -A
git commit -m "refactor: split ClassSelect into directory structure

- ClassSelect.tsx: Main layout + state + CSS (~250 lines)
- ClassCard.tsx: Class selection button (~80 lines)
- ClassDetailsPanel.tsx: Selected class details (~140 lines)
- BackgroundDecor.tsx: Torches, stars, gradients (~60 lines)
- hooks.ts: useClassNavigation keyboard handler (~30 lines)
- constants.ts: CLASS_ICONS, STAT_LABELS (~20 lines)
- index.ts: Backwards-compatible export

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| File | Lines | Purpose |
|------|-------|---------|
| ClassSelect.tsx | ~250 | Main layout + state + CSS |
| ClassCard.tsx | ~80 | Class selection button |
| ClassDetailsPanel.tsx | ~140 | Selected class details |
| BackgroundDecor.tsx | ~60 | Decorative elements |
| hooks.ts | ~30 | Keyboard navigation hook |
| constants.ts | ~20 | Icon mappings, stat labels |
| index.ts | ~1 | Re-export |

**Total: 7 files, ~581 lines (from 651 original)**
