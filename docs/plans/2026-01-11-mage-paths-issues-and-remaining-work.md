# Mage Paths Implementation - Issues & Remaining Work

> **Status: INCOMPLETE - DO NOT MERGE**
>
> **Created:** 2026-01-11
> **Branch:** `feature/mage-path-rewrite`

---

## Executive Summary

The mage path implementation on this branch is **fundamentally broken**. The Archmage path shows Berserker powers instead of Archmage powers. Most Enchanter effects are defined as data but never implemented. E2E tests pass but don't verify correct behavior.

---

## Critical Bugs

### BUG-1: Archmage Path Shows Berserker Powers (CRITICAL)

**Severity:** CRITICAL - Feature completely non-functional

**Evidence:**
```
E2E test output when selecting Archmage:
Found powers: {
  hasArcaneBolt: false,      // Archmage power NOT shown
  hasMeteorStrike: false,    // Archmage power NOT shown
  hasRageStrike: true,       // Berserker power shown instead!
  hasSavageSlam: true        // Berserker power shown instead!
}
```

**Root Cause:**

In `src/ecs/systems/input.ts:414`:
```typescript
if (isPowerLevel) {
  const choices = getBerserkerPowerChoices(currentLevel);  // WRONG!
  // Should check player.path.pathId and call appropriate function
}
```

In `src/ecs/systems/progression.ts:99`:
```typescript
if (isPowerLevel) {
  const choices = getBerserkerPowerChoices(newLevel);  // WRONG!
  // Same issue - hardcoded to Berserker
}
```

**The function `getArchmagePowerChoices` exists in `src/data/paths/archmage-powers.ts` but is NEVER imported or called.**

**Fix Required:**
1. Import `getArchmagePowerChoices` in both files
2. Check `player.path?.pathId` or `player.identity?.class` to determine which power choices function to call
3. Add similar logic for future classes (Rogue, Paladin)

**Files to modify:**
- `src/ecs/systems/input.ts`
- `src/ecs/systems/progression.ts`

---

### BUG-2: Plan Never Included Wiring Step

**Severity:** CRITICAL - Planning failure

The implementation plan (`docs/plans/2026-01-09-mage-paths-implementation.md`) has 22 tasks across 6 phases. **None of them wire powers to path selection.**

Tasks 2.1-2.7 create power data files with exports like `getArchmagePowerChoices()`.
Task 4.2 updates `power.ts` for power mechanics.

**Missing task:** "Update input.ts and progression.ts to use path-specific power choices"

This was a planning oversight, not an implementation oversight.

---

## Unimplemented Features

### Enchanter Hex Effects (7 of 11 NOT IMPLEMENTED)

The plan (Tasks 4.3-4.5) only implemented 4 hex effects. The remaining 7 are defined in data but **do nothing**.

| Effect | Tier | Location Needed | Status |
|--------|------|-----------------|--------|
| `hexDamageReduction` | 1 | `combat.ts` | ✅ Implemented |
| `hexSlowPercent` | 2 | `combat.ts` or `attack-timing.ts` | ❌ NOT IMPLEMENTED |
| `hexDamageAmp` | 3 | `combat.ts` | ✅ Implemented |
| `hexRegen` | 4 | `regen.ts` or `passive-effect.ts` | ❌ NOT IMPLEMENTED |
| `hexIntensity` | 5 | Multiplier for other effects | ✅ Implemented (used by others) |
| `hexLifesteal` | 6 | `combat.ts` | ❌ NOT IMPLEMENTED |
| `hexArmorReduction` | 7 | `combat.ts` | ❌ NOT IMPLEMENTED |
| `hexReflect` | 8 | `combat.ts` or `passive-effect.ts` | ❌ NOT IMPLEMENTED |
| `hexDamageAura` | 9 | `passive-effect.ts` | ✅ Implemented |
| `hexHealOnEnemyAttack` | 12 | `combat.ts` (on enemy attack) | ❌ NOT IMPLEMENTED |
| `hexDisableAbilities` | 13 | `enemy-ability.ts` | ✅ Implemented |

**What this means:** Players can acquire Tier 2, 4, 6, 7, 8, 12 Hex Veil enhancements that literally do nothing.

---

### Enchanter Burn Effects (11 of 11 NOT IMPLEMENTED)

All burn effects are defined in `enchanter-enhancements.ts` and computed in `passive-effect.ts`, but `status-effect.ts` **never reads these computed values**.

