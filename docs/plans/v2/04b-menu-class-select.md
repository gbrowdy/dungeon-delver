# Phase 4B: Main Menu + Class Select Screen

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do NOT create a new branch — commit directly to the current branch.

**Goal:** Adapt MainMenu for Zustand and build the ClassSelect screen with stat weight visualization, innate descriptions, and a select+confirm flow.

**Architecture:** Both screens use `useGameStore()` for state and actions. MainMenu transitions to class-select phase. ClassSelect shows 3 class cards and calls `selectClass(classId)` + `startRun()` on confirmation.

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + shadcn/ui

**Prerequisites:** 04a (phase router) must be complete.

---

## Reference Files

Before starting, read these for context:
- `src/data/classes.ts` — ClassDefinition shape, CLASS_LIST, CLASSES record
- `src/store/gameStore.ts` — `selectClass()` and `startRun()` actions
- `src/components/screens/MainMenu.tsx` — current MainMenu (needs adaptation)
- `src/index.css` — pixel-panel, pixel-title, pixel-button, pixel-stat-box CSS classes
- Design doc Section 3 (Classes) and Section 8 (Visual Design) in `docs/plans/2026-02-08-game-redesign-v2.md`

---

## Task 1: Adapt MainMenu for Zustand

**Files:**
- Modify: `src/components/screens/MainMenu.tsx`

If 04a already adapted MainMenu (removing `onStart` prop, adding store integration), verify it works. If not:

**Step 1: Remove the props interface**

Remove:
```tsx
interface MainMenuProps {
  onStart: () => void;
}
```

Change function signature from `export function MainMenu({ onStart }: MainMenuProps)` to `export function MainMenu()`.

**Step 2: Add store integration**

```tsx
import { useGameStore } from '@/store/gameStore';

export function MainMenu() {
  const handleStart = () => {
    useGameStore.setState({ phase: 'class-select' });
  };
  // ... replace all references to onStart with handleStart
```

**Step 3: Remove the Paladin class dot (only 3 classes in v2)**

In the class color indicators section, remove the amber/Paladin dot. Keep only:
- Red (Warrior)
- Violet (Mage)
- Green (Rogue)

**Step 4: Verify in dev server**

```bash
npm run dev
```

Click "Start Game" → should navigate to class-select stub screen.

**Step 5: Commit**

```bash
git add src/components/screens/MainMenu.tsx
git commit -m "feat(ui): adapt MainMenu for Zustand store integration"
```

---

## Task 2: Build ClassSelect Screen

**Files:**
- Modify: `src/components/screens/ClassSelect.tsx` (replace stub)
- Test: `src/components/screens/__tests__/ClassSelect.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/screens/__tests__/ClassSelect.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassSelect } from '../ClassSelect';
import { useGameStore } from '@/store/gameStore';

describe('ClassSelect', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ phase: 'class-select' });
  });

  it('renders all three class cards', () => {
    render(<ClassSelect />);
    expect(screen.getByText('Warrior')).toBeDefined();
    expect(screen.getByText('Rogue')).toBeDefined();
    expect(screen.getByText('Mage')).toBeDefined();
  });

  it('shows innate description for each class', () => {
    render(<ClassSelect />);
    expect(screen.getByText(/Toughness/)).toBeDefined();
    expect(screen.getByText(/Precision/)).toBeDefined();
    expect(screen.getByText(/Amplify/)).toBeDefined();
  });

  it('selecting a class highlights it', () => {
    render(<ClassSelect />);
    const warriorCard = screen.getByText('Warrior').closest('[data-testid]');
    fireEvent.click(warriorCard!);
    expect(warriorCard!.getAttribute('data-selected')).toBe('true');
  });

  it('confirm button calls selectClass and startRun', () => {
    render(<ClassSelect />);
    // Select warrior
    fireEvent.click(screen.getByText('Warrior').closest('[data-testid]')!);
    // Confirm
    fireEvent.click(screen.getByText('Begin Descent'));

    const state = useGameStore.getState();
    expect(state.classId).toBe('warrior');
    // startRun transitions to combat phase
    expect(state.phase).toBe('combat');
  });

  it('confirm button is disabled until a class is selected', () => {
    render(<ClassSelect />);
    const btn = screen.getByText('Begin Descent');
    expect(btn.closest('button')?.disabled).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/screens/__tests__/ClassSelect.test.tsx
```

Expected: FAIL — ClassSelect is still a stub.

**Step 3: Implement ClassSelect**

