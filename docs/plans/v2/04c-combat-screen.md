# Phase 4C: Combat Screen

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do NOT create a new branch — commit directly to the current branch.

**Goal:** Build the main combat view — the screen where the player spends most of their time. Side-view layout with sprites, health bars, attack timers, speed controls, floating damage numbers, and status effect display.

**Architecture:** CombatScreen subscribes to `renderVersion` for per-frame updates. Sub-components read from the store directly. Combat events are consumed from the store's `combatEvents` array and mapped to floating numbers. The game loop is already running from App.tsx via `useGameLoop()`.

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + AnimatedPixelSprite

**Prerequisites:** 04a (phase router) must be complete.

---

## Reference Files

Before starting, read these for context:
- `src/store/gameStore.ts` — store shape, all actions (tick, togglePause, setSpeed, cycleSpeed)
- `src/types/game.ts` — CombatEntity, CombatEvent, EnemyDefinition, GameState
- `src/components/game/PixelSprite.tsx` — PixelSprite and AnimatedPixelSprite interfaces
- `src/components/game/HealthBar.tsx` — HealthBar props interface
- `src/components/game/battle-effects/FloatingNumbers.tsx` — DamageNumber props
- `src/data/sprites.ts` — SpriteType union, sprite names for enemies/classes
- `src/math/stats.ts` — getAttackInterval (for attack bar fill percentage)
- `src/math/balance.ts` — ENRAGE_THRESHOLD_MS, TICK_MS
- `src/index.css` — pixel-panel, animation classes
- Design doc Section 8 (Combat Screen Layout, Attack bars, Damage Number Visual Language)

---

## Task 1: Enemy Sprite Helper

**Files:**
- Create: `src/utils/spriteMapping.ts`
- Test: `src/utils/__tests__/spriteMapping.test.ts`

The enemy system generates enemies by tier (common/uncommon/rare/boss) without a specific sprite type. We need a deterministic mapping from (floor, room, tier) → sprite type.

**Step 1: Write the failing test**

```tsx
// src/utils/__tests__/spriteMapping.test.ts
import { describe, it, expect } from 'vitest';
import { getEnemySpriteType } from '../spriteMapping';

describe('getEnemySpriteType', () => {
  it('returns a valid sprite type for common enemies', () => {
    const sprite = getEnemySpriteType('common', 1, 1);
    expect(typeof sprite).toBe('string');
    expect(sprite.length).toBeGreaterThan(0);
  });

  it('returns boss sprites for boss tier', () => {
    const sprite = getEnemySpriteType('boss', 5, 4);
    expect(['dragon', 'archdemon', 'death-knight', 'elder-lich', 'titan']).toContain(sprite);
  });

  it('is deterministic for same inputs', () => {
    const a = getEnemySpriteType('common', 3, 2);
    const b = getEnemySpriteType('common', 3, 2);
    expect(a).toBe(b);
  });

  it('varies with different floor/room combos', () => {
    const sprites = new Set([
      getEnemySpriteType('common', 1, 1),
      getEnemySpriteType('common', 2, 1),
      getEnemySpriteType('common', 3, 1),
      getEnemySpriteType('common', 4, 1),
      getEnemySpriteType('common', 5, 1),
    ]);
    // At least some variation
    expect(sprites.size).toBeGreaterThan(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/spriteMapping.test.ts
```

**Step 3: Implement**

```tsx
// src/utils/spriteMapping.ts
import type { EnemyTier } from '@/types/game';
import type { SpriteType } from '@/data/sprites';

const COMMON_SPRITES: SpriteType[] = ['goblin', 'slime', 'rat', 'spider', 'imp', 'zombie'];
const UNCOMMON_SPRITES: SpriteType[] = ['orc', 'skeleton', 'dark-elf', 'ghost', 'harpy'];
const RARE_SPRITES: SpriteType[] = ['werewolf', 'minotaur', 'vampire', 'demon', 'golem'];
const BOSS_SPRITES: SpriteType[] = ['dragon', 'archdemon', 'death-knight', 'elder-lich', 'titan'];

const TIER_SPRITES: Record<EnemyTier, SpriteType[]> = {
  common: COMMON_SPRITES,
  uncommon: UNCOMMON_SPRITES,
  rare: RARE_SPRITES,
  boss: BOSS_SPRITES,
};

/**
 * Deterministic mapping from (tier, floor, room) to an enemy sprite type.
 * Uses floor+room as a seed to cycle through available sprites.
 */
export function getEnemySpriteType(tier: EnemyTier, floor: number, room: number): SpriteType {
  const pool = TIER_SPRITES[tier];
  const index = ((floor * 7) + (room * 13)) % pool.length;
  return pool[index];
}
```

