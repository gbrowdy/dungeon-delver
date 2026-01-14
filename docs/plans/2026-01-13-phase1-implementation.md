# Phase 1: Codebase Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the codebase navigable for Claude Code by establishing clear naming, removing deprecated patterns, and splitting monolithic data files.

**Architecture:** Rename confusing files, delete deprecated code (preserving design docs), and split 500+ line data files into focused modules with backwards-compatible re-exports.

**Tech Stack:** TypeScript, Vite, Vitest

---

## Task 1: Rename statUtils.ts → fortuneDerivedStats.ts

**Files:**
- Rename: `src/utils/statUtils.ts` → `src/utils/fortuneDerivedStats.ts`
- Modify: `src/ecs/factories/index.ts`
- Modify: `src/ecs/systems/input-handlers/shopHandlers.ts`

**Step 1: Rename the file**

```bash
cd /Users/gilbrowdy/rogue
git mv src/utils/statUtils.ts src/utils/fortuneDerivedStats.ts
```

**Step 2: Update import in factories/index.ts**

In `src/ecs/factories/index.ts`, change:
```typescript
// OLD
import { computeDerivedStats } from '@/utils/statUtils';

// NEW
import { computeDerivedStats } from '@/utils/fortuneDerivedStats';
```

**Step 3: Update import in shopHandlers.ts**

In `src/ecs/systems/input-handlers/shopHandlers.ts`, change:
```typescript
// OLD
import { recomputeDerivedStats } from '@/utils/statUtils';

// NEW
import { recomputeDerivedStats } from '@/utils/fortuneDerivedStats';
```

**Step 4: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 5: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename statUtils → fortuneDerivedStats for clarity"
```

---

## Task 2: Rename stateUtils.ts → cloneUtils.ts

**Files:**
- Rename: `src/utils/stateUtils.ts` → `src/utils/cloneUtils.ts`
- Modify: `src/utils/damageUtils.ts`
- Modify: `src/utils/statsUtils.ts`
- Modify: `src/utils/statusEffectUtils.ts`

**Step 1: Rename the file**

```bash
git mv src/utils/stateUtils.ts src/utils/cloneUtils.ts
```

**Step 2: Update import in damageUtils.ts**

In `src/utils/damageUtils.ts`, change:
```typescript
// OLD
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

// NEW
import { deepClonePlayer, deepCloneEnemy } from '@/utils/cloneUtils';
```

**Step 3: Update import in statsUtils.ts**

In `src/utils/statsUtils.ts`, change:
```typescript
// OLD
import { deepClonePlayer } from '@/utils/stateUtils';

// NEW
import { deepClonePlayer } from '@/utils/cloneUtils';
```

**Step 4: Update import in statusEffectUtils.ts**

In `src/utils/statusEffectUtils.ts`, change:
```typescript
// OLD
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

// NEW
import { deepClonePlayer, deepCloneEnemy } from '@/utils/cloneUtils';
```

**Step 5: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 6: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename stateUtils → cloneUtils for clarity"
```

---

## Task 3: Rename statsUtils.ts → playerMutations.ts

**Files:**
- Rename: `src/utils/statsUtils.ts` → `src/utils/playerMutations.ts`
- Search and update all imports

**Step 1: Find all imports**

```bash
grep -r "from '@/utils/statsUtils'" src/
```

**Step 2: Rename the file**

```bash
git mv src/utils/statsUtils.ts src/utils/playerMutations.ts
```

**Step 3: Update all imports**

Find and replace in all files that import from statsUtils:
```typescript
// OLD
import { ... } from '@/utils/statsUtils';

// NEW
import { ... } from '@/utils/playerMutations';
```

**Step 4: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 5: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename statsUtils → playerMutations for clarity"
```

---

## Task 4: Rename animation.ts → combatTiming.ts

**Files:**
- Rename: `src/constants/animation.ts` → `src/constants/combatTiming.ts`
- Modify: `src/App.tsx`
- Modify: `src/constants/game.ts` (if it imports)

**Step 1: Rename the file**

```bash
git mv src/constants/animation.ts src/constants/combatTiming.ts
```

**Step 2: Update import in App.tsx**

In `src/App.tsx`, change:
```typescript
// OLD
import { getAnimationCSSVariables } from "@/constants/animation";

// NEW
import { getAnimationCSSVariables } from "@/constants/combatTiming";
```

**Step 3: Check for other imports**

```bash
grep -r "from '@/constants/animation'" src/
```

Update any found.

**Step 4: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 5: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename animation → combatTiming for clarity"
```

---

## Task 5: Delete unused animations.ts

**Files:**
- Delete: `src/constants/animations.ts`

**Step 1: Verify file is unused**

```bash
grep -r "from '@/constants/animations'" src/
grep -r "DURATIONS\|EASINGS\|TRANSITIONS\|DURATION_CLASSES\|TRANSITION_CLASSES" src/ --include="*.ts" --include="*.tsx" | grep -v "animations.ts"
```

Expected: No matches (file is unused).

**Step 2: Delete the file**

```bash
git rm src/constants/animations.ts
```

**Step 3: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused animations.ts constants file"
```

---

## Task 6: Create Rogue Design Document

**Files:**
- Create: `docs/class-designs/rogue.md`

**Step 1: Create the design document**

Create `docs/class-designs/rogue.md`:

```markdown
# Rogue Class Design

## Class Identity

**Fantasy:** Master of precision and evasion. High risk/reward gameplay focused on timing and positioning.

**Core Feel:** Fast, deadly, fragile. Rewards skilled play with explosive damage.

## Existing Assets

### Sprites
- Character sprite key: `rogue` in `src/data/sprites.ts`
- All standard animations (idle, attack, hit, death) in CharacterSprite.tsx

### Icons
- Class icon: `class-rogue`
- Path icons:
  - `ability-paths-rogue-assassin`
  - `ability-paths-rogue-duelist` (if exists)
  - `ability-paths-rogue-shadowblade`
  - `ability-paths-rogue-nightstalker`

### UI References
- Class appears in `ClassSelect.tsx` class list
- Rogue-specific colors/theming may exist in constants

## Paths

### Assassin (Active Path)
**Fantasy:** Strike from the shadows with devastating burst damage and chain kills into unstoppable momentum.

**Resource:** Momentum (builds on attacks, spent on finishers)

**Subpaths:**
- **Shadowblade** - Crit mastery: guaranteed crits, massive crit damage multipliers
- **Nightstalker** - Kill chains: cooldown resets on kill, snowballing bonuses

**Key Ability Concepts:**
- Vital Strike: Power abilities have guaranteed crit, +50% crit damage
- Ambush: First attack against each enemy is guaranteed crit with +100% damage
- Deadly Precision: +15% crit chance, +75% crit damage
- Shadow Dance: Brief invulnerability window after killing an enemy
- Execute: Massive damage to low-HP targets, instant reset on kill

