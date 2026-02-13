# Phase 4D: Draft Pick + Boss Shop Screens

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do NOT create a new branch — commit directly to the current branch.

**Goal:** Build the draft pick screen (choose 1 of 3 stat boosts every 3 fights) and the boss shop screen (choose 2 of 5 cards including items after boss fights).

**Architecture:** Both screens overlay on a darkened background. Draft uses `draftChoices` + `selectedChoices` + `selectDraftCard`/`confirmDraft` from the store. Shop uses `shopCards` + `selectedChoices` + `selectShopCard`/`confirmShop`. Item comparison uses a local modal state.

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + shadcn/ui

**Prerequisites:** 04a (phase router) must be complete. 04c (combat screen) recommended but not required.

---

## Reference Files

Before starting, read these for context:
- `src/store/gameStore.ts` — selectDraftCard, confirmDraft, selectShopCard, confirmShop actions
- `src/types/game.ts` — DraftCard, ShopCard, StatType, ItemId, Item
- `src/data/items.ts` — ITEM_DEFINITIONS, ItemDefinition, getScaledValue
- `src/data/classes.ts` — CLASSES (for stat weight context)
- `src/math/balance.ts` — stat floor constants
- Design doc Section 8 (Draft Pick Screen, Boss Shop Screen, Item Comparison)

---

## Task 1: StatIcon Helper

**Files:**
- Create: `src/components/game/StatIcon.tsx`

Pixel art icons for the 4 stats. Simple geometric shapes rendered as CSS.

**Step 1: Implement**

```tsx
// src/components/game/StatIcon.tsx
import type { StatType } from '@/types/game';

const STAT_ICONS: Record<StatType, { symbol: string; color: string }> = {
  power: { symbol: '/', color: 'text-red-400' },        // Sword-like
  fortitude: { symbol: '#', color: 'text-blue-400' },    // Shield-like
  speed: { symbol: '>', color: 'text-yellow-400' },      // Arrow/lightning
  luck: { symbol: '*', color: 'text-purple-400' },       // Star
};

const STAT_LABELS: Record<StatType, string> = {
  power: 'Power',
  fortitude: 'Fortitude',
  speed: 'Speed',
  luck: 'Luck',
};

export function StatIcon({ stat, size = 'md' }: { stat: StatType; size?: 'sm' | 'md' | 'lg' }) {
  const { symbol, color } = STAT_ICONS[stat];
  const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className={`${color} ${sizeClass} font-bold pixel-text`} aria-label={STAT_LABELS[stat]}>
      {symbol}
    </span>
  );
}

export { STAT_LABELS };
```

**Step 2: Commit**

```bash
git add src/components/game/StatIcon.tsx
git commit -m "feat(ui): StatIcon component for stat type display"
```

---

## Task 2: DraftCard Component

**Files:**
- Create: `src/components/game/DraftCard.tsx`
- Test: `src/components/game/__tests__/DraftCard.test.tsx`

A card showing a stat boost with impact preview. Selectable (highlighted border when selected).

**Step 1: Write the failing test**

```tsx
// src/components/game/__tests__/DraftCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftCard } from '../DraftCard';

describe('DraftCard', () => {
  const card = { stat: 'power' as const, value: 15, impactPreview: '+11% damage' };

  it('renders stat name and value', () => {
    render(<DraftCard card={card} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('+15')).toBeDefined();
    expect(screen.getByText('Power')).toBeDefined();
  });

  it('renders impact preview', () => {
    render(<DraftCard card={card} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('+11% damage')).toBeDefined();
  });

  it('calls onSelect when clicked', () => {
    let called = false;
    render(<DraftCard card={card} selected={false} onSelect={() => { called = true; }} />);
    fireEvent.click(screen.getByText('+15').closest('button')!);
    expect(called).toBe(true);
  });

  it('shows selected state', () => {
    render(<DraftCard card={card} selected={true} onSelect={() => {}} />);
    const button = screen.getByText('+15').closest('button');
    expect(button?.getAttribute('data-selected')).toBe('true');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/game/__tests__/DraftCard.test.tsx
```

**Step 3: Implement**

