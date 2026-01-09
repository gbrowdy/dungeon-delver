# Power Visual Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visual feedback for power usage - impact effects on enemies, buff icons with timers, buff auras, and secondary effect feedback.

**Architecture:** Strict ECS flow. Systems queue animation events and set visualEffects components. AnimationSystem processes events. Snapshot copies to immutable state. React reads snapshots only.

**Tech Stack:** React, TypeScript, Tailwind CSS, miniplex ECS

---

## Task 1: Add spell_cast Processing to AnimationSystem

The `spell_cast` events are already queued by PowerSystem but AnimationSystem doesn't process them. Add processing to set visual effects on the enemy when a damage power hits.

**Files:**
- Modify: `src/ecs/systems/animation.ts`
- Modify: `src/ecs/components.ts` (add powerImpact to visualEffects)
- Test: `src/ecs/systems/__tests__/animation.test.ts`

### Step 1: Add powerImpact type to components.ts

In `src/ecs/components.ts`, find the `visualEffects` type and add `powerImpact`:

```typescript
visualEffects?: {
  flash?: { color?: 'white' | 'red' | 'green' | 'gold'; untilTick: number };
  shake?: { untilTick: number };
  hitStop?: { untilTick: number };
  aura?: { color: string; untilTick: number };
  powerImpact?: { powerId: string; untilTick: number };
};
```

### Step 2: Add spell_cast case to AnimationSystem

In `src/ecs/systems/animation.ts`, add a case in `processAnimationEvent()` after the `player_hit` case:

```typescript
case 'spell_cast': {
  // Only process damage spells (not heals/buffs)
  if (event.payload.type === 'spell' && event.payload.powerId) {
    const enemy = enemyQuery.first;
    if (enemy) {
      // Set power impact effect on enemy
      if (!enemy.visualEffects) {
        enemy.visualEffects = {};
      }
      enemy.visualEffects.powerImpact = {
        powerId: event.payload.powerId,
        untilTick: event.displayUntilTick,
      };
    }
  }
  break;
}
```

### Step 3: Write test for spell_cast processing

Add to `src/ecs/systems/__tests__/animation.test.ts`:

```typescript
it('should set powerImpact on enemy for spell_cast events', () => {
  // Add enemy
  const enemy = world.add({
    enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
    health: { current: 50, max: 50 },
  });

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: 'rage-strike',
    value: 30,
  }, 400);

  AnimationSystem(16);

  expect(enemy.visualEffects?.powerImpact).toBeDefined();
  expect(enemy.visualEffects?.powerImpact?.powerId).toBe('rage-strike');
});
```

### Step 4: Run tests

```bash
npx vitest run src/ecs/systems/__tests__/animation.test.ts
```

### Step 5: Commit

```bash
git add src/ecs/components.ts src/ecs/systems/animation.ts src/ecs/systems/__tests__/animation.test.ts
git commit -m "feat(ecs): add spell_cast processing to AnimationSystem"
```

---

## Task 2: Add powerImpact to Snapshot

Ensure the powerImpact visual effect is copied to the enemy snapshot for React to read.

**Files:**
- Modify: `src/ecs/snapshot.ts`

### Step 1: Check EnemySnapshot interface

In `src/ecs/snapshot.ts`, find `EnemySnapshot` interface and ensure `visualEffects` includes `powerImpact`. The interface likely already has `visualEffects?: {...}`. If not, add it.

### Step 2: Verify createEnemySnapshot copies visualEffects

In `createEnemySnapshot()` function, ensure `visualEffects` is spread/copied:

```typescript
visualEffects: entity.visualEffects ? { ...entity.visualEffects } : undefined,
```

### Step 3: Run build to verify types

```bash
npm run build
```

### Step 4: Commit

```bash
git add src/ecs/snapshot.ts
git commit -m "feat(ecs): ensure powerImpact in enemy snapshot"
```

---

## Task 3: Create PowerImpactEffect Component

Create a React component that renders the visual impact effect (fire burst, shockwave) on the enemy.

**Files:**
- Create: `src/components/game/PowerImpactEffect.tsx`
- Modify: `src/components/game/CharacterSprite.tsx`

### Step 1: Create PowerImpactEffect component

