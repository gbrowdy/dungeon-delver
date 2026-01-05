import { CircularBuffer } from '@/utils/circularBuffer';
import { PlayerPath } from './paths';
import { ShopState, ShopTier } from './shop';
import { PowerCategory, PowerSynergy } from './powers';
import { ModifierEffect } from '@/data/enemyModifiers';
import { FloorTheme } from '@/data/floorThemes';

export type CharacterClass = 'warrior' | 'mage' | 'rogue' | 'paladin';

export interface Stats {
  health: number;
  maxHealth: number;
  power: number;      // Replaces attack - offensive stat
  armor: number;      // Replaces defense - damage reduction
  speed: number;
  mana: number;
  maxMana: number;
  fortune: number;    // Unified luck stat - affects crit, dodge, drops, proc chances
}

// DEPRECATED: Old upgrade purchase system removed in favor of shop system
// Keeping type for backwards compatibility during migration
// TODO: Remove completely once all references are cleaned up
export type UpgradePurchases = Record<string, number>;

// Active buffs with duration tracking
export interface ActiveBuff {
  id: string;
  name: string;
  stat: 'power' | 'armor' | 'speed' | 'fortune';
  multiplier: number; // e.g., 1.5 for +50%
  remainingTurns: number; // Legacy name - now stores seconds (time-based), not turns
  icon: string;
}

// Status effects (debuffs/DoTs)
export interface StatusEffect {
  id: string;
  type: 'poison' | 'stun' | 'slow' | 'bleed';
  damage?: number; // For DoT effects
  value?: number; // For slow (speed reduction %), stun (chance), etc.
  remainingTurns: number;
  icon: string;
}

// Enemy abilities
export type EnemyAbilityType = 'multi_hit' | 'poison' | 'stun' | 'heal' | 'enrage' | 'shield';

export interface EnemyAbility {
  id: string;
  name: string;
  type: EnemyAbilityType;
  value: number; // Damage multiplier, heal amount, etc.
  cooldown: number;
  currentCooldown: number;
  chance: number; // Probability to use (0-1)
  icon: string;
  description: string;
}

// Enemy intent - what the enemy will do next turn
export type EnemyIntentType = 'attack' | 'ability' | 'defending';

export interface EnemyIntent {
  type: EnemyIntentType;
  damage?: number;
  ability?: EnemyAbility;
  icon: string;
}

/**
 * Base fields shared by all attack modifier types
 */
interface AttackModifierBase {
  id: string;
  remainingAttacks: number;
  sourceName: string; // For combat log
}

/**
 * Temporary attack modifier (lasts for N attacks)
 * Uses discriminated union for type safety:
 * - guaranteed_crit: No value needed
 * - bonus_damage: Requires value (damage multiplier)
 * - lifesteal: Requires value (heal percentage)
 */
export type AttackModifier =
  | (AttackModifierBase & { effect: 'guaranteed_crit' })
  | (AttackModifierBase & { effect: 'bonus_damage'; value: number })
  | (AttackModifierBase & { effect: 'lifesteal'; value: number });

// ============================================================================
// PATH RESOURCE SYSTEM (Phase 6: Active Path Resources)
// ============================================================================

/**
 * Resource types for active paths
 * Each active path uses a unique resource instead of mana
 */
export type PathResourceType =
  | 'mana'           // Default (pre-level 2 or passive paths)
  | 'fury'           // Berserker (Warrior)
  | 'arcane_charges' // Archmage (Mage)
  | 'momentum'       // Assassin (Rogue)
  | 'zeal';          // Crusader (Paladin)

/**
 * Threshold effect triggered when resource reaches a certain value.
 * Uses discriminated union to enforce that:
 * - cost_reduction and damage_bonus require a numeric value
 * - special effects have no value (behavior defined elsewhere)
 */
export type ThresholdEffect =
  | { type: 'cost_reduction'; value: number; description: string }
  | { type: 'damage_bonus'; value: number; description: string }
  | { type: 'special'; description: string };

/**
 * Path resource configuration
 * Defines generation, decay, and threshold effects for active path resources
 */
export interface PathResource {
  type: PathResourceType;
  current: number;
  max: number;
  color: string;  // CSS color for UI

  // Generation config
  generation: {
    onHit?: number;      // Gain per auto-attack
    onDamaged?: number;  // Gain per hit taken
    onCrit?: number;     // Gain per critical hit
    onKill?: number;     // Gain per enemy killed
    onPowerUse?: number; // Gain per power used
    onBlock?: number;    // Gain per successful block
    passive?: number;    // Gain per second
  };

