# Phase 4E: Progression Screens (Floor Complete, Death, Endless, Character Sheet)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do NOT create a new branch — commit directly to the current branch.

**Goal:** Build the remaining screens: floor-complete summary, death diagnostic, endless-mode intro/defeat, and the character sheet overlay accessible from any phase.

**Architecture:** These screens are all event-driven (not per-frame). They read stable state from the store and dispatch single actions (advanceFloor, respawnAtCheckpoint, startEndless, resetGame). Character sheet is a modal overlay toggled by local state, accessible from all phases.

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + shadcn/ui

**Prerequisites:** 04a (phase router) must be complete.

---

## Reference Files

Before starting, read these for context:
- `src/store/gameStore.ts` — advanceFloor, respawnAtCheckpoint, startEndless, resetGame actions
- `src/types/game.ts` — DeathSummary, EquippedItems, CombatEntity, GameState
- `src/data/items.ts` — ITEM_DEFINITIONS for item name/description lookups
- `src/data/classes.ts` — CLASSES for class name/innate lookups
- `src/math/stats.ts` — getAttackInterval, getCritChance, getDodgeChance, getMaxHp (derived stats)
- `src/math/balance.ts` — FINAL_BOSS_FLOOR, ENDLESS_START_FLOOR
- Design doc Section 8 (Between Floors Screen, Death Summary Screen, Character Sheet)

---

## Task 1: FloorComplete Screen

**Files:**
- Modify: `src/components/screens/FloorComplete.tsx` (replace stub)
- Test: `src/components/screens/__tests__/FloorComplete.test.tsx`

Brief pause screen: floor depth, stat summary, equipped items. "Continue to Floor N" button. Auto-advance after 5s (click to skip).

**Step 1: Write the failing test**

```tsx
// src/components/screens/__tests__/FloorComplete.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloorComplete } from '../FloorComplete';
import { useGameStore } from '@/store/gameStore';

describe('FloorComplete', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'floor-complete',
      floor: 5,
      player: {
        power: 120, fortitude: 90, speed: 14, luck: 10,
        basePower: 120, baseSpeed: 14,
        hp: 550, maxHp: 550, attackTimer: 0,
        statusEffects: [],
      },
      classId: 'warrior',
      equippedItems: {
        weapon: { id: 'heavy_cleaver', slot: 'weapon', tier: 1 },
        armor: null,
        accessory: null,
      },
    });
  });

  it('shows floor complete message', () => {
    render(<FloorComplete />);
    expect(screen.getByText(/Floor 5 Complete/)).toBeDefined();
  });

  it('shows current stats', () => {
    render(<FloorComplete />);
    expect(screen.getByText(/Power/)).toBeDefined();
    expect(screen.getByText(/120/)).toBeDefined();
  });

  it('shows equipped items', () => {
    render(<FloorComplete />);
    expect(screen.getByText(/Heavy Cleaver/)).toBeDefined();
  });

  it('continue button calls advanceFloor', () => {
    render(<FloorComplete />);
    fireEvent.click(screen.getByText(/Continue to Floor 6/));
    expect(useGameStore.getState().floor).toBe(6);
    expect(useGameStore.getState().phase).toBe('combat');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/screens/__tests__/FloorComplete.test.tsx
```

**Step 3: Implement**