**Step 4: Run tests**

```bash
npx vitest run src/utils/__tests__/spriteMapping.test.ts
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/utils/spriteMapping.ts src/utils/__tests__/spriteMapping.test.ts
git commit -m "feat(utils): deterministic enemy sprite mapping by tier/floor/room"
```

---

## Task 2: AttackBar Component

**Files:**
- Create: `src/components/game/AttackBar.tsx`
- Test: `src/components/game/__tests__/AttackBar.test.tsx`

A thin bar that fills from left to right as the attack timer counts down. Color shifts blue → yellow → white as it fills. Brief flash when attack fires (timer resets).

**Step 1: Write the failing test**

```tsx
// src/components/game/__tests__/AttackBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttackBar } from '../AttackBar';

describe('AttackBar', () => {
  it('renders with correct fill percentage', () => {
    // Timer starts at full interval, counts down to 0
    // attackTimer=1000, interval=2000 → 50% elapsed → 50% fill
    render(<AttackBar attackTimer={1000} attackInterval={2000} />);
    const fill = screen.getByTestId('attack-bar-fill');
    expect(fill.style.width).toBe('50%');
  });

  it('shows 100% when timer is at 0', () => {
    render(<AttackBar attackTimer={0} attackInterval={2000} />);
    const fill = screen.getByTestId('attack-bar-fill');
    expect(fill.style.width).toBe('100%');
  });

  it('shows 0% when timer equals interval', () => {
    render(<AttackBar attackTimer={2000} attackInterval={2000} />);
    const fill = screen.getByTestId('attack-bar-fill');
    expect(fill.style.width).toBe('0%');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/game/__tests__/AttackBar.test.tsx
```

**Step 3: Implement**

```tsx
// src/components/game/AttackBar.tsx
import { cn } from '@/lib/utils';

interface AttackBarProps {
  attackTimer: number;   // ms remaining until next attack
  attackInterval: number; // total ms between attacks
  className?: string;
}

export function AttackBar({ attackTimer, attackInterval, className }: AttackBarProps) {
  // Timer counts down from interval to 0. Fill = how much has elapsed.
  const elapsed = Math.max(0, attackInterval - attackTimer);
  const fillPercent = Math.min(100, Math.max(0, (elapsed / attackInterval) * 100));

  // Color shifts: blue (0-50%) → yellow (50-80%) → white (80-100%)
  const getBarColor = () => {
    if (fillPercent >= 80) return 'bg-white';
    if (fillPercent >= 50) return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  return (
    <div className={cn('h-1.5 bg-slate-800 rounded-full overflow-hidden', className)}>
      <div
        data-testid="attack-bar-fill"
        className={cn('h-full rounded-full transition-colors duration-100', getBarColor())}
        style={{ width: `${fillPercent}%` }}
      />
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/game/__tests__/AttackBar.test.tsx
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/game/AttackBar.tsx src/components/game/__tests__/AttackBar.test.tsx
git commit -m "feat(ui): AttackBar component with blue→yellow→white color transition"
```

---

## Task 3: CombatHeader Component

**Files:**
- Create: `src/components/game/CombatHeader.tsx`

The top bar of the combat screen: floor/room indicator on the left, speed controls + pause on the right.

**Step 1: Implement**

```tsx
// src/components/game/CombatHeader.tsx
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export function CombatHeader() {
  const floor = useGameStore(s => s.floor);
  const room = useGameStore(s => s.room);
  const roomsPerFloor = useGameStore(s => s.roomsPerFloor);
  const speedMultiplier = useGameStore(s => s.speedMultiplier);
  const paused = useGameStore(s => s.paused);
  const cycleSpeed = useGameStore(s => s.cycleSpeed);
  const togglePause = useGameStore(s => s.togglePause);

  return (
    <div className="flex items-center justify-between px-3 py-2">
      {/* Floor/room info */}
      <div className="pixel-text text-pixel-xs text-muted-foreground">
        Floor {floor} — Room {room}/{roomsPerFloor}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={cycleSpeed}
          className="pixel-text text-pixel-xs min-w-[48px] min-h-[44px]"
          data-testid="speed-toggle"
        >
          {speedMultiplier}x
        </Button>

        {/* Pause */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePause}
          className="pixel-text text-pixel-xs min-w-[48px] min-h-[44px]"
          data-testid="pause-toggle"
        >
          {paused ? 'Play' : 'Pause'}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/CombatHeader.tsx
git commit -m "feat(ui): CombatHeader with floor/room info and speed/pause controls"
```

