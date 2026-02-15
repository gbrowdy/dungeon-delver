# Plan 2: Combat Visual Juice

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make combat visually engaging — sprite reactions, screen shake, enrage timer bar, status stack counts, and proc item counters.

**Architecture:** All changes are UI-layer additions. Combat logic is untouched. New CSS animation classes in `index.css`, new sub-components, and wiring combat events to visual states. No new packages needed.

**Tech Stack:** React 18, CSS animations/transitions, Tailwind CSS, existing `useReducedMotion` hook

**Prerequisite:** Plan 1 (Bug Fixes) should be completed first — especially Task 1 (HP guards) which changes combat event flow.

---

### Task 1: Sprite Animation State Machine

**Files:**
- Create: `src/hooks/useSpriteAnimation.ts`
- Modify: `src/components/screens/CombatScreen.tsx`
- Modify: `src/index.css` (add animation keyframes)

**Context:** Currently sprites are always in "idle" state. We need a state machine driven by combat events: `idle | attacking | hit | critting | dodging | dying`. Each state applies a CSS class, returns to `idle` on completion.

**Step 1: Add CSS animation keyframes to index.css**

Add to `src/index.css` (at the end, in `@layer utilities` or after existing animation classes):

```css
/* Combat sprite animations */
@keyframes sprite-attack-right {
  0% { transform: translateX(0); }
  40% { transform: translateX(30px); }
  100% { transform: translateX(0); }
}

@keyframes sprite-attack-left {
  0% { transform: translateX(0); }
  40% { transform: translateX(-30px); }
  100% { transform: translateX(0); }
}

@keyframes sprite-hit {
  0% { transform: translateX(0); filter: brightness(1); }
  30% { transform: translateX(-8px); filter: brightness(2); }
  100% { transform: translateX(0); filter: brightness(1); }
}

@keyframes sprite-hit-left {
  0% { transform: translateX(0); filter: brightness(1); }
  30% { transform: translateX(8px); filter: brightness(2); }
  100% { transform: translateX(0); filter: brightness(1); }
}

@keyframes sprite-crit-hit {
  0% { transform: translateX(0) scale(1); filter: brightness(1); }
  20% { transform: translateX(-15px) scale(1.1); filter: brightness(2.5); }
  100% { transform: translateX(0) scale(1); filter: brightness(1); }
}

@keyframes sprite-crit-hit-left {
  0% { transform: translateX(0) scale(1); filter: brightness(1); }
  20% { transform: translateX(15px) scale(1.1); filter: brightness(2.5); }
  100% { transform: translateX(0) scale(1); filter: brightness(1); }
}

@keyframes sprite-dodge {
  0% { transform: translateX(0); }
  30% { transform: translateX(15px); opacity: 0.6; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes sprite-dodge-left {
  0% { transform: translateX(0); }
  30% { transform: translateX(-15px); opacity: 0.6; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes sprite-die {
  0% { transform: translateY(0); opacity: 1; filter: hue-rotate(0deg); }
  50% { transform: translateY(10px); opacity: 0.6; filter: hue-rotate(-30deg) saturate(2) brightness(0.7); }
  100% { transform: translateY(20px); opacity: 0; filter: hue-rotate(-30deg) saturate(2) brightness(0.5); }
}

.animate-sprite-attack-right { animation: sprite-attack-right 200ms ease-out forwards; }
.animate-sprite-attack-left { animation: sprite-attack-left 200ms ease-out forwards; }
.animate-sprite-hit { animation: sprite-hit 150ms ease-out forwards; }
.animate-sprite-hit-left { animation: sprite-hit-left 150ms ease-out forwards; }
.animate-sprite-crit-hit { animation: sprite-crit-hit 200ms ease-out forwards; }
.animate-sprite-crit-hit-left { animation: sprite-crit-hit-left 200ms ease-out forwards; }
.animate-sprite-dodge { animation: sprite-dodge 200ms ease-out forwards; }
.animate-sprite-dodge-left { animation: sprite-dodge-left 200ms ease-out forwards; }
.animate-sprite-die { animation: sprite-die 400ms ease-out forwards; }

/* Reduced motion: disable all sprite combat animations */
@media (prefers-reduced-motion: reduce) {
  .animate-sprite-attack-right,
  .animate-sprite-attack-left,
  .animate-sprite-hit,
  .animate-sprite-hit-left,
  .animate-sprite-crit-hit,
  .animate-sprite-crit-hit-left,
  .animate-sprite-dodge,
  .animate-sprite-dodge-left,
  .animate-sprite-die {
    animation: none;
  }
}
```