  // Decay config
  decay?: {
    rate: number;        // Amount lost per tick
    tickInterval: number; // Milliseconds between decay ticks
    outOfCombatOnly?: boolean;
  };

  // Threshold effects
  thresholds?: {
    value: number;
    effect: ThresholdEffect;
  }[];
}

// Item special effects
export type ItemEffectTrigger =
  | 'on_hit'
  | 'on_crit'
  | 'on_kill'
  | 'on_damaged'
  | 'combat_start'
  | 'turn_start'
  // New triggers for expanded item system
  | 'passive' // Always active effects (calculated at stat time)
  | 'on_damage_dealt' // When dealing damage (for lifesteal scaling)
  | 'on_lethal_damage' // When receiving lethal damage (survival effects)
  | 'out_of_combat' // Between combats (regen effects)
  | 'on_power_cast' // When using a power
  | 'on_death' // When player would die (phoenix effects)
  | 'on_damage_taken'; // Alias for ON_DAMAGED

export interface ItemEffect {
  trigger: ItemEffectTrigger;
  type: 'heal' | 'damage' | 'buff' | 'mana' | 'debuff' | 'special';
  value: number;
  chance?: number; // Probability (0-1), defaults to 1
  description: string;
}

// Combat speed multiplier
export type CombatSpeed = 1 | 2 | 3;

// Pause reasons - explicit tracking of why the game is paused
export type PauseReason = 'user' | 'level_up' | 'item_drop' | 'enemy_defeated' | null;

export interface Power {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  cooldown: number; // Cooldown duration in seconds
  // NOTE: Cooldown state is tracked in entity.cooldowns Map, not on the Power object
  // Use cooldowns.get(power.id)?.remaining to get current cooldown
  effect: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  icon: string;
  upgradeLevel?: number; // Current upgrade level (1 = base, 2+ = upgraded)
  category?: PowerCategory; // Optional: Power category for new power system
  synergies?: PowerSynergy[]; // Optional: Path synergies for new power system
}

// Represents a power upgrade offer (not the power itself)
export interface PowerUpgradeOffer {
  powerId: string; // ID of the power being upgraded
  powerName: string;
  powerIcon: string;
  currentLevel: number;
  newLevel: number;
  description: string; // Description of what the upgrade does
  isUpgrade: true; // Discriminator to distinguish from new powers
}

export type ItemType = 'weapon' | 'armor' | 'accessory';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  statBonus: Partial<Stats>;
  description: string;
  icon: string;
  effect?: ItemEffect; // Optional special effect
  // Enhancement fields
  enhancementLevel: number;  // 0-3, starts at 0
  maxEnhancement: number;    // Based on tier (3 for all tiers)
  tier?: ShopTier;           // 'starter' | 'class' | 'specialty' | 'legendary'
}

/**
 * Stat debuff applied to an enemy from player abilities
 */
export interface EnemyStatDebuff {
  id: string;
  stat: 'power' | 'armor' | 'speed';
  percentReduction: number; // e.g., 0.15 = 15% reduction
  remainingDuration: number; // seconds remaining
  sourceName: string; // ability name for combat log
}

/**
 * @deprecated Legacy type - use ECS entities with enemy component instead.
 * The ECS stores enemy data as entities in world.ts with health, attack, defense, etc. components.
 * This type remains for backward compatibility with generateEnemy() and legacy systems.
 * Prefer using EnemySnapshot from ecs/snapshot.ts for UI components.
 */
export interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  power: number;
  armor: number;
  speed: number;
  experienceReward: number;
  goldReward: number;
  isBoss: boolean;
  abilities: EnemyAbility[]; // Enemy special abilities
  intent: EnemyIntent | null; // What enemy will do next turn
  statusEffects: StatusEffect[]; // Active debuffs on enemy
  statDebuffs?: EnemyStatDebuff[]; // Stat reductions from player abilities
  isShielded?: boolean; // Temporary shield
  shieldTurnsRemaining?: number; // Turns until shield expires
  isEnraged?: boolean; // Enrage buff active
  enrageTurnsRemaining?: number; // Turns until enrage expires
  basePower?: number; // Original power before enrage (to prevent stacking)
  isDying?: boolean; // True when health <= 0, awaiting death animation completion
  isFinalBoss?: boolean; // True if this is the final boss on Floor 5
  modifiers?: ModifierEffect[]; // Optional elite/rare enemy modifiers
}

