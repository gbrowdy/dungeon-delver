// src/ecs/components.ts
/**
 * ECS Component definitions for the game.
 * Components are plain data - no methods, no behavior.
 * Each optional property represents a component that can be attached to an entity.
 */

import type {
  CharacterClass,
  Power,
  Item,
  ActiveBuff,
  StatusEffect,
  EnemyAbility,
  EnemyIntent,
  AttackModifier,
  PathResource,
  EnemyStatDebuff,
  ModifierEffect,
} from '@/types/game';
import type { PlayerPath, PlayerStanceState, PlayerPathProgression, StanceEnhancement, StanceEffect } from '@/types/paths';
import type { CombatAnimationType, FloatingEffectType } from '@/constants/enums';

// Game phases
export type GamePhase =
  | 'menu'
  | 'class-select'
  | 'path-select'
  | 'combat'
  | 'shop'
  | 'floor-complete'
  | 'victory'
  | 'defeat';

// Enemy tiers
export type EnemyTier = 'common' | 'uncommon' | 'rare' | 'boss';

// Animation event types
export type AnimationEventType =
  | 'player_attack'
  | 'enemy_attack'
  | 'player_hit'
  | 'enemy_hit'
  | 'player_block'
  | 'player_dodge'
  | 'spell_cast'
  | 'death'
  | 'level_up'
  | 'status_applied'
  | 'status_removed'
  | 'item_proc'
  | 'power_used'
  | 'enemy_ability';

// Animation event payload types
export type AnimationPayload =
  | { type: 'damage'; value: number; isCrit: boolean; blocked: boolean; targetDied?: boolean }
  | { type: 'heal'; value: number; source: string }
  | { type: 'spell'; powerId: string; value: number }
  | { type: 'death'; isPlayer: boolean }
  | { type: 'status'; effectType: string; applied: boolean }
  | { type: 'item'; itemName: string; effectDescription: string }
  | { type: 'block'; reduction: number }
  | { type: 'level_up'; newLevel: number }
  | { type: 'dodge' }
  | { type: 'enemy_ability'; abilityType: string; abilityName: string };

// Animation event
export interface AnimationEvent {
  id: string;
  type: AnimationEventType;
  payload: AnimationPayload;
  createdAtTick: number;
  displayUntilTick: number;
  consumed: boolean;
}

// Scheduled transition
export interface ScheduledTransition {
  toPhase: GamePhase;
  delay: number; // ms remaining
}

// Scheduled enemy spawn
export interface ScheduledSpawn {
  delay: number; // ms remaining
}

// Popup state
export interface PopupState {
  levelUp?: { level: number };
  death?: { floor: number };
  victory?: { finalFloor: number };
  abilityChoice?: { abilities: string[] };
}

// Reward for floor completion
export interface PendingReward {
  xp: number;
  gold: number;
  powers?: (Power | { isUpgrade: true; powerId: string })[];
  items?: Item[];
}

/**
 * Entity type - all possible components an entity can have.
 * miniplex uses this to provide type-safe queries.
 */
export interface Entity {
  // === IDENTITY TAGS ===
  /** Marks this entity as the player */
  player?: true;
  /** Marks this entity as an enemy with metadata */
  enemy?: {
    id: string;
    tier: EnemyTier;
    name: string;
    isBoss: boolean;
    isFinalBoss?: boolean;
    abilities: EnemyAbility[];
    intent: EnemyIntent | null;
    modifiers?: ModifierEffect[];
  };
  /** Marks this entity as the game state singleton */
  gameState?: true;

  // === COMBAT STATS ===
  health?: {
    current: number;
    max: number;
  };
  mana?: {
    current: number;
    max: number;
  };
  attack?: {
    baseDamage: number;
    critChance: number; // 0-1
    critMultiplier: number;
    variance: { min: number; max: number };
  };
  defense?: {
    value: number;
    blockReduction: number;
  };
  speed?: {
    value: number;
    attackInterval: number; // calculated from value
    accumulated: number; // ms toward next attack
  };
  /** Cached derived stats computed from fortune */
  derivedStats?: {
    critChance: number;    // 0-1, e.g., 0.15 = 15%
    critDamage: number;    // multiplier, e.g., 1.5 = 150%
    dodgeChance: number;   // 0-1
  };
  /** Fortune stat - base value from class + equipment bonuses */
  fortune?: number;