```tsx
// src/components/game/DraftCard.tsx
import type { DraftCard as DraftCardType } from '@/types/game';
import { StatIcon, STAT_LABELS } from './StatIcon';
import { cn } from '@/lib/utils';

interface DraftCardProps {
  card: DraftCardType;
  selected: boolean;
  onSelect: () => void;
}

export function DraftCard({ card, selected, onSelect }: DraftCardProps) {
  return (
    <button
      data-selected={selected}
      onClick={onSelect}
      className={cn(
        'pixel-panel p-4 sm:p-5 flex flex-col items-center gap-3 rounded-lg border-2 transition-all duration-200 cursor-pointer w-full',
        selected
          ? 'border-amber-500/70 shadow-lg shadow-amber-500/20 bg-slate-800/80'
          : 'border-transparent hover:border-slate-600 bg-slate-900/60'
      )}
    >
      <StatIcon stat={card.stat} size="lg" />

      <div className="pixel-text text-pixel-lg text-foreground font-bold">
        +{card.value}
      </div>

      <div className="pixel-text text-pixel-xs text-muted-foreground">
        {STAT_LABELS[card.stat]}
      </div>

      {/* Impact preview */}
      <div className="pixel-text text-pixel-xs text-amber-400 mt-1">
        {card.impactPreview}
      </div>
    </button>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/game/__tests__/DraftCard.test.tsx
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/game/DraftCard.tsx src/components/game/__tests__/DraftCard.test.tsx
git commit -m "feat(ui): DraftCard component with stat icon and impact preview"
```

---

## Task 3: DraftScreen

**Files:**
- Modify: `src/components/screens/DraftScreen.tsx` (replace stub)
- Test: `src/components/screens/__tests__/DraftScreen.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/screens/__tests__/DraftScreen.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftScreen } from '../DraftScreen';
import { useGameStore } from '@/store/gameStore';

describe('DraftScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'draft',
      player: {
        power: 100, fortitude: 80, speed: 12, luck: 8,
        basePower: 100, baseSpeed: 12,
        hp: 500, maxHp: 500, attackTimer: 2000,
        statusEffects: [],
      },
      draftChoices: [
        { stat: 'power', value: 15, impactPreview: '+11% damage' },
        { stat: 'fortitude', value: 12, impactPreview: '-8% dmg taken' },
        { stat: 'speed', value: 2, impactPreview: '-300ms interval' },
      ],
      selectedChoices: [],
    });
  });

  it('renders current stats bar', () => {
    render(<DraftScreen />);
    expect(screen.getByText(/Power: 100/)).toBeDefined();
    expect(screen.getByText(/Fortitude: 80/)).toBeDefined();
  });

  it('renders all 3 draft cards', () => {
    render(<DraftScreen />);
    expect(screen.getByText('+15')).toBeDefined();
    expect(screen.getByText('+12')).toBeDefined();
    expect(screen.getByText('+2')).toBeDefined();
  });

  it('selecting a card calls selectDraftCard', () => {
    render(<DraftScreen />);
    fireEvent.click(screen.getByText('+15').closest('button')!);
    expect(useGameStore.getState().selectedChoices).toEqual([0]);
  });

  it('confirm button calls confirmDraft', () => {
    useGameStore.setState({ selectedChoices: [0] });
    render(<DraftScreen />);
    fireEvent.click(screen.getByText('Confirm'));
    // confirmDraft applies the stat and transitions phase
    expect(useGameStore.getState().player.power).toBe(115);
  });

  it('confirm button is disabled with no selection', () => {
    render(<DraftScreen />);
    const btn = screen.getByText('Confirm');
    expect(btn.closest('button')?.disabled).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/screens/__tests__/DraftScreen.test.tsx
```

**Step 3: Implement**

