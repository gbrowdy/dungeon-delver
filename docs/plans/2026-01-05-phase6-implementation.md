# Phase 6: Active Path Resources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make path resources (Fury, Arcane Charges, Momentum, Zeal) functional - powers consume/generate resources, amplify effects trigger at thresholds.

**Architecture:** PowerSystem checks `pathResource` before `mana`. Spend-type resources (Fury, Momentum, Zeal) are deducted on cast. Gain-type resources (Arcane Charges) are added on cast. Threshold effects apply damage bonuses or special effects.

**Tech Stack:** TypeScript, miniplex ECS, Vitest unit tests, Playwright E2E

---

## Already Completed (Previous Session)

The following files have been modified and are ready:

| File | Status | Changes |
|------|--------|---------|
| `src/types/game.ts` | ✅ Done | Added `resourceBehavior: 'spend' \| 'gain'` to PathResource, added `resourceCost?: number` to Power |
| `src/data/pathResources.ts` | ✅ Done | Updated configs: Arcane max=100, added resourceBehavior, removed decay from Momentum/Zeal/Fury |
| `src/ecs/systems/resource-generation.ts` | ✅ Done | New system generates resources from combat triggers |
| `src/ecs/systems/path-ability.ts` | ✅ Done | Added `getPendingTriggers()` export |
| `src/ecs/systems/index.ts` | ✅ Done | Registered ResourceGenerationSystem |
| `src/components/game/ResourceBar.tsx` | ✅ Done | Added test-ids |
| `e2e/resource-generation.spec.ts` | ✅ Done | E2E tests for resource generation |

---

## Remaining Tasks

### Task 1: PowerSystem - Add Resource Check Logic

**Files:**
- Modify: `src/ecs/systems/power.ts:16` (query definition)
- Modify: `src/ecs/systems/power.ts:231-260` (resource checking logic)
- Test: `src/ecs/systems/__tests__/power.test.ts`

**Step 1: Write failing test for spend-type resource check**

Create or modify `src/ecs/systems/__tests__/power.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { PowerSystem } from '../power';
import type { Entity } from '../../components';

describe('PowerSystem', () => {
  beforeEach(() => {
    // Clear world
    for (const entity of world) {
      world.remove(entity);
    }
  });

  describe('path resource consumption', () => {
    it('should deduct spend-type resource when casting power', () => {
      // Create game state entity
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
      };
      world.add(gameState);

      // Create player with Fury (spend-type resource)
      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 10, variance: { min: 1, max: 1 } },
        powers: [{
          id: 'test-power',
          name: 'Test Power',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'fury',
          current: 50,
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      };
      world.add(player);

      // Create enemy target
      const enemy: Entity = {
        enemy: { name: 'Goblin', experienceReward: 10, goldReward: 5 },
        health: { current: 50, max: 50 },
        defense: { value: 0 },
      };
      world.add(enemy);

      // Run PowerSystem
      PowerSystem(16);

      // Fury should be deducted
      expect(player.pathResource?.current).toBe(20); // 50 - 30 = 20
    });

    it('should reject cast if not enough spend-type resource', () => {
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
      };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'test-power',
          name: 'Test Power',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'fury',
          current: 20, // Not enough (need 30)
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      };
      world.add(player);

      PowerSystem(16);

      // Fury should NOT be deducted, casting should be cleared
      expect(player.pathResource?.current).toBe(20);
      expect(player.casting).toBeUndefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/ecs/systems/__tests__/power.test.ts --reporter=verbose
```

Expected: FAIL - current implementation requires mana component.

**Step 3: Modify casting query to not require mana**

In `src/ecs/systems/power.ts`, change line ~16:

```typescript
// OLD:
const castingQuery = world.with('casting', 'powers', 'mana');

// NEW:
const castingQuery = world.with('casting', 'powers');
```

**Step 4: Add resource check logic before mana check**

In `src/ecs/systems/power.ts`, replace the mana check section (~lines 248-259):