### Duelist (Passive Path)
**Fantasy:** Counter and evade. Turn enemy aggression against them.

**Mechanic:** Stance-based with dodge/counter synergies

**Subpaths:**
- **Swashbuckler** - Dodging grants stacking crit chance
- **Phantom** - Automatic dodge every X attacks received

**Key Ability Concepts:**
- Riposte: Counter-attack after successful dodge
- Blade Dance: Increased dodge chance, attacks grant dodge stacks
- Evasion Mastery: Dodge chance bonuses and dodge-triggered effects
- Phantom Step: Guaranteed dodge every N enemy attacks

## Implementation Notes

When rebuilding Rogue:
1. Follow Warrior pattern: active path (like Berserker) and passive path (like Guardian)
2. Resource system should use `src/data/pathResources.ts` pattern
3. Powers go in `src/data/paths/assassin-powers.ts`
4. Enhancements go in `src/data/paths/duelist-enhancements.ts`
5. Main definition in `src/data/paths/rogue.ts`
6. Register in `src/data/paths/registry.ts`
```

**Step 2: Commit**

```bash
git add docs/class-designs/rogue.md
git commit -m "docs: preserve Rogue class design for future implementation"
```

---

## Task 7: Create Paladin Design Document

**Files:**
- Create: `docs/class-designs/paladin.md`

**Step 1: Create the design document**

Create `docs/class-designs/paladin.md`:

```markdown
# Paladin Class Design

## Class Identity

**Fantasy:** Holy warrior balancing offense and defense. Righteous judgment and divine protection.

**Core Feel:** Sturdy, methodical, rewarding. Consistent damage with strong survivability.

## Existing Assets

### Sprites
- Character sprite key: `paladin` in `src/data/sprites.ts`
- All standard animations (idle, attack, hit, death) in CharacterSprite.tsx

### Icons
- Class icon: `class-paladin`
- Path icons:
  - `ability-paths-paladin-crusader` (if exists)
  - `ability-paths-paladin-protector` (if exists)
  - `ability-paths-paladin-templar`
  - `ability-paths-paladin-inquisitor`
  - `ability-paths-paladin-sentinel`
  - `ability-paths-paladin-martyr`

### UI References
- Class appears in `ClassSelect.tsx` class list
- Paladin has base HP regen (0.5) - see `hpRegen` in player factory

## Paths

### Crusader (Active Path)
**Fantasy:** Channel holy power through timed strikes and righteous judgment.

**Resource:** Zeal (builds through combat, spent on holy abilities)

**Subpaths:**
- **Templar** - Holy burst damage, light damage bonuses, smite power
- **Inquisitor** - Enemy debuffs, armor reduction, marking enemies

**Key Ability Concepts:**
- Holy Strike: Attacks deal bonus holy damage based on armor stat
- Righteous Fury: Crits trigger holy burst dealing +50% bonus damage
- Smite the Wicked: +30% damage to debuffed enemies
- Divine Judgment: Massive holy damage, bonus vs low-HP enemies
- Consecration: AoE holy damage over time

### Protector (Passive Path)
**Fantasy:** Self-sustaining survival. Outlast enemies through divine protection.

**Mechanic:** Stance-based with healing/mitigation focus

**Subpaths:**
- **Sentinel** - HP regeneration scaling, healing amplification
- **Martyr** - Damage reduction, survive lethal hits

**Key Ability Concepts:**
- Divine Shield: Temporary invulnerability
- Healing Light: Passive HP regeneration that scales with missing HP
- Martyr's Resolve: Survive lethal hit once per combat
- Blessed Armor: Armor provides healing when hit
- Sanctuary: Damage reduction aura

## Implementation Notes

When rebuilding Paladin:
1. Follow Warrior pattern: active path (like Berserker) and passive path (like Guardian)
2. Consider unique mechanic: Paladin's base HP regen (already exists in codebase)
3. Resource system should use `src/data/pathResources.ts` pattern
4. Powers go in `src/data/paths/crusader-powers.ts`
5. Enhancements go in `src/data/paths/protector-enhancements.ts`
6. Main definition in `src/data/paths/paladin.ts`
7. Register in `src/data/paths/registry.ts`
```

**Step 2: Commit**

```bash
git add docs/class-designs/paladin.md
git commit -m "docs: preserve Paladin class design for future implementation"
```

---

## Task 8: Delete Rogue and Paladin Code

**Files:**
- Delete: `src/data/paths/rogue.ts`
- Delete: `src/data/paths/paladin.ts`
- Modify: `src/data/paths/registry.ts`

**Step 1: Update registry.ts**

In `src/data/paths/registry.ts`, make these changes:

```typescript
// DELETE these import lines (lines 13-14):
import { ROGUE_PATHS } from './rogue';
import { PALADIN_PATHS } from './paladin';

// MODIFY the PATH_REGISTRY (around line 24-29):
// OLD:
const PATH_REGISTRY: Record<string, PathDefinition[]> = {
  warrior: Object.values(WARRIOR_PATHS),
  mage: MAGE_PATHS,
  rogue: ROGUE_PATHS,
  paladin: PALADIN_PATHS,
};

// NEW:
const PATH_REGISTRY: Record<string, PathDefinition[]> = {
  warrior: Object.values(WARRIOR_PATHS),
  mage: MAGE_PATHS,
  // rogue and paladin removed - see docs/class-designs/ for design docs
};
```

**Step 2: Delete the deprecated files**

```bash
git rm src/data/paths/rogue.ts
git rm src/data/paths/paladin.ts
```

**Step 3: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Run tests**

```bash
npx vitest run
```

Expected: All tests pass (some path tests may need updating if they reference rogue/paladin).

**Step 5: Run E2E to verify game works**

```bash
npx playwright test --project="Desktop" --grep="class selection|warrior|mage"
```

Expected: Warrior and Mage are playable. Rogue/Paladin should not appear in class selection.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated rogue/paladin paths

Design documents preserved in docs/class-designs/.
Sprites and animations remain for future implementation."
```

---

## Task 9: Split powers.ts into powers/ directory

**Files:**
- Create: `src/data/powers/definitions.ts`
- Create: `src/data/powers/upgrades.ts`
- Create: `src/data/powers/utils.ts`
- Create: `src/data/powers/index.ts`
- Delete: `src/data/powers.ts`

**Step 1: Create directory**

```bash
mkdir -p src/data/powers
```

**Step 2: Create definitions.ts**

Create `src/data/powers/definitions.ts` with the power definitions only:

