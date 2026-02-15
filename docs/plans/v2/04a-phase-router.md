# Phase 4A: Phase Router + Game Loop Wiring

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do NOT create a new branch — commit directly to the current branch.

**Goal:** Wire App.tsx as a phase router that renders the correct screen for each game phase, start the game loop, and create stub components for all screens.

**Architecture:** App.tsx reads `phase` from Zustand store via selector, renders matching screen component. `useGameLoop()` starts the RAF loop at the root level. Screen stubs are minimal placeholder components that will be fleshed out in subsequent sub-docs.

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS

---

## Task 1: Create Screen Stub Files

**Files:**
- Create: `src/components/screens/ClassSelect.tsx`
- Create: `src/components/screens/CombatScreen.tsx`
- Create: `src/components/screens/DraftScreen.tsx`
- Create: `src/components/screens/ShopScreen.tsx`
- Create: `src/components/screens/FloorComplete.tsx`
- Create: `src/components/screens/DeathScreen.tsx`
- Create: `src/components/screens/EndlessIntro.tsx`
- Create: `src/components/screens/EndlessDefeat.tsx`
- Create: `src/components/game/CharacterSheet.tsx`

**Step 1: Create all stub screen files**

Each stub is a simple component displaying its phase name. They'll be replaced with full implementations in later sub-docs.

Pattern for each stub:

```tsx
// src/components/screens/ClassSelect.tsx
export function ClassSelect() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <h1 className="pixel-title text-xl">Class Select</h1>
    </div>
  );
}
```

Create all 9 files using this pattern:
- `ClassSelect.tsx` → "Class Select"
- `CombatScreen.tsx` → "Combat"
- `DraftScreen.tsx` → "Draft Pick"
- `ShopScreen.tsx` → "Boss Shop"
- `FloorComplete.tsx` → "Floor Complete"
- `DeathScreen.tsx` → "Defeated"
- `EndlessIntro.tsx` → "Endless Mode"
- `EndlessDefeat.tsx` → "Endless Defeat"
- `CharacterSheet.tsx` → "Character Sheet" (same pattern, in `game/` dir)

**Step 2: Commit**

```bash
git add src/components/screens/ src/components/game/CharacterSheet.tsx
git commit -m "chore(ui): create stub components for all game screens"
```

---

## Task 2: Wire Phase Router in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/App.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { useGameStore } from '@/store/gameStore';

describe('App phase router', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.getState().resetGame();
  });

  it('renders MainMenu when phase is menu', () => {
    render(<App />);
    expect(screen.getByText('Start Game')).toBeDefined();
  });

  it('renders ClassSelect when phase is class-select', () => {
    useGameStore.setState({ phase: 'class-select' });
    render(<App />);
    expect(screen.getByText('Class Select')).toBeDefined();
  });

  it('renders CombatScreen when phase is combat', () => {
    useGameStore.setState({ phase: 'combat' });
    render(<App />);
    expect(screen.getByText('Combat')).toBeDefined();
  });

  it('renders DraftScreen when phase is draft', () => {
    useGameStore.setState({ phase: 'draft' });
    render(<App />);
    expect(screen.getByText('Draft Pick')).toBeDefined();
  });

  it('renders ShopScreen when phase is shop', () => {
    useGameStore.setState({ phase: 'shop' });
    render(<App />);
    expect(screen.getByText('Boss Shop')).toBeDefined();
  });

  it('renders FloorComplete when phase is floor-complete', () => {
    useGameStore.setState({ phase: 'floor-complete' });
    render(<App />);
    expect(screen.getByText('Floor Complete')).toBeDefined();
  });

  it('renders DeathScreen when phase is death', () => {
    useGameStore.setState({ phase: 'death' });
    render(<App />);
    expect(screen.getByText('Defeated')).toBeDefined();
  });

  it('renders EndlessIntro when phase is endless-intro', () => {
    useGameStore.setState({ phase: 'endless-intro' });
    render(<App />);
    expect(screen.getByText('Endless Mode')).toBeDefined();
  });

  it('renders EndlessDefeat when phase is endless-defeat', () => {
    useGameStore.setState({ phase: 'endless-defeat' });
    render(<App />);
    expect(screen.getByText('Endless Defeat')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/App.test.tsx
```

Expected: FAIL — App.tsx doesn't read phase from store yet.

**Step 3: Implement the phase router**

```tsx
// src/App.tsx
import { useGameStore } from '@/store/gameStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { MainMenu } from '@/components/screens/MainMenu';
import { ClassSelect } from '@/components/screens/ClassSelect';
import { CombatScreen } from '@/components/screens/CombatScreen';
import { DraftScreen } from '@/components/screens/DraftScreen';
import { ShopScreen } from '@/components/screens/ShopScreen';
import { FloorComplete } from '@/components/screens/FloorComplete';
import { DeathScreen } from '@/components/screens/DeathScreen';
import { EndlessIntro } from '@/components/screens/EndlessIntro';
import { EndlessDefeat } from '@/components/screens/EndlessDefeat';

function App() {
  const phase = useGameStore(s => s.phase);
  useGameLoop();

  switch (phase) {
    case 'menu':
      return <MainMenu />;
    case 'class-select':
      return <ClassSelect />;
    case 'combat':
      return <CombatScreen />;
    case 'draft':
      return <DraftScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'floor-complete':
      return <FloorComplete />;
    case 'death':
      return <DeathScreen />;
    case 'endless-intro':
      return <EndlessIntro />;
    case 'endless-defeat':
      return <EndlessDefeat />;
    default:
      return <MainMenu />;
  }
}

export default App;
```

**Step 4: Adapt MainMenu to use store directly**

MainMenu currently takes an `onStart` prop. Change it to call the store directly:

```tsx
// src/components/screens/MainMenu.tsx
// Change the interface and component:
// REMOVE: interface MainMenuProps { onStart: () => void; }
// REMOVE: export function MainMenu({ onStart }: MainMenuProps) {
// ADD:
import { useGameStore } from '@/store/gameStore';

export function MainMenu() {
  const selectClass = useGameStore(s => s.selectClass);

  // Replace onClick={onStart} with:
  // onClick={() => { /* navigate to class select */ }}
  // The MainMenu's "Start Game" button should transition to class-select phase.
  // Since selectClass('') doesn't exist, we need a simple phase setter.
  // Use useGameStore.setState directly:
  const handleStart = () => {
    useGameStore.setState({ phase: 'class-select' });
  };

  // ... rest of component, replace onStart with handleStart
```

The key change: replace `onStart` prop callback with `handleStart` that sets `phase: 'class-select'` via the store.

**Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/App.test.tsx
```

Expected: ALL PASS (9 tests)

**Step 6: Verify dev server works**

```bash
npm run dev
```

Open browser — should see MainMenu. No console errors.

**Step 7: Commit**

```bash
git add src/App.tsx src/components/screens/MainMenu.tsx src/__tests__/App.test.tsx
git commit -m "feat(ui): phase router in App.tsx with game loop integration"
```

---

## Task 3: Verify Full Build

**Step 1: Run all existing tests**

```bash
npx vitest run
```

Expected: All 361+ tests pass (existing tests unaffected).

**Step 2: Run build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

**Step 3: Run lint**

```bash
npm run lint
```

Expected: No errors (warnings OK for now).

**Step 4: Fix any issues found, commit if needed**

If build/lint/tests fail, fix the issues and commit:

```bash
git add -A
git commit -m "fix(ui): resolve build/lint issues from phase router"
```
