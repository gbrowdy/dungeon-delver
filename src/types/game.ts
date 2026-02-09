// src/types/game.ts
//
// Core game type definitions.
// Design doc Section 9 (GameState) and Section 2 (status effects).
// These are pure type definitions — no runtime code, no imports.

// ── Status Effects ──────────────────────────────────────────────

export type StatusEffectType = 'poison' | 'stun' | 'curse' | 'shield' | 'regen';

export interface StatusEffect {
  type: StatusEffectType;
  /** Number of active stacks (poison: 1-5, curse: 1-10, others: 1) */
  stacks: number;
  /** Remaining duration in ms (per-stack for poison, total for stun) */
  remainingMs: number;
  /** Tick timestamp when stun immunity expires (stun only) */
  immuneUntilMs?: number;
}

// ── Combat Entities ─────────────────────────────────────────────

export interface CombatEntity {
  power: number;
  fortitude: number;
  speed: number;
  luck: number;
  /** Original Power before enrage scaling (enemies only) */
  basePower: number;
  hp: number;
  maxHp: number;
  /** ms accumulated toward next attack (counts down to 0) */
  attackTimer: number;
  statusEffects: StatusEffect[];
}

// ── Items ───────────────────────────────────────────────────────

export type ItemSlot = 'weapon' | 'armor' | 'accessory';

export type WeaponId =
  | 'venomous_fang'
  | 'shocking_edge'
  | 'heavy_cleaver'
  | 'twin_fang'
  | 'hex_blade';

export type ArmorId =
  | 'thorned_mail'
  | 'vampiric_shroud'
  | 'stone_skin'
  | 'phase_cloak'
  | 'berserker_plate';

export type AccessoryId =
  | 'riposte_charm'
  | 'flurry_ring'
  | 'war_cry_totem'
  | 'bloodstone'
  | 'regeneration_band';

export type ItemId = WeaponId | ArmorId | AccessoryId;

/**
 * An item instance as equipped by the player. Items have NO raw stats —
 * they define how the character fights through mechanical procs.
 */
export interface Item {
  id: ItemId;
  slot: ItemSlot;
  tier: number; // 1+, upgradeable at boss shops
}

export interface EquippedItems {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}

// ── Draft & Shop ────────────────────────────────────────────────

export type StatType = 'power' | 'fortitude' | 'speed' | 'luck';

export interface DraftCard {
  stat: StatType;
  value: number;
  /** Human-readable impact preview, e.g. "+11% damage" */
  impactPreview: string;
}

export type ShopCardType = 'stat_boost' | 'item';

export interface ShopCard {
  type: ShopCardType;
  /** Present if type === 'stat_boost' */
  stat?: StatType;
  statValue?: number;
  /** Present if type === 'item' */
  itemId?: ItemId;
  /** Present if this is a tier upgrade for an equipped item */
  isUpgrade?: boolean;
}

// ── Enemies ─────────────────────────────────────────────────────

export type EnemyTier = 'common' | 'uncommon' | 'rare' | 'boss';

export type EnemyModifier =
  | 'swift'
  | 'armored'
  | 'berserker'
  | 'regenerating'
  | 'venomous'
  | 'shielded';

export interface EnemyDefinition {
  tier: EnemyTier;
  modifiers: EnemyModifier[];
}

// ── Combat Events (consumed by React for animations) ────────────

export type CombatEventType =
  | 'damage'
  | 'crit'
  | 'dot'
  | 'reflect'
  | 'heal'
  | 'stun'
  | 'curse'
  | 'dodge'
  | 'death';

export interface CombatEvent {
  type: CombatEventType;
  /** Who was affected */
  target: 'player' | 'enemy';
  /** Numeric value (damage, heal amount, etc.) */
  value?: number;
  /** Timestamp (game tick) when this event was emitted */
  tick: number;
}

// ── Death Summary ───────────────────────────────────────────────

export interface DeathSummary {
  floor: number;
  room: number;
  enemyTier: EnemyTier;
  enemyModifiers: EnemyModifier[];
  playerStats: { power: number; fortitude: number; speed: number; luck: number };
  enemyStats: { power: number; fortitude: number; speed: number };
  playerDamagePerHit: number;
  enemyDamagePerHit: number;
  weaknessHint: string;
}

// ── Game Phases ─────────────────────────────────────────────────

export type GamePhase =
  | 'menu'
  | 'class-select'
  | 'combat'
  | 'draft'
  | 'shop'
  | 'floor-complete'
  | 'death'
  | 'endless-intro'
  | 'endless-defeat';

// ── Full Game State ─────────────────────────────────────────────

export interface GameState {
  // Run state
  phase: GamePhase;
  floor: number;
  room: number;
  roomsPerFloor: number;
  paused: boolean;
  fightCount: number; // total fights this floor (for draft pick triggers)

  // Player
  player: CombatEntity;
  classId: string;
  equippedItems: EquippedItems;

  // Current enemy
  enemy: CombatEntity | null;
  enemyDefinition: EnemyDefinition | null;

  // Combat state
  combatElapsed: number;
  combatEvents: CombatEvent[];
  speedMultiplier: 1 | 2 | 4;
  gameTick: number; // monotonically increasing tick counter

  // Draft/shop state
  draftChoices: DraftCard[];
  shopCards: ShopCard[];
  selectedChoices: number[];

  // Progression
  depth: number; // max floor reached (the score)
  checkpoint: number; // last boss floor cleared (respawn point)
  lastDeathStats: DeathSummary | null;

  // Rendering
  renderVersion: number; // bumped after each tick batch for React subscriptions
}