```typescript
import type { Power } from '@/types/game';

// Power synergy interface for power definitions
interface PowerSynergy {
  pathId: string;
  description: string;
}

interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  resourceCost: number;
  cooldown: number;
  category: 'strike' | 'burst' | 'execute' | 'control' | 'buff' | 'sacrifice' | 'heal';
  effect: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  synergies: PowerSynergy[];
  maxLevel?: number;
  additionalEffects?: string;
}

/**
 * POWER CATEGORIES:
 *
 * Powers are VERBS, not numbers. Each power does something mechanically distinct.
 *
 * - STRIKE: Single reliable hit (Crushing Blow, Power Strike)
 * - BURST: Multiple small hits that proc on-hit effects (Fan of Knives, Flurry)
 * - EXECUTE: Bonus damage vs low HP enemies (Ambush, Coup de Grace)
 * - CONTROL: Change combat flow (Frost Nova, Stunning Blow)
 * - BUFF: Temporary stat boost (Battle Cry, Inner Focus)
 * - SACRIFICE: Spend HP for effect (Reckless Swing, Blood Pact)
 * - HEAL: Restore HP (Divine Heal, Regeneration)
 */

export const POWER_DEFINITIONS: PowerDefinition[] = [
  // STRIKE POWERS
  {
    id: 'crushing-blow',
    name: 'Crushing Blow',
    description: 'A devastating single strike dealing 150% damage',
    icon: 'power-crushing_blow',
    resourceCost: 30,
    cooldown: 5,
    category: 'strike',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'berserker', description: 'Low HP bonuses increase damage' },
      { pathId: 'guardian', description: 'Triggers counter-attack effects' },
      { pathId: 'paladin_crusader', description: 'Deals bonus holy damage' },
    ],
  },
  {
    id: 'power-strike',
    name: 'Power Strike',
    description: 'Basic but effective strike dealing 120% damage',
    icon: 'power-power_strike',
    resourceCost: 20,
    cooldown: 3,
    category: 'strike',
    effect: 'damage',
    value: 1.2,
    synergies: [
      { pathId: 'guardian', description: 'Benefits from armor scaling' },
      { pathId: 'paladin_protector', description: 'Grants HP regen on hit' },
    ],
  },

  // BURST POWERS
  {
    id: 'fan-of-knives',
    name: 'Fan of Knives',
    description: '5 quick hits of 30% damage each (150% total, procs on-hit effects)',
    icon: 'power-fan_of_knives',
    resourceCost: 35,
    cooldown: 6,
    category: 'burst',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'assassin', description: 'Each hit can crit independently' },
      { pathId: 'duelist', description: 'Triggers riposte effects multiple times' },
    ],
    additionalEffects: 'Hits 5 times for 30% damage each',
  },
  {
    id: 'flurry',
    name: 'Flurry',
    description: '3 rapid strikes of 50% damage each (150% total)',
    icon: 'power-flurry',
    resourceCost: 25,
    cooldown: 4,
    category: 'burst',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'berserker', description: 'Speed bonuses reduce cooldown' },
      { pathId: 'assassin', description: 'Builds kill chain momentum' },
    ],
    additionalEffects: 'Hits 3 times for 50% damage each',
  },

  // EXECUTE POWERS
  {
    id: 'ambush',
    name: 'Ambush',
    description: 'Deal 100% damage, doubled against enemies below 25% HP',
    icon: 'power-ambush',
    resourceCost: 30,
    cooldown: 5,
    category: 'execute',
    effect: 'damage',
    value: 1.0,
    synergies: [
      { pathId: 'assassin', description: 'Guaranteed crit on execute' },
      { pathId: 'berserker', description: 'Resets cooldown on kill' },
    ],
    additionalEffects: 'Deals 200% damage to enemies below 25% HP',
  },
  {
    id: 'coup-de-grace',
    name: 'Coup de Grace',
    description: 'Massive 250% damage strike to enemies below 30% HP, else 80%',
    icon: 'power-coup_de_grace',
    resourceCost: 40,
    cooldown: 8,
    category: 'execute',
    effect: 'damage',
    value: 0.8,
    synergies: [
      { pathId: 'berserker', description: 'Executioner synergy amplifies damage' },
      { pathId: 'assassin', description: 'Instantly resets on kill' },
    ],
    additionalEffects: 'Deals 250% damage to enemies below 30% HP',
  },

  // CONTROL POWERS
  {
    id: 'frost-nova',
    name: 'Frost Nova',
    description: 'Deal 110% damage and slow enemy attack speed by 30% for 4s',
    icon: 'power-frost_nova',
    resourceCost: 35,
    cooldown: 6,
    category: 'control',
    effect: 'debuff',
    value: 1.1,
    synergies: [
      { pathId: 'archmage', description: 'Elementalist combos with ice affinity' },
      { pathId: 'enchanter', description: 'DoT effects extended' },
    ],
    additionalEffects: 'Slows enemy by 30% for 4 seconds',
  },
  {
    id: 'stunning-blow',
    name: 'Stunning Blow',
    description: 'Deal 100% damage with 40% chance to stun for 2s',
    icon: 'power-stunning_blow',
    resourceCost: 30,
    cooldown: 5,
    category: 'control',
    effect: 'debuff',
    value: 1.0,
    synergies: [
      { pathId: 'berserker', description: 'Warlord increases stun chance' },
      { pathId: 'guardian', description: 'Extends stun duration' },
    ],
    additionalEffects: '40% chance to stun for 2 seconds',
  },

  // BUFF POWERS
  {
    id: 'battle-cry',
    name: 'Battle Cry',
    description: 'Gain +50% Power and +30% Speed for 6 seconds',
    icon: 'power-battle_cry',
    resourceCost: 40,
    cooldown: 10,
    category: 'buff',
    effect: 'buff',
    value: 0.5,
    synergies: [
      { pathId: 'berserker', description: 'Battle Trance reduces cooldown' },
      { pathId: 'paladin_crusader', description: 'Amplifies smite damage' },
    ],
    additionalEffects: 'Also grants +30% Speed',
  },
  {
    id: 'inner-focus',
    name: 'Inner Focus',
    description: 'Gain +40% Fortune (crit/dodge/proc chance) for 5 seconds',
    icon: 'power-inner_focus',
    resourceCost: 30,
    cooldown: 8,
    category: 'buff',
    effect: 'buff',
    value: 0.4,
    synergies: [
      { pathId: 'assassin', description: 'Shadowblade crit synergies activate' },
      { pathId: 'duelist', description: 'Boosts dodge-based procs' },
    ],
  },

  // SACRIFICE POWERS
  {
    id: 'reckless-swing',
    name: 'Reckless Swing',
    description: 'Spend 15% max HP to deal 200% damage',
    icon: 'power-reckless_swing',
    resourceCost: 25,
    cooldown: 4,
    category: 'sacrifice',
    effect: 'damage',
    value: 2.0,
    synergies: [
      { pathId: 'berserker', description: 'Lowers HP to trigger damage bonuses' },
      { pathId: 'paladin_protector', description: 'Martyr benefits from sacrifice' },
    ],
    additionalEffects: 'Costs 15% max HP',
  },
  {
    id: 'blood-pact',
    name: 'Blood Pact',
    description: 'Spend 20% max HP to restore 50 resource',
    icon: 'power-blood_pact',
    resourceCost: 0,
    cooldown: 12,
    category: 'sacrifice',
    effect: 'heal',
    value: 50,
    synergies: [
      { pathId: 'berserker', description: 'Enables more power usage' },
      { pathId: 'archmage', description: 'Enables more spell casts' },
    ],
    additionalEffects: 'Costs 20% max HP, restores resource instead of HP',
  },

  // HEAL POWERS
  {
    id: 'divine-heal',
    name: 'Divine Heal',
    description: 'Restore 60% of max HP',
    icon: 'power-divine_heal',
    resourceCost: 40,
    cooldown: 10,
    category: 'heal',
    effect: 'heal',
    value: 0.6,
    synergies: [
      { pathId: 'paladin_protector', description: 'Sentinel boosts healing received' },
      { pathId: 'guardian', description: 'Synergizes with regen effects' },
    ],
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Restore 10% max HP immediately, then 3% per second for 5s',
    icon: 'power-regeneration',
    resourceCost: 30,
    cooldown: 8,
    category: 'heal',
    effect: 'heal',
    value: 0.1,
    synergies: [
      { pathId: 'paladin_protector', description: 'Regen scaling amplifies HoT' },
      { pathId: 'enchanter', description: 'DoT amplification extends duration' },
    ],
    additionalEffects: 'Heals 3% max HP per second for 5 seconds (25% total)',
  },

  // ADDITIONAL UNIQUE POWERS
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Massive tremor deals 250% damage',
    icon: 'power-earthquake',
    resourceCost: 60,
    cooldown: 12,
    category: 'strike',
    effect: 'damage',
    value: 2.5,
    synergies: [
      { pathId: 'berserker', description: 'Devastating at low HP' },
      { pathId: 'archmage', description: 'Destroyer amplifies spell power' },
    ],
  },
  {
    id: 'vampiric-touch',
    name: 'Vampiric Touch',
    description: 'Deal 120% damage and heal for 100% of damage dealt',
    icon: 'power-vampiric_touch',
    resourceCost: 45,
    cooldown: 7,
    category: 'heal',
    effect: 'damage',
    value: 1.2,
    synergies: [
      { pathId: 'berserker', description: 'Bloodbath synergy sustains berserker' },
      { pathId: 'paladin_protector', description: 'Healing amplification applies' },
    ],
    additionalEffects: 'Heals for 100% of damage dealt',
  },
];

// Convert PowerDefinition to Power for compatibility
export const UNLOCKABLE_POWERS: Power[] = POWER_DEFINITIONS.map(def => ({
  id: def.id,
  name: def.name,
  description: def.description,
  resourceCost: def.resourceCost,
  cooldown: def.cooldown,
  effect: def.effect,
  value: def.value,
  icon: def.icon,
  category: def.category,
  synergies: def.synergies,
}));
```