**Step 2: Create useSpriteAnimation hook**

Create `src/hooks/useSpriteAnimation.ts`:

```typescript
import { useRef, useCallback } from 'react';
import type { CombatEvent } from '@/types/game';

export type SpriteAnimState = 'idle' | 'attacking' | 'hit' | 'critting' | 'dodging' | 'dying';

interface SpriteAnimations {
  playerClass: string;
  enemyClass: string;
  triggerPlayerAnim: (state: SpriteAnimState) => void;
  triggerEnemyAnim: (state: SpriteAnimState) => void;
  processEvents: (events: CombatEvent[], lastProcessedTick: number) => void;
}

export function useSpriteAnimation(): SpriteAnimations {
  const playerClassRef = useRef('');
  const enemyClassRef = useRef('');
  const playerTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const enemyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Animation durations in ms (match CSS)
  const DURATIONS: Record<SpriteAnimState, number> = {
    idle: 0,
    attacking: 200,
    hit: 150,
    critting: 200,
    dodging: 200,
    dying: 400,
  };

  const triggerPlayerAnim = useCallback((state: SpriteAnimState) => {
    clearTimeout(playerTimerRef.current);
    const classMap: Record<SpriteAnimState, string> = {
      idle: '',
      attacking: 'animate-sprite-attack-right',
      hit: 'animate-sprite-hit',
      critting: 'animate-sprite-crit-hit',
      dodging: 'animate-sprite-dodge',
      dying: 'animate-sprite-die',
    };
    playerClassRef.current = classMap[state];
    if (state !== 'idle' && state !== 'dying') {
      playerTimerRef.current = setTimeout(() => {
        playerClassRef.current = '';
      }, DURATIONS[state]);
    }
  }, []);

  const triggerEnemyAnim = useCallback((state: SpriteAnimState) => {
    clearTimeout(enemyTimerRef.current);
    const classMap: Record<SpriteAnimState, string> = {
      idle: '',
      attacking: 'animate-sprite-attack-left',
      hit: 'animate-sprite-hit-left',
      critting: 'animate-sprite-crit-hit-left',
      dodging: 'animate-sprite-dodge-left',
      dying: 'animate-sprite-die',
    };
    enemyClassRef.current = classMap[state];
    if (state !== 'idle' && state !== 'dying') {
      enemyTimerRef.current = setTimeout(() => {
        enemyClassRef.current = '';
      }, DURATIONS[state]);
    }
  }, []);

  const processEvents = useCallback((events: CombatEvent[], lastTick: number) => {
    const newEvents = events.filter(e => e.tick > lastTick);
    for (const event of newEvents) {
      if (event.type === 'damage' || event.type === 'dot' || event.type === 'reflect') {
        if (event.target === 'enemy') {
          triggerEnemyAnim('hit');
          triggerPlayerAnim('attacking');
        } else {
          triggerPlayerAnim('hit');
          triggerEnemyAnim('attacking');
        }
      } else if (event.type === 'crit') {
        if (event.target === 'enemy') {
          triggerEnemyAnim('critting');
          triggerPlayerAnim('attacking');
        } else {
          triggerPlayerAnim('critting');
          triggerEnemyAnim('attacking');
        }
      } else if (event.type === 'dodge') {
        if (event.target === 'player') {
          triggerPlayerAnim('dodging');
          triggerEnemyAnim('attacking');
        }
      } else if (event.type === 'death') {
        if (event.target === 'enemy') triggerEnemyAnim('dying');
        else triggerPlayerAnim('dying');
      }
    }
  }, [triggerPlayerAnim, triggerEnemyAnim]);

  return {
    playerClass: playerClassRef.current,
    enemyClass: enemyClassRef.current,
    triggerPlayerAnim,
    triggerEnemyAnim,
    processEvents,
  };
}
```