```typescript
    // Check resource requirements
    // Priority: pathResource (active paths) > mana (pre-level-2)
    if (entity.pathResource && entity.pathResource.type !== 'mana') {
      const resource = entity.pathResource;
      const cost = power.resourceCost ?? power.manaCost;

      if (resource.resourceBehavior === 'gain') {
        // Arcane Charges: casting ADDS to resource
        const newValue = resource.current + cost;
        if (newValue > resource.max) {
          addCombatLog(`Arcane overload! Cannot cast ${power.name}`);
          world.removeComponent(entity, 'casting');
          continue;
        }
        resource.current = newValue;
      } else {
        // Fury/Momentum/Zeal: casting COSTS resource
        if (resource.current < cost) {
          const resourceName = resource.type.replace('_', ' ');
          addCombatLog(`Not enough ${resourceName} to cast ${power.name}`);
          world.removeComponent(entity, 'casting');
          continue;
        }
        resource.current -= cost;
      }
    } else if (entity.mana) {
      // Pre-level-2: use mana
      if (entity.mana.current < power.manaCost) {
        addCombatLog(`Not enough mana to cast ${power.name}`);
        world.removeComponent(entity, 'casting');
        continue;
      }
      entity.mana.current = Math.max(0, entity.mana.current - power.manaCost);
    }
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/ecs/systems/__tests__/power.test.ts --reporter=verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/ecs/systems/power.ts src/ecs/systems/__tests__/power.test.ts
git commit -m "feat(ecs): PowerSystem checks pathResource before mana"
```

---

### Task 2: PowerSystem - Add Gain-Type Resource Test

**Files:**
- Test: `src/ecs/systems/__tests__/power.test.ts`

**Step 1: Write failing test for gain-type resource (Arcane Charges)**

Add to `src/ecs/systems/__tests__/power.test.ts`:

```typescript
    it('should ADD to gain-type resource when casting power', () => {
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
      };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 10, variance: { min: 1, max: 1 } },
        powers: [{
          id: 'fireball',
          name: 'Fireball',
          description: 'Test',
          manaCost: 30,
          resourceCost: 40, // Adds 40 charges
          cooldown: 3,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'arcane_charges',
          current: 30,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
          decay: { rate: 5, tickInterval: 1000 },
        },
        casting: { powerId: 'fireball', startedAtTick: 0 },
        cooldowns: new Map(),
      };
      world.add(player);

      const enemy: Entity = {
        enemy: { name: 'Goblin', experienceReward: 10, goldReward: 5 },
        health: { current: 50, max: 50 },
        defense: { value: 0 },
      };
      world.add(enemy);

      PowerSystem(16);

      // Arcane charges should INCREASE
      expect(player.pathResource?.current).toBe(70); // 30 + 40 = 70
    });

    it('should reject cast at max gain-type resource', () => {
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
      };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'fireball',
          name: 'Fireball',
          description: 'Test',
          manaCost: 30,
          resourceCost: 40,
          cooldown: 3,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'arcane_charges',
          current: 80, // 80 + 40 = 120 > max 100
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'fireball', startedAtTick: 0 },
        cooldowns: new Map(),
      };
      world.add(player);

      PowerSystem(16);

      // Should be rejected, charges unchanged
      expect(player.pathResource?.current).toBe(80);
      expect(player.casting).toBeUndefined();
      expect(gameState.combatLog).toContain('Arcane overload! Cannot cast Fireball');
    });
```

**Step 2: Run test to verify it passes (already implemented)**

```bash
npx vitest run src/ecs/systems/__tests__/power.test.ts --reporter=verbose
```

Expected: PASS (if Task 1 was done correctly)

**Step 3: Commit if tests pass**

```bash
git add src/ecs/systems/__tests__/power.test.ts
git commit -m "test(ecs): add gain-type resource tests for PowerSystem"
```

---

### Task 3: PowerSystem - Add Amplify Damage Bonus

**Files:**
- Modify: `src/ecs/systems/power.ts:77-92` (calculatePowerDamage function)
- Test: `src/ecs/systems/__tests__/power.test.ts`

**Step 1: Write failing test for Fury amplify bonus**

Add to `src/ecs/systems/__tests__/power.test.ts`:

```typescript
  describe('amplify threshold effects', () => {
    it('should apply +30% damage when Fury >= 80', () => {
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        animationEvents: [],
      };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 100, variance: { min: 1, max: 1 } }, // Fixed variance for test
        powers: [{
          id: 'test-power',
          name: 'Strike',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.0, // 100% damage = 100 base
          icon: 'test',
        }],
        pathResource: {
          type: 'fury',
          current: 80, // At threshold
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
          thresholds: [{
            value: 80,
            effect: { type: 'damage_bonus', value: 0.3, description: '+30% damage' },
          }],
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      };
      world.add(player);

      const enemy: Entity = {
        enemy: { name: 'Goblin', experienceReward: 10, goldReward: 5 },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
      };
      world.add(enemy);

      PowerSystem(16);

      // Base 100 damage * 1.3 amplify = 130 damage
      // Enemy should have 200 - 130 = 70 HP
      expect(enemy.health?.current).toBe(70);
    });
  });
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/ecs/systems/__tests__/power.test.ts --reporter=verbose
```