**Step 3: Create upgrades.ts**

Create `src/data/powers/upgrades.ts`:

```typescript
import type { Power, PowerUpgradeOffer } from '@/types/game';
import { UNLOCKABLE_POWERS } from './definitions';

// Power upgrade configuration
export const POWER_UPGRADE_CONFIG = {
  MAX_UPGRADE_LEVEL: 3,
  VALUE_INCREASE_PER_LEVEL: 0.25,
  COOLDOWN_REDUCTION_PER_LEVEL: 0.5,
  COST_REDUCTION_PER_LEVEL: 0.1,
  UPGRADE_OFFER_CHANCE: 0.5,
} as const;

/**
 * Generate a power upgrade offer for an existing power
 */
export function generatePowerUpgradeOffer(power: Power): PowerUpgradeOffer | null {
  const currentLevel = power.upgradeLevel ?? 1;

  if (currentLevel >= POWER_UPGRADE_CONFIG.MAX_UPGRADE_LEVEL) {
    return null;
  }

  const newLevel = currentLevel + 1;
  const valueIncrease = Math.floor(POWER_UPGRADE_CONFIG.VALUE_INCREASE_PER_LEVEL * 100);
  const cooldownReduction = POWER_UPGRADE_CONFIG.COOLDOWN_REDUCTION_PER_LEVEL;
  const costReduction = Math.floor(POWER_UPGRADE_CONFIG.COST_REDUCTION_PER_LEVEL * 100);

  return {
    powerId: power.id,
    powerName: power.name,
    powerIcon: power.icon,
    currentLevel,
    newLevel,
    description: `+${valueIncrease}% power, -${cooldownReduction}s cooldown, -${costReduction}% cost`,
    isUpgrade: true,
  };
}

/**
 * Apply an upgrade to a power, returning the upgraded power
 */
export function applyPowerUpgrade(power: Power): Power {
  const currentLevel = power.upgradeLevel ?? 1;
  const newLevel = currentLevel + 1;

  const valueMultiplier = 1 + (POWER_UPGRADE_CONFIG.VALUE_INCREASE_PER_LEVEL * (newLevel - 1));
  const cooldownReduction = POWER_UPGRADE_CONFIG.COOLDOWN_REDUCTION_PER_LEVEL * (newLevel - 1);
  const costMultiplier = 1 - (POWER_UPGRADE_CONFIG.COST_REDUCTION_PER_LEVEL * (newLevel - 1));

  const basePower = UNLOCKABLE_POWERS.find(p => p.id === power.id);
  if (!basePower) return power;

  const newValue = Number((basePower.value * valueMultiplier).toFixed(2));
  const newCooldown = Math.max(1, basePower.cooldown - cooldownReduction);
  const newCost = Math.max(5, Math.floor(basePower.resourceCost * costMultiplier));

  let newDescription = power.description;
  if (power.effect === 'damage') {
    newDescription = power.description.replace(/\d+%/, `${Math.floor(newValue * 100)}%`);
  }

  return {
    ...power,
    value: newValue,
    cooldown: newCooldown,
    resourceCost: newCost,
    description: newDescription,
    upgradeLevel: newLevel,
    name: newLevel > 1 ? `${basePower.name} +${newLevel - 1}` : basePower.name,
  };
}
```

**Step 4: Create utils.ts**

Create `src/data/powers/utils.ts`:

