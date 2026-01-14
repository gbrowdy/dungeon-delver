# ShopScreen Split - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split ShopScreen.tsx (846 lines) into 5 focused files under a directory structure.

**Architecture:** Extract ItemCard and EquippedItemCard components to separate files, move helpers and constants to dedicated files. Create index.ts for backwards-compatible export.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## Task 1: Create Directory and Constants

**Files:**
- Create: `src/components/game/ShopScreen/` (directory)
- Create: `src/components/game/ShopScreen/constants.ts`

**Step 1: Create directory and constants file**

```bash
mkdir -p src/components/game/ShopScreen
```

Create `src/components/game/ShopScreen/constants.ts`:

```typescript
import type { Item } from '@/types/game';
import type { ShopTier } from '@/types/shop';

// Map tier to rarity (tiers roughly correspond to rarity levels)
export const TIER_TO_RARITY: Record<ShopTier, Item['rarity']> = {
  starter: 'common',
  class: 'uncommon',
  specialty: 'rare',
  legendary: 'legendary',
};

// Tier colors matching the design spec
export const TIER_COLORS = {
  starter: {
    primary: '#94a3b8', // slate-400
    secondary: '#64748b', // slate-500
    glow: 'rgba(148, 163, 184, 0.5)',
    bg: 'rgba(148, 163, 184, 0.1)',
  },
  class: {
    primary: '#3b82f6', // blue-500
    secondary: '#2563eb', // blue-600
    glow: 'rgba(59, 130, 246, 0.5)',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  specialty: {
    primary: '#a855f7', // purple-500
    secondary: '#9333ea', // purple-600
    glow: 'rgba(168, 85, 247, 0.5)',
    bg: 'rgba(168, 85, 247, 0.1)',
  },
  legendary: {
    primary: '#f59e0b', // amber-500
    secondary: '#d97706', // amber-600
    glow: 'rgba(245, 158, 11, 0.5)',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
};
```

---

## Task 2: Create helpers.ts

**Files:**
- Create: `src/components/game/ShopScreen/helpers.ts`

**Step 1: Create helpers file**

Create `src/components/game/ShopScreen/helpers.ts`:

```typescript
import type { Item } from '@/types/game';
import type { ShopItem, ShopTier } from '@/types/shop';
import * as Icons from 'lucide-react';
import { TIER_TO_RARITY } from './constants';

/**
 * Convert a ShopItem to the Item type expected by the game engine.
 * Maps shop-specific fields to the standard Item interface.
 */
export function shopItemToItem(shopItem: ShopItem): Item {
  return {
    id: shopItem.id,
    name: shopItem.name,
    type: shopItem.type,
    rarity: TIER_TO_RARITY[shopItem.tier],
    statBonus: shopItem.stats,
    description: shopItem.description,
    icon: shopItem.icon,
    effect: shopItem.effect,
    enhancementLevel: shopItem.enhancementLevel ?? 0,
    maxEnhancement: 3,
    tier: shopItem.tier,
  };
}

/**
 * Get the Lucide icon component for an item.
 * Item data stores icon names directly as valid Lucide icon names (e.g., 'Sword', 'Axe', 'Wand2').
 * Falls back to 'Package' if the icon doesn't exist.
 */
export function getItemIcon(iconName: string): keyof typeof Icons {
  if (iconName in Icons) {
    return iconName as keyof typeof Icons;
  }
  return 'Package';
}

/**
 * Tier hierarchy for comparison: starter < class < specialty < legendary
 * Returns true if newItemTier is lower than equippedItemTier (i.e., a downgrade)
 */
export function isDowngrade(newItemTier: ShopTier, equippedItemTier: ShopTier): boolean {
  const tierOrder: ShopTier[] = ['starter', 'class', 'specialty', 'legendary'];
  const newTierIndex = tierOrder.indexOf(newItemTier);
  const equippedTierIndex = tierOrder.indexOf(equippedItemTier);

  // Guard against invalid tier values (indexOf returns -1)
  if (newTierIndex === -1 || equippedTierIndex === -1) {
    return false;
  }

  return newTierIndex < equippedTierIndex;
}
```

---

## Task 3: Create ItemCard.tsx

**Files:**
- Create: `src/components/game/ShopScreen/ItemCard.tsx`

**Step 1: Create ItemCard component**

Create `src/components/game/ShopScreen/ItemCard.tsx` with the ItemCard component (lines 125-346 from original). This is a large component (~220 lines) that handles shop item display and purchase with downgrade confirmation dialog.

The component should:
- Import from `./constants` and `./helpers`
- Include the AlertDialog for downgrade confirmation
- Handle hover states and purchase logic

---

## Task 4: Create EquippedItemCard.tsx

**Files:**
- Create: `src/components/game/ShopScreen/EquippedItemCard.tsx`

**Step 1: Create EquippedItemCard component**

Create `src/components/game/ShopScreen/EquippedItemCard.tsx` with the EquippedItemCard component (lines 348-562 from original). This component (~210 lines) handles equipped item display and enhancement.

The component should:
- Import TIER_COLORS from `./constants`
- Handle enhancement preview and button states
- Show empty slot state when no item equipped

---

## Task 5: Create Main ShopScreen.tsx

**Files:**
- Create: `src/components/game/ShopScreen/ShopScreen.tsx`

**Step 1: Create main component**

Create `src/components/game/ShopScreen/ShopScreen.tsx` with the main ShopScreen component (lines 564-846 from original). This component (~280 lines) handles:
- Shop layout with sections (Your Equipment, Starter Gear, Class Gear, Today's Selection, Legendary)
- Gold display
- Continue button
- CSS styles (inline style tag)

Import ItemCard and EquippedItemCard from local files, and shopItemToItem from helpers.

---

## Task 6: Create index.ts

**Files:**
- Create: `src/components/game/ShopScreen/index.ts`

**Step 1: Create index file**

Create `src/components/game/ShopScreen/index.ts`:

```typescript
export { ShopScreen } from './ShopScreen';
```

---

## Task 7: Delete Original and Verify

**Files:**
- Delete: `src/components/game/ShopScreen.tsx`

**Step 1: Delete original file**

```bash
rm src/components/game/ShopScreen.tsx
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

## Task 8: Commit

**Step 1: Commit changes**

```bash
git add -A
git commit -m "refactor: split ShopScreen into directory structure

- ShopScreen.tsx: Main layout + sections (~280 lines)
- ItemCard.tsx: Shop item display + purchase (~220 lines)
- EquippedItemCard.tsx: Equipped item + enhance (~210 lines)
- helpers.ts: shopItemToItem, getItemIcon, isDowngrade (~50 lines)
- constants.ts: TIER_COLORS, TIER_TO_RARITY (~45 lines)
- index.ts: Backwards-compatible export

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| File | Lines | Purpose |
|------|-------|---------|
| ShopScreen.tsx | ~280 | Main layout + sections + CSS |
| ItemCard.tsx | ~220 | Shop item card + purchase |
| EquippedItemCard.tsx | ~210 | Equipped item + enhancement |
| helpers.ts | ~50 | Conversion and utility functions |
| constants.ts | ~45 | Tier colors and mappings |
| index.ts | ~1 | Re-export |

**Total: 6 files, ~806 lines (from 846 original)**