---

## Task 4: StatusBadges Component

**Files:**
- Create: `src/components/game/StatusBadges.tsx`

Small badges showing enemy modifiers and active status effects. Displayed near the enemy name.

**Step 1: Implement**

```tsx
// src/components/game/StatusBadges.tsx
import type { EnemyModifier, StatusEffect } from '@/types/game';
import { cn } from '@/lib/utils';

const MODIFIER_COLORS: Record<EnemyModifier, string> = {
  swift: 'bg-yellow-600 text-yellow-100',
  armored: 'bg-blue-700 text-blue-100',
  berserker: 'bg-red-700 text-red-100',
  regenerating: 'bg-green-700 text-green-100',
  venomous: 'bg-purple-700 text-purple-100',
  shielded: 'bg-cyan-700 text-cyan-100',
};

const STATUS_COLORS: Record<string, string> = {
  poison: 'bg-green-600 text-green-100',
  stun: 'bg-yellow-600 text-yellow-100',
  curse: 'bg-purple-600 text-purple-100',
  shield: 'bg-cyan-600 text-cyan-100',
  regen: 'bg-emerald-600 text-emerald-100',
};

export function ModifierBadges({ modifiers }: { modifiers: EnemyModifier[] }) {
  if (modifiers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {modifiers.map(mod => (
        <span
          key={mod}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase', MODIFIER_COLORS[mod])}
        >
          {mod}
        </span>
      ))}
    </div>
  );
}

export function StatusEffectBadges({ effects }: { effects: StatusEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {effects.map((effect, i) => (
        <span
          key={`${effect.type}-${i}`}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase', STATUS_COLORS[effect.type])}
        >
          {effect.type}{effect.stacks > 1 ? ` x${effect.stacks}` : ''}
        </span>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/StatusBadges.tsx
git commit -m "feat(ui): StatusBadges and ModifierBadges for combat display"
```

---

## Task 5: ItemSlots Component

**Files:**
- Create: `src/components/game/ItemSlots.tsx`

Compact display of equipped items. Shows slot letter + item name. Tappable for tooltip on mobile (future enhancement — just display for now).

**Step 1: Implement**