```typescript
import type { Power, PowerUpgradeOffer } from '@/types/game';
import { UNLOCKABLE_POWERS } from './definitions';
import { POWER_UPGRADE_CONFIG, generatePowerUpgradeOffer } from './upgrades';

// Union type for power choices (can be new power or upgrade)
export type PowerChoice = Power | PowerUpgradeOffer;

export function isPowerUpgrade(choice: PowerChoice): choice is PowerUpgradeOffer {
  return 'isUpgrade' in choice && choice.isUpgrade === true;
}

export function getRandomPower(existingPowerIds: string[]): Power | null {
  const available = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  const selectedPower = available[randomIndex];
  if (!selectedPower) return null;
  return { ...selectedPower };
}

/**
 * Get multiple random powers for player to choose from
 */
export function getRandomPowers(existingPowerIds: string[], count: number = 2): Power[] {
  const available = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));
  if (available.length === 0) return [];

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, available.length)).map(p => ({ ...p }));
}

/**
 * Get power choices for player - mix of new powers and potential upgrades
 */
export function getPowerChoices(existingPowers: Power[], count: number = 2): PowerChoice[] {
  const existingPowerIds = existingPowers.map(p => p.id);
  const choices: PowerChoice[] = [];

  const availableNew = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));

  const upgradeablePowers = existingPowers.filter(p => {
    const level = p.upgradeLevel ?? 1;
    return level < POWER_UPGRADE_CONFIG.MAX_UPGRADE_LEVEL;
  });

  let upgradeCount = 0;
  if (upgradeablePowers.length > 0 && Math.random() < POWER_UPGRADE_CONFIG.UPGRADE_OFFER_CHANCE) {
    upgradeCount = 1;
  }

  if (upgradeCount > 0 && upgradeablePowers.length > 0) {
    const shuffledUpgradeable = [...upgradeablePowers].sort(() => Math.random() - 0.5);
    for (let i = 0; i < upgradeCount && i < shuffledUpgradeable.length; i++) {
      const power = shuffledUpgradeable[i];
      if (power) {
        const upgradeOffer = generatePowerUpgradeOffer(power);
        if (upgradeOffer) {
          choices.push(upgradeOffer);
        }
      }
    }
  }

  const remainingSlots = count - choices.length;
  if (remainingSlots > 0 && availableNew.length > 0) {
    const shuffledNew = [...availableNew].sort(() => Math.random() - 0.5);
    for (let i = 0; i < remainingSlots && i < shuffledNew.length; i++) {
      const power = shuffledNew[i];
      if (power) {
        choices.push({ ...power, upgradeLevel: 1 });
      }
    }
  }

  if (choices.length < count && upgradeablePowers.length > choices.filter(c => isPowerUpgrade(c)).length) {
    const usedUpgradeIds = choices.filter(isPowerUpgrade).map(c => c.powerId);
    const remainingUpgradeable = upgradeablePowers.filter(p => !usedUpgradeIds.includes(p.id));
    const shuffled = [...remainingUpgradeable].sort(() => Math.random() - 0.5);

    for (let i = 0; choices.length < count && i < shuffled.length; i++) {
      const power = shuffled[i];
      if (power) {
        const upgradeOffer = generatePowerUpgradeOffer(power);
        if (upgradeOffer) {
          choices.push(upgradeOffer);
        }
      }
    }
  }

  return choices;
}
```

**Step 5: Create index.ts**

Create `src/data/powers/index.ts`:

```typescript
// Backwards-compatible re-exports
export { POWER_DEFINITIONS, UNLOCKABLE_POWERS } from './definitions';
export { POWER_UPGRADE_CONFIG, generatePowerUpgradeOffer, applyPowerUpgrade } from './upgrades';
export { getRandomPower, getRandomPowers, getPowerChoices, isPowerUpgrade } from './utils';
export type { PowerChoice } from './utils';
```

**Step 6: Delete old powers.ts**

```bash
git rm src/data/powers.ts
```

**Step 7: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds (imports from `@/data/powers` resolve to new `powers/index.ts`).

**Step 8: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: split powers.ts into powers/ directory

- definitions.ts: Power definitions only
- upgrades.ts: Upgrade config and logic
- utils.ts: Random power selection utilities
- index.ts: Backwards-compatible re-exports"
```

---

## Task 10: Split enemies.ts into enemies/ directory

**Files:**
- Create: `src/data/enemies/names.ts`
- Create: `src/data/enemies/abilities.ts`
- Create: `src/data/enemies/scaling.ts`
- Create: `src/data/enemies/intent.ts`
- Create: `src/data/enemies/generator.ts`
- Create: `src/data/enemies/index.ts`
- Delete: `src/data/enemies.ts`

**Step 1: Create directory**

```bash
mkdir -p src/data/enemies
```

**Step 2: Create names.ts**

Create `src/data/enemies/names.ts`:

```typescript
export const ENEMY_NAMES = {
  common: ['Goblin', 'Skeleton', 'Slime', 'Rat', 'Spider', 'Imp', 'Zombie'],
  uncommon: ['Orc', 'Dark Elf', 'Werewolf', 'Ghost', 'Harpy', 'Minotaur'],
  rare: ['Vampire', 'Demon', 'Golem', 'Lich', 'Hydra Head'],
  boss: ['Dragon', 'Archdemon', 'Death Knight', 'Elder Lich', 'Titan'],
} as const;

// Bespoke prefixes for every ability combination
export const ABILITY_COMBO_PREFIXES: Record<string, string> = {
  // Single abilities
  'double_strike': 'Swift',
  'triple_strike': 'Furious',
  'poison_bite': 'Venomous',
  'stunning_blow': 'Crushing',
  'regenerate': 'Undying',
  'enrage': 'Raging',
  'shield_bash': 'Armored',

  // Two-ability combinations
  'double_strike+enrage': 'Berserker',
  'double_strike+poison_bite': 'Viper',
  'double_strike+stunning_blow': 'Hammering',
  'enrage+triple_strike': 'Savage',
  'regenerate+stunning_blow': 'Eternal',
  'enrage+stunning_blow': 'Brutal',
  'enrage+regenerate': 'Unkillable',
  'poison_bite+regenerate': 'Plague',
  'poison_bite+stunning_blow': 'Paralyzing',
  'enrage+poison_bite': 'Feral',
  'poison_bite+triple_strike': 'Virulent',
  'enrage+shield_bash': 'Juggernaut',
  'shield_bash+stunning_blow': 'Sentinel',
  'regenerate+triple_strike': 'Relentless',

  // Three-ability combinations
  'poison_bite+regenerate+stunning_blow': 'Pestilent',
  'enrage+poison_bite+triple_strike': 'Apocalypse',
  'enrage+shield_bash+triple_strike': 'Destroyer',
  'poison_bite+regenerate+triple_strike': 'Noxious',
  'enrage+regenerate+stunning_blow': 'Immortal',
  'enrage+shield_bash+stunning_blow': 'Invincible',
  'enrage+poison_bite+regenerate': 'Blighted',
  'double_strike+enrage+shield_bash': 'Champion',
  'double_strike+enrage+stunning_blow': 'Dominator',

  // Four-ability combinations
  'enrage+poison_bite+regenerate+triple_strike': 'Cataclysmic',
  'double_strike+enrage+shield_bash+stunning_blow': 'Legendary',
  'enrage+poison_bite+regenerate+stunning_blow': 'Dread',
  'enrage+shield_bash+stunning_blow+triple_strike': 'Titanic',
};
```

**Step 3: Create abilities.ts**

Create `src/data/enemies/abilities.ts`:

```typescript
import type { EnemyAbility } from '@/types/game';
import { ENEMY_ABILITY_CONFIG } from '@/constants/balance';
import { ABILITY_COMBO_PREFIXES } from './names';