Expected: FAIL - current implementation doesn't apply amplify bonus.

**Step 3: Modify calculatePowerDamage to check thresholds**

In `src/ecs/systems/power.ts`, modify `calculatePowerDamage`:

```typescript
function calculatePowerDamage(caster: Entity, power: Power, target: Entity): number {
  const baseDamage = caster.attack?.baseDamage ?? 10;
  const multiplier = power.value;

  // Apply variance (similar to combat)
  const variance = caster.attack?.variance ?? { min: 0.85, max: 1.15 };
  const varianceMultiplier = variance.min + Math.random() * (variance.max - variance.min);

  let damage = Math.round(baseDamage * multiplier * varianceMultiplier);

  // Apply amplify threshold bonuses from pathResource
  if (caster.pathResource?.thresholds) {
    for (const threshold of caster.pathResource.thresholds) {
      if (caster.pathResource.current >= threshold.value) {
        if (threshold.effect.type === 'damage_bonus') {
          // For arcane_charges, bonus is per-charge (0.5% per charge)
          if (caster.pathResource.type === 'arcane_charges') {
            const bonus = caster.pathResource.current * threshold.effect.value;
            damage = Math.round(damage * (1 + bonus));
          } else {
            // Fixed bonus (e.g., 30% for Fury at 80+)
            damage = Math.round(damage * (1 + threshold.effect.value));
          }
        }
      }
    }
  }

  // Apply target defense
  const defense = target.defense?.value ?? 0;
  damage = Math.max(1, damage - defense);

  return damage;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/ecs/systems/__tests__/power.test.ts --reporter=verbose
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/power.ts src/ecs/systems/__tests__/power.test.ts
git commit -m "feat(ecs): add amplify damage bonus for path resource thresholds"
```

---

### Task 4: InputSystem - Remove Mana on Active Path Selection

**Files:**
- Modify: `src/ecs/systems/input.ts:304-338` (SELECT_PATH handler)
- Test: `src/ecs/systems/__tests__/input.test.ts`

**Step 1: Write failing test for mana removal**

Create or modify `src/ecs/systems/__tests__/input.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { InputSystem } from '../input';
import { dispatch } from '../../commands';
import type { Entity } from '../../components';

describe('InputSystem - Path Selection', () => {
  beforeEach(() => {
    for (const entity of world) {
      world.remove(entity);
    }
  });

  it('should remove mana component when selecting active path', () => {
    const gameState: Entity = {
      gameState: true,
      phase: 'path-select',
      floor: { number: 1, room: 1, totalRooms: 5 },
    };
    world.add(gameState);

    const player: Entity = {
      player: true,
      identity: { name: 'Hero' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 }, // Has mana pre-path selection
      powers: [{ id: 'fireball', name: 'Fireball', description: '', manaCost: 30, cooldown: 5, effect: 'damage', value: 1.5, icon: '' }],
      progression: { level: 2, experience: 0, experienceToNext: 100 },
    };
    world.add(player);

    // Select Berserker (active path)
    dispatch({ type: 'SELECT_PATH', pathId: 'berserker' });
    InputSystem(16);

    // Mana should be removed
    expect(player.mana).toBeUndefined();
    // pathResource should be added
    expect(player.pathResource).toBeDefined();
    expect(player.pathResource?.type).toBe('fury');
  });

  it('should remove mana and powers when selecting passive path', () => {
    const gameState: Entity = {
      gameState: true,
      phase: 'path-select',
      floor: { number: 1, room: 1, totalRooms: 5 },
    };
    world.add(gameState);

    const player: Entity = {
      player: true,
      identity: { name: 'Hero' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      powers: [{ id: 'fireball', name: 'Fireball', description: '', manaCost: 30, cooldown: 5, effect: 'damage', value: 1.5, icon: '' }],
      progression: { level: 2, experience: 0, experienceToNext: 100 },
    };
    world.add(player);

    // Select Guardian (passive path)
    dispatch({ type: 'SELECT_PATH', pathId: 'guardian' });
    InputSystem(16);

    // Mana should be removed
    expect(player.mana).toBeUndefined();
    // Powers should be cleared
    expect(player.powers).toEqual([]);
    // pathResource should NOT be added (passive paths have no resource)
    expect(player.pathResource).toBeUndefined();
    // stanceState should be added
    expect(player.stanceState).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/ecs/systems/__tests__/input.test.ts --reporter=verbose
```