| Effect | Tier | What It Should Do | Status |
|--------|------|-------------------|--------|
| `burnDamagePercent` | 1, 11 | Multiply burn tick damage | ❌ NOT IMPLEMENTED |
| `burnProcChance` | 2, 9 | Chance to apply burn on hit | ❌ NOT IMPLEMENTED |
| `burnDurationBonus` | 3 | Extend burn duration | ❌ NOT IMPLEMENTED |
| `burnMaxStacks` | 4 | Allow multiple burn stacks | ❌ NOT IMPLEMENTED |
| `burnTickRate` | 5 | Faster burn ticks | ❌ NOT IMPLEMENTED |
| `damageVsBurning` | 6 | Bonus damage to burning enemies | ❌ NOT IMPLEMENTED |
| `critRefreshesBurn` | 7 | Crits refresh burn duration | ❌ NOT IMPLEMENTED |
| `lifestealFromBurns` | 8 | Heal from burn damage | ❌ NOT IMPLEMENTED |
| `burnExecuteBonus` | 10 | Extra burn damage to low HP | ❌ NOT IMPLEMENTED |
| `burnIgnoresArmor` | 12 | Burn bypasses armor | ❌ NOT IMPLEMENTED |
| `burnCanCrit` | 13 | Burn ticks can crit | ❌ NOT IMPLEMENTED |

**Current behavior:** Burn DoT in `status-effect.ts:27-49` uses `effect.damage` directly with no modifiers. The computed values are calculated but never used.

**What this means:** The entire Arcane Surge stance enhancement tree (13 tiers) does almost nothing. Only the base stance effects work.

---

### Arcane Surge Stance - Burn Proc Not Implemented

The Arcane Surge stance in `stances.ts:55-66` defines:
```typescript
{ type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
```

This `arcane_burn` behavior is **never processed anywhere**. There's no code that:
1. Checks for `arcane_burn` behavior on player
2. Rolls the 20% chance on hit
3. Applies a burn status effect

**Files that would need modification:**
- `src/ecs/systems/combat.ts` - Check for arcane_burn behavior on hit
- `src/ecs/systems/status-effect.ts` - Process burn with computed modifiers

---

## Missing E2E Tests

### Comparison: Warrior vs Mage E2E Coverage

| Test Category | Warrior Tests | Mage Tests |
|--------------|---------------|------------|
| **Power Mechanics** | `berserker-mechanics.spec.ts` (6 tests) | ❌ NONE |
| | - Savage Slam applies stun | |
| | - Reckless Charge self-damage | |
| | - Berserker Roar buff | |
| | - Rage Strike usability | |
| | - Multiple powers available | |
| | - Fury resource display | |
| **Progression Flow** | `berserker-progression.spec.ts` (6 tests) | ❌ NONE |
| | - Power choice at level 2 | |
| | - Upgrade choice at level 3 | |
| | - Second power at level 4 | |
| | - Powers in power bar | |
| | - Path resource display | |
| | - Upgraded power affects combat | |
| **Stance Enhancements** | `guardian-progression.spec.ts` (3 tests) | ❌ NONE |
| | - Enhancement choice at level 3 | |
| | - Enhancements affect stats | |
| | - Multiple enhancements | |
| **Path Selection** | (covered in progression tests) | `mage-paths.spec.ts` (7 tests) |
| | | ⚠️ Only checks UI exists |
| | | ⚠️ Doesn't verify correct powers |

### What Mage E2E Tests Actually Check

From `e2e/mage-paths.spec.ts`:

```typescript
// Test: "Archmage should have power buttons visible"
const powerButton = page.locator('[data-testid^="power-"]').first();
expect(powerExists).toBe(true);  // Just checks ANY button exists!
```

This test passes even though the wrong powers (Berserker) are shown.

### Required Mage E2E Tests

1. **`archmage-mechanics.spec.ts`** - Equivalent to `berserker-mechanics.spec.ts`
   - Arcane Bolt deals correct damage
   - Meteor Strike applies stun (when upgraded)
   - Arcane Empowerment applies buffs
   - Arcane Weakness applies vulnerable debuff
   - Siphon Soul heals player
   - Arcane Surge resets cooldowns
   - Arcane Charges resource increments correctly

2. **`archmage-progression.spec.ts`** - Equivalent to `berserker-progression.spec.ts`
   - Level 2 shows Arcane Bolt AND Meteor Strike (not Berserker powers!)
   - Choosing a power adds it to power bar
   - Level 3 shows upgrade choice
   - Level 4 shows second power choice
   - Level 6 shows third power choice

3. **`enchanter-progression.spec.ts`** - Equivalent to `guardian-progression.spec.ts`
   - Level 3 shows stance enhancement choices
   - Choosing Arcane Surge enhancement affects burn
   - Choosing Hex Veil enhancement affects damage reduction
   - Stance toggle switches active stance
   - Enhancement effects apply to combat

---

## Unit Tests Status

### Passing But Misleading

The Archmage integration tests in `src/ecs/systems/__tests__/archmage-integration.test.ts` pass because they test powers **directly**:

```typescript
// This test bypasses path selection entirely
player.powers = [ARCHMAGE_POWERS.arcane_bolt];
player.casting = { powerId: 'arcane_bolt', startedAtTick: 0 };
PowerSystem(16);
```

This proves the power mechanics work in isolation. It does NOT prove:
- Path selection gives correct powers
- Level-up gives correct power choices
- The game flow actually uses Archmage powers