// Power cost of each ability (reduces enemy stats as compensation)
export const ABILITY_POWER_COST: Record<string, number> = {
  double_strike: 0.08,
  triple_strike: 0.12,
  poison_bite: 0.10,
  stunning_blow: 0.12,
  regenerate: 0.08,
  enrage: 0.06,
  shield_bash: 0.06,
};

export const ENEMY_ABILITIES: Record<string, EnemyAbility> = {
  double_strike: {
    id: 'double_strike',
    name: 'Double Strike',
    type: 'multi_hit',
    value: 2,
    cooldown: 3,
    currentCooldown: 0,
    chance: 0.5,
    icon: 'ability-multi_hit',
    description: 'Attacks twice in quick succession',
  },
  poison_bite: {
    id: 'poison_bite',
    name: 'Poison Bite',
    type: 'poison',
    value: 3,
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.45,
    icon: 'ability-poison',
    description: 'Inflicts poison dealing damage over time',
  },
  stunning_blow: {
    id: 'stunning_blow',
    name: 'Stunning Blow',
    type: 'stun',
    value: 1,
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.35,
    icon: 'ability-stun',
    description: 'A heavy blow that stuns the target',
  },
  regenerate: {
    id: 'regenerate',
    name: 'Regenerate',
    type: 'heal',
    value: 0.15,
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.5,
    icon: 'ability-heal',
    description: 'Recovers health over time',
  },
  enrage: {
    id: 'enrage',
    name: 'Enrage',
    type: 'enrage',
    value: 0.5,
    cooldown: 6,
    currentCooldown: 0,
    chance: 0.4,
    icon: 'ability-enrage',
    description: 'Becomes enraged, increasing attack power',
  },
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    type: 'shield',
    value: 2,
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.35,
    icon: 'ability-shield',
    description: 'Raises a shield, reducing incoming damage',
  },
  triple_strike: {
    id: 'triple_strike',
    name: 'Triple Strike',
    type: 'multi_hit',
    value: 3,
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.4,
    icon: 'ability-triple_strike',
    description: 'Unleashes three rapid attacks',
  },
};

export const ENEMY_ABILITY_POOLS: Record<string, string[]> = {
  // Common enemies
  Goblin: ['double_strike'],
  Skeleton: ['double_strike'],
  Slime: ['poison_bite'],
  Rat: ['poison_bite'],
  Spider: ['poison_bite', 'stunning_blow'],
  Imp: ['double_strike'],
  Zombie: ['stunning_blow'],
  // Uncommon enemies
  Orc: ['double_strike', 'enrage'],
  'Dark Elf': ['double_strike', 'poison_bite'],
  Werewolf: ['triple_strike', 'enrage'],
  Ghost: ['stunning_blow', 'regenerate'],
  Harpy: ['double_strike', 'stunning_blow'],
  Minotaur: ['stunning_blow', 'enrage'],
  // Rare enemies
  Vampire: ['regenerate', 'stunning_blow', 'enrage'],
  Demon: ['triple_strike', 'enrage', 'poison_bite'],
  Golem: ['shield_bash', 'stunning_blow', 'enrage'],
  Lich: ['poison_bite', 'regenerate', 'stunning_blow'],
  'Hydra Head': ['triple_strike', 'poison_bite', 'regenerate'],
  // Boss enemies
  Dragon: ['triple_strike', 'enrage', 'shield_bash'],
  Archdemon: ['triple_strike', 'poison_bite', 'enrage', 'regenerate'],
  'Death Knight': ['stunning_blow', 'enrage', 'shield_bash', 'double_strike'],
  'Elder Lich': ['poison_bite', 'stunning_blow', 'regenerate', 'enrage'],
  Titan: ['triple_strike', 'stunning_blow', 'enrage', 'shield_bash'],
};

export interface AbilityResult {
  abilities: EnemyAbility[];
  powerCost: number;
  prefix: string | null;
}

/**
 * Get abilities for an enemy based on its name and difficulty
 */
export function getEnemyAbilities(baseName: string, floor: number, isBoss: boolean): AbilityResult {
  const abilityPool = ENEMY_ABILITY_POOLS[baseName] || [];
  if (abilityPool.length === 0) {
    return { abilities: [], powerCost: 0, prefix: null };
  }

  let numAbilities = 0;

  if (isBoss) {
    numAbilities = Math.min(2 + Math.floor(floor / 3), abilityPool.length);
  } else {
    const floorConfig = ENEMY_ABILITY_CONFIG.FLOOR_SCALING[floor];

    if (floorConfig) {
      if (Math.random() < floorConfig.chance) {
        numAbilities = 1 + Math.floor(Math.random() * floorConfig.maxAbilities);
      }
    } else {
      const { LATE_FLOOR_MIN_ABILITIES, LATE_FLOOR_MAX_ABILITIES } = ENEMY_ABILITY_CONFIG;
      const range = LATE_FLOOR_MAX_ABILITIES - LATE_FLOOR_MIN_ABILITIES + 1;
      numAbilities = LATE_FLOOR_MIN_ABILITIES + Math.floor(Math.random() * range);
    }

    numAbilities = Math.min(numAbilities, abilityPool.length);
  }

  if (numAbilities === 0) {
    return { abilities: [], powerCost: 0, prefix: null };
  }

  const shuffled = [...abilityPool].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, numAbilities);

  let totalPowerCost = 0;
  const abilities = selectedIds.map(id => {
    const ability = ENEMY_ABILITIES[id];
    if (!ability) return null;

    totalPowerCost += ABILITY_POWER_COST[id] ?? 0;

    const scaledAbility = { ...ability };
    if (scaledAbility.type === 'poison') {
      scaledAbility.value = Math.floor(scaledAbility.value * (1 + (floor - 1) * 0.2));
    }
    return scaledAbility;
  }).filter((a): a is EnemyAbility => a !== null);

  const comboKey = [...selectedIds].sort().join('+');
  const prefix = ABILITY_COMBO_PREFIXES[comboKey] ?? null;

  return { abilities, powerCost: totalPowerCost, prefix };
}

/**
 * Get an ability by its ID (for testing)
 */
