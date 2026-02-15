# Plan 3: UI Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish all non-combat UI: phase transitions, pixel-style bars, combat info fixes, shop enforcement, FloorComplete countdown, speed/pause indicators, and MainMenu style cleanup.

**Architecture:** All changes are to existing component files. One new CSS class set for phase transitions. No new packages.

**Tech Stack:** React 18, Tailwind CSS, CSS transitions

**Prerequisite:** Plan 1 (Bug Fixes) should be completed first. Plan 2 (Combat Juice) is independent — can run in parallel.

---

### Task 1: Phase Transitions

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Context:** Currently `PhaseRouter` does a hard cut between screens. We add a fade-in animation on phase change. The `animate-fade-in` concept exists in the CSS but we need to ensure it's properly defined and applied.

**Step 1: Add fade-in keyframe to index.css (if not already present)**

```css
@keyframes phase-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-phase-enter {
  animation: phase-fade-in 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-phase-enter {
    animation: none;
  }
}
```

**Step 2: Apply animation in App.tsx using key-based remounting**

The `PhaseRouter` already unmounts/remounts on phase change. We just need to wrap its output so React triggers the animation on mount:

```typescript
function App() {
  const phase = useGameStore(s => s.phase);
  const mainRef = useRef<HTMLDivElement>(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  useGameLoop();

  useEffect(() => {
    const timer = setTimeout(() => mainRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div ref={mainRef} tabIndex={-1} className="outline-none">
      <div key={phase} className="animate-phase-enter">
        <PhaseRouter phase={phase} />
      </div>
      {/* ... character sheet toggle and overlay */}
    </div>
  );
}
```

The `key={phase}` forces React to remount the wrapper div when phase changes, triggering the CSS animation.

**Step 3: Build and visually verify**

Run: `npm run dev`
Verify: switching between phases shows a subtle fade-in.