```tsx
// src/components/screens/FloorComplete.tsx
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ITEM_DEFINITIONS } from '@/data/items';
import { CLASSES } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import type { ItemSlot } from '@/types/game';

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

export function FloorComplete() {
  const floor = useGameStore(s => s.floor);
  const player = useGameStore(s => s.player);
  const classId = useGameStore(s => s.classId);
  const equippedItems = useGameStore(s => s.equippedItems);
  const advanceFloor = useGameStore(s => s.advanceFloor);

  const classDef = CLASSES[classId];

  // Auto-advance after 5 seconds
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(advanceFloor, 5000);
    return () => clearTimeout(timerRef.current);
  }, [advanceFloor]);

  const handleContinue = () => {
    clearTimeout(timerRef.current);
    advanceFloor();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="pixel-title text-pixel-sm text-amber-400 uppercase">
          Floor {floor} Complete
        </h2>

        <PixelDivider color="orange" />

        {/* Class */}
        <div className="pixel-text text-pixel-xs text-muted-foreground">
          {classDef?.name} — {classDef?.innate.name}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Power', value: player.power },
            { label: 'Fortitude', value: player.fortitude },
            { label: 'Speed', value: player.speed },
            { label: 'Luck', value: player.luck },
          ].map(({ label, value }) => (
            <div key={label} className="pixel-panel-dark p-3 rounded">
              <div className="pixel-text text-pixel-xs text-muted-foreground">{label}</div>
              <div className="pixel-text text-pixel-sm text-foreground font-bold">{value}</div>
            </div>
          ))}
        </div>

        {/* Equipment */}
        <div className="space-y-2">
          {(['weapon', 'armor', 'accessory'] as ItemSlot[]).map(slot => {
            const item = equippedItems[slot];
            const def = item ? ITEM_DEFINITIONS[item.id] : null;
            return (
              <div key={slot} className="flex items-center gap-2 text-left">
                <span className="pixel-text text-pixel-xs text-muted-foreground w-16">{SLOT_LABELS[slot]}:</span>
                <span className="pixel-text text-pixel-xs text-foreground">
                  {def ? `${def.name}${item!.tier > 1 ? ` (T${item!.tier})` : ''}` : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          size="lg"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 uppercase font-bold"
        >
          Continue to Floor {floor + 1}
        </Button>

        <p className="pixel-text text-[8px] text-muted-foreground">
          Auto-continuing in 5s...
        </p>
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/screens/__tests__/FloorComplete.test.tsx
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/screens/FloorComplete.tsx src/components/screens/__tests__/FloorComplete.test.tsx
git commit -m "feat(ui): FloorComplete screen with stats summary and auto-advance"
```

---

## Task 2: DeathScreen

**Files:**
- Modify: `src/components/screens/DeathScreen.tsx` (replace stub)
- Test: `src/components/screens/__tests__/DeathScreen.test.tsx`

Death diagnostic screen. Shows what killed you, stat comparison, weakness hint, and respawn button.

**Step 1: Write the failing test**

```tsx
// src/components/screens/__tests__/DeathScreen.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeathScreen } from '../DeathScreen';
import { useGameStore } from '@/store/gameStore';

describe('DeathScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'death',
      floor: 12,
      checkpoint: 10,
      lastDeathStats: {
        floor: 12,
        room: 3,
        enemyTier: 'rare',
        enemyModifiers: ['armored'],
        playerStats: { power: 148, fortitude: 107, speed: 16, luck: 12 },
        enemyStats: { power: 89, fortitude: 142, speed: 10 },
        playerDamagePerHit: 28,
        enemyDamagePerHit: 41,
        weaknessHint: 'Your Power was 42% below the enemy Fortitude. Consider prioritizing Power picks or DoT weapons against Armored enemies.',
      },
      player: {
        power: 148, fortitude: 107, speed: 16, luck: 12,
        basePower: 148, baseSpeed: 16,
        hp: 0, maxHp: 635, attackTimer: 0,
        statusEffects: [],
      },
    });
  });

  it('shows defeated heading', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Defeated/)).toBeDefined();
  });

  it('shows floor and room', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Floor 12, Room 3/)).toBeDefined();
  });

  it('shows enemy info', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Rare/i)).toBeDefined();
    expect(screen.getByText(/Armored/i)).toBeDefined();
  });

  it('shows stat comparison', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/148/)).toBeDefined(); // player power
    expect(screen.getByText(/89/)).toBeDefined();  // enemy power
  });

  it('shows weakness hint', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Power was 42% below/)).toBeDefined();
  });

  it('respawn button calls respawnAtCheckpoint', () => {
    render(<DeathScreen />);
    fireEvent.click(screen.getByText(/Respawn at Floor 10/));
    expect(useGameStore.getState().phase).toBe('combat');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/screens/__tests__/DeathScreen.test.tsx
```

**Step 3: Implement**

