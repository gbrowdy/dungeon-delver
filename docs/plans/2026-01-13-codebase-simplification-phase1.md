# Codebase Simplification - Phase 1: Foundation + Quick Wins

**Date:** 2026-01-13
**Status:** Draft
**Goal:** Make the codebase navigable for Claude Code by establishing clear naming, removing deprecated patterns, and splitting monolithic data files.

---

## Problem Statement

The codebase has grown to a point where Claude Code frequently "loses the thread" or only half-implements changes. Root causes:

1. **Confusing naming** - `statUtils`, `statsUtils`, `stateUtils` are nearly identical names for unrelated functionality
2. **Conflicting patterns** - Rogue/Paladin use deprecated patterns that confuse AI when looking for examples
3. **Monolithic files** - `powers.ts` (517 lines) and `enemies.ts` (598 lines) mix data with logic, requiring full file reads for small changes

## Success Criteria

- No file over 300 lines (except tests)
- Clear, distinct names that describe actual purpose
- Only working patterns visible in the codebase
- Data definitions separated from business logic

---

## Part 1: Naming Convention Fixes

### Utility Renames

| Current | New Name | Purpose |
|---------|----------|---------|
| `src/utils/statUtils.ts` | `src/utils/fortuneDerivedStats.ts` | Computes crit/dodge from fortune stat |
| `src/utils/statsUtils.ts` | `src/utils/playerMutations.ts` | Player state mutations (heal, buff, resource gen) |
| `src/utils/stateUtils.ts` | `src/utils/cloneUtils.ts` | Deep clone functions for Player/Enemy |

### Constant Renames

| Current | New Name | Purpose |
|---------|----------|---------|
| `src/constants/animation.ts` | `src/constants/combatTiming.ts` | Combat animation timings (attack, death, effects) |
| `src/constants/animations.ts` | `src/constants/uiTransitions.ts` | UI animation presets (durations, easings) |

### Implementation Steps

1. Rename each file using git mv
2. Update all imports (use grep to find them)
3. Run `npm run build` to verify no broken imports
4. Run `npx vitest run` to verify tests pass

---

## Part 2: Quarantine Deprecated Patterns

### Create Design Documents

Extract design intent from deprecated code before deletion.

**Create `docs/class-designs/rogue.md`:**
- Class identity and fantasy
- Path concepts (Assassin/Duelist)
- Key ability ideas worth preserving
- Existing asset references (sprites, icons, UI elements)

**Create `docs/class-designs/paladin.md`:**
- Class identity and fantasy
- Path concepts (Crusader/Protector)
- Key ability ideas worth preserving
- Existing asset references (sprites, icons, UI elements)

### Delete Deprecated Code

1. Delete `src/data/paths/rogue.ts`
2. Delete `src/data/paths/paladin.ts`
3. Update `src/data/paths/registry.ts`:

```typescript
// Remove these imports
import { ROGUE_PATHS } from './rogue';
import { PALADIN_PATHS } from './paladin';

// Update registry
const PATH_REGISTRY: Record<string, PathDefinition[]> = {
  warrior: Object.values(WARRIOR_PATHS),
  mage: MAGE_PATHS,
  // rogue and paladin removed - see docs/class-designs/
};
```

### Assets Preserved (NOT deleted)

- Sprites in `src/data/sprites.ts` - keep all rogue/paladin sprites
- Character animations in `CharacterSprite.tsx` - unchanged
- Class icons - keep for future use
- Any UI elements in ClassSelect.tsx - will show "Coming Soon" or be hidden

---

## Part 3: Split Monolithic Data Files

### Powers Directory Structure

**Before:** `src/data/powers.ts` (517 lines)

**After:**
```
src/data/powers/
├── index.ts              # Re-exports for backwards compatibility
├── definitions.ts        # POWER_DEFINITIONS array (~180 lines)
├── upgrades.ts           # Upgrade config and logic (~120 lines)
└── utils.ts              # getRandomPower, getPowerChoices (~80 lines)
```

**index.ts pattern:**
```typescript
// Backwards-compatible re-exports
export { POWER_DEFINITIONS, UNLOCKABLE_POWERS } from './definitions';
export { POWER_UPGRADE_CONFIG, generatePowerUpgradeOffer, applyPowerUpgrade } from './upgrades';
export { getRandomPower, getRandomPowers, getPowerChoices, isPowerUpgrade } from './utils';
export type { PowerChoice } from './utils';
```

### Enemies Directory Structure

**Before:** `src/data/enemies.ts` (598 lines)

**After:**
```
src/data/enemies/
├── index.ts              # Re-exports for backwards compatibility
├── names.ts              # ENEMY_NAMES, ABILITY_COMBO_PREFIXES (~60 lines)
├── abilities.ts          # ENEMY_ABILITIES, pools, getEnemyAbilities (~150 lines)
├── scaling.ts            # Difficulty multipliers, stat scaling (~100 lines)
├── intent.ts             # calculateEnemyIntent (~50 lines)
└── generator.ts          # generateEnemy main function (~150 lines)
```

**index.ts pattern:**
```typescript
// Backwards-compatible re-exports
export { generateEnemy } from './generator';
export { calculateEnemyIntent } from './intent';
export { getAbilityById } from './abilities';
```

### Implementation Steps

1. Create new directory structure
2. Move code to appropriate files (copy, don't cut initially)
3. Create index.ts with re-exports
4. Update original file to re-export from index (temporary)
5. Run tests to verify nothing broke
6. Delete original file, update any direct imports
7. Run final test pass

---

## Part 4: Verification Checklist

After all changes:

- [ ] `npm run build` passes with no errors
- [ ] `npx vitest run` - all tests pass
- [ ] `npx playwright test --project="Desktop"` - E2E tests pass
- [ ] Warrior class playable (menu → class select → path select → combat)
- [ ] Mage class playable (menu → class select → path select → combat)
- [ ] Rogue/Paladin not selectable (expected - removed from registry)
- [ ] No TypeScript errors in IDE

---

## Files Changed Summary

### Renames (5 files)
- `src/utils/statUtils.ts` → `fortuneDerivedStats.ts`
- `src/utils/statsUtils.ts` → `playerMutations.ts`
- `src/utils/stateUtils.ts` → `cloneUtils.ts`
- `src/constants/animation.ts` → `combatTiming.ts`
- `src/constants/animations.ts` → `uiTransitions.ts`

### New Files (4 files)
- `docs/class-designs/rogue.md`
- `docs/class-designs/paladin.md`
- `src/data/powers/` directory (4 files)
- `src/data/enemies/` directory (6 files)

### Deleted Files (3 files)
- `src/data/paths/rogue.ts`
- `src/data/paths/paladin.ts`
- `src/data/powers.ts` (after split)
- `src/data/enemies.ts` (after split)

### Modified Files (~20 files)
- All files importing renamed utils/constants
- `src/data/paths/registry.ts`
- Test files for renamed modules

---

## Future Phases (Out of Scope)

**Phase 2: Component Decomposition**
- Split ShopScreen.tsx (846 lines)
- Split ClassSelect.tsx (651 lines)
- Split PlayerStatsPanel.tsx (624 lines)

**Phase 3: System Cleanup**
- Split power.ts system (517 lines)
- Split combat.ts system (455 lines)
- Consolidate related utilities

**Phase 4: Type Refinement**
- Restructure Entity interface (50+ properties)
- Group types by domain

---

## Notes

- Sprites and animations for Rogue/Paladin are preserved for future use
- All re-exports maintain backwards compatibility during transition
- Tests must pass at each step before proceeding