export function getAbilityById(id: string): EnemyAbility | undefined {
  return ENEMY_ABILITIES[id] ? { ...ENEMY_ABILITIES[id] } : undefined;
}
```

**Step 4: Create scaling.ts**

Create `src/data/enemies/scaling.ts`:

```typescript
import {
  ENEMY_SCALING,
  FLOOR_MULTIPLIERS,
  ENEMY_STAT_SCALING,
  ROOM_SCALING,
} from '@/constants/game';
import { isFeatureEnabled } from '@/constants/features';
import { logError } from '@/utils/gameLogger';

export interface StatMultipliers {
  health: number;
  power: number;
  armor: number;
  speed: number;
}

/**
 * Calculate difficulty multiplier for enemy scaling
 */
export function getDifficultyMultiplier(floor: number, room: number): number {
  if (import.meta.env.DEV) {
    if (floor < 1 || room < 1 || !Number.isFinite(floor) || !Number.isFinite(room)) {
      logError('getDifficultyMultiplier called with invalid inputs', { floor, room });
    }
  }

  if (!isFeatureEnabled('ENEMY_SCALING_V2')) {
    return 1 + (floor - 1) * ENEMY_SCALING.PER_FLOOR_MULTIPLIER + (room - 1) * ENEMY_SCALING.PER_ROOM_MULTIPLIER;
  }

  const floorIndex = Math.min(floor - 1, FLOOR_MULTIPLIERS.length - 1);
  const floorMult = FLOOR_MULTIPLIERS[floorIndex];

  if (floorMult === undefined) {
    logError('FLOOR_MULTIPLIERS access returned undefined, using fallback', {
      floorIndex,
      floor,
      arrayLength: FLOOR_MULTIPLIERS.length,
    });
    return 1.0 * (1 + (room - 1) * ROOM_SCALING.MULTIPLIER);
  }

  const roomMult = 1 + (room - 1) * ROOM_SCALING.MULTIPLIER;
  return floorMult * roomMult;
}

/**
 * Apply per-stat scaling rates
 */
export function getStatMultipliers(baseMult: number): StatMultipliers {
  if (!Number.isFinite(baseMult) || baseMult < 0.1) {
    logError('getStatMultipliers received invalid baseMult', { baseMult });
    baseMult = 1.0;
  }

  if (!isFeatureEnabled('ENEMY_SCALING_V2')) {
    return {
      health: baseMult,
      power: baseMult,
      armor: baseMult,
      speed: 1,
    };
  }

  return {
    health: baseMult * ENEMY_STAT_SCALING.HEALTH,
    power: baseMult * ENEMY_STAT_SCALING.POWER,
    armor: baseMult * ENEMY_STAT_SCALING.ARMOR,
    speed: 1 + (baseMult - 1) * ENEMY_STAT_SCALING.SPEED,
  };
}
```

**Step 5: Create intent.ts**

Create `src/data/enemies/intent.ts`:

```typescript
import type { Enemy, EnemyAbility, EnemyIntent } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Calculate enemy's next intent based on abilities and cooldowns
 */
export function calculateEnemyIntent(enemy: Enemy): EnemyIntent {
  const readyAbilities = enemy.abilities.filter(
    (a: EnemyAbility) => a.currentCooldown === 0
  );

  if (readyAbilities.length > 0) {
    const shuffled = [...readyAbilities].sort(() => Math.random() - 0.5);

    for (const ability of shuffled) {
      if (Math.random() < ability.chance) {
        return {
          type: 'ability',
          ability,
          damage: ability.type === 'multi_hit'
            ? Math.floor(enemy.power * COMBAT_BALANCE.MULTI_HIT_DAMAGE_MODIFIER * ability.value)
            : ability.type === 'poison'
              ? ability.value * COMBAT_BALANCE.DEFAULT_POISON_DURATION
              : undefined,
          icon: ability.icon,
        };
      }
    }
  }

  return {
    type: 'attack',
    damage: enemy.power,
    icon: 'ability-attack',
  };
}
```

**Step 6: Create generator.ts**

Create `src/data/enemies/generator.ts`:

```typescript
import type { Enemy } from '@/types/game';
import {
  ENEMY_SCALING,
  ENEMY_BASE_STATS,
  FLOOR_CONFIG,
} from '@/constants/game';
import { REWARD_CONFIG } from '@/constants/balance';
import { logError } from '@/utils/gameLogger';
import { generateFinalBoss } from '../finalBoss';
import { FloorTheme } from '@/data/floorThemes';
import { getRandomModifiers, toModifierEffect, ModifierEffect } from '@/data/enemyModifiers';
import { ENEMY_NAMES } from './names';
import { getEnemyAbilities } from './abilities';
import { getDifficultyMultiplier, getStatMultipliers } from './scaling';
import { calculateEnemyIntent } from './intent';

const DEFAULT_FLOOR_THEME: FloorTheme = {
  id: 'default',
  name: 'Standard',
  description: 'A balanced floor with no special modifiers.',
  composition: 'mixed',
  statModifiers: {
    health: 1.0,
    power: 1.0,
    armor: 1.0,
    speed: 1.0,
  },
  favoredAbilities: [],
  extraAbilityChance: 0,
};

const MIN_FLOOR = 1;
const MAX_FLOOR = 100;
const MIN_ROOM = 1;
const MIN_ROOMS_PER_FLOOR = 1;

/**
 * Generates an enemy based on floor, room, and difficulty parameters.
 */