**Step 3: Wire into CombatScreen**

In `CombatScreen.tsx`, import the hook and apply animation classes to sprite containers. The refs won't trigger re-renders on their own, but the component already re-renders on `renderVersion` every tick. Read the ref values during render:

```typescript
// In the sprite containers, wrap with animation div:
<div className={spriteAnims.playerClass}>
  <AnimatedPixelSprite type={classId} state="idle" direction="right" scale={4} />
</div>
```

Call `spriteAnims.processEvents(combatEvents, lastProcessedTickRef.current)` in the existing event-processing effect.

**Step 4: Build and visual test**

Run: `npm run build && npm run dev`
Verify: sprites lunge/recoil/flash during combat in the browser.

**Step 5: Commit**

```bash
git add src/hooks/useSpriteAnimation.ts src/components/screens/CombatScreen.tsx src/index.css
git commit -m "feat(ui): add sprite combat animations (lunge, hit, crit, dodge, death)"
```

---

### Task 2: Screen Shake

**Files:**
- Modify: `src/components/screens/CombatScreen.tsx`
- Modify: `src/index.css`

**Step 1: Add screen-shake keyframe to index.css**

```css
@keyframes screen-shake {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-3px, 2px); }
  40% { transform: translate(2px, -3px); }
  60% { transform: translate(-2px, 1px); }
  80% { transform: translate(3px, -1px); }
  100% { transform: translate(0, 0); }
}

.animate-screen-shake {
  animation: screen-shake 150ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-screen-shake {
    animation: none;
  }
}
```

**Step 2: Add shake state to CombatScreen**

```typescript
const [shaking, setShaking] = useState(false);
```

In the event processing effect, when a `crit` event is detected:
```typescript
if (event.type === 'crit') {
  setShaking(true);
  setTimeout(() => setShaking(false), 150);
}
```

Apply to the arena container:
```tsx
<div className={cn('relative w-full max-w-2xl h-64 sm:h-80 ...', shaking && 'animate-screen-shake')}>
```

**Step 3: Wire up useReducedMotion (finally using it!)**

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion';

const reducedMotion = useReducedMotion();
// Skip shake when reduced motion preferred
if (event.type === 'crit' && !reducedMotion) {
  setShaking(true);
  setTimeout(() => setShaking(false), 150);
}
```

**Step 4: Build and test visually**

Run: `npm run dev`

**Step 5: Commit**

```bash
git add src/components/screens/CombatScreen.tsx src/index.css
git commit -m "feat(ui): add screen shake on critical hits"
```

---

### Task 3: Enrage Timer Bar

**Files:**
- Create: `src/components/game/EnrageBar.tsx`
- Modify: `src/components/screens/CombatScreen.tsx`

**Context:** Reads `state.combatElapsed` (already exists). Needs `ENRAGE_THRESHOLD_MS` from balance.ts. Color stages: green (0-30s) → yellow (30-40s) → orange (40-45s) → pulsing red (45s+).

**Step 1: Create EnrageBar component**

Create `src/components/game/EnrageBar.tsx`:

```typescript
import { cn } from '@/lib/utils';
import { ENRAGE_THRESHOLD_MS } from '@/math/balance';

interface EnrageBarProps {
  combatElapsed: number;
  className?: string;
}