Expected: FAIL - mana is not being removed.

**Step 3: Modify SELECT_PATH handler to remove mana**

In `src/ecs/systems/input.ts`, modify the SELECT_PATH case (~line 304-338):

```typescript
      case 'SELECT_PATH': {
        if (!player || !gameState) break;

        // Get the path definition to check if it's active
        const pathDef = getPathById(cmd.pathId);

        // Store the selected path on player
        player.path = {
          pathId: cmd.pathId,
          subpathId: undefined,
          abilities: [],
          abilityCooldowns: {},
        };

        // Remove mana for ALL paths (active uses pathResource, passive uses nothing)
        if (player.mana) {
          world.removeComponent(player, 'mana');
        }

        // Initialize pathResource for active paths
        if (pathDef?.type === 'active' && PATH_RESOURCES[cmd.pathId]) {
          player.pathResource = getPathResource(cmd.pathId);
        }

        // Initialize stance state for passive paths
        if (pathDef?.type === 'passive') {
          // Clear powers - passive paths use stances, not powers
          player.powers = [];

          const defaultStanceId = getDefaultStanceId(cmd.pathId);
          if (defaultStanceId) {
            player.stanceState = {
              activeStanceId: defaultStanceId,
              stanceCooldownRemaining: 0,
              triggerCooldowns: {},
            };
          }
        }

        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/ecs/systems/__tests__/input.test.ts --reporter=verbose
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/input.ts src/ecs/systems/__tests__/input.test.ts
git commit -m "feat(ecs): remove mana on path selection, clear powers for passive"
```

---

### Task 5: InputSystem - Fix Power Activation for pathResource

**Files:**
- Modify: `src/ecs/systems/input.ts:27-46` (ACTIVATE_POWER handler)
- Test: `src/ecs/systems/__tests__/input.test.ts`

**Step 1: Write failing test for power activation with pathResource**

Add to `src/ecs/systems/__tests__/input.test.ts`:

```typescript
  describe('Power Activation', () => {
    it('should allow power activation with sufficient pathResource', () => {
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
      };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'strike',
          name: 'Strike',
          description: '',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: '',
        }],
        pathResource: {
          type: 'fury',
          current: 50,
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        cooldowns: new Map(),
      };
      world.add(player);

      dispatch({ type: 'ACTIVATE_POWER', powerId: 'strike' });
      InputSystem(16);

      // Should set casting component
      expect(player.casting).toBeDefined();
      expect(player.casting?.powerId).toBe('strike');
    });

    it('should reject power activation with insufficient pathResource', () => {
      const gameState: Entity = {
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
      };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'strike',
          name: 'Strike',
          description: '',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: '',
        }],
        pathResource: {
          type: 'fury',
          current: 20, // Not enough
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        cooldowns: new Map(),
      };
      world.add(player);

      dispatch({ type: 'ACTIVATE_POWER', powerId: 'strike' });
      InputSystem(16);

      // Should NOT set casting component
      expect(player.casting).toBeUndefined();
    });
  });
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/ecs/systems/__tests__/input.test.ts --reporter=verbose
```

Expected: FAIL - current code only checks mana.

**Step 3: Modify ACTIVATE_POWER to check pathResource**

In `src/ecs/systems/input.ts`, modify the ACTIVATE_POWER case (~line 27-46):

