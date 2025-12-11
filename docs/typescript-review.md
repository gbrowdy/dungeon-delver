# TypeScript/JavaScript Code Quality Review
**Roguelike Game Codebase**

**Review Date:** 2025-12-08
**Reviewer:** TypeScript Architecture Review
**Project Path:** `/Users/gilbrowdy/rogue`

---

## Executive Summary

This codebase represents a React-based roguelike game with TypeScript. The overall architecture demonstrates good component organization and React patterns. However, the codebase has **CRITICAL type safety issues** due to intentionally disabled TypeScript strict mode settings, which creates substantial technical debt and runtime risk.

### Overall Assessment

| Category | Rating | Status |
|----------|--------|--------|
| Type Safety | 🔴 CRITICAL | Strict mode disabled, noImplicitAny disabled |
| Error Handling | 🟡 MODERATE | Limited error boundaries, some missing validations |
| Code Organization | 🟢 GOOD | Clean component structure, logical separation |
| Security | 🟡 MODERATE | No major vulnerabilities found, input validation needed |
| Performance | 🟢 GOOD | Proper memoization, no obvious bottlenecks |
| Production Readiness | 🔴 NOT READY | Type safety must be addressed first |

### Key Findings

**CRITICAL ISSUES (3):**
- TypeScript strict mode completely disabled
- No implicit any checking disabled
- No unused variable/parameter checking

**HIGH SEVERITY ISSUES (8):**
- Missing null/undefined checks in combat logic
- Unsafe type assertions and implicit any usage
- Missing error boundaries for component failures
- No input validation for enemy generation
- Race conditions in setTimeout chains
- Missing early returns for error cases

**MODERATE ISSUES (12):**
- Inconsistent error handling patterns
- Missing JSDoc documentation
- Type narrowing opportunities missed
- Duplicate code in animation logic

---

## 1. Critical Issues (Must Fix Immediately)

### 1.1 TypeScript Configuration - CRITICAL FAILURE

**File:** `/Users/gilbrowdy/rogue/tsconfig.json`, `/Users/gilbrowdy/rogue/tsconfig.app.json`

**Issue:** TypeScript strict mode and essential safety features are completely disabled.

```typescript
// Current configuration (DANGEROUS):
{
  "compilerOptions": {
    "strict": false,                  // ❌ CRITICAL
    "noImplicitAny": false,          // ❌ CRITICAL
    "strictNullChecks": false,       // ❌ CRITICAL
    "noUnusedLocals": false,         // ❌ WARNING
    "noUnusedParameters": false,     // ❌ WARNING
    "noFallthroughCasesInSwitch": false
  }
}
```

**Impact:**
- Any type can slip through without detection
- Null/undefined bugs will only appear at runtime
- No protection against common JavaScript pitfalls
- Technical debt compounds with every new line of code

**Required Fix:**
```typescript
// REQUIRED configuration:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

**Action Required:** This must be fixed BEFORE any production deployment. Enabling strict mode will reveal hundreds of type errors that are currently hidden.

---

### 1.2 Unsafe Type Coercion in Combat Logic

**File:** `/Users/gilbrowdy/rogue/src/hooks/useGameState.ts`
**Lines:** 38-41, 508

**Issue:** Unsafe type assertions with `as keyof Stats` without validation.

```typescript
// UNSAFE - Current code:
Object.entries(item.statBonus).forEach(([key, value]) => {
  if (key in stats && value) {
    stats[key as keyof Stats] += value;  // ❌ No validation key is valid
  }
});

// Line 508 - Direct property access without type safety:
(player.baseStats as Record<string, number>)[upgrade.stat] += upgrade.value;
```

**Potential Runtime Errors:**
- Invalid stat keys could corrupt player state
- Type mismatches could cause NaN values
- No validation that `upgrade.stat` is a valid key

**Required Fix:**
```typescript
// SAFE - Type guard approach:
const VALID_STAT_KEYS: ReadonlyArray<keyof Stats> = [
  'health', 'maxHealth', 'attack', 'defense', 'speed',
  'critChance', 'dodgeChance', 'mana', 'maxMana'
];