```tsx
// src/components/game/ItemSlots.tsx
import { useGameStore } from '@/store/gameStore';
import { ITEM_DEFINITIONS } from '@/data/items';
import type { ItemSlot } from '@/types/game';

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'W',
  armor: 'A',
  accessory: 'C',
};

const SLOT_COLORS: Record<ItemSlot, string> = {
  weapon: 'text-red-400 border-red-400/30',
  armor: 'text-blue-400 border-blue-400/30',
  accessory: 'text-amber-400 border-amber-400/30',
};

export function ItemSlots() {
  const equippedItems = useGameStore(s => s.equippedItems);

  return (
    <div className="flex gap-2">
      {(['weapon', 'armor', 'accessory'] as ItemSlot[]).map(slot => {
        const item = equippedItems[slot];
        const def = item ? ITEM_DEFINITIONS[item.id] : null;

        return (
          <div
            key={slot}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border ${SLOT_COLORS[slot]} ${item ? 'bg-slate-800/50' : 'bg-slate-900/30 opacity-40'}`}
          >
            <span className="pixel-text text-pixel-xs font-bold">{SLOT_LABELS[slot]}</span>
            {def ? (
              <span className="pixel-text text-pixel-xs text-foreground truncate max-w-[80px]">
                {def.name}{item!.tier > 1 ? ` T${item!.tier}` : ''}
              </span>
            ) : (
              <span className="pixel-text text-pixel-xs text-muted-foreground">Empty</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/ItemSlots.tsx
git commit -m "feat(ui): ItemSlots component showing equipped items in combat"
```

---

## Task 6: CombatScreen (Main Composition)

**Files:**
- Modify: `src/components/screens/CombatScreen.tsx` (replace stub)
- Test: `src/components/screens/__tests__/CombatScreen.test.tsx`

This is the main composition that brings together all sub-components.

**Step 1: Write the failing test**

```tsx
// src/components/screens/__tests__/CombatScreen.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CombatScreen } from '../CombatScreen';
import { useGameStore } from '@/store/gameStore';
import { generateEnemy } from '@/data/enemies';

function setupCombatState() {
  const enemy = generateEnemy(1);
  useGameStore.setState({
    phase: 'combat',
    floor: 1,
    room: 1,
    roomsPerFloor: 2,
    classId: 'warrior',
    player: {
      power: 10, fortitude: 8, speed: 10, luck: 5,
      basePower: 10, baseSpeed: 10,
      hp: 140, maxHp: 140, attackTimer: 2500,
      statusEffects: [],
    },
    enemy: enemy.entity,
    enemyDefinition: { tier: enemy.tier, modifiers: enemy.modifiers },
    speedMultiplier: 1,
    paused: false,
    combatEvents: [],
  });
}

describe('CombatScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    setupCombatState();
  });

  it('renders floor and room info', () => {
    render(<CombatScreen />);
    expect(screen.getByText(/Floor 1/)).toBeDefined();
    expect(screen.getByText(/Room 1/)).toBeDefined();
  });

  it('renders speed toggle', () => {
    render(<CombatScreen />);
    expect(screen.getByTestId('speed-toggle')).toBeDefined();
  });

  it('renders pause button', () => {
    render(<CombatScreen />);
    expect(screen.getByTestId('pause-toggle')).toBeDefined();
  });

  it('cycles speed on speed button click', () => {
    render(<CombatScreen />);
    fireEvent.click(screen.getByTestId('speed-toggle'));
    expect(useGameStore.getState().speedMultiplier).toBe(2);
  });

  it('toggles pause on pause button click', () => {
    render(<CombatScreen />);
    fireEvent.click(screen.getByTestId('pause-toggle'));
    expect(useGameStore.getState().paused).toBe(true);
  });

  it('renders player and enemy health bars', () => {
    render(<CombatScreen />);
    // HealthBar renders labels
    expect(screen.getByText('HP')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/screens/__tests__/CombatScreen.test.tsx
```

**Step 3: Implement CombatScreen**

```tsx
// src/components/screens/CombatScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CombatHeader } from '@/components/game/CombatHeader';
import { HealthBar } from '@/components/game/HealthBar';
import { AttackBar } from '@/components/game/AttackBar';
import { AnimatedPixelSprite } from '@/components/game/PixelSprite';
import { DamageNumber } from '@/components/game/battle-effects/FloatingNumbers';
import { ModifierBadges, StatusEffectBadges } from '@/components/game/StatusBadges';
import { ItemSlots } from '@/components/game/ItemSlots';
import { getAttackInterval } from '@/math/stats';
import { getEnemySpriteType } from '@/utils/spriteMapping';
import type { CombatEvent } from '@/types/game';

// Track which events we've already spawned floating numbers for
let lastProcessedTick = 0;

interface FloatingNum {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  isHeal: boolean;
  isMiss: boolean;
}

let floatingNumId = 0;

export function CombatScreen() {
  // Subscribe to renderVersion for per-frame updates
  useGameStore(s => s.renderVersion);

  const player = useGameStore(s => s.player);
  const enemy = useGameStore(s => s.enemy);
  const enemyDef = useGameStore(s => s.enemyDefinition);
  const classId = useGameStore(s => s.classId);
  const floor = useGameStore(s => s.floor);
  const room = useGameStore(s => s.room);
  const combatEvents = useGameStore(s => s.combatEvents);

  // Floating damage numbers (React-local state)
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNum[]>([]);

  // Process new combat events into floating numbers
  useEffect(() => {
    if (combatEvents.length === 0) return;

    const newEvents = combatEvents.filter(e => e.tick > lastProcessedTick);
    if (newEvents.length === 0) return;

    lastProcessedTick = Math.max(...newEvents.map(e => e.tick));

    const newNumbers: FloatingNum[] = newEvents
      .filter(e => e.value !== undefined && e.type !== 'death')
      .map(event => ({
        id: ++floatingNumId,
        value: event.value!,
        x: event.target === 'enemy' ? 70 : 30,
        y: 30 + Math.random() * 20,
        isCrit: event.type === 'crit',
        isHeal: event.type === 'heal',
        isMiss: event.type === 'dodge',
      }));

    if (newNumbers.length > 0) {
      setFloatingNumbers(prev => [...prev, ...newNumbers]);
    }
  }, [combatEvents]);

  const removeFloatingNumber = useCallback((id: number) => {
    setFloatingNumbers(prev => prev.filter(n => n.id !== id));
  }, []);

  if (!enemy || !enemyDef) return null;

  const playerInterval = getAttackInterval(player.speed);
  const enemyInterval = getAttackInterval(enemy.speed);
  const enemySprite = getEnemySpriteType(enemyDef.tier, floor, room);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <CombatHeader />

      {/* Battle arena */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4">
        {/* Sprites area */}
        <div className="relative w-full max-w-2xl h-64 sm:h-80 flex items-end justify-between px-8 sm:px-16">
          {/* Player side */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedPixelSprite
              type={classId as 'warrior' | 'rogue' | 'mage'}
              state="idle"
              direction="right"
              scale={4}
            />
            <AttackBar
              attackTimer={player.attackTimer}
              attackInterval={playerInterval}
              className="w-20"
            />
          </div>

          {/* Enemy side */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedPixelSprite
              type={enemySprite}
              state="idle"
              direction="left"
              scale={4}
            />
            <AttackBar
              attackTimer={enemy.attackTimer}
              attackInterval={enemyInterval}
              className="w-20"
            />
          </div>

          {/* Floating damage numbers overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {floatingNumbers.map(num => (
              <DamageNumber
                key={num.id}
                value={num.value}
                x={num.x}
                y={num.y}
                isCrit={num.isCrit}
                isHeal={num.isHeal}
                isMiss={num.isMiss}
                onComplete={() => removeFloatingNumber(num.id)}
              />
            ))}
          </div>
        </div>

        {/* Stats panel */}
        <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mt-4">
          {/* Player stats */}
          <div className="space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground">{classId}</div>
            <HealthBar current={player.hp} max={player.maxHp} label="HP" />
            <StatusEffectBadges effects={player.statusEffects} />
          </div>

          {/* Enemy stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="pixel-text text-pixel-xs text-muted-foreground capitalize">
                {enemyDef.tier}
              </span>
              <ModifierBadges modifiers={enemyDef.modifiers} />
            </div>
            <HealthBar current={enemy.hp} max={enemy.maxHp} label="HP" />
            <StatusEffectBadges effects={enemy.statusEffects} />
          </div>
        </div>

        {/* Item slots */}
        <div className="w-full max-w-2xl mt-4">
          <ItemSlots />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/components/screens/__tests__/CombatScreen.test.tsx
```

Expected: ALL PASS

**Step 5: Verify in browser**

```bash
npm run dev
```

Main Menu → Start Game → Select Warrior → Begin Descent → should see combat screen with:
- Floor/room info in header
- Speed (1x) and Pause buttons
- Two sprites (player and enemy)
- Attack bars filling
- Health bars
- Damage numbers floating

**Step 6: Commit**

```bash
git add src/components/screens/CombatScreen.tsx src/components/screens/__tests__/CombatScreen.test.tsx
git commit -m "feat(ui): CombatScreen with sprites, health bars, attack bars, damage numbers"
```

---

## Task 7: Polish and Edge Cases

**Files:**
- Modify: `src/components/screens/CombatScreen.tsx`

**Step 1: Reset lastProcessedTick when entering combat**

The `lastProcessedTick` counter persists across fights. Add a reset when the component mounts:

```tsx
// At the top of CombatScreen component:
useEffect(() => {
  lastProcessedTick = 0;
  floatingNumId = 0;
  setFloatingNumbers([]);
}, [floor, room]); // Reset when fight changes
```

**Step 2: Handle enemy death animation**

When `enemy.hp <= 0`, the combat tick calls `handleEnemyDeath` which transitions phases. But visually, we want a brief flash/fade before the transition. For now, the phase change handles this — the screen will switch to draft/floor-complete/shop. Future polish can add death animation delay.

**Step 3: Verify the full combat loop works**

```bash
npm run dev
```

Play through a couple rooms:
- Verify damage numbers appear when attacks land
- Verify attack bars fill and reset
- Verify health bars decrease
- Verify speed toggle works (1x → 2x → 4x → 1x)
- Verify pause stops combat
- Verify enemy death transitions to next room or draft screen

**Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/components/screens/CombatScreen.tsx
git commit -m "fix(ui): reset combat floating numbers on fight change"
```