**Step 4: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat(ui): add fade-in phase transitions"
```

---

### Task 2: Pixel-Style Bars

**Files:**
- Modify: `src/components/game/HealthBar.tsx`
- Modify: `src/components/game/AttackBar.tsx`

**Context:** Both bars use `rounded-full` which creates smooth pill shapes. The `pixel-progress-bar` and `pixel-progress-fill` CSS classes exist in `index.css:948-958` with proper pixel borders but are unused. Switch to them.

**Step 1: Update HealthBar**

In `HealthBar.tsx`, replace the bar container and fill:

```typescript
  return (
    <div data-testid={testId} className={cn('space-y-1', className)}>
      <div className="flex justify-between pixel-text text-pixel-sm">
        <span className="text-muted-foreground">{label}</span>
        {showValues && (
          <span className="font-mono text-foreground">{Math.floor(current)}/{max}</span>
        )}
      </div>
      <div className={cn('pixel-progress-bar rounded-sm overflow-hidden', bgColors[variant])}>
        <div
          className={cn('pixel-progress-fill transition-all duration-300', barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
```

**Step 2: Update AttackBar**

In `AttackBar.tsx`:

```typescript
  return (
    <div className={cn('pixel-progress-bar h-1.5 rounded-sm overflow-hidden', className)}>
      <div
        data-testid="attack-bar-fill"
        className={cn('pixel-progress-fill transition-colors duration-100', getBarColor())}
        style={{ width: `${fillPercent}%` }}
      />
    </div>
  );
```

**Step 3: Run build + existing tests**

Run: `npx vitest run && npm run build`

**Step 4: Commit**

```bash
git add src/components/game/HealthBar.tsx src/components/game/AttackBar.tsx
git commit -m "style(ui): use pixel-style bars instead of rounded for health/attack"
```

---

### Task 3: Combat Screen Info Fixes

**Files:**
- Modify: `src/components/screens/CombatScreen.tsx:146, 153-157`
- Modify: `src/data/enemies.ts` (need to check if enemy names exist)

**Context:** Player class shows raw lowercase ID. Enemy shows only tier. Fix both.

**Step 1: Fix player class display**

In `CombatScreen.tsx`, import CLASSES and replace line 146:

```typescript
import { CLASSES } from '@/data/classes';

// Replace:
// <div className="pixel-text text-pixel-xs text-muted-foreground">{classId}</div>
// With:
<div className="pixel-text text-pixel-xs text-muted-foreground">
  {CLASSES[classId]?.name ?? classId}
</div>
```

**Step 2: Add enemy name display**

The enemy generation system may not have names. Check `src/data/enemies.ts` — if no name field exists, we generate one from tier + modifiers. Update the enemy info section:

```typescript
// Replace:
// <span className="pixel-text text-pixel-xs text-muted-foreground capitalize">{enemyDef.tier}</span>
// With:
<span className="pixel-text text-pixel-xs text-muted-foreground capitalize">
  {enemyDef.tier} Enemy
</span>
```

**Step 3: Run tests**

Run: `npx vitest run`

**Step 4: Commit**

```bash
git add src/components/screens/CombatScreen.tsx
git commit -m "fix(ui): show proper class name and enemy label in combat"
```

---

### Task 4: Draft Screen Floor Context

**Files:**
- Modify: `src/components/screens/DraftScreen.tsx`

**Context:** Draft screen shows no orientation — add floor/room context.

**Step 1: Add floor/room to draft header**

```typescript
export function DraftScreen() {
  const player = useGameStore(s => s.player);
  const floor = useGameStore(s => s.floor);
  const draftChoices = useGameStore(s => s.draftChoices);
  const selectedChoices = useGameStore(s => s.selectedChoices);
  const selectDraftCard = useGameStore(s => s.selectDraftCard);
  const confirmDraft = useGameStore(s => s.confirmDraft);

  return (
    <div data-testid="draft-screen" className="...">
      <div className="w-full max-w-xl space-y-6">
        {/* Floor context */}
        <div className="pixel-text text-pixel-xs text-center text-muted-foreground">
          Floor {floor}
        </div>

        {/* Current stats bar */}
        {/* ... existing code ... */}
```

**Step 2: Run tests**

Run: `npx vitest run`

**Step 3: Commit**

```bash
git add src/components/screens/DraftScreen.tsx
git commit -m "feat(ui): add floor context to draft screen"
```

---

### Task 5: Shop "Choose 2" Enforcement

**Files:**
- Modify: `src/components/screens/ShopScreen.tsx:85-89`

**Context:** Confirm button is enabled with >=1 selections, but header says "Choose 2 Rewards". Disable until exactly 2.

**Step 1: Fix the disabled condition**

Change line 87 from:
```tsx
disabled={selectedChoices.length === 0}
```
to:
```tsx
disabled={selectedChoices.length !== 2}
```

**Step 2: Update the selection count indicator to be clearer**

The existing `{selectedChoices.length}/2 selected` is fine but update the button text:

```tsx
<Button
  onClick={confirmShop}
  disabled={selectedChoices.length !== 2}
  className="pixel-button-main text-pixel-xs px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 uppercase font-bold"
>
  {selectedChoices.length === 2 ? 'Confirm' : `Select ${2 - selectedChoices.length} more`}
</Button>
```

**Step 3: Update test if one exists**

Check `src/components/screens/__tests__/ShopScreen.test.tsx` — update assertions about the confirm button.

**Step 4: Run tests**

Run: `npx vitest run`

**Step 5: Commit**

```bash
git add src/components/screens/ShopScreen.tsx
git commit -m "fix(ui): enforce exactly 2 selections in shop before confirming"
```

---

### Task 6: FloorComplete Countdown Bar

**Files:**
- Modify: `src/components/screens/FloorComplete.tsx`

**Context:** Replace the invisible `text-[8px]` "Auto-continuing in 5s..." text with a visible countdown bar.

**Step 1: Add countdown state and visual bar**

```typescript
export function FloorComplete() {
  const floor = useGameStore(s => s.floor);
  const player = useGameStore(s => s.player);
  const classId = useGameStore(s => s.classId);
  const equippedItems = useGameStore(s => s.equippedItems);
  const advanceFloor = useGameStore(s => s.advanceFloor);
  const classDef = CLASSES[classId];

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const advancedRef = useRef(false);
  const [countdown, setCountdown] = useState(5);

  // Countdown tick
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-advance after 5 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!advancedRef.current) {
        advancedRef.current = true;
        advanceFloor();
      }
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [advanceFloor]);

  const handleContinue = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    clearTimeout(timerRef.current);
    advanceFloor();
  };

  return (
    <div data-testid="floor-complete" className="...">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* ... existing title, stats, equipment ... */}

        {/* Continue button */}
        <Button onClick={handleContinue} size="lg" data-testid="continue-button"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 uppercase font-bold">
          Continue to Floor {floor + 1}
        </Button>

        {/* Countdown bar (replaces invisible text) */}
        <div className="w-full max-w-xs mx-auto">
          <div className="pixel-progress-bar h-1.5 rounded-sm overflow-hidden">
            <div
              className="pixel-progress-fill bg-muted-foreground transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
          <p className="pixel-text text-pixel-2xs text-muted-foreground mt-1">
            Auto-continuing in {countdown}s
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run tests**

Run: `npx vitest run`

**Step 3: Commit**

```bash
git add src/components/screens/FloorComplete.tsx
git commit -m "feat(ui): add visible countdown bar to FloorComplete auto-advance"
```

---

### Task 7: Speed/Pause Visual Indicators

**Files:**
- Modify: `src/components/game/CombatHeader.tsx`
- Modify: `src/components/screens/CombatScreen.tsx`

**Context:** Active speed level should look visually distinct. When paused, dim the combat arena.

**Step 1: Update CombatHeader speed button**

```typescript
<Button
  variant={speedMultiplier === 1 ? 'outline' : 'default'}
  size="sm"
  onClick={cycleSpeed}
  className={cn(
    'pixel-text text-pixel-xs min-w-[48px] min-h-[44px]',
    speedMultiplier > 1 && 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700',
  )}
  data-testid="speed-toggle"
>
  {speedMultiplier}x
</Button>
```

**Step 2: Update CombatHeader pause button**

```typescript
<Button
  variant={paused ? 'default' : 'outline'}
  size="sm"
  onClick={togglePause}
  className={cn(
    'pixel-text text-pixel-xs min-w-[48px] min-h-[44px]',
    paused && 'bg-blue-600 hover:bg-blue-500 text-white border-blue-700',
  )}
  data-testid="pause-toggle"
>
  {paused ? 'Play' : 'Pause'}
</Button>
```

**Step 3: Add arena dimming when paused**

In `CombatScreen.tsx`, read the paused state and apply opacity:

```typescript
const paused = useGameStore(s => s.paused);

// On the battle arena container:
<div className={cn(
  'flex-1 relative flex flex-col items-center justify-center px-4',
  paused && 'opacity-60 transition-opacity duration-200',
)}>
```

**Step 4: Run tests**

Run: `npx vitest run`

**Step 5: Commit**

```bash
git add src/components/game/CombatHeader.tsx src/components/screens/CombatScreen.tsx
git commit -m "feat(ui): add visual indicators for speed and pause state"
```

---

### Task 8: MainMenu Style Cleanup

**Files:**
- Modify: `src/components/screens/MainMenu.tsx` (remove inline `<style>` block)
- Modify: `src/index.css` (ensure all styles exist)

**Context:** MainMenu has a ~210-line `<style>` block embedded in JSX (lines 98-306). Many of these classes already exist in `index.css` or are easily added. Move all to `index.css` and delete the inline block.

**Step 1: Audit which styles are duplicated vs. unique**

Check if these classes already exist in `index.css`: `.pixel-torch`, `.torch-flame`, `.torch-stick`, `.pixel-stars`, `.pixel-star`, `.dungeon-frame`, `.pixel-glow`, `.pixel-title`, `.pixel-text`, `.pixel-class-dot`, `.pixel-button-main`, `@keyframes flicker`, `@keyframes twinkle`.

**Step 2: Add any missing classes to index.css**

Move the following from MainMenu.tsx inline styles to `index.css` (after the existing pixel art section):

```css
/* MainMenu pixel art */
.pixel-torch {
  position: absolute;
  width: 8px;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.torch-flame {
  width: 8px;
  height: 12px;
  background: #ff6b00;
  box-shadow:
    0 -4px 0 0 #ffaa00,
    0 -8px 0 0 #ffdd00,
    4px -4px 0 0 #ff8800,
    -4px -4px 0 0 #ff8800;
  animation: flicker 1.5s infinite;
  image-rendering: pixelated;
}

/* ... (all other classes from the inline block) ... */
```

**Step 3: Delete the entire `<style>` block from MainMenu.tsx (lines 97-306)**

Remove the `<style>{...}</style>` JSX entirely.

**Step 4: Verify visually**

Run: `npm run dev`
Check MainMenu looks identical.

**Step 5: Run tests + build**

Run: `npx vitest run && npm run build`

**Step 6: Commit**

```bash
git add src/components/screens/MainMenu.tsx src/index.css
git commit -m "refactor(ui): move MainMenu inline styles to index.css"
```

---

## Summary

| Task | Feature | Files Modified |
|------|---------|---------------|
| 1 | Phase fade-in transitions | App.tsx, index.css |
| 2 | Pixel-style health/attack bars | HealthBar.tsx, AttackBar.tsx |
| 3 | Enemy/class labels in combat | CombatScreen.tsx |
| 4 | Floor context on draft screen | DraftScreen.tsx |
| 5 | Shop "Choose 2" enforcement | ShopScreen.tsx |
| 6 | FloorComplete countdown bar | FloorComplete.tsx |
| 7 | Speed/Pause visual indicators | CombatHeader.tsx, CombatScreen.tsx |
| 8 | MainMenu style cleanup | MainMenu.tsx, index.css |

After all 8 tasks: `npx vitest run && npm run build && npm run dev` — full visual verification in browser.