```typescript
      case 'ACTIVATE_POWER': {
        if (!player || !player.powers) break;

        const power = player.powers.find((p) => p.id === cmd.powerId);
        if (!power) break;

        // Check cooldown
        const cooldown = player.cooldowns?.get(cmd.powerId);
        if (cooldown && cooldown.remaining > 0) break;

        // Check resource - pathResource takes priority over mana
        if (player.pathResource && player.pathResource.type !== 'mana') {
          const cost = power.resourceCost ?? power.manaCost;
          if (player.pathResource.resourceBehavior === 'spend') {
            if (player.pathResource.current < cost) break;
          } else {
            // Gain type (arcane charges) - check if would overflow
            if (player.pathResource.current + cost > player.pathResource.max) break;
          }
        } else if (player.mana) {
          if (player.mana.current < power.manaCost) break;
        } else {
          // No resource system - can't cast (passive paths shouldn't have powers)
          break;
        }

        // Mark as casting - PowerSystem will handle the effect
        world.addComponent(player, 'casting', {
          powerId: cmd.powerId,
          startedAtTick: getTick(),
        });
        break;
      }
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/ecs/systems/__tests__/input.test.ts --reporter=verbose
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/input.ts src/ecs/systems/__tests__/input.test.ts
git commit -m "feat(ecs): InputSystem checks pathResource for power activation"
```

---

### Task 6: Add resourceCost to Power Data

**Files:**
- Modify: `src/data/powers.ts:47-55` (PowerDefinition interface)
- Modify: `src/data/powers.ts:350-361` (UNLOCKABLE_POWERS mapping)

**Step 1: Add resourceCost field to PowerDefinition**

In `src/data/powers.ts`, update interface:

```typescript
interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  manaCost: number;
  resourceCost?: number; // For active path resources
  cooldown: number;
  category: 'strike' | 'burst' | 'execute' | 'control' | 'buff' | 'sacrifice' | 'heal';
  effect: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  synergies: PowerSynergy[];
  maxLevel?: number;
  additionalEffects?: string;
}
```

**Step 2: Update UNLOCKABLE_POWERS mapping**

```typescript
export const UNLOCKABLE_POWERS: Power[] = POWER_DEFINITIONS.map(def => ({
  id: def.id,
  name: def.name,
  description: def.description,
  manaCost: def.manaCost,
  resourceCost: def.resourceCost, // Pass through
  cooldown: def.cooldown,
  effect: def.effect,
  value: def.value,
  icon: def.icon,
  category: def.category,
  synergies: def.synergies,
}));
```

**Step 3: Commit**

```bash
git add src/data/powers.ts
git commit -m "feat(data): add resourceCost field to power definitions"
```

---

### Task 7: Run Full Test Suite

**Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Run E2E tests**

```bash
npx playwright test e2e/resource-generation.spec.ts --project="Desktop"
```

Expected: All tests pass.

**Step 3: Run full E2E suite**

```bash
npx playwright test --project="Desktop"
```

Expected: All tests pass.

---

### Task 8: Manual Browser Validation

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test Berserker flow**

1. Select Warrior class
2. Fight until level 2
3. Select Berserker path
4. Verify:
   - Mana bar is gone
   - Fury bar appears (red)
   - Fury generates on hits
   - Powers cost Fury (not mana)
   - At 80+ Fury, damage is amplified

**Step 3: Test Archmage flow**

1. Select Mage class
2. Fight until level 2
3. Select Archmage path
4. Verify:
   - Mana bar is gone
   - Arcane Charges bar appears (purple, 0/100)
   - Casting power ADDS charges
   - Charges decay over time
   - At 100 charges, can't cast
   - Damage scales with charge count

**Step 4: Test Passive path flow**

1. Select Warrior class
2. Fight until level 2
3. Select Guardian path (passive)
4. Verify:
   - No resource bar (no mana, no pathResource)
   - Powers are removed (power buttons gone)
   - Stances appear

---

### Task 9: Final Commit

**Step 1: Stage all changes**

```bash
git add -A
```

**Step 2: Create summary commit**

```bash
git commit -m "feat(ecs): implement Phase 6 active path resources

- PowerSystem checks pathResource before mana
- Spend-type resources (Fury, Momentum, Zeal) are deducted on cast
- Gain-type resources (Arcane Charges) are added on cast
- Amplify damage bonuses apply at thresholds
- InputSystem removes mana on path selection
- Passive paths clear powers, use stances
- Added unit tests for resource logic
- Verified with E2E tests"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | PowerSystem resource check | Unit |
| 2 | Gain-type resource tests | Unit |
| 3 | Amplify damage bonus | Unit |
| 4 | Remove mana on path select | Unit |
| 5 | Power activation with pathResource | Unit |
| 6 | Add resourceCost to powers | None |
| 7 | Run full test suite | All |
| 8 | Manual browser validation | Manual |
| 9 | Final commit | None |

**Estimated time:** 30-45 minutes