```tsx
// src/components/screens/DraftScreen.tsx
import { useGameStore } from '@/store/gameStore';
import { DraftCard } from '@/components/game/DraftCard';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function DraftScreen() {
  const player = useGameStore(s => s.player);
  const draftChoices = useGameStore(s => s.draftChoices);
  const selectedChoices = useGameStore(s => s.selectedChoices);
  const selectDraftCard = useGameStore(s => s.selectDraftCard);
  const confirmDraft = useGameStore(s => s.confirmDraft);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Current stats bar */}
        <div className="flex flex-wrap justify-center gap-4 pixel-text text-pixel-xs text-muted-foreground">
          <span>Power: {player.power}</span>
          <span>Fortitude: {player.fortitude}</span>
          <span>Speed: {player.speed}</span>
          <span>Luck: {player.luck}</span>
        </div>

        <PixelDivider color="orange" />

        <h2 className="pixel-title text-pixel-sm text-center text-foreground">
          Choose a Stat Boost
        </h2>

        {/* Draft cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {draftChoices.map((card, index) => (
            <DraftCard
              key={index}
              card={card}
              selected={selectedChoices.includes(index)}
              onSelect={() => selectDraftCard(index)}
            />
          ))}
        </div>

        {/* Confirm button */}
        <div className="text-center pt-2">
          <Button
            onClick={confirmDraft}
            disabled={selectedChoices.length === 0}
            className="pixel-button-main text-pixel-xs px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 uppercase font-bold"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/screens/__tests__/DraftScreen.test.tsx
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/screens/DraftScreen.tsx src/components/screens/__tests__/DraftScreen.test.tsx
git commit -m "feat(ui): DraftScreen with stat preview and card selection"
```

---

## Task 4: ItemCard + ItemComparison Components

**Files:**
- Create: `src/components/game/ItemCard.tsx`
- Create: `src/components/game/ItemComparison.tsx`

ItemCard displays an item's name, slot, and effect description. ItemComparison shows current vs. new item side-by-side (stacked on mobile).

**Step 1: Implement ItemCard**

```tsx
// src/components/game/ItemCard.tsx
import { ITEM_DEFINITIONS, type ItemDefinition } from '@/data/items';
import type { ShopCard as ShopCardType, StatType } from '@/types/game';
import { StatIcon, STAT_LABELS } from './StatIcon';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  shopCard: ShopCardType;
  selected: boolean;
  onSelect: () => void;
}

const SLOT_COLORS: Record<string, string> = {
  weapon: 'border-red-500/50',
  armor: 'border-blue-500/50',
  accessory: 'border-amber-500/50',
};

export function ItemCard({ shopCard, selected, onSelect }: ItemCardProps) {
  if (shopCard.type === 'stat_boost' && shopCard.stat) {
    return (
      <StatBoostCard
        stat={shopCard.stat}
        value={shopCard.statValue ?? 0}
        selected={selected}
        onSelect={onSelect}
      />
    );
  }

  if (shopCard.type === 'item' && shopCard.itemId) {
    const def = ITEM_DEFINITIONS[shopCard.itemId];
    return (
      <ItemEquipCard
        def={def}
        isUpgrade={shopCard.isUpgrade ?? false}
        selected={selected}
        onSelect={onSelect}
      />
    );
  }

  return null;
}

function StatBoostCard({
  stat, value, selected, onSelect,
}: {
  stat: StatType; value: number; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-selected={selected}
      className={cn(
        'pixel-panel p-3 sm:p-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all cursor-pointer w-full min-w-[100px]',
        selected ? 'border-amber-500/70 shadow-lg shadow-amber-500/20' : 'border-transparent hover:border-slate-600',
      )}
    >
      <StatIcon stat={stat} size="md" />
      <div className="pixel-text text-pixel-sm text-foreground font-bold">+{value}</div>
      <div className="pixel-text text-pixel-xs text-muted-foreground">{STAT_LABELS[stat]}</div>
    </button>
  );
}

function ItemEquipCard({
  def, isUpgrade, selected, onSelect,
}: {
  def: ItemDefinition; isUpgrade: boolean; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-selected={selected}
      className={cn(
        'pixel-panel p-3 sm:p-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all cursor-pointer w-full min-w-[100px]',
        selected ? 'border-amber-500/70 shadow-lg shadow-amber-500/20' : `${SLOT_COLORS[def.slot]} hover:border-slate-500`,
      )}
    >
      <div className="pixel-text text-pixel-xs text-amber-400 uppercase">{def.slot}</div>
      <div className="pixel-text text-pixel-xs text-foreground font-bold text-center">{def.name}</div>
      {isUpgrade && (
        <div className="pixel-text text-[8px] text-green-400 uppercase">Tier Up</div>
      )}
      <div className="pixel-text text-[8px] text-muted-foreground text-center leading-relaxed">
        {def.description}
      </div>
    </button>
  );
}
```