function isValidStatKey(key: string): key is keyof Stats {
  return VALID_STAT_KEYS.includes(key as keyof Stats);
}

Object.entries(item.statBonus).forEach(([key, value]) => {
  if (isValidStatKey(key) && typeof value === 'number' && !isNaN(value)) {
    stats[key] += value;
  } else {
    console.error(`Invalid stat bonus: ${key}=${value}`);
  }
});
```

---

### 1.3 Missing Null Checks in Critical Combat Flow

**File:** `/Users/gilbrowdy/rogue/src/hooks/useGameState.ts`
**Lines:** 118-313, 315-407

**Issue:** Combat functions assume player/enemy exist without proper null guards.

```typescript
// UNSAFE - Line 118-120:
const performCombatTick = useCallback(() => {
  setState(prev => {
    if (!prev.player || !prev.currentEnemy || prev.isPaused) return prev;
    // ❌ After this check, prev.player could still be null in deeper logic
```

**Problem:** The early return doesn't guarantee type safety in nested callbacks and timeouts.

```typescript
// Line 153-158 - setTimeout with potential null access:
setLastCombatEvent({
  type: 'playerAttack',
  damage: playerDamage,
  isCrit: playerCrit,
  timestamp: Date.now(),
});
// ❌ If state changes during setTimeout, event handlers may access null values
```

**Required Fix:**
```typescript
const performCombatTick = useCallback(() => {
  setState(prev => {
    // Explicit null guards with type narrowing
    const player = prev.player;
    const enemy = prev.currentEnemy;

    if (!player || !enemy || prev.isPaused) {
      return prev;
    }

    // Now TypeScript knows these are non-null
    const playerCopy = { ...player };
    const enemyCopy = { ...enemy };

    // All combat logic uses local copies, preventing null access
    // ... combat logic
  });
}, [calculateStats]);
```

---

## 2. High Severity Issues (Fix Before Production)

### 2.1 Race Condition in Battle Animation

**File:** `/Users/gilbrowdy/rogue/src/hooks/useGameState.ts`
**Lines:** 161-184, 246-275

**Issue:** Multiple setTimeout chains without cleanup or coordination.

```typescript
// UNSAFE - Race condition risk:
setTimeout(() => {
  setLastCombatEvent({
    type: 'enemyHit',
    damage: playerDamage,
    isCrit: playerCrit,
    timestamp: Date.now(),
  });
}, 150);

// Another setTimeout 300ms later
setTimeout(() => {
  setLastCombatEvent({
    type: 'enemyDeath',
    damage: 0,
    isCrit: false,
    timestamp: Date.now(),
  });
}, 300);
```

**Problem:**
- No cleanup if component unmounts
- No cancellation if combat state changes
- Events may fire out of order if timing is off
- Memory leaks from orphaned timeouts

**Required Fix:**
```typescript
const performCombatTick = useCallback(() => {
  setState(prev => {
    if (!prev.player || !prev.currentEnemy || prev.isPaused) return prev;

    // Store timeout IDs for cleanup
    const timeoutIds: number[] = [];

    // Emit events with cleanup tracking
    const emitEvent = (event: CombatEvent, delay: number) => {
      const id = window.setTimeout(() => {
        setLastCombatEvent(event);
      }, delay);
      timeoutIds.push(id);
    };

    // Cleanup function
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  });
}, [calculateStats]);

// Add cleanup in useEffect
useEffect(() => {
  return () => {
    // Cleanup any pending combat events
  };
}, []);
```

---

### 2.2 No Error Boundaries

**File:** `/Users/gilbrowdy/rogue/src/App.tsx`
**Issue:** No error boundaries to catch and recover from React errors.

**Current Code:**
```typescript
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

**Problem:** Any component error will crash the entire app with a white screen.

**Required Fix:**
```typescript
// Create error boundary:
class GameErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Game Error:', error, errorInfo);
    // TODO: Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Game Error
            </h1>
            <p className="text-muted-foreground mb-4">
              Something went wrong. Please refresh to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap app:
const App = () => (
  <GameErrorBoundary>
    <QueryClientProvider client={queryClient}>
      {/* ... rest of app */}
    </QueryClientProvider>
  </GameErrorBoundary>
);
```

---

### 2.3 Unsafe Enemy Generation

**File:** `/Users/gilbrowdy/rogue/src/data/enemies.ts`
**Lines:** 10-71

**Issue:** No validation of input parameters or generated values.

```typescript
export function generateEnemy(floor: number, room: number, roomsPerFloor: number): {
  // ❌ No validation that floor/room are positive integers
  // ❌ No validation that room <= roomsPerFloor
  // ❌ No checks for NaN or Infinity

  const difficultyMultiplier = 1 + (floor - 1) * 0.3 + (room - 1) * 0.05;
  // ❌ Could produce negative values if floor < 1
```

**Required Fix:**
```typescript
interface EnemyGenerationParams {
  floor: number;
  room: number;
  roomsPerFloor: number;
}

function validateEnemyParams(params: EnemyGenerationParams): void {
  const { floor, room, roomsPerFloor } = params;

  if (!Number.isInteger(floor) || floor < 1) {
    throw new Error(`Invalid floor: ${floor}. Must be positive integer.`);
  }
  if (!Number.isInteger(room) || room < 1) {
    throw new Error(`Invalid room: ${room}. Must be positive integer.`);
  }
  if (!Number.isInteger(roomsPerFloor) || roomsPerFloor < 1) {
    throw new Error(`Invalid roomsPerFloor: ${roomsPerFloor}.`);
  }
  if (room > roomsPerFloor) {
    throw new Error(`Room ${room} exceeds roomsPerFloor ${roomsPerFloor}.`);
  }
}

export function generateEnemy(
  floor: number,
  room: number,
  roomsPerFloor: number
): Enemy {
  // Validate inputs
  validateEnemyParams({ floor, room, roomsPerFloor });

  const difficultyMultiplier = Math.max(
    1,
    1 + (floor - 1) * 0.3 + (room - 1) * 0.05
  );

  // Rest of generation logic...

  // Validate output before returning
  const enemy = {
    // ... generated enemy
  };

  if (enemy.health <= 0 || enemy.maxHealth <= 0) {
    throw new Error('Generated enemy with invalid health');
  }

  return enemy;
}
```

---

### 2.4 Missing Early Returns and Error Cases

**File:** `/Users/gilbrowdy/rogue/src/hooks/useGameState.ts`
**Lines:** 409-433, 435-452

**Issue:** Functions continue execution instead of failing fast on invalid state.

```typescript
const buyItem = useCallback((itemIndex: number) => {
  const item = shopItems[itemIndex];
  if (!item) return;  // ❌ Silent failure - no error logged

  const price = getItemPrice(item);

  setState(prev => {
    if (!prev.player || prev.player.gold < price) return prev;
    // ❌ Silent failure - user doesn't know why purchase failed
```

**Required Fix:**
```typescript
const buyItem = useCallback((itemIndex: number) => {
  // Validate index
  if (!Number.isInteger(itemIndex) || itemIndex < 0) {
    console.error(`Invalid item index: ${itemIndex}`);
    return;
  }

  const item = shopItems[itemIndex];
  if (!item) {
    console.error(`No item at index ${itemIndex}`);
    return;
  }

  const price = getItemPrice(item);
  if (!Number.isFinite(price) || price < 0) {
    console.error(`Invalid item price: ${price}`);
    return;
  }

  setState(prev => {
    if (!prev.player) {
      console.error('Cannot buy item: No player');
      return prev;
    }

    if (prev.player.gold < price) {
      // User feedback - not enough gold
      console.warn(`Not enough gold. Need ${price}, have ${prev.player.gold}`);
      return prev;
    }

    // Valid purchase - proceed
    // ...
  });
}, [shopItems, calculateStats]);
```

---

### 2.5 Unhandled Division by Zero

**File:** `/Users/gilbrowdy/rogue/src/components/game/DeathScreen.tsx`
**Lines:** 380, 400-403

**Issue:** Percentage calculations without zero checks.

```typescript
const percentage = Math.max(0, Math.min(100, (current / max) * 100));
// ❌ If max is 0, this produces NaN
```

**Required Fix:**
```typescript
const percentage = max > 0
  ? Math.max(0, Math.min(100, (current / max) * 100))
  : 0;
```

---

### 2.6 Implicit Any in Event Handlers

**File:** `/Users/gilbrowdy/rogue/src/components/game/DeathScreen.tsx`
**Lines:** 452, 515, 548, 594

**Issue:** Event handlers use implicit any types for event parameters.

```typescript
const handleClick = (e: React.MouseEvent) => {  // ❌ Implicit any on element type
  if (!canAfford) return;

  const rect = cardRef.current?.getBoundingClientRect();
```

**Required Fix:**
```typescript
const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (!canAfford) return;

  const rect = cardRef.current?.getBoundingClientRect();
  // Type-safe event handling
```

---

### 2.7 Unsafe Array Access

**File:** `/Users/gilbrowdy/rogue/src/data/items.ts`
**Lines:** 52, 55, 67

**Issue:** Array access without bounds checking.

```typescript
const template = ITEM_TEMPLATES[itemType][Math.floor(Math.random() * ITEM_TEMPLATES[itemType].length)];
// ❌ Could theoretically be undefined if array is empty

const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
// ❌ No check that prefixes array exists or has items
```

**Required Fix:**
```typescript
const templates = ITEM_TEMPLATES[itemType];
if (!templates || templates.length === 0) {
  throw new Error(`No templates available for item type: ${itemType}`);
}
const template = templates[Math.floor(Math.random() * templates.length)];

const prefixes = RARITY_PREFIXES[rarity];
if (!prefixes || prefixes.length === 0) {
  throw new Error(`No prefixes for rarity: ${rarity}`);
}
const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
```

---

### 2.8 Missing Type Guards for Union Types

**File:** `/Users/gilbrowdy/rogue/src/hooks/useBattleAnimation.ts`
**Lines:** 124-218

**Issue:** Switch statement on union type without exhaustiveness checking.

```typescript
switch (lastCombatEvent.type) {
  case 'playerAttack':
    // ...
    break;
  case 'enemyHit':
    // ...
    break;
  // ... other cases
}
// ❌ No default case or exhaustiveness check
```

**Required Fix:**
```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected combat event type: ${x}`);
}

switch (lastCombatEvent.type) {
  case 'playerAttack':
    // ...
    break;
  case 'enemyHit':
    // ...
    break;
  case 'enemyAttack':
    // ...
    break;
  case 'playerHit':
    // ...
    break;
  case 'playerDodge':
    // ...
    break;
  case 'enemyDeath':
    // ...
    break;
  case 'playerDeath':
    // ...
    break;
  default:
    assertNever(lastCombatEvent.type);
}
```

---

## 3. Moderate Issues (Should Fix)

### 3.1 Missing JSDoc Documentation

**Files:** All `.ts` and `.tsx` files
**Issue:** No JSDoc comments for public functions, interfaces, or complex logic.

**Required:**
```typescript
/**
 * Generates an enemy for the current floor and room.
 *
 * Scales enemy stats based on floor progression and room position.
 * Boss enemies appear on the final room of each floor.
 *
 * @param floor - The current floor number (1-indexed)
 * @param room - The current room number (1-indexed)
 * @param roomsPerFloor - Total number of rooms per floor
 * @returns A fully generated enemy with stats, rewards, and type
 * @throws {Error} If parameters are invalid or generation fails
 *
 * @example
 * const enemy = generateEnemy(5, 3, 5);
 * console.log(enemy.name); // "Fierce Orc"
 */
export function generateEnemy(
  floor: number,
  room: number,
  roomsPerFloor: number
): Enemy {
  // ...
}
```

---

### 3.2 Magic Numbers Throughout Codebase

**Files:** Multiple
**Issue:** Hardcoded values without named constants.

**Examples:**
```typescript
// useGameState.ts:129
player.currentStats.mana + 2  // ❌ Magic number

// useGameState.ts:142
const playerDamageVariance = 0.8 + Math.random() * 0.4;  // ❌ Magic numbers

// useBattleAnimation.ts:106
const transitionDuration = 1500;  // ❌ Magic number
```

**Required Fix:**
```typescript
// constants.ts
export const COMBAT_CONSTANTS = {
  MANA_REGEN_PER_TICK: 2,
  DAMAGE_VARIANCE_MIN: 0.8,
  DAMAGE_VARIANCE_MAX: 1.2,
  ENEMY_ENTER_ANIMATION_MS: 1500,
  PLAYER_ATTACK_ANIMATION_MS: 250,
  HIT_ANIMATION_MS: 200,
} as const;

// Usage:
player.currentStats.mana + COMBAT_CONSTANTS.MANA_REGEN_PER_TICK
```

---

### 3.3 Duplicate Type Definitions

**Files:** Multiple
**Issue:** `BattlePhase` type defined in multiple files.

```typescript
// src/hooks/useBattleAnimation.ts:14
type BattlePhase = 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';

// src/components/game/CombatScreen.tsx:10
type BattlePhase = 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';
```

**Required Fix:**
Move to shared types file:
```typescript
// src/types/game.ts
export type BattlePhase = 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';
```

---

### 3.4 Inconsistent Error Handling Patterns

**Issue:** Some functions throw errors, some return null, some fail silently.

**Examples:**
```typescript
// Silent failure:
const item = shopItems[itemIndex];
if (!item) return;

// Null return:
export function getRandomPower(existingPowerIds: string[]): Power | null {
  if (available.length === 0) return null;
```

**Required:** Establish consistent error handling strategy:
1. Use exceptions for programming errors (invalid parameters)
2. Use null/undefined for expected "not found" cases
3. Use Result/Option types for operations that can fail

---

### 3.5 Missing Input Sanitization

**File:** `/Users/gilbrowdy/rogue/src/data/sprites.ts`
**Lines:** 355-357

**Issue:** String normalization but no validation.

```typescript
export function getSprite(name: string): SpriteDefinition {
  const normalized = name.toLowerCase().replace(/^(fierce|ancient|corrupted|shadow|cursed|vengeful|bloodthirsty)\s+/, '');
  return SPRITES[normalized] || SPRITES['goblin'];
  // ❌ No check if input is actually a string
  // ❌ No check if normalized is non-empty
}
```

**Required Fix:**
```typescript
export function getSprite(name: string): SpriteDefinition {
  if (typeof name !== 'string' || name.trim().length === 0) {
    console.warn('Invalid sprite name, using default');
    return SPRITES['goblin'];
  }

  const normalized = name.toLowerCase().trim()
    .replace(/^(fierce|ancient|corrupted|shadow|cursed|vengeful|bloodthirsty)\s+/, '');

  if (normalized.length === 0) {
    console.warn('Empty sprite name after normalization');
    return SPRITES['goblin'];
  }

  return SPRITES[normalized] || SPRITES['goblin'];
}
```

---

### 3.6 Complex State Updates Without Immer

**File:** `/Users/gilbrowdy/rogue/src/hooks/useGameState.ts`
**Issue:** Deep object spreading prone to mistakes.

```typescript
const player = {
  ...prev.player,
  equippedItems: [...prev.player.equippedItems, item],
};
player.currentStats = calculateStats(player);
```

**Recommendation:** Consider using Immer for complex state updates:
```typescript
import { produce } from 'immer';

setState(produce(prev => {
  if (!prev.player) return;

  prev.player.equippedItems.push(item);
  prev.player.currentStats = calculateStats(prev.player);
}));
```

---

### 3.7 No Accessibility Attributes

**Files:** All component files
**Issue:** Missing ARIA labels and keyboard navigation.

**Examples:**
```tsx
<Button
  onClick={onUse}
  disabled={!canUse}
  variant="outline"
>
  {/* ❌ No aria-label for screen readers */}
  {/* ❌ No aria-describedby for power description */}
</Button>
```

**Required Fix:**
```tsx
<Button
  onClick={onUse}
  disabled={!canUse}
  variant="outline"
  aria-label={`Use ${power.name}`}
  aria-describedby={`power-desc-${power.id}`}
>
  <span className="text-2xl">{power.icon}</span>
  <span className="text-xs font-medium">{power.name}</span>
  <span id={`power-desc-${power.id}`} className="sr-only">
    {power.description}
  </span>
</Button>
```

---

### 3.8 useCallback Dependencies Issues

**File:** `/Users/gilbrowdy/rogue/src/hooks/useGameState.ts`
**Lines:** 662

**Issue:** Missing dependencies in useEffect.

```typescript
useEffect(() => {
  if (state.gamePhase === 'combat' && !state.isPaused) {
    // ...
  }
}, [state.gamePhase, state.isPaused, state.currentEnemy, state.currentRoom, state.roomsPerFloor, nextRoom, showFloorComplete, performCombatTick]);
// ❌ Should include 'state' or destructure needed properties
```

**Required Fix:**
```typescript
useEffect(() => {
  if (state.gamePhase === 'combat' && !state.isPaused) {
    if (!state.currentEnemy && state.currentRoom < state.roomsPerFloor) {
      const timeout = setTimeout(nextRoom, 800);
      return () => clearTimeout(timeout);
    } else if (!state.currentEnemy && state.currentRoom >= state.roomsPerFloor) {
      const timeout = setTimeout(showFloorComplete, 1000);
      return () => clearTimeout(timeout);
    } else if (state.currentEnemy) {
      combatIntervalRef.current = window.setInterval(performCombatTick, 1200);
      return () => {
        if (combatIntervalRef.current) {
          clearInterval(combatIntervalRef.current);
        }
      };
    }
  }
  return undefined;
}, [
  state.gamePhase,
  state.isPaused,
  state.currentEnemy,
  state.currentRoom,
  state.roomsPerFloor,
  nextRoom,
  showFloorComplete,
  performCombatTick,
]);
```

---

### 3.9 String Concatenation in IDs

**File:** `/Users/gilbrowdy/rogue/src/data/enemies.ts`, `/Users/gilbrowdy/rogue/src/data/items.ts`
**Issue:** Non-unique ID generation.

```typescript
id: `enemy-${Date.now()}-${Math.random()}`,
id: `item-${Date.now()}-${Math.random()}`,
```

**Problem:** If called in rapid succession, IDs could collide.

**Required Fix:**
```typescript
// utils/id.ts
let counter = 0;
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++counter}-${Math.random().toString(36).substr(2, 9)}`;
}

// Usage:
id: generateId('enemy'),
id: generateId('item'),
```

---

### 3.10 Missing Default Cases

**File:** `/Users/gilbrowdy/rogue/src/components/game/Game.tsx`
**Lines:** 11-58

**Issue:** Switch statement has default but doesn't handle unknown states.

```typescript
switch (state.gamePhase) {
  case 'menu':
    return <MainMenu onStart={actions.startGame} />;
  // ... other cases
  default:
    return <MainMenu onStart={actions.startGame} />;
    // ❌ Silent fallback - unknown states not logged
}
```

**Required Fix:**
```typescript
switch (state.gamePhase) {
  case 'menu':
    return <MainMenu onStart={actions.startGame} />;
  case 'class-select':
    return <ClassSelect onSelect={actions.selectClass} />;
  case 'combat':
    return <CombatScreen {...props} />;
  case 'floor-complete':
    if (!state.player) {
      console.error('Floor complete with no player');
      return <MainMenu onStart={actions.startGame} />;
    }
    return <FloorCompleteScreen {...props} />;
  case 'defeat':
    if (!state.player) {
      console.error('Defeat screen with no player');
      return <MainMenu onStart={actions.startGame} />;
    }
    return <DeathScreen {...props} />;
  default:
    console.error(`Unknown game phase: ${state.gamePhase}`);
    return <MainMenu onStart={actions.startGame} />;
}
```

---

### 3.11 Weak Type for Record Access

**File:** `/Users/gilbrowdy/rogue/src/components/game/CombatScreen.tsx`
**Lines:** 165-172

**Issue:** Record<string, string> allows any string key.

```typescript
function getClassIcon(playerClass: string): string {
  const icons: Record<string, string> = {
    warrior: '⚔️',
    mage: '🔮',
    rogue: '🗡️',
    paladin: '🛡️',
  };
  return icons[playerClass] || '👤';
}
```

**Required Fix:**
```typescript
import { CharacterClass } from '@/types/game';

const CLASS_ICONS: Record<CharacterClass, string> = {
  warrior: '⚔️',
  mage: '🔮',
  rogue: '🗡️',
  paladin: '🛡️',
} as const;

function getClassIcon(playerClass: CharacterClass): string {
  return CLASS_ICONS[playerClass];
  // Type-safe - TypeScript ensures all classes are covered
}
```

---

### 3.12 CSS-in-JS Type Safety

**File:** `/Users/gilbrowdy/rogue/src/components/game/PixelSprite.tsx`
**Lines:** 98-100, 114-115

**Issue:** CSS custom properties not type-checked.

```typescript
style={{
  '--frame-count': frameCount,
  '--animation-duration': `${animationDuration}ms`,
} as React.CSSProperties}
// ❌ Type assertion bypasses type checking
```

**Better Approach:**
```typescript
interface CustomCSSProperties extends React.CSSProperties {
  '--frame-count'?: number;
  '--animation-duration'?: string;
  '--frame-index'?: number;
  '--particle-angle'?: string;
}

style={{
  '--frame-count': frameCount,
  '--animation-duration': `${animationDuration}ms`,
} as CustomCSSProperties}
```

---

## 4. Security Considerations

### 4.1 No XSS Vulnerabilities Found

The codebase does not use `dangerouslySetInnerHTML` and properly escapes all user-generated content. However, be cautious if adding:
- User-provided names or text
- Dynamic style injection
- Third-party content

---

### 4.2 Local Storage Considerations

**Current:** No local storage usage detected.

**If adding save games:** Implement proper validation and sanitization:
```typescript
interface SaveData {
  version: string;
  player: Player;
  timestamp: number;
}

function savegame(data: SaveData): void {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem('roguelike-save', json);
  } catch (error) {
    console.error('Failed to save game:', error);
  }
}

function loadGame(): SaveData | null {
  try {
    const json = localStorage.getItem('roguelike-save');
    if (!json) return null;

    const data = JSON.parse(json);

    // Validate structure
    if (!isValidSaveData(data)) {
      console.error('Invalid save data structure');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

function isValidSaveData(data: unknown): data is SaveData {
  // Type guard implementation
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    'player' in data &&
    'timestamp' in data
  );
}
```

---

### 4.3 No Injection Vulnerabilities

No SQL, command injection, or prototype pollution risks detected. The codebase is client-side only with no external API calls.

---

## 5. Performance Analysis

### 5.1 Good Practices Observed

- Proper use of `useCallback` for event handlers
- `useMemo` for expensive sprite calculations
- No unnecessary re-renders detected
- Efficient component structure

---

### 5.2 Potential Optimizations

**Combat Log Array Growth:**
```typescript
// Current - unlimited growth:
combatLog: [...prev.combatLog, message],

// Better - with limit:
combatLog: [...prev.combatLog.slice(-50), message],
// ✅ Already implemented - good!
```

**Consider React.memo for Pure Components:**
```typescript
export const PowerButton = React.memo(function PowerButton({
  power,
  currentMana,
  onUse,
  disabled
}: PowerButtonProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.power.id === nextProps.power.id &&
    prevProps.power.currentCooldown === nextProps.power.currentCooldown &&
    prevProps.currentMana === nextProps.currentMana &&
    prevProps.disabled === nextProps.disabled
  );
});
```

---

## 6. Code Organization Assessment

### 6.1 Strengths

- Clean separation of concerns (components, hooks, types, data)
- Consistent file naming conventions
- Logical folder structure
- Type definitions in dedicated files

---

### 6.2 Suggested Improvements

**Create a constants directory:**
```
src/
  constants/
    combat.ts       - Combat-related constants
    animations.ts   - Animation timing constants
    items.ts        - Item-related constants
```

**Separate business logic:**
```
src/
  services/
    combatEngine.ts  - Pure combat calculation functions
    itemGenerator.ts - Item generation logic
    enemyFactory.ts  - Enemy generation logic
```

---

## 7. Production Readiness Checklist

### Must Fix Before Production

- [ ] Enable TypeScript strict mode
- [ ] Fix all type errors revealed by strict mode
- [ ] Add error boundaries
- [ ] Implement input validation for all data generators
- [ ] Add proper error logging
- [ ] Fix race conditions in combat timing
- [ ] Add null/undefined checks throughout

### Should Fix Before Production

- [ ] Add JSDoc comments to public APIs
- [ ] Implement comprehensive error handling strategy
- [ ] Add accessibility attributes
- [ ] Replace magic numbers with named constants
- [ ] Add unit tests for critical functions
- [ ] Add integration tests for combat flow
- [ ] Implement proper ID generation
- [ ] Add performance monitoring

### Nice to Have

- [ ] Add ESLint rules for better code quality
- [ ] Implement code coverage tracking
- [ ] Add Storybook for component development
- [ ] Implement save/load functionality
- [ ] Add analytics tracking
- [ ] Implement proper logging service
- [ ] Add CI/CD pipeline

---

## 8. Testing Recommendations

### Unit Tests Needed

```typescript
// __tests__/combatEngine.test.ts
describe('Combat System', () => {
  it('should calculate damage with variance', () => {
    const damage = calculateDamage(player, enemy);
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThanOrEqual(player.attack * 1.2);
  });

  it('should handle critical hits', () => {
    const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0);
    // Test crit logic
    mockRandom.mockRestore();
  });

  it('should prevent negative health', () => {
    // Test edge case
  });
});

// __tests__/enemyGeneration.test.ts
describe('Enemy Generation', () => {
  it('should throw on invalid floor', () => {
    expect(() => generateEnemy(0, 1, 5)).toThrow();
    expect(() => generateEnemy(-1, 1, 5)).toThrow();
  });

  it('should generate boss on final room', () => {
    const enemy = generateEnemy(1, 5, 5);
    expect(enemy.isBoss).toBe(true);
  });

  it('should scale stats with floor', () => {
    const floor1 = generateEnemy(1, 1, 5);
    const floor5 = generateEnemy(5, 1, 5);
    expect(floor5.health).toBeGreaterThan(floor1.health);
  });
});
```

---

## 9. ESLint Configuration Recommendations

```javascript
// .eslintrc.js
export default {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
};
```

---

## 10. Summary and Action Plan

### Phase 1: Critical Fixes (Week 1)

1. Enable TypeScript strict mode in stages
2. Fix all revealed type errors
3. Add error boundaries
4. Implement input validation
5. Fix race conditions

### Phase 2: High Priority (Week 2)

1. Add comprehensive error handling
2. Implement proper null checks
3. Add exhaustiveness checking
4. Fix unsafe type assertions
5. Add JSDoc comments

### Phase 3: Quality Improvements (Week 3)

1. Extract magic numbers to constants
2. Add unit tests for critical paths
3. Improve accessibility
4. Implement proper logging
5. Add performance monitoring

### Phase 4: Polish (Week 4)

1. Code review and refactoring
2. Integration tests
3. Performance optimization
4. Documentation
5. Deployment preparation

---

## Conclusion

This codebase demonstrates solid React architecture and component organization. However, the **disabled TypeScript strict mode is a CRITICAL issue** that must be addressed before any production deployment. The current configuration creates a false sense of security and allows type errors to slip through that will only manifest at runtime.

**Immediate Actions Required:**

1. Enable TypeScript strict mode
2. Fix all type errors (expect 100-200 errors initially)
3. Add error boundaries
4. Implement comprehensive error handling
5. Add input validation

Once these critical issues are addressed, this will be a robust, maintainable codebase suitable for production use.

---

**Generated:** 2025-12-08
**Tool:** TypeScript Architecture Review
**Version:** 1.0