```tsx
// src/components/screens/ClassSelect.tsx
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CLASS_LIST, type ClassDefinition } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import type { StatType } from '@/types/game';

const STAT_LABELS: Record<StatType, string> = {
  power: 'Power',
  fortitude: 'Fortitude',
  speed: 'Speed',
  luck: 'Luck',
};

const STAT_COLORS: Record<StatType, string> = {
  power: 'bg-red-500',
  fortitude: 'bg-blue-500',
  speed: 'bg-yellow-500',
  luck: 'bg-purple-500',
};

const CLASS_COLORS: Record<string, string> = {
  warrior: 'border-red-500/60',
  rogue: 'border-green-500/60',
  mage: 'border-violet-500/60',
};

const CLASS_GLOW: Record<string, string> = {
  warrior: 'shadow-red-500/20',
  rogue: 'shadow-green-500/20',
  mage: 'shadow-violet-500/20',
};

function StatWeightBar({ stat, weight, maxWeight }: { stat: StatType; weight: number; maxWeight: number }) {
  const pct = (weight / maxWeight) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="pixel-text text-pixel-xs text-muted-foreground w-20 text-right">{STAT_LABELS[stat]}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${STAT_COLORS[stat]} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ClassCard({
  classDef,
  selected,
  onSelect,
}: {
  classDef: ClassDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const maxWeight = Math.max(...Object.values(classDef.statWeights));

  return (
    <button
      data-testid={`class-card-${classDef.id}`}
      data-selected={selected}
      onClick={onSelect}
      className={`
        pixel-panel w-full p-4 sm:p-6 text-left transition-all duration-200 cursor-pointer
        border-2 rounded-lg
        ${selected
          ? `${CLASS_COLORS[classDef.id]} ${CLASS_GLOW[classDef.id]} shadow-lg`
          : 'border-transparent hover:border-slate-600'
        }
      `}
    >
      <h3 className="pixel-title text-pixel-sm font-bold text-foreground mb-1">
        {classDef.name}
      </h3>
      <p className="pixel-text text-pixel-xs text-muted-foreground mb-4">
        {classDef.description}
      </p>

      {/* Stat weights */}
      <div className="space-y-2 mb-4">
        {(Object.keys(STAT_LABELS) as StatType[]).map(stat => (
          <StatWeightBar
            key={stat}
            stat={stat}
            weight={classDef.statWeights[stat]}
            maxWeight={maxWeight}
          />
        ))}
      </div>

      {/* Innate */}
      <div className="pixel-panel-dark p-3 rounded">
        <div className="pixel-text text-pixel-xs text-amber-400 font-bold mb-1">
          {classDef.innate.name}
        </div>
        <div className="pixel-text text-pixel-xs text-muted-foreground">
          {classDef.innate.description}
        </div>
      </div>
    </button>
  );
}

export function ClassSelect() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selectClass = useGameStore(s => s.selectClass);
  const startRun = useGameStore(s => s.startRun);

  const handleConfirm = () => {
    if (!selectedClassId) return;
    selectClass(selectedClassId);
    startRun();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-6 sm:space-y-8 pt-8 sm:pt-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="pixel-title text-lg sm:text-xl font-bold text-foreground mb-2">
            Choose Your Class
          </h1>
          <p className="pixel-text text-pixel-xs text-muted-foreground">
            Each class has a unique innate ability that defines your playstyle.
          </p>
        </div>

        <PixelDivider color="blue" />

        {/* Class cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {CLASS_LIST.map(classDef => (
            <ClassCard
              key={classDef.id}
              classDef={classDef}
              selected={selectedClassId === classDef.id}
              onSelect={() => setSelectedClassId(classDef.id)}
            />
          ))}
        </div>

        {/* Confirm button */}
        <div className="text-center pt-4">
          <Button
            onClick={handleConfirm}
            disabled={!selectedClassId}
            size="lg"
            className="pixel-button-main text-pixel-sm px-8 sm:px-12 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 hover:border-orange-700 active:border-b-2 active:translate-y-[2px] uppercase font-bold"
          >
            Begin Descent
          </Button>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-indigo-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/screens/__tests__/ClassSelect.test.tsx
```

Expected: ALL PASS

**Step 5: Verify in browser**

```bash
npm run dev
```

Main Menu → "Start Game" → Class Select screen with 3 cards → Select a class → "Begin Descent" → should transition to combat stub.

**Step 6: Commit**

```bash
git add src/components/screens/ClassSelect.tsx src/components/screens/__tests__/ClassSelect.test.tsx
git commit -m "feat(ui): class select screen with stat weights and innate descriptions"
```

---

## Task 3: Back Button on ClassSelect

**Files:**
- Modify: `src/components/screens/ClassSelect.tsx`

**Step 1: Add a back button that returns to the menu**

Add above the "Choose Your Class" header:

```tsx
<button
  onClick={() => useGameStore.setState({ phase: 'menu' })}
  className="pixel-text text-pixel-xs text-muted-foreground hover:text-foreground transition-colors"
>
  &larr; Back
</button>
```

**Step 2: Verify in browser**

Click Back → returns to MainMenu.

**Step 3: Commit**

```bash
git add src/components/screens/ClassSelect.tsx
git commit -m "feat(ui): add back button to class select screen"
```