**Step 2: Implement ItemComparison**

```tsx
// src/components/game/ItemComparison.tsx
import { ITEM_DEFINITIONS } from '@/data/items';
import type { Item, ItemId } from '@/types/game';
import { Button } from '@/components/ui/button';

interface ItemComparisonProps {
  currentItem: Item | null;
  newItemId: ItemId;
  isUpgrade: boolean;
  onKeep: () => void;
  onEquip: () => void;
}

export function ItemComparison({ currentItem, newItemId, isUpgrade, onKeep, onEquip }: ItemComparisonProps) {
  const newDef = ITEM_DEFINITIONS[newItemId];
  const currentDef = currentItem ? ITEM_DEFINITIONS[currentItem.id] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="pixel-panel p-6 w-full max-w-lg space-y-6 rounded-lg">
        <h3 className="pixel-title text-pixel-sm text-center text-foreground uppercase">
          {newDef.slot} Comparison
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current item */}
          <div className="pixel-panel-dark p-4 rounded space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground uppercase">Current</div>
            {currentDef ? (
              <>
                <div className="pixel-text text-pixel-xs text-foreground font-bold">
                  {currentDef.name}{currentItem!.tier > 1 ? ` (T${currentItem!.tier})` : ''}
                </div>
                <div className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
                  {currentDef.description}
                </div>
              </>
            ) : (
              <div className="pixel-text text-pixel-xs text-muted-foreground italic">Empty slot</div>
            )}
          </div>

          {/* New item */}
          <div className="pixel-panel-dark p-4 rounded space-y-2 border border-amber-500/30">
            <div className="pixel-text text-pixel-xs text-amber-400 uppercase">
              {isUpgrade ? 'Upgrade' : 'New'}
            </div>
            <div className="pixel-text text-pixel-xs text-foreground font-bold">
              {newDef.name}{isUpgrade && currentItem ? ` (T${currentItem.tier + 1})` : ''}
            </div>
            <div className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
              {newDef.description}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onKeep}
            className="pixel-text text-pixel-xs px-4 py-2"
          >
            Keep Current
          </Button>
          <Button
            onClick={onEquip}
            className="pixel-text text-pixel-xs px-4 py-2 bg-amber-600 hover:bg-amber-500"
          >
            {isUpgrade ? 'Upgrade' : 'Equip New'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/game/ItemCard.tsx src/components/game/ItemComparison.tsx
git commit -m "feat(ui): ItemCard and ItemComparison components for boss shop"
```

---

## Task 5: ShopScreen

**Files:**
- Modify: `src/components/screens/ShopScreen.tsx` (replace stub)
- Test: `src/components/screens/__tests__/ShopScreen.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/screens/__tests__/ShopScreen.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShopScreen } from '../ShopScreen';
import { useGameStore } from '@/store/gameStore';

describe('ShopScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'shop',
      floor: 5,
      player: {
        power: 100, fortitude: 80, speed: 12, luck: 8,
        basePower: 100, baseSpeed: 12,
        hp: 500, maxHp: 500, attackTimer: 2000,
        statusEffects: [],
      },
      shopCards: [
        { type: 'stat_boost', stat: 'power', statValue: 18 },
        { type: 'stat_boost', stat: 'fortitude', statValue: 14 },
        { type: 'item', itemId: 'venomous_fang' },
        { type: 'stat_boost', stat: 'speed', statValue: 2 },
        { type: 'item', itemId: 'thorned_mail' },
      ],
      selectedChoices: [],
    });
  });

  it('renders "Choose 2 Rewards" heading', () => {
    render(<ShopScreen />);
    expect(screen.getByText(/Choose 2 Rewards/)).toBeDefined();
  });

  it('renders all 5 shop cards', () => {
    render(<ShopScreen />);
    expect(screen.getByText('+18')).toBeDefined();
    expect(screen.getByText('Venomous Fang')).toBeDefined();
    expect(screen.getByText('Thorned Mail')).toBeDefined();
  });

  it('allows selecting up to 2 cards', () => {
    render(<ShopScreen />);
    // Select first two stat cards
    fireEvent.click(screen.getByText('+18').closest('button')!);
    fireEvent.click(screen.getByText('+14').closest('button')!);
    expect(useGameStore.getState().selectedChoices).toEqual([0, 1]);
  });

  it('confirm applies selections and transitions to floor-complete', () => {
    useGameStore.setState({ selectedChoices: [0, 1] });
    render(<ShopScreen />);
    fireEvent.click(screen.getByText('Confirm'));
    const state = useGameStore.getState();
    expect(state.phase).toBe('floor-complete');
    expect(state.player.power).toBe(118); // +18 power applied
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/screens/__tests__/ShopScreen.test.tsx
```