Create `src/components/game/PowerImpactEffect.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface PowerImpactEffectProps {
  powerId: string;
  className?: string;
}

// Map power IDs to visual effect types
const POWER_EFFECTS: Record<string, { type: 'fire' | 'shockwave' | 'slash'; color: string }> = {
  'rage-strike': { type: 'fire', color: '#ef4444' },      // red-500
  'savage-slam': { type: 'shockwave', color: '#fbbf24' }, // amber-400
  'reckless-charge': { type: 'slash', color: '#f97316' }, // orange-500
};

export function PowerImpactEffect({ powerId, className }: PowerImpactEffectProps) {
  const effect = POWER_EFFECTS[powerId] || { type: 'fire', color: '#ef4444' };

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-40', className)}>
      {effect.type === 'fire' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-24 h-24 rounded-full animate-power-burst opacity-80"
            style={{
              background: `radial-gradient(circle, ${effect.color} 0%, transparent 70%)`,
            }}
          />
        </div>
      )}
      {effect.type === 'shockwave' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-32 h-32 rounded-full border-4 animate-shockwave opacity-80"
            style={{ borderColor: effect.color }}
          />
        </div>
      )}
      {effect.type === 'slash' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-20 h-4 animate-slash-trail opacity-80"
            style={{ background: `linear-gradient(90deg, transparent, ${effect.color}, transparent)` }}
          />
        </div>
      )}
    </div>
  );
}
```

### Step 2: Add CSS animations to index.css

In `src/index.css`, add:

```css
@keyframes power-burst {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes shockwave {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes slash-trail {
  0% { transform: scaleX(0.5) translateX(-50%); opacity: 1; }
  100% { transform: scaleX(2) translateX(50%); opacity: 0; }
}

.animate-power-burst {
  animation: power-burst 400ms ease-out forwards;
}

.animate-shockwave {
  animation: shockwave 400ms ease-out forwards;
}

.animate-slash-trail {
  animation: slash-trail 300ms ease-out forwards;
}
```

### Step 3: Integrate into CharacterSprite

In `src/components/game/CharacterSprite.tsx`, import and render:

1. Add import at top:
```tsx
import { PowerImpactEffect } from './PowerImpactEffect';
```

2. Add prop to interface:
```tsx
powerImpact?: { powerId: string } | null;
```

3. Add rendering after enemy sprite (inside the enemy section):
```tsx
{/* Power impact effect - enemy only */}
{!isHero && powerImpact && (
  <PowerImpactEffect powerId={powerImpact.powerId} />
)}
```

### Step 4: Run build

```bash
npm run build
```

### Step 5: Commit

```bash
git add src/components/game/PowerImpactEffect.tsx src/components/game/CharacterSprite.tsx src/index.css
git commit -m "feat(ui): add PowerImpactEffect component for damage powers"
```

---

## Task 4: Wire PowerImpact Through BattleArena

Pass the powerImpact visual effect from snapshot through to CharacterSprite.

**Files:**
- Modify: `src/components/game/BattleArena.tsx`

### Step 1: Read powerImpact from enemy snapshot

In `BattleArena.tsx`, find where `CharacterSprite` is rendered for enemy. Add powerImpact prop:

```tsx
<CharacterSprite
  type="enemy"
  // ... existing props
  powerImpact={enemy?.visualEffects?.powerImpact ?? null}
/>
```

### Step 2: Run build and manual test

```bash
npm run build
npm run dev
```

Test by using a Berserker power on an enemy.

### Step 3: Commit

```bash
git add src/components/game/BattleArena.tsx
git commit -m "feat(ui): wire powerImpact through BattleArena to CharacterSprite"
```

---

## Task 5: Add Buff Aura to Player

Add a pulsing glow aura around the player when buffs are active.

**Files:**
- Create: `src/components/game/BuffAura.tsx`
- Modify: `src/components/game/CharacterSprite.tsx`

### Step 1: Create BuffAura component

Create `src/components/game/BuffAura.tsx`:

```tsx
import { cn } from '@/lib/utils';
import type { ActiveBuff } from '@/types/game';

interface BuffAuraProps {
  buffs: ActiveBuff[];
  className?: string;
}

// Determine aura color based on active buffs
function getAuraColor(buffs: ActiveBuff[]): string {
  const hasPower = buffs.some(b => b.stat === 'power');
  const hasSpeed = buffs.some(b => b.stat === 'speed');

  if (hasPower && hasSpeed) return 'rgba(251, 146, 60, 0.5)'; // orange blend
  if (hasPower) return 'rgba(239, 68, 68, 0.5)'; // red
  if (hasSpeed) return 'rgba(250, 204, 21, 0.5)'; // yellow
  return 'rgba(34, 197, 94, 0.4)'; // green default
}

export function BuffAura({ buffs, className }: BuffAuraProps) {
  if (buffs.length === 0) return null;

  const color = getAuraColor(buffs);

  return (
    <div
      className={cn(
        'absolute inset-0 rounded-full pointer-events-none z-0 animate-buff-aura',
        className
      )}
      style={{
        boxShadow: `0 0 20px 10px ${color}, inset 0 0 15px 5px ${color}`,
      }}
    />
  );
}
```

### Step 2: Add CSS animation

In `src/index.css`, add:

```css
@keyframes buff-aura {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.05); }
}

.animate-buff-aura {
  animation: buff-aura 2s ease-in-out infinite;
}
```

### Step 3: Integrate into CharacterSprite

In `src/components/game/CharacterSprite.tsx`:

1. Add import:
```tsx
import { BuffAura } from './BuffAura';
```