export function EnrageBar({ combatElapsed, className }: EnrageBarProps) {
  const progress = Math.min(1, combatElapsed / ENRAGE_THRESHOLD_MS);
  const isEnraged = combatElapsed >= ENRAGE_THRESHOLD_MS;

  const getBarColor = () => {
    if (isEnraged) return 'bg-red-500 animate-pulse';
    if (combatElapsed >= 40000) return 'bg-orange-500';
    if (combatElapsed >= 30000) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Don't show until 10s into combat (avoids clutter on quick fights)
  if (combatElapsed < 10000) return null;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-2">
        <div className="pixel-progress-bar flex-1 h-1.5 rounded-sm overflow-hidden">
          <div
            className={cn('h-full transition-colors duration-300', getBarColor())}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {isEnraged && (
          <span className="pixel-text text-pixel-2xs text-red-400 uppercase animate-pulse">
            Enraged
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add to CombatScreen**

In `CombatScreen.tsx`, import and render between the sprites area and stats panel:

```typescript
import { EnrageBar } from '@/components/game/EnrageBar';

// Read combatElapsed
const combatElapsed = useGameStore(s => s.combatElapsed);

// In JSX, after the sprites area div:
<EnrageBar combatElapsed={combatElapsed} className="max-w-2xl mt-2" />
```

**Step 3: Write a simple render test**

Create `src/components/game/__tests__/EnrageBar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { EnrageBar } from '../EnrageBar';

describe('EnrageBar', () => {
  it('does not render before 10s', () => {
    const { container } = render(<EnrageBar combatElapsed={5000} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders at 15s', () => {
    const { container } = render(<EnrageBar combatElapsed={15000} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows "Enraged" text when past threshold', () => {
    render(<EnrageBar combatElapsed={50000} />);
    expect(screen.getByText('Enraged')).toBeDefined();
  });
});
```

**Step 4: Run tests + build**

Run: `npx vitest run && npm run build`

**Step 5: Commit**

```bash
git add src/components/game/EnrageBar.tsx src/components/game/__tests__/EnrageBar.test.tsx src/components/screens/CombatScreen.tsx
git commit -m "feat(ui): add enrage timer bar with color stages"
```

---

### Task 4: Status Effect Stack Counts

**Files:**
- Modify: `src/components/game/StatusBadges.tsx`

**Context:** StatusEffectBadges already shows the effect type. It already shows stacks when > 1 (line 46: `{effect.stacks > 1 ? ` x${effect.stacks}` : ''}`). But for shield, `stacks` is the shield HP pool — it should display differently. And the display always shows even for 1 stack.

**Step 1: Improve StatusEffectBadges**

Modify the existing component to always show stack count and format shield differently:

```typescript
export function StatusEffectBadges({ effects }: { effects: StatusEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {effects.map((effect, i) => (
        <span
          key={`${effect.type}-${i}`}
          className={cn('px-1.5 py-0.5 rounded text-pixel-2xs font-bold uppercase', STATUS_COLORS[effect.type])}
        >
          {effect.type}
          {effect.type === 'shield' ? ` ${effect.stacks}` : effect.stacks > 1 ? ` x${effect.stacks}` : ''}
        </span>
      ))}
    </div>
  );
}
```

Also fix `ModifierBadges` to use `text-pixel-2xs`:

```typescript
className={cn('px-1.5 py-0.5 rounded text-pixel-2xs font-bold uppercase', MODIFIER_COLORS[mod])}
```

**Step 2: Run tests**

Run: `npx vitest run`

**Step 3: Commit**

```bash
git add src/components/game/StatusBadges.tsx
git commit -m "feat(ui): show status effect stack counts and shield HP"
```

---

### Task 5: Proc Item Counters

**Files:**
- Create: `src/components/game/ProcCounters.tsx`
- Modify: `src/components/screens/CombatScreen.tsx`

**Context:** Small counters near the player side. Shocking Edge: "2/4" (hits until stun). Flurry Ring: "3/5" (hits until bonus). Read from existing `state.combatCounters.playerAttackCount`.

**Step 1: Create ProcCounters component**

Create `src/components/game/ProcCounters.tsx`:

```typescript
import type { EquippedItems, CombatCounters } from '@/types/game';

interface ProcCountersProps {
  equippedItems: EquippedItems;
  counters: CombatCounters;
}

export function ProcCounters({ equippedItems, counters }: ProcCountersProps) {
  const hasShockingEdge = equippedItems.weapon?.id === 'shocking_edge';
  const hasFlurryRing = equippedItems.accessory?.id === 'flurry_ring';

  if (!hasShockingEdge && !hasFlurryRing) return null;

  return (
    <div className="flex gap-2">
      {hasShockingEdge && (
        <span className="pixel-text text-pixel-2xs text-yellow-400" title="Hits until stun">
          {counters.playerAttackCount % 4}/{4}
        </span>
      )}
      {hasFlurryRing && (
        <span className="pixel-text text-pixel-2xs text-blue-400" title="Hits until bonus">
          {counters.playerAttackCount % 5}/{5}
        </span>
      )}
    </div>
  );
}
```

**Step 2: Wire into CombatScreen**

```typescript
import { ProcCounters } from '@/components/game/ProcCounters';

const equippedItems = useGameStore(s => s.equippedItems);
const combatCounters = useGameStore(s => s.combatCounters);

// Render near the player's attack bar:
<ProcCounters equippedItems={equippedItems} counters={combatCounters} />
```

**Step 3: Write test**

Create `src/components/game/__tests__/ProcCounters.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { ProcCounters } from '../ProcCounters';

describe('ProcCounters', () => {
  const baseCounts = { playerAttackCount: 0, playerHitCount: 0, shieldRefreshTimer: 0, curseDecayTimer: 0 };

  it('renders nothing when no proc items equipped', () => {
    const { container } = render(
      <ProcCounters equippedItems={{ weapon: null, armor: null, accessory: null }} counters={baseCounts} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Shocking Edge counter', () => {
    const items = { weapon: { id: 'shocking_edge' as const, slot: 'weapon' as const, tier: 1 }, armor: null, accessory: null };
    render(<ProcCounters equippedItems={items} counters={{ ...baseCounts, playerAttackCount: 2 }} />);
    expect(screen.getByText('2/4')).toBeDefined();
  });

  it('shows Flurry Ring counter', () => {
    const items = { weapon: null, armor: null, accessory: { id: 'flurry_ring' as const, slot: 'accessory' as const, tier: 1 } };
    render(<ProcCounters equippedItems={items} counters={{ ...baseCounts, playerAttackCount: 3 }} />);
    expect(screen.getByText('3/5')).toBeDefined();
  });
});
```

**Step 4: Run tests + build**

Run: `npx vitest run && npm run build`

**Step 5: Commit**

```bash
git add src/components/game/ProcCounters.tsx src/components/game/__tests__/ProcCounters.test.tsx src/components/screens/CombatScreen.tsx
git commit -m "feat(ui): add proc item counters (Shocking Edge, Flurry Ring)"
```

---

## Summary

| Task | Feature | New Files |
|------|---------|-----------|
| 1 | Sprite lunge/hit/crit/dodge/death animations | `useSpriteAnimation.ts`, CSS keyframes |
| 2 | Screen shake on crits | CSS keyframe, wire `useReducedMotion` |
| 3 | Enrage timer bar (green→yellow→orange→red) | `EnrageBar.tsx` |
| 4 | Status effect stack counts | StatusBadges.tsx update |
| 5 | Proc item counters (2/4, 3/5) | `ProcCounters.tsx` |

After all 5 tasks: `npx vitest run && npm run build && npm run dev` — visually verify in browser.