**Step 3: Implement**

```tsx
// src/components/screens/ShopScreen.tsx
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ItemCard } from '@/components/game/ItemCard';
import { ItemComparison } from '@/components/game/ItemComparison';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { ITEM_DEFINITIONS } from '@/data/items';
import type { ItemId } from '@/types/game';

export function ShopScreen() {
  const shopCards = useGameStore(s => s.shopCards);
  const selectedChoices = useGameStore(s => s.selectedChoices);
  const equippedItems = useGameStore(s => s.equippedItems);
  const selectShopCard = useGameStore(s => s.selectShopCard);
  const confirmShop = useGameStore(s => s.confirmShop);

  // Item comparison modal state
  const [comparingItem, setComparingItem] = useState<{
    index: number;
    itemId: ItemId;
    isUpgrade: boolean;
  } | null>(null);

  const handleCardSelect = (index: number) => {
    const card = shopCards[index];

    // If it's an item card, open comparison first
    if (card.type === 'item' && card.itemId && !selectedChoices.includes(index)) {
      setComparingItem({
        index,
        itemId: card.itemId,
        isUpgrade: card.isUpgrade ?? false,
      });
      return;
    }

    selectShopCard(index);
  };

  const handleKeep = () => {
    setComparingItem(null);
  };

  const handleEquip = () => {
    if (comparingItem) {
      selectShopCard(comparingItem.index);
      setComparingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h2 className="pixel-title text-pixel-sm text-amber-400 mb-2 uppercase">
            Boss Defeated
          </h2>
          <p className="pixel-text text-pixel-xs text-muted-foreground">
            Choose 2 Rewards
          </p>
        </div>

        <PixelDivider color="orange" />

        {/* Shop cards — horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {shopCards.map((card, index) => (
            <div key={index} className="snap-center shrink-0 w-[140px] sm:w-auto">
              <ItemCard
                shopCard={card}
                selected={selectedChoices.includes(index)}
                onSelect={() => handleCardSelect(index)}
              />
            </div>
          ))}
        </div>

        {/* Selection count indicator */}
        <div className="text-center pixel-text text-pixel-xs text-muted-foreground">
          {selectedChoices.length}/2 selected
        </div>

        {/* Confirm button */}
        <div className="text-center">
          <Button
            onClick={confirmShop}
            disabled={selectedChoices.length === 0}
            className="pixel-button-main text-pixel-xs px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 uppercase font-bold"
          >
            Confirm
          </Button>
        </div>
      </div>

      {/* Item comparison modal */}
      {comparingItem && (
        <ItemComparison
          currentItem={equippedItems[ITEM_DEFINITIONS[comparingItem.itemId].slot]}
          newItemId={comparingItem.itemId}
          isUpgrade={comparingItem.isUpgrade}
          onKeep={handleKeep}
          onEquip={handleEquip}
        />
      )}
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/screens/__tests__/ShopScreen.test.tsx
```

Expected: ALL PASS

**Step 5: Verify in browser**

Play through to a boss floor (floor 3 or 5) to trigger the shop:
- 5 cards displayed
- Tap stat cards to select/deselect
- Tap item cards to open comparison modal
- Confirm with 1-2 selections → transitions to floor-complete

**Step 6: Commit**

```bash
git add src/components/screens/ShopScreen.tsx src/components/screens/__tests__/ShopScreen.test.tsx
git commit -m "feat(ui): ShopScreen with item comparison and card selection"
```
