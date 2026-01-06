# Enchanter Stances Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Enchanter's stat-only stances with unique combat mechanics (Arcane Burn proc, Hex Veil aura).

**Architecture:** Add two new stance behaviors (`arcane_burn`, `hex_aura`) to the existing stance system. Arcane Burn applies a new `burn` status effect. Hex Veil reduces enemy damage via a passive aura check in combat.

**Tech Stack:** TypeScript, ECS (miniplex), Vitest for tests

---

## Task 1: Add `burn` Status Effect Type

**Files:**
- Modify: `src/types/game.ts:39`
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`

**Step 1: Write failing test for burn status effect**

Add to `src/ecs/systems/__tests__/status-effect.test.ts`:

```typescript
it('should apply burn damage over time', () => {
  const entity = world.add({
    player: true,
    health: { current: 100, max: 100 },
    statusEffects: [
      {
        id: 'burn-1',
        type: 'burn',
        damage: 5,
        remainingTurns: 3,
        icon: 'flame',
      },
    ],
  });

  // Simulate 1 second
  StatusEffectSystem(1000);

  // Should take 5 damage (5 dps * 1s)
  expect(entity.health?.current).toBe(95);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/status-effect.test.ts -t "burn"`
Expected: FAIL - 'burn' is not a valid status effect type

**Step 3: Add burn to StatusEffect type**

In `src/types/game.ts:39`, change:
```typescript
type: 'poison' | 'stun' | 'slow' | 'bleed';
```
to:
```typescript
type: 'poison' | 'stun' | 'slow' | 'bleed' | 'burn';
```

**Step 4: Update StatusEffectSystem to handle burn**

In `src/ecs/systems/status-effect.ts:80`, change:
```typescript
if ((effect.type === 'poison' || effect.type === 'bleed') && effect.damage) {
```
to:
```typescript
if ((effect.type === 'poison' || effect.type === 'bleed' || effect.type === 'burn') && effect.damage) {
```

And update the log message around line 87:
```typescript
const effectName = effect.type === 'poison' ? 'Poison' : effect.type === 'bleed' ? 'Bleed' : 'Burn';
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/status-effect.test.ts -t "burn"`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types/game.ts src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/status-effect.test.ts
git commit -m "feat: add burn status effect type for Arcane Burn"
```

---

## Task 2: Add New Stance Behaviors to Types

**Files:**
- Modify: `src/types/paths.ts:239-243`

**Step 1: Add new behaviors to StanceBehavior type**

In `src/types/paths.ts:239-243`, change:
```typescript
export type StanceBehavior =
  | 'reflect_damage'
  | 'counter_attack'
  | 'auto_block'
  | 'lifesteal';
```
to:
```typescript
export type StanceBehavior =
  | 'reflect_damage'
  | 'counter_attack'
  | 'auto_block'
  | 'lifesteal'
  | 'arcane_burn'    // Chance on hit to deal bonus damage + apply burn DoT
  | 'hex_aura';      // Passive: enemies deal reduced damage
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/paths.ts
git commit -m "feat: add arcane_burn and hex_aura stance behaviors"
```

---

## Task 3: Update Enchanter Stance Definitions

**Files:**
- Modify: `src/data/stances.ts:55-80`
- Test: `src/data/__tests__/stances.test.ts`

**Step 1: Write test for new Enchanter stances**

Add to `src/data/__tests__/stances.test.ts`:

```typescript
describe('Enchanter stances', () => {
  it('should have arcane_burn behavior on Arcane Surge', () => {
    const stances = getStancesForPath('enchanter');
    const arcaneSurge = stances.find(s => s.id === 'arcane_surge');

    expect(arcaneSurge).toBeDefined();
    const burnEffect = arcaneSurge!.effects.find(
      e => e.type === 'behavior_modifier' && e.behavior === 'arcane_burn'
    );
    expect(burnEffect).toBeDefined();
  });

  it('should have hex_aura behavior on Hex Veil', () => {
    const stances = getStancesForPath('enchanter');
    const hexVeil = stances.find(s => s.id === 'hex_veil');

    expect(hexVeil).toBeDefined();
    const hexEffect = hexVeil!.effects.find(
      e => e.type === 'behavior_modifier' && e.behavior === 'hex_aura'
    );
    expect(hexEffect).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/stances.test.ts -t "Enchanter"`
Expected: FAIL - stances not found

**Step 3: Replace Enchanter stance definitions**

In `src/data/stances.ts`, replace lines 51-80 (the entire `ENCHANTER_STANCES` section):

```typescript
// ============================================================================
// ENCHANTER STANCES (Mage - Passive Path)
// ============================================================================

export const ENCHANTER_STANCES: PassiveStance[] = [
  {
    id: 'arcane_surge',
    name: 'Arcane Surge',
    description: '+15% Power, +10% Speed. 20% chance to proc Arcane Burn (bonus damage + DoT).',
    icon: 'sparkles',
    effects: [
      { type: 'stat_modifier', stat: 'power', percentBonus: 0.15 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
  {
    id: 'hex_veil',
    name: 'Hex Veil',
    description: '+15% Armor, +10% Speed. Enemies deal 15% less damage.',
    icon: 'shield-alert',
    effects: [
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.15 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'hex_aura', value: 0.15 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
];
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/stances.test.ts -t "Enchanter"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/stances.ts src/data/__tests__/stances.test.ts
git commit -m "feat: redesign Enchanter stances with arcane_burn and hex_aura"
```

---

## Task 4: Implement Arcane Burn in Combat System

**Files:**
- Modify: `src/ecs/systems/combat.ts` (after lifesteal section, ~line 254)
- Test: `src/ecs/systems/__tests__/combat.test.ts`

**Step 1: Write failing test for arcane_burn proc**

Add to `src/ecs/systems/__tests__/combat.test.ts`:

```typescript
describe('Arcane Burn stance behavior', () => {
  it('should apply burn status effect when arcane_burn procs', () => {
    // Mock Math.random to always proc (return < 0.20)
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const gameState = world.add({
      phase: 'combat' as const,
      floor: { number: 1, room: 1, totalRooms: 5 },
      combatLog: [],
    });

    const player = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: { baseDamage: 10, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
      speed: { value: 10, attackInterval: 2000, accumulated: 0 },
      statusEffects: [],
      path: { pathId: 'enchanter', abilities: [] },
      stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
    });
    world.addComponent(player, 'attackReady', { damage: 10, isCrit: false });

    const enemy = world.add({
      enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
      health: { current: 100, max: 100 },
      defense: { value: 0, blockReduction: 0 },
      statusEffects: [],
    });

    CombatSystem(16);

    // Should have burn status effect on enemy
    expect(enemy.statusEffects?.some(e => e.type === 'burn')).toBe(true);

    mockRandom.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts -t "Arcane Burn"`
Expected: FAIL - no burn effect applied

**Step 3: Implement arcane_burn in combat.ts**

After the lifesteal section (~line 254), add:

```typescript
      // Apply arcane burn from stance (chance to deal bonus damage + apply burn DoT)
      const arcaneBurnChance = getStanceBehavior(entity, 'arcane_burn');
      if (arcaneBurnChance > 0 && Math.random() < arcaneBurnChance) {
        // Bonus damage: 30% of attack damage
        const bonusDamage = Math.round(damage * 0.3);
        if (bonusDamage > 0 && target.health) {
          target.health.current = Math.max(0, target.health.current - bonusDamage);
        }

        // Apply burn DoT: 5 damage per second for 3 seconds
        if (!target.statusEffects) {
          target.statusEffects = [];
        }
        target.statusEffects.push({
          id: `burn-${Date.now()}`,
          type: 'burn',
          damage: 5,
          remainingTurns: 3,
          icon: 'flame',
        });

        addCombatLog(`Arcane Burn! ${bonusDamage} bonus damage + burning for 15`);
      }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts -t "Arcane Burn"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/__tests__/combat.test.ts
git commit -m "feat: implement arcane_burn stance behavior"
```

---

## Task 5: Implement Hex Aura in Combat System

**Files:**
- Modify: `src/ecs/systems/combat.ts` (in enemy attack section, before armor calculation)
- Test: `src/ecs/systems/__tests__/combat.test.ts`

**Step 1: Write failing test for hex_aura damage reduction**

Add to `src/ecs/systems/__tests__/combat.test.ts`:

```typescript
describe('Hex Aura stance behavior', () => {
  it('should reduce enemy damage by 15% when hex_aura is active', () => {
    const gameState = world.add({
      phase: 'combat' as const,
      floor: { number: 1, room: 1, totalRooms: 5 },
      combatLog: [],
    });

    const player = world.add({
      player: true,
      health: { current: 100, max: 100 },
      defense: { value: 0, blockReduction: 0 },
      statusEffects: [],
      path: { pathId: 'enchanter', abilities: [] },
      stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0, triggerCooldowns: {} },
    });

    const enemy = world.add({
      enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
      health: { current: 100, max: 100 },
      attack: { baseDamage: 100, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
      speed: { value: 10, attackInterval: 2000, accumulated: 0 },
    });
    world.addComponent(enemy, 'attackReady', { damage: 100, isCrit: false });

    CombatSystem(16);

    // 100 damage - 15% hex reduction = 85 damage
    // Player should have 100 - 85 = 15 HP
    expect(player.health?.current).toBe(15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts -t "Hex Aura"`
Expected: FAIL - player takes 100 damage instead of 85

**Step 3: Implement hex_aura in combat.ts**

In the enemy attack section (after auto_block check, before damage calculation), around line 133, add:

```typescript
      // Apply hex aura damage reduction (passive aura weakens enemies)
      const hexReduction = getStanceBehavior(target, 'hex_aura');
      if (hexReduction > 0) {
        damage = Math.round(damage * (1 - hexReduction));
        damage = Math.max(1, damage);
      }
```

Note: This should be placed right after the auto_block check and before `let damage = attackData.damage;` is modified by other effects. The exact location is around line 134, before the power modifier section.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts -t "Hex Aura"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/__tests__/combat.test.ts
git commit -m "feat: implement hex_aura stance behavior"
```

---

## Task 6: Run Full Test Suite and Verify

**Step 1: Run all ECS tests**

Run: `npx vitest run src/ecs`
Expected: All tests pass (330+ tests)

**Step 2: Run E2E tests**

Run: `npx playwright test --project="Desktop"`
Expected: All tests pass (61 tests)

**Step 3: Manual browser verification**

1. Start dev server: `npm run dev`
2. Select Mage → Enchanter path
3. Verify Arcane Surge stance shows correct description
4. Verify Hex Veil stance shows correct description
5. In combat, switch to Arcane Surge and watch for "Arcane Burn!" in combat log
6. Switch to Hex Veil and verify reduced incoming damage

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify Enchanter stances work in browser"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Add burn status effect | types/game.ts, status-effect.ts |
| 2 | Add stance behavior types | types/paths.ts |
| 3 | Update Enchanter stances | data/stances.ts |
| 4 | Implement arcane_burn | ecs/systems/combat.ts |
| 5 | Implement hex_aura | ecs/systems/combat.ts |
| 6 | Full verification | - |
