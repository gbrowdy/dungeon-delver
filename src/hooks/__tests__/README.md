# Unit Tests for Item Effect Processing

This directory contains unit tests for the `processItemEffects` function from `useItemEffects.ts`.

## Setup Instructions

The test dependencies are already listed in `package.json`. If they're not installed, run:

```bash
npm install
```

This will install:
- `vitest` - Test framework
- `@vitest/ui` - UI for test results

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Coverage

The test suite covers:

### Trigger Types
- `TURN_START` - Effects that trigger at the start of each turn
- `ON_HIT` - Effects that trigger when the player hits an enemy
- `ON_CRIT` - Effects that trigger on critical hits
- `ON_KILL` - Effects that trigger when an enemy is killed
- `ON_DAMAGED` - Effects that trigger when the player takes damage

### Effect Types
- `HEAL` - Healing effects that restore HP
- `DAMAGE` - Damage effects (flat bonus or multiplier)
- `MANA` - Mana restoration effects

### Chance-Based Effects
- Tests for effects with probability < 100%
- Tests for default 100% chance when undefined
- Tests for 0% chance (never triggers)
- Mock-based deterministic testing of random outcomes

### Edge Cases
- No equipped items
- Items without effects
- Items with wrong trigger types
- Multiple items with same/different triggers
- Health/mana capped at maximum values
- Original player object immutability
- Missing damage context for damage calculations

## Test Structure

Each test follows this pattern:

1. **Setup** - Create a test player with specific stats
2. **Arrange** - Create items with effects and equip them
3. **Act** - Call `processItemEffects` with the appropriate context
4. **Assert** - Verify the results match expected behavior

## Example Test

```typescript
it('should heal player on TURN_START trigger', () => {
  const player = createTestPlayer({
    currentStats: { ...createTestPlayer().currentStats, health: 30 },
  });
  const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
  player.equippedItems = [item];

  const context: ItemEffectContext = {
    trigger: ITEM_EFFECT_TRIGGER.TURN_START,
    player,
  };

  const result = processItemEffects(context);

  expect(result.player.currentStats.health).toBe(40);
  expect(result.logs).toContain('🔮 Regenerated 10 HP');
  expect(result.additionalDamage).toBe(0);
});
```

## Test Helpers

- `createTestPlayer(overrides?)` - Creates a minimal test player with customizable properties
- `createTestItem(trigger, type, value, chance?)` - Creates an item with a specific effect

## Notes

- Tests use `vi.spyOn(Math, 'random')` to mock random chance calculations
- Player immutability is verified to ensure no unintended mutations
- All tests are isolated and can run in any order
