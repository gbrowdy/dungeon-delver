# ECS Computed State Design

**Date:** 2026-01-06
**Status:** Ready for implementation
**Branch:** feature/berserker-power-definitions

## Problem Statement

Power upgrades and stance enhancements are stored but never applied in combat:

1. **Power upgrades** - Tier 1/2 bonuses (damage, cooldown, cost, special effects) stored in `pathProgression.powerUpgrades` but `PowerSystem` reads base power values
2. **Stance enhancements** - Guardian's 26 enhancement bonuses stored in `stanceProgression.acquiredEnhancements` but `getActiveStanceEffects()` only returns base stance effects
3. **UI violations** - 14 components compute game state instead of rendering precomputed data from ECS

## Design Principles

1. **ECS-pure architecture** - Derived data computed by systems, stored in components, UI only renders
2. **Extensibility** - Warrior paths (Berserker/Guardian) are the template for all future paths
3. **E2E validation** - Browser tests verify full pipeline: ECS computation → snapshot → React render

## Architecture

### Data Flow

```
Commands (SELECT_POWER, UPGRADE_POWER, etc.)
    ↓
InputSystem recomputes derived state
    ↓
Components store computed values (effectivePowers, effectiveStanceEffects, etc.)
    ↓
Snapshot copies to React
    ↓
UI renders precomputed values (no computation)
```

### New Components

Add to `Entity` in `src/ecs/components.ts`:

```typescript
effectivePowers?: Power[];           // Powers with upgrade stats merged
effectiveStanceEffects?: StanceEffect[];  // Base stance + enhancements
derivedStats?: {
  critChance: number;
  critDamage: number;
  dodgeChance: number;
};
weaponVariant?: 'sword' | 'dagger' | 'staff' | 'mace';
```

Extend `PathResource`:

```typescript
activeThresholds?: Threshold[];  // Thresholds currently met
resourceLabel?: string;          // Display name
```

Extend `Power` in snapshot:

```typescript
canUse?: boolean;        // Precomputed usability
effectiveCost?: number;  // Cost after reductions
```

## File Changes

### New Files

**`src/utils/powerUpgrades.ts`**

```typescript
// Registry pattern for path-specific upgrade lookups
const upgradeRegistry: Record<string, UpgradeLookup> = {
  berserker: getBerserkerPowerUpgrade,
  // Future paths add one line here
};

// Core functions
export function computeEffectivePower(entity: Entity, basePower: Power): Power
export function getPowerUpgradeTier(entity: Entity, powerId: string): 0 | 1 | 2
export function getUpgradeDefinition(pathId: string, powerId: string, tier: 1 | 2): PowerUpgrade | undefined

// Merge strategy: cumulative (Base → T1 → T2)
// Uses explicit field list to prevent property bleed
const UPGRADE_FIELDS = ['value', 'cooldown', 'resourceCost', 'guaranteedCrit', 'stunDuration', ...] as const;
```

### Modified Files

**`src/ecs/systems/input.ts`**

- After `SELECT_POWER`: call `recomputeEffectivePowers(player)`
- After `UPGRADE_POWER`: call `recomputeEffectivePowers(player)`
- After `SELECT_STANCE_ENHANCEMENT`: call `recomputeEffectiveStanceEffects(player)`
- After `SWITCH_STANCE`: call `recomputeEffectiveStanceEffects(player)`

**`src/ecs/systems/power.ts`**

```typescript
// Before:
const power = entity.powers?.find(p => p.id === castingData.powerId);

// After:
const power = entity.effectivePowers?.find(p => p.id === castingData.powerId);
```

**`src/utils/stanceUtils.ts`**

```typescript
// Registry for enhancement lookups
const enhancementRegistry: Record<string, EnhancementLookup> = {
  guardian: getGuardianEnhancement,
  // Future paths add one line here
};

// Modified to read from component
export function getActiveStanceEffects(entity: Entity): StanceEffect[] {
  return entity.effectiveStanceEffects ?? [];
}

// New helper for recomputation
export function computeEffectiveStanceEffects(entity: Entity): StanceEffect[]
```

**`src/ecs/snapshot.ts`**

Add all new computed fields to `PlayerSnapshot`:

```typescript
effectivePowers: player.effectivePowers ?? [],
effectiveStanceEffects: player.effectiveStanceEffects ?? [],
derivedStats: player.derivedStats,
weaponVariant: player.weaponVariant,
```

**UI Components (remove computation, use snapshot):**