2. Render before sprite (inside hero section, at z-0):
```tsx
{/* Buff aura - hero only */}
{isHero && activeBuffs.length > 0 && (
  <BuffAura buffs={activeBuffs} />
)}
```

### Step 4: Run build

```bash
npm run build
```

### Step 5: Commit

```bash
git add src/components/game/BuffAura.tsx src/components/game/CharacterSprite.tsx src/index.css
git commit -m "feat(ui): add BuffAura component for active player buffs"
```

---

## Task 6: Add Heal Flash to AnimationSystem

When a heal effect occurs (lifesteal, heal power), show a green flash on the player.

**Files:**
- Modify: `src/ecs/systems/animation.ts`
- Modify: `src/ecs/components.ts` (add color to flash type)

### Step 1: Update flash type in components.ts

Update the `flash` type in `visualEffects` to include color:

```typescript
flash?: { color?: 'white' | 'red' | 'green' | 'gold'; untilTick: number };
```

### Step 2: Handle heal in spell_cast case

In `animation.ts`, extend the `spell_cast` case:

```typescript
case 'spell_cast': {
  if (event.payload.type === 'spell' && event.payload.powerId) {
    // Damage spell - impact on enemy
    const enemy = enemyQuery.first;
    if (enemy) {
      if (!enemy.visualEffects) enemy.visualEffects = {};
      enemy.visualEffects.powerImpact = {
        powerId: event.payload.powerId,
        untilTick: event.displayUntilTick,
      };
    }
  } else if (event.payload.type === 'heal') {
    // Heal spell - green flash on player
    const player = getPlayer();
    if (player) {
      if (!player.visualEffects) player.visualEffects = {};
      player.visualEffects.flash = {
        color: 'green',
        untilTick: currentTick + 3, // ~48ms green flash
      };
      // Add floating heal text
      addFloatingEffect(gameState, event.payload, 'player');
    }
  }
  break;
}
```

### Step 3: Update addFloatingEffect to handle heal type

The `addFloatingEffect` function already handles `heal` type - verify it works.

### Step 4: Commit

```bash
git add src/ecs/systems/animation.ts src/ecs/components.ts
git commit -m "feat(ecs): add green flash for heal effects"
```

---

## Task 7: Update CharacterSprite Flash to Use Color

Update the flash rendering in CharacterSprite to use the color from visualEffects.

**Files:**
- Modify: `src/components/game/CharacterSprite.tsx`

### Step 1: Add flashColor prop

Add to CharacterSpriteProps:
```tsx
flashColor?: 'white' | 'red' | 'green' | 'gold';
```

### Step 2: Update flash rendering

Find where flash overlay is rendered and update:

```tsx
{isFlashing && (
  <div
    className={cn(
      'absolute inset-0 pointer-events-none rounded animate-flash',
      flashColor === 'green' && 'bg-green-500/50',
      flashColor === 'gold' && 'bg-yellow-400/50',
      flashColor === 'red' && 'bg-red-500/50',
      (!flashColor || flashColor === 'white') && 'bg-white/50'
    )}
  />
)}
```

### Step 3: Pass flashColor from BattleArena

In BattleArena.tsx, pass the flash color:

```tsx
flashColor={player?.visualEffects?.flash?.color}
```

### Step 4: Commit

```bash
git add src/components/game/CharacterSprite.tsx src/components/game/BattleArena.tsx
git commit -m "feat(ui): support colored flash effects (green heal, gold proc)"
```

---

## Task 8: Final Integration Test

Run full E2E test to verify all visual effects work together.

**Files:**
- Test manually in browser

### Step 1: Run dev server

```bash
npm run dev
```

### Step 2: Test checklist

- [ ] Start as Warrior, select Berserker path
- [ ] Use Rage Strike - see fire burst on enemy
- [ ] Use Savage Slam (if available) - see shockwave on enemy
- [ ] Use Berserker Roar - see buff icons with timers appear above player
- [ ] While buffed - see pulsing aura around player
- [ ] If power has lifesteal - see green flash on player

### Step 3: Run full test suite

```bash
npx vitest run
npm run build
```

### Step 4: Final commit

```bash
git add -A
git commit -m "feat: complete power visual feedback implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Process spell_cast in AnimationSystem | animation.ts, components.ts |
| 2 | Add powerImpact to snapshot | snapshot.ts |
| 3 | Create PowerImpactEffect component | PowerImpactEffect.tsx, CharacterSprite.tsx, index.css |
| 4 | Wire through BattleArena | BattleArena.tsx |
| 5 | Add BuffAura component | BuffAura.tsx, CharacterSprite.tsx, index.css |
| 6 | Add heal flash to AnimationSystem | animation.ts, components.ts |
| 7 | Support colored flash in UI | CharacterSprite.tsx, BattleArena.tsx |
| 8 | Integration test | manual testing |