export function generateEnemy(
  floor: number,
  room: number,
  roomsPerFloor: number,
  floorTheme: FloorTheme = DEFAULT_FLOOR_THEME
): Enemy {
  const rawFloor = floor;
  const rawRoom = room;
  const rawRoomsPerFloor = roomsPerFloor;

  floor = Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, Math.floor(Number(floor) || MIN_FLOOR)));
  room = Math.max(MIN_ROOM, Math.floor(Number(room) || MIN_ROOM));
  roomsPerFloor = Math.max(MIN_ROOMS_PER_FLOOR, Math.floor(Number(roomsPerFloor) || MIN_ROOMS_PER_FLOOR));
  room = Math.min(room, roomsPerFloor);

  if (rawFloor !== floor || rawRoom !== room || rawRoomsPerFloor !== roomsPerFloor) {
    logError('generateEnemy received invalid inputs that were sanitized', {
      raw: { floor: rawFloor, room: rawRoom, roomsPerFloor: rawRoomsPerFloor },
      sanitized: { floor, room, roomsPerFloor },
    });
  }

  const isBoss = room === roomsPerFloor;

  if (floor === FLOOR_CONFIG.FINAL_BOSS_FLOOR && isBoss) {
    return generateFinalBoss();
  }

  const baseDifficultyMult = getDifficultyMultiplier(floor, room);
  const statMults = getStatMultipliers(baseDifficultyMult);

  let namePool: readonly string[];
  let baseHealth: number;
  let basePower: number;
  let baseArmor: number;
  let enemyTier: 'common' | 'uncommon' | 'rare' | 'boss';

  if (isBoss) {
    namePool = ENEMY_NAMES.boss;
    baseHealth = ENEMY_BASE_STATS.boss.health;
    basePower = ENEMY_BASE_STATS.boss.power;
    baseArmor = ENEMY_BASE_STATS.boss.armor;
    enemyTier = 'boss';
  } else if (room > roomsPerFloor * ENEMY_SCALING.RARE_THRESHOLD) {
    namePool = ENEMY_NAMES.rare;
    baseHealth = ENEMY_BASE_STATS.rare.health;
    basePower = ENEMY_BASE_STATS.rare.power;
    baseArmor = ENEMY_BASE_STATS.rare.armor;
    enemyTier = 'rare';
  } else if (room > roomsPerFloor * ENEMY_SCALING.UNCOMMON_THRESHOLD) {
    namePool = ENEMY_NAMES.uncommon;
    baseHealth = ENEMY_BASE_STATS.uncommon.health;
    basePower = ENEMY_BASE_STATS.uncommon.power;
    baseArmor = ENEMY_BASE_STATS.uncommon.armor;
    enemyTier = 'uncommon';
  } else {
    namePool = ENEMY_NAMES.common;
    baseHealth = ENEMY_BASE_STATS.common.health;
    basePower = ENEMY_BASE_STATS.common.power;
    baseArmor = ENEMY_BASE_STATS.common.armor;
    enemyTier = 'common';
  }

  const nameIndex = Math.floor(Math.random() * namePool.length);
  const baseName = namePool[nameIndex] ?? 'Unknown';

  let modifiers: ModifierEffect[] = [];
  if (enemyTier === 'rare') {
    const selectedModifiers = getRandomModifiers(1);
    modifiers = selectedModifiers.map(toModifierEffect);
  } else if (enemyTier === 'boss') {
    const modifierCount = Math.random() < 0.5 ? 1 : 2;
    const selectedModifiers = getRandomModifiers(modifierCount);
    modifiers = selectedModifiers.map(toModifierEffect);
  }

  const { abilities, powerCost, prefix: abilityPrefix } = getEnemyAbilities(baseName, floor, isBoss);

  const namePrefixes: string[] = [];
  if (modifiers.length > 0) {
    namePrefixes.push(...modifiers.map(m => m.name));
  }
  if (abilityPrefix) {
    namePrefixes.push(abilityPrefix);
  }

  const displayName = namePrefixes.length > 0
    ? `${namePrefixes.join(' ')} ${baseName}`
    : baseName;

  const statMultiplier = 1 - powerCost;

  const themeHealthMult = floorTheme.statModifiers.health;
  const themePowerMult = floorTheme.statModifiers.power;
  const themeArmorMult = floorTheme.statModifiers.armor;
  const themeSpeedMult = floorTheme.statModifiers.speed;

  const health = Math.floor(baseHealth * statMults.health * statMultiplier * themeHealthMult);
  const power = Math.floor(basePower * statMults.power * statMultiplier * themePowerMult);

  let armor = Math.floor(baseArmor * statMults.armor * statMultiplier * themeArmorMult);
  let speed = REWARD_CONFIG.ENEMY_BASE_SPEED + Math.floor(Math.random() * REWARD_CONFIG.ENEMY_SPEED_RANGE);

  speed = Math.floor(speed * statMults.speed * themeSpeedMult);

  for (const modifier of modifiers) {
    if (modifier.id === 'swift' && modifier.speedBonus) {
      speed = Math.floor(speed * (1 + modifier.speedBonus));
    }
    if (modifier.id === 'armored' && modifier.armorBonus) {
      armor = Math.floor(armor * (1 + modifier.armorBonus));
    }
  }

  const enemy: Enemy = {
    id: `enemy-${Date.now()}-${Math.random()}`,
    name: displayName,
    health,
    maxHealth: health,
    power,
    armor,
    speed,
    experienceReward: Math.floor((REWARD_CONFIG.BASE_ENEMY_XP * 2 + floor * REWARD_CONFIG.XP_PER_FLOOR + room * REWARD_CONFIG.XP_PER_ROOM) * (isBoss ? REWARD_CONFIG.BOSS_XP_MULTIPLIER : 1)),
    goldReward: Math.floor((REWARD_CONFIG.BASE_ENEMY_GOLD + floor * REWARD_CONFIG.GOLD_PER_FLOOR + room * REWARD_CONFIG.GOLD_PER_ROOM) * (isBoss ? REWARD_CONFIG.BOSS_GOLD_MULTIPLIER : 1) * (REWARD_CONFIG.GOLD_VARIANCE_MIN + Math.random() * REWARD_CONFIG.GOLD_VARIANCE_RANGE)),
    isBoss,
    abilities,
    intent: null,
    statusEffects: [],
    isShielded: false,
    isEnraged: false,
    modifiers: modifiers.length > 0 ? modifiers : undefined,
  };

  enemy.intent = calculateEnemyIntent(enemy);

  return enemy;
}
```

**Step 7: Create index.ts**

Create `src/data/enemies/index.ts`:

```typescript
// Backwards-compatible re-exports
export { generateEnemy } from './generator';
export { calculateEnemyIntent } from './intent';
export { getAbilityById } from './abilities';
```

**Step 8: Delete old enemies.ts**

```bash
git rm src/data/enemies.ts
```

**Step 9: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

**Step 10: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 11: Run E2E tests**

```bash
npx playwright test --project="Desktop"
```

Expected: All E2E tests pass.

**Step 12: Commit**

```bash
git add -A
git commit -m "refactor: split enemies.ts into enemies/ directory

- names.ts: Enemy names and ability prefixes
- abilities.ts: Enemy abilities and pools
- scaling.ts: Difficulty and stat multipliers
- intent.ts: Enemy intent calculation
- generator.ts: Main enemy generation
- index.ts: Backwards-compatible re-exports"
```

---

## Task 11: Final Verification and Cleanup

**Step 1: Run full test suite**

```bash
npm run build && npx vitest run && npx playwright test --project="Desktop"
```

Expected: All pass.

**Step 2: Manual smoke test**

1. Start dev server: `npm run dev`
2. Play through:
   - Select Warrior → Berserker → Complete floor 1
   - Select Mage → Archmage → Complete floor 1
3. Verify Rogue/Paladin are NOT in class selection

**Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: phase 1 cleanup and verification"
```

---

## Summary

After completing all tasks:

| Metric | Before | After |
|--------|--------|-------|
| Confusing util names | 3 | 0 |
| Deprecated path files | 2 | 0 (preserved in docs) |
| powers.ts lines | 517 | Split into 4 files (~100 each) |
| enemies.ts lines | 598 | Split into 6 files (~100 each) |
| Unused files | 1 (animations.ts) | 0 |

**Files changed:** ~25 files
**New files:** 12
**Deleted files:** 5