```tsx
// src/components/screens/DeathScreen.tsx
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function DeathScreen() {
  const lastDeathStats = useGameStore(s => s.lastDeathStats);
  const checkpoint = useGameStore(s => s.checkpoint);
  const respawnAtCheckpoint = useGameStore(s => s.respawnAtCheckpoint);

  if (!lastDeathStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="pixel-text text-muted-foreground">No death data available.</p>
      </div>
    );
  }

  const ds = lastDeathStats;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/30 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Heading */}
        <div className="text-center">
          <h2 className="pixel-title text-pixel-sm text-red-400 uppercase">Defeated</h2>
          <p className="pixel-text text-pixel-xs text-muted-foreground mt-1">
            Floor {ds.floor}, Room {ds.room}
          </p>
        </div>

        <PixelDivider color="red" />

        {/* Killed by */}
        <div className="text-center pixel-text text-pixel-xs text-muted-foreground">
          Killed by:{' '}
          <span className="text-foreground capitalize">
            {ds.enemyTier}{' '}
            {ds.enemyModifiers.map(m => (
              <span key={m} className="text-amber-400 capitalize">{m} </span>
            ))}
            enemy
          </span>
        </div>

        {/* Stat comparison */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="pixel-text text-pixel-xs text-muted-foreground">Stat</div>
          <div className="pixel-text text-pixel-xs text-blue-400">You</div>
          <div className="pixel-text text-pixel-xs text-red-400">Enemy</div>

          {/* Power */}
          <div className="pixel-text text-pixel-xs text-muted-foreground">Power</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.playerStats.power}</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.enemyStats.power}</div>

          {/* Fortitude */}
          <div className="pixel-text text-pixel-xs text-muted-foreground">Fortitude</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.playerStats.fortitude}</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.enemyStats.fortitude}</div>

          {/* Speed */}
          <div className="pixel-text text-pixel-xs text-muted-foreground">Speed</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.playerStats.speed}</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.enemyStats.speed}</div>
        </div>

        {/* Damage comparison */}
        <div className="flex justify-around pixel-text text-pixel-xs">
          <div className="text-center">
            <div className="text-muted-foreground">You dealt</div>
            <div className="text-foreground font-bold">~{ds.playerDamagePerHit}/hit</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Enemy dealt</div>
            <div className="text-foreground font-bold">~{ds.enemyDamagePerHit}/hit</div>
          </div>
        </div>

        <PixelDivider color="red" />

        {/* Weakness hint */}
        <div className="pixel-panel-dark p-4 rounded">
          <div className="pixel-text text-pixel-xs text-amber-400 font-bold mb-1">Weakness</div>
          <div className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
            {ds.weaknessHint}
          </div>
        </div>

        {/* Respawn button */}
        <div className="text-center pt-2">
          <Button
            onClick={respawnAtCheckpoint}
            size="lg"
            className="pixel-button-main text-pixel-xs px-8 py-4 bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 uppercase font-bold"
          >
            Respawn at Floor {Math.max(1, checkpoint)}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/screens/__tests__/DeathScreen.test.tsx
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/screens/DeathScreen.tsx src/components/screens/__tests__/DeathScreen.test.tsx
git commit -m "feat(ui): DeathScreen with stat comparison and weakness hint"
```

---

## Task 3: EndlessIntro Screen

**Files:**
- Modify: `src/components/screens/EndlessIntro.tsx` (replace stub)

This is a brief warning screen shown at floor 100: "No more checkpoints."

**Step 1: Implement**

```tsx
// src/components/screens/EndlessIntro.tsx
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function EndlessIntro() {
  const startEndless = useGameStore(s => s.startEndless);
  const player = useGameStore(s => s.player);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="pixel-title text-pixel-sm text-amber-400 uppercase">
          Floor 100 Complete
        </h2>

        <PixelDivider color="orange" />

        <div className="space-y-4">
          <p className="pixel-text text-pixel-xs text-foreground leading-relaxed">
            You have conquered the dungeon.
          </p>
          <p className="pixel-text text-pixel-xs text-muted-foreground leading-relaxed">
            Beyond this point, there are no checkpoints.
            Death ends your run. Your depth is your score.
          </p>
          <p className="pixel-text text-pixel-xs text-red-400 leading-relaxed">
            There is no safety net.
          </p>
        </div>

        {/* Stats snapshot */}
        <div className="flex justify-center gap-4 pixel-text text-pixel-xs text-muted-foreground">
          <span>Power: {player.power}</span>
          <span>Fort: {player.fortitude}</span>
          <span>Speed: {player.speed}</span>
          <span>Luck: {player.luck}</span>
        </div>

        <Button
          onClick={startEndless}
          size="lg"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-red-700 hover:bg-red-600 border-b-4 border-red-900 uppercase font-bold"
        >
          Enter the Endless Depths
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/screens/EndlessIntro.tsx
git commit -m "feat(ui): EndlessIntro warning screen at floor 100"
```