### Missing Unit Tests

1. `input.ts` - No tests for path-aware power choice selection
2. `progression.ts` - No tests for path-aware level-up power choices
3. `status-effect.ts` - No tests for burn effect modifiers
4. `combat.ts` - No tests for hex slow, lifesteal, armor reduction, reflect

---

## Files Requiring Changes

### Critical (Archmage Powers Don't Work)

| File | Change Required |
|------|-----------------|
| `src/ecs/systems/input.ts` | Add path-aware power choice selection |
| `src/ecs/systems/progression.ts` | Add path-aware level-up power choices |

### High (Enchanter Effects Don't Work)

| File | Change Required |
|------|-----------------|
| `src/ecs/systems/combat.ts` | Add hexSlowPercent, hexLifesteal, hexArmorReduction, hexReflect, hexHealOnEnemyAttack, burn proc |
| `src/ecs/systems/status-effect.ts` | Use computed burn modifiers instead of hardcoded values |
| `src/ecs/systems/regen.ts` | Add hexRegen processing |
| `src/ecs/systems/attack-timing.ts` | Add hexSlowPercent to enemy attack speed |

### E2E Tests (Verification Missing)

| File | Change Required |
|------|-----------------|
| `e2e/archmage-mechanics.spec.ts` | CREATE - Test power mechanics in browser |
| `e2e/archmage-progression.spec.ts` | CREATE - Test level-up flow with correct powers |
| `e2e/enchanter-progression.spec.ts` | CREATE - Test stance enhancements |
| `e2e/mage-paths.spec.ts` | UPDATE - Verify correct power names shown |

---

## Recommended Fix Order

### Phase 1: Critical Fix (Archmage Playable)
1. Fix `input.ts` to use `getArchmagePowerChoices` for Archmage path
2. Fix `progression.ts` to use `getArchmagePowerChoices` for Archmage path
3. Write E2E test verifying correct powers shown
4. Browser test: Start Mage → Select Archmage → Verify Arcane Bolt/Meteor Strike

### Phase 2: Enchanter Hex Effects
1. Implement `hexSlowPercent` in `attack-timing.ts`
2. Implement `hexLifesteal` in `combat.ts`
3. Implement `hexArmorReduction` in `combat.ts`
4. Implement `hexReflect` in `combat.ts` or `passive-effect.ts`
5. Implement `hexRegen` in `regen.ts`
6. Implement `hexHealOnEnemyAttack` in `combat.ts`
7. Write unit tests for each
8. Browser test: Verify effects work

### Phase 3: Enchanter Burn Effects
1. Add `arcane_burn` behavior processing in `combat.ts`
2. Update `status-effect.ts` to use computed burn modifiers
3. Implement all 11 burn computed effects
4. Write unit tests
5. Browser test: Verify burns apply and scale with enhancements

### Phase 4: E2E Test Coverage
1. Create `archmage-mechanics.spec.ts`
2. Create `archmage-progression.spec.ts`
3. Create `enchanter-progression.spec.ts`
4. Update existing `mage-paths.spec.ts` to verify correct content

---

## Lessons Learned

1. **Plans must include wiring steps** - Creating data without connecting it to the game flow is useless
2. **E2E tests must verify content, not just existence** - Checking "a button exists" doesn't catch showing wrong buttons
3. **Browser validation is mandatory** - Unit tests passing doesn't mean the feature works
4. **Define explicit acceptance criteria** - "Archmage path works" means "selecting Archmage shows Archmage powers and they function correctly"

---

## Appendix: Code Snippets for Reference

### Current Broken Code (input.ts:414)

```typescript
if (pathDef?.type === 'active' && player.progression) {
  const currentLevel = player.progression.level;
  const isPowerLevel = [2, 4, 6, 8].includes(currentLevel);

  if (isPowerLevel) {
    // BUG: Always uses Berserker regardless of path
    const choices = getBerserkerPowerChoices(currentLevel);
    if (choices.length > 0) {
      world.addComponent(player, 'pendingPowerChoice', {
        level: currentLevel,
        choices,
      });
      gameState.paused = true;
    }
  }
}
```

### Required Fix Pattern

```typescript
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { getArchmagePowerChoices } from '@/data/paths/archmage-powers';

// In the power choice section:
if (isPowerLevel) {
  let choices: Power[] = [];

  // Select correct power choices based on path
  if (player.path?.pathId === 'berserker') {
    choices = getBerserkerPowerChoices(currentLevel);
  } else if (player.path?.pathId === 'archmage') {
    choices = getArchmagePowerChoices(currentLevel);
  }
  // TODO: Add assassin, duelist, crusader, protector when implemented

  if (choices.length > 0) {
    world.addComponent(player, 'pendingPowerChoice', {
      level: currentLevel,
      choices,
    });
    gameState.paused = true;
  }
}
```

---

**Document Author:** Claude (automated validation)
**Validation Method:** E2E test creation and execution, code review, plan analysis