  // === STATUS ===
  statusEffects?: StatusEffect[];
  statDebuffs?: EnemyStatDebuff[]; // For enemies - stat reductions from player
  shield?: {
    value: number;
    remaining: number; // duration in seconds
    maxDuration: number;
  };
  buffs?: ActiveBuff[];
  dying?: {
    startedAtTick: number;
    duration: number; // ms
  };
  /** Enemy-specific flags */
  enemyFlags?: {
    isShielded?: boolean;
    shieldTurnsRemaining?: number;
    isEnraged?: boolean;
    enrageTurnsRemaining?: number;
    basePower?: number; // before enrage
  };

  // === TIMING ===
  cooldowns?: Map<string, { remaining: number; base: number }>;
  regen?: {
    healthPerSecond: number;
    manaPerSecond: number;
    accumulated: number; // ms since last regen tick
  };

  // === COMBAT ACTIONS ===
  /** Set when entity is ready to attack this tick */
  attackReady?: {
    damage: number;
    isCrit: boolean;
  };
  /** Set when player is casting a power */
  casting?: {
    powerId: string;
    startedAtTick: number;
  };
  /** Temporary attack modifiers (shadow_dance, ambush, etc) */
  attackModifiers?: AttackModifier[];

  // === PROGRESSION ===
  progression?: {
    level: number;
    xp: number;
    xpToNext: number;
  };
  path?: PlayerPath;
  pathProgression?: PlayerPathProgression;
  pendingAbilityChoice?: boolean;
  pendingPowerChoice?: {
    level: number;
    choices: Power[];
  };
  pendingUpgradeChoice?: {
    powerIds: string[]; // IDs of powers that can be upgraded
  };
  pendingStanceEnhancement?: {
    ironChoice: StanceEnhancement;
    retributionChoice: StanceEnhancement;
  };
  powers?: Power[];
  effectivePowers?: Power[];
  effectiveStanceEffects?: StanceEffect[];
  equipment?: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  inventory?: {
    gold: number;
    items: Item[];
  };
  /** Player identity */
  identity?: {
    name: string;
    class: CharacterClass;
  };
  /** Path resource for active paths */
  pathResource?: PathResource;
  /** Stance state for passive paths */
  stanceState?: PlayerStanceState;
  /** Ability tracking */
  abilityTracking?: {
    usedCombatAbilities: string[];
    usedFloorAbilities: string[];
    enemyAttackCounter: number;
    abilityCounters: Record<string, number>;
  };
  /** Combo tracking */
  combo?: {
    count: number;
    lastPowerUsed: string | null;
  };

  // === GAME FLOW (game state entity only) ===
  phase?: GamePhase;
  floor?: {
    number: number;
    room: number;
    totalRooms: number;
    theme?: string;
  };
  combatSpeed?: {
    multiplier: 1 | 2 | 3;
  };
  paused?: boolean;
  isTransitioning?: boolean;
  /** Tracks what phase we entered shop from (for proper exit behavior) */
  shopEnteredFrom?: 'defeat' | 'floor-complete';

  // === ANIMATION (game state entity only) ===
  animationEvents?: AnimationEvent[];
  combatLog?: string[];

  // Animation state (for player/enemy entities)
  combatAnimation?: {
    type: CombatAnimationType;
    startedAtTick: number;
    duration: number; // ms
    powerId?: string; // for cast animations
    anticipation?: number; // wind-up time in ms
  };

  // Visual effects overlay
  visualEffects?: {
    flash?: { color?: 'white' | 'red' | 'green' | 'gold'; untilTick: number };
    shake?: { untilTick: number };
    hitStop?: { untilTick: number };
    aura?: { color: 'red' | 'blue' | 'green'; untilTick: number };
    powerImpact?: { powerId: string; untilTick: number };
  };

  // Floating text effects (on gameState entity)
  floatingEffects?: Array<{
    id: string;
    type: FloatingEffectType;
    value?: number;
    x: number;
    y: number;
    createdAtTick: number;
    duration: number; // ms
    isCrit?: boolean;
  }>;

  // Battle phase (on gameState entity)
  battlePhase?: {
    phase: 'entering' | 'combat' | 'transitioning' | 'defeat';
    startedAtTick: number;
    duration?: number; // ms, for timed phases
  };

  // Ground scrolling state
  groundScrolling?: boolean;

  // === UI STATE (game state entity only) ===
  popups?: PopupState;
  pendingRewards?: PendingReward;
  pendingLevelUp?: number | null;
  scheduledTransitions?: ScheduledTransition[];
  scheduledSpawns?: ScheduledSpawn[];

  // === REWARDS ===
  rewards?: {
    xp: number;
    gold: number;
  };
}

// Entity ID constants
export const PLAYER_ENTITY_ID = 1;
export const GAME_STATE_ENTITY_ID = 2;
export const ENEMY_ENTITY_ID_START = 100;