/**
 * @deprecated Legacy type - use ECS entities with player component instead.
 * The ECS stores player data as entities in world.ts with health, mana, attack, etc. components.
 * This type remains for backward compatibility with legacy systems.
 * Prefer using PlayerSnapshot from ecs/snapshot.ts for UI components.
 */
export interface Player {
  name: string;
  class: CharacterClass;
  level: number;
  experience: number;
  experienceToNext: number;
  gold: number;
  baseStats: Stats;
  currentStats: Stats;
  powers: Power[];
  inventory: Item[];
  equippedItems: Item[];
  activeBuffs: ActiveBuff[]; // Temporary buffs with duration
  statusEffects: StatusEffect[]; // Active debuffs on player
  isBlocking: boolean; // Active block/dodge state
  comboCount: number; // Current power combo count
  lastPowerUsed: string | null; // For combo tracking
  // upgradePurchases: UpgradePurchases; // DEPRECATED: Removed in favor of shop system
  isDying?: boolean; // True when health <= 0, awaiting death animation
  path: PlayerPath | null; // null until level 2
  pendingAbilityChoice: boolean; // true when level-up needs ability selection
  enemyAttackCounter?: number; // Counter for Uncanny Dodge ability
  usedCombatAbilities?: string[]; // Abilities that have been used this combat (reset on combat end)
  usedFloorAbilities?: string[]; // Abilities that have been used this floor (reset on floor change)
  shield?: number; // Current shield amount (absorbs damage before HP)
  shieldMaxDuration?: number; // Max duration in seconds (for display)
  shieldRemainingDuration?: number; // Remaining duration in seconds
  /**
   * Counters for ability-specific tracking.
   * Known keys:
   * - 'blur_dodges': Consecutive dodges for Blur shield (max 3)
   * - 'perfect_form_momentum': Momentum stacks for Perfect Form damage (max 5)
   */
  abilityCounters?: Record<string, number>;
  attackModifiers?: AttackModifier[]; // Temporary attack effects (shadow_dance, ambush)
  hpRegen?: number; // Base HP regen per second from class (e.g., Paladin has 0.5)
  pathResource?: PathResource; // Active path resource (Phase 6) - replaces mana for active paths
}

/**
 * @deprecated Legacy type - use ECS gameState entity instead.
 * The ECS stores game state in an entity with phase, floor, popups, etc. components.
 * This type remains for backward compatibility with legacy systems.
 * Prefer using GameStateSnapshot from ecs/snapshot.ts for UI components.
 */
export interface GameState {
  player: Player | null;
  currentEnemy: Enemy | null;
  currentFloor: number;
  currentRoom: number;
  roomsPerFloor: number;
  currentFloorTheme: FloorTheme | null; // Theme variant selected for current floor
  combatLog: CircularBuffer<string>; // Circular buffer to prevent unbounded growth
  gamePhase: 'menu' | 'class-select' | 'path-select' | 'combat' | 'shop' | 'upgrade' | 'victory' | 'defeat' | 'floor-complete';
  isPaused: boolean; // Derived from pauseReason !== null for backwards compatibility
  pauseReason: PauseReason; // Explicit reason why game is paused (null = not paused)
  combatSpeed: CombatSpeed; // 1x, 2x, 3x speed
  pendingLevelUp: number | null; // New level if level up occurred, null otherwise
  itemPityCounter: number; // Counts non-rare items since last rare+ drop (for pity system)
  shopItems: Item[]; // Items available in shop/floor complete screen
  availablePowers: (Power | PowerUpgradeOffer)[]; // Power choices available (can be new powers or upgrade offers)
  isTransitioning: boolean; // True when hero is walking to next room (between enemy death and next spawn)
  shopState: ShopState | null; // null until shop is initialized
  previousPhase: 'menu' | 'class-select' | 'path-select' | 'combat' | 'shop' | 'upgrade' | 'victory' | 'defeat' | 'floor-complete' | null; // Track previous phase for returning from shop
  deathFloor: number | null; // Floor where player died (for retry tracking)
}

export interface ClassData {
  name: string;
  description: string;
  baseStats: Stats;
  startingPower: Power;
  icon: string;
  hpRegen?: number; // Base HP regen per second (e.g., Paladin has 0.5)
}