---

## Task 4: EndlessDefeat Screen

**Files:**
- Modify: `src/components/screens/EndlessDefeat.tsx` (replace stub)

High score display after dying in endless mode (floor 101+). Return to menu.

**Step 1: Implement**

```tsx
// src/components/screens/EndlessDefeat.tsx
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function EndlessDefeat() {
  const depth = useGameStore(s => s.depth);
  const lastDeathStats = useGameStore(s => s.lastDeathStats);
  const resetGame = useGameStore(s => s.resetGame);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/20 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="pixel-title text-pixel-sm text-red-400 uppercase">
          The Depths Claimed You
        </h2>

        <PixelDivider color="red" />

        {/* High score */}
        <div className="space-y-2">
          <div className="pixel-text text-pixel-xs text-muted-foreground">Deepest Floor Reached</div>
          <div className="pixel-title text-3xl text-amber-400 font-bold">{depth}</div>
        </div>

        {/* Death info (if available) */}
        {lastDeathStats && (
          <div className="pixel-panel-dark p-4 rounded space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground">
              Killed on Floor {lastDeathStats.floor}, Room {lastDeathStats.room}
            </div>
            <div className="pixel-text text-pixel-xs text-muted-foreground">
              by a{' '}
              <span className="text-foreground capitalize">
                {lastDeathStats.enemyModifiers.join(' ')} {lastDeathStats.enemyTier}
              </span>{' '}
              enemy
            </div>
          </div>
        )}

        <Button
          onClick={resetGame}
          size="lg"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-slate-700 hover:bg-slate-600 border-b-4 border-slate-900 uppercase font-bold"
        >
          Return to Menu
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/screens/EndlessDefeat.tsx
git commit -m "feat(ui): EndlessDefeat screen with high score display"
```

---

## Task 5: CharacterSheet Overlay

**Files:**
- Modify: `src/components/game/CharacterSheet.tsx` (replace stub)
- Modify: `src/App.tsx` (add character sheet toggle button)

Accessible from any phase. Shows all 4 stats + derived values + equipped items with full descriptions.

**Step 1: Implement CharacterSheet**