| Component | Remove | Use Instead |
|-----------|--------|-------------|
| `PlayerStatsPanel.tsx` | `getCritChance()`, etc. | `player.derivedStats.critChance` |
| `PowersPanel.tsx` | `getPowerModifiers()` | `power.effectiveCost` |
| `PowerButton.tsx` | `canAfford` calculation | `power.canUse` |
| `CharacterSprite.tsx` | `getWeaponVariant()` | `player.weaponVariant` |
| `ResourceBar.tsx` | threshold filtering | `resource.activeThresholds` |
| `StanceEnhancementPopup.tsx` | `dispatch(Commands...)` | `actions.selectStanceEnhancement()` |

## Implementation Phases

### Phase 1: Core Fixes (Original Issue)
1. Create `src/utils/powerUpgrades.ts` with merge logic
2. Add `effectivePowers` to components, recompute in InputSystem
3. Update PowerSystem to use `effectivePowers`
4. Fix `stanceUtils.ts` to include enhancements
5. Add `effectiveStanceEffects` component
6. **E2E test:** Verify upgrades affect combat damage

### Phase 2: Snapshot Expansion
7. Add derived stats to snapshot (`critChance`, `dodgeChance`, `critDamage`)
8. Add `canUse` to powers in snapshot
9. Add `effectiveCost` to powers
10. Add `activeThresholds` to PathResource
11. Add `weaponVariant` to player
12. **E2E test:** Verify all stats render correctly

### Phase 3: UI Cleanup
13. Update `PlayerStatsPanel` - remove fortune util calls
14. Update `PowerButton` - use precomputed `canUse`
15. Update `PowersPanel` - use precomputed costs
16. Update `CharacterSprite` - use `weaponVariant`
17. Update `ResourceBar` - use precomputed thresholds
18. Fix `StanceEnhancementPopup` dispatch inconsistency
19. **E2E test:** Full regression pass

### Phase 4: Lower Priority (Optional)
20. Move `abilityChoices` computation to snapshot
21. Move `shopState` computation to system
22. Precompute `lastCombatEvent` format

## Testing Strategy

**E2E tests are primary** - verify full pipeline from ECS to rendered UI.

### E2E Tests (extend `e2e/berserker-progression.spec.ts`)

```typescript
describe('Power upgrades render correctly and affect combat', () => {
  it('PowersPanel shows upgraded damage value after upgrade')
  it('PowersPanel shows reduced cooldown after upgrade')
  it('upgraded power deals more damage than base (check combat log)')
  it('upgraded power cooldown is shorter (check cooldown timer)')
  it('tier 2 guaranteedCrit triggers (check combat log for crit)')
})

describe('Guardian stance enhancements render and affect combat', () => {
  it('StanceToggle shows enhanced armor value')
  it('player takes less damage with armor enhancement active')
})

describe('Derived stats render from snapshot', () => {
  it('crit chance displays correctly in PlayerStatsPanel')
  it('power usability disables button correctly')
  it('active thresholds highlight in ResourceBar')
})
```

### Unit Tests (secondary, for complex logic)

- `src/utils/__tests__/powerUpgrades.test.ts` - cumulative merge logic
- `src/utils/__tests__/stanceUtils.test.ts` - enhancement effect conversion

## Extensibility

### Adding a New Active Path (e.g., Archmage)

1. Create `src/data/paths/archmage-powers.ts` with power definitions and upgrades
2. Add to registry in `powerUpgrades.ts`:
   ```typescript
   archmage: getArchmagePowerUpgrade,
   ```
3. Done - existing systems handle the rest

### Adding a New Passive Path (e.g., Chronomancer)

1. Create `src/data/paths/chronomancer-enhancements.ts` with enhancement definitions
2. Add to registry in `stanceUtils.ts`:
   ```typescript
   chronomancer: getChronomancerEnhancement,
   ```
3. Done - existing systems handle the rest

## UI Violations Audit

Full list of UI components that compute game state (all addressed in Phase 2-3):

| Component | Violation | Priority |
|-----------|-----------|----------|
| `PlayerStatsPanel.tsx:353-356` | Fortune stat calculations | High |
| `PowersPanel.tsx:35-38` | Effective mana cost calculation | High |
| `PowerButton.tsx:136-149` | Power usability calculation | High |
| `CharacterSprite.tsx:101-109` | Weapon variant lookup | High |
| `ResourceBar.tsx:31-41` | Active threshold filtering | High |
| `Game.tsx:20-34` | Ability choices computation | Medium |
| `Game.tsx:37-41` | Shop state generation | Medium |
| `BattleArena.tsx:61-114` | Animation event transformation | Medium |
| `CombatHeader.tsx:38-41` | Room progress calculation | Low |
| `CharacterSprite.tsx:95-98` | Health percentage | Low |
| `FloorCompleteScreen.tsx:172` | Crit display formatting | Low |

## Estimated Scope

- **Files modified:** ~15-20
- **Lines changed:** ~500-800
- **New files:** 1 (`src/utils/powerUpgrades.ts`)
- **Test files:** 2-3 extended
