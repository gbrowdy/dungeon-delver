import { CircularBuffer } from '@/utils/circularBuffer';
import { PlayerPath } from './paths';
import { ShopState } from './shop';

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
  remainingTurns: number;
  icon: string;
}

// Status effects (debuffs/DoTs)
export interface StatusEffect {
  id: string;
  type: 'poison' | 'stun' | 'slow' | 'bleed';
  damage?: number; // For DoT effects
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

// Item special effects
export type ItemEffectTrigger = 'on_hit' | 'on_crit' | 'on_kill' | 'on_damaged' | 'combat_start' | 'turn_start';

export interface ItemEffect {
  trigger: ItemEffectTrigger;
  type: 'heal' | 'damage' | 'buff' | 'mana';
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
  currentCooldown: number; // Remaining cooldown in seconds (can be fractional)
  effect: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  icon: string;
  upgradeLevel?: number; // Current upgrade level (1 = base, 2+ = upgraded)
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
}

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
  isShielded?: boolean; // Temporary shield
  shieldTurnsRemaining?: number; // Turns until shield expires
  isEnraged?: boolean; // Enrage buff active
  enrageTurnsRemaining?: number; // Turns until enrage expires
  basePower?: number; // Original power before enrage (to prevent stacking)
  isDying?: boolean; // True when health <= 0, awaiting death animation completion
}

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
}

export interface GameState {
  player: Player | null;
  currentEnemy: Enemy | null;
  currentFloor: number;
  currentRoom: number;
  roomsPerFloor: number;
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
}

export interface ClassData {
  name: string;
  description: string;
  baseStats: Stats;
  startingPower: Power;
  icon: string;
}