```tsx
// src/components/game/CharacterSheet.tsx
import { useGameStore } from '@/store/gameStore';
import { CLASSES } from '@/data/classes';
import { ITEM_DEFINITIONS } from '@/data/items';
import { getAttackInterval, getCritChance, getCritDamage, getDodgeChance, getMaxHp } from '@/math/stats';
import { calculateEffectiveness } from '@/math/damage';
import { PLAYER_BASE_HP, WARRIOR_FORTITUDE_MULT } from '@/math/balance';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import type { ItemSlot } from '@/types/game';

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

interface CharacterSheetProps {
  onClose: () => void;
}

export function CharacterSheet({ onClose }: CharacterSheetProps) {
  const player = useGameStore(s => s.player);
  const classId = useGameStore(s => s.classId);
  const equippedItems = useGameStore(s => s.equippedItems);
  const depth = useGameStore(s => s.depth);
  const floor = useGameStore(s => s.floor);

  const classDef = CLASSES[classId];
  if (!classDef) return null;

  // Derived stats
  const attackInterval = getAttackInterval(player.speed);
  const critChance = getCritChance(player.luck);
  const critDamage = getCritDamage(player.luck);
  const dodgeChance = getDodgeChance(player.luck);
  const maxHp = getMaxHp(PLAYER_BASE_HP, player.fortitude);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
      <div className="pixel-panel p-6 w-full max-w-lg space-y-5 rounded-lg my-4">
        <div className="flex items-center justify-between">
          <h3 className="pixel-title text-pixel-sm text-foreground uppercase">Character Sheet</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="pixel-text text-pixel-xs">
            Close
          </Button>
        </div>

        {/* Class + floor */}
        <div className="pixel-text text-pixel-xs text-muted-foreground">
          {classDef.name} ({classDef.innate.name}) — Floor {floor}
          {depth > 0 && <span className="ml-2 text-amber-400">Depth Record: {depth}</span>}
        </div>

        <PixelDivider color="blue" />

        {/* Stats + derived */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="pixel-text text-pixel-xs text-muted-foreground uppercase mb-1">Stats</div>
            {[
              { label: 'Power', value: player.power },
              { label: 'Fortitude', value: player.fortitude },
              { label: 'Speed', value: player.speed },
              { label: 'Luck', value: player.luck },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="pixel-text text-pixel-xs text-muted-foreground">{label}</span>
                <span className="pixel-text text-pixel-xs text-foreground font-bold">{value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="pixel-text text-pixel-xs text-muted-foreground uppercase mb-1">Derived</div>
            {[
              { label: 'Max HP', value: maxHp.toString() },
              { label: 'Interval', value: `${attackInterval}ms` },
              { label: 'Crit', value: `${(critChance * 100).toFixed(1)}%` },
              { label: 'Crit Dmg', value: `${(critDamage * 100).toFixed(0)}%` },
              { label: 'Dodge', value: `${(dodgeChance * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="pixel-text text-pixel-xs text-muted-foreground">{label}</span>
                <span className="pixel-text text-pixel-xs text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <PixelDivider color="blue" />

        {/* Equipment */}
        <div className="space-y-3">
          <div className="pixel-text text-pixel-xs text-muted-foreground uppercase">Equipment</div>
          {(['weapon', 'armor', 'accessory'] as ItemSlot[]).map(slot => {
            const item = equippedItems[slot];
            const def = item ? ITEM_DEFINITIONS[item.id] : null;
            return (
              <div key={slot} className="pixel-panel-dark p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="pixel-text text-pixel-xs text-muted-foreground">[{SLOT_LABELS[slot][0]}]</span>
                  <span className="pixel-text text-pixel-xs text-foreground font-bold">
                    {def ? `${def.name}${item!.tier > 1 ? ` (T${item!.tier})` : ''}` : 'Empty'}
                  </span>
                </div>
                {def && (
                  <p className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
                    {def.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add character sheet toggle to App.tsx**

Modify `src/App.tsx` to include a character sheet toggle button visible in all phases except 'menu':

```tsx
// Add to App.tsx:
import { useState } from 'react';
import { CharacterSheet } from '@/components/game/CharacterSheet';

function App() {
  const phase = useGameStore(s => s.phase);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  useGameLoop();

  return (
    <>
      {/* Phase router (existing switch statement) */}
      {/* ... */}

      {/* Character sheet toggle — hidden on menu and class-select */}
      {phase !== 'menu' && phase !== 'class-select' && (
        <button
          onClick={() => setShowCharacterSheet(!showCharacterSheet)}
          className="fixed top-3 left-3 z-40 pixel-text text-pixel-xs text-muted-foreground hover:text-foreground bg-slate-900/80 px-2 py-1 rounded border border-slate-700"
          data-testid="character-sheet-toggle"
        >
          Stats
        </button>
      )}

      {/* Character sheet overlay */}
      {showCharacterSheet && (
        <CharacterSheet onClose={() => setShowCharacterSheet(false)} />
      )}
    </>
  );
}
```

**Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Verify in browser**

- Play through a few rooms
- Click "Stats" button → Character sheet overlay opens
- Shows correct stats, derived values, and equipment
- Click "Close" → returns to game

**Step 5: Commit**

```bash
git add src/components/game/CharacterSheet.tsx src/App.tsx
git commit -m "feat(ui): CharacterSheet overlay accessible from all phases"
```

---

## Task 6: Final Verification

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (361+ original + new UI tests).

**Step 2: Run build**

```bash
npm run build
```

Expected: Clean build.

**Step 3: Run lint**

```bash
npm run lint
```

Expected: No errors.

**Step 4: Manual full playthrough**

```bash
npm run dev
```

Test the complete flow:
1. Main Menu → Start Game
2. Class Select → pick Warrior → Begin Descent
3. Combat → watch fights, verify damage numbers, attack bars, health bars
4. Draft pick appears every 3 fights → select a stat → confirm
5. Continue through rooms until boss floor (floor 3)
6. Boss shop → select 2 rewards → confirm
7. Floor Complete → continue to next floor
8. Character sheet toggle from any screen
9. Speed controls (1x/2x/4x) and pause
10. If possible: let player die → Death screen with stats + hint → respawn

**Step 5: Fix any issues found**

If anything is broken, fix and commit:

```bash
git add -A
git commit -m "fix(ui): resolve issues found during full playthrough"
```
