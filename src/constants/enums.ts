/**
 * Game enums and string constants
 * Centralized string literals for type safety and consistency
 */

// Game phases - matches GameState.gamePhase type
export const GAME_PHASE = {
  MENU: 'menu',
  CLASS_SELECT: 'class-select',
  PATH_SELECT: 'path-select',
  COMBAT: 'combat',
  SHOP: 'shop',
  UPGRADE: 'upgrade',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  FLOOR_COMPLETE: 'floor-complete',
} as const;

export type GamePhase = typeof GAME_PHASE[keyof typeof GAME_PHASE];

// Status effect types - matches StatusEffect.type
export const STATUS_EFFECT_TYPE = {
  POISON: 'poison',
  STUN: 'stun',
  SLOW: 'slow',
  BLEED: 'bleed',
} as const;

export type StatusEffectType = typeof STATUS_EFFECT_TYPE[keyof typeof STATUS_EFFECT_TYPE];

// Item effect triggers - matches ItemEffectTrigger type
export const ITEM_EFFECT_TRIGGER = {
  ON_HIT: 'on_hit',
  ON_CRIT: 'on_crit',
  ON_KILL: 'on_kill',
  ON_DAMAGED: 'on_damaged',
  COMBAT_START: 'combat_start',
  TURN_START: 'turn_start',
  // New triggers for expanded item system
  PASSIVE: 'passive', // Always active effects (calculated at stat time)
  ON_DAMAGE_DEALT: 'on_damage_dealt', // When dealing damage (for lifesteal scaling)
  ON_LETHAL_DAMAGE: 'on_lethal_damage', // When receiving lethal damage (survival effects)
  OUT_OF_COMBAT: 'out_of_combat', // Between combats (regen effects)
  ON_POWER_CAST: 'on_power_cast', // When using a power
  ON_DEATH: 'on_death', // When player would die (phoenix effects)
  ON_DAMAGE_TAKEN: 'on_damage_taken', // Alias for ON_DAMAGED
} as const;

export type ItemEffectTriggerType = typeof ITEM_EFFECT_TRIGGER[keyof typeof ITEM_EFFECT_TRIGGER];

// Effect types (for items and powers)
export const EFFECT_TYPE = {
  HEAL: 'heal',
  DAMAGE: 'damage',
  BUFF: 'buff',
  DEBUFF: 'debuff',
  SPECIAL: 'special', // For unique effects like "survive lethal", "ignore dodge"
} as const;

export type EffectType = typeof EFFECT_TYPE[keyof typeof EFFECT_TYPE];

// Item types
export const ITEM_TYPE = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
} as const;

export type ItemTypeValue = typeof ITEM_TYPE[keyof typeof ITEM_TYPE];

// Item rarities
export const ITEM_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export type ItemRarityType = typeof ITEM_RARITY[keyof typeof ITEM_RARITY];

// Enemy ability types - matches EnemyAbilityType
export const ENEMY_ABILITY_TYPE = {
  MULTI_HIT: 'multi_hit',
  POISON: 'poison',
  STUN: 'stun',
  HEAL: 'heal',
  ENRAGE: 'enrage',
  SHIELD: 'shield',
} as const;

export type EnemyAbilityTypeValue = typeof ENEMY_ABILITY_TYPE[keyof typeof ENEMY_ABILITY_TYPE];

// Enemy intent types
export const ENEMY_INTENT_TYPE = {
  ATTACK: 'attack',
  ABILITY: 'ability',
  DEFENDING: 'defending',
} as const;

export type EnemyIntentTypeValue = typeof ENEMY_INTENT_TYPE[keyof typeof ENEMY_INTENT_TYPE];

// Character classes
export const CHARACTER_CLASS = {
  WARRIOR: 'warrior',
  MAGE: 'mage',
  ROGUE: 'rogue',
  PALADIN: 'paladin',
} as const;

export type CharacterClassType = typeof CHARACTER_CLASS[keyof typeof CHARACTER_CLASS];

// Buff stat types
export const BUFF_STAT = {
  POWER: 'power',
  ARMOR: 'armor',
  FORTUNE: 'fortune',
} as const;

export type BuffStatType = typeof BUFF_STAT[keyof typeof BUFF_STAT];

// Combat event types (for animation system)
export const COMBAT_EVENT_TYPE = {
  PLAYER_ATTACK: 'playerAttack',
  PLAYER_POWER: 'playerPower', // Special ability used
  ENEMY_ATTACK: 'enemyAttack',
  ENEMY_ABILITY: 'enemyAbility', // Non-attack abilities (heal, enrage, shield)
  PLAYER_HIT: 'playerHit',
  ENEMY_HIT: 'enemyHit',
  ENEMY_DEATH: 'enemyDeath',
  PLAYER_DEATH: 'playerDeath',
  PLAYER_DODGE: 'playerDodge',
} as const;

export type CombatEventType = typeof COMBAT_EVENT_TYPE[keyof typeof COMBAT_EVENT_TYPE];

// Battle arena phases (for animation state machine)
export const BATTLE_PHASE = {
  ENTERING: 'entering',
  COMBAT: 'combat',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  TRANSITIONING: 'transitioning',
} as const;

export type BattlePhaseType = typeof BATTLE_PHASE[keyof typeof BATTLE_PHASE];

// Sprite animation states
export const SPRITE_STATE = {
  IDLE: 'idle',
  WALK: 'walk',
  ATTACK: 'attack',
  HIT: 'hit',
  DIE: 'die',
} as const;

export type SpriteStateType = typeof SPRITE_STATE[keyof typeof SPRITE_STATE];

// Pause reasons - explicit tracking of why the game is paused
export const PAUSE_REASON = {
  USER: 'user',
  LEVEL_UP: 'level_up',
  ITEM_DROP: 'item_drop',
  ENEMY_DEFEATED: 'enemy_defeated',
} as const;

export type PauseReasonType = typeof PAUSE_REASON[keyof typeof PAUSE_REASON];

// Combat animation states for ECS
export const COMBAT_ANIMATION = {
  IDLE: 'idle',
  ATTACK: 'attack',
  HIT: 'hit',
  CAST: 'cast',
  DIE: 'die',
} as const;

export type CombatAnimationType = typeof COMBAT_ANIMATION[keyof typeof COMBAT_ANIMATION];

// Visual effect types
export const VISUAL_EFFECT = {
  FLASH: 'flash',
  SHAKE: 'shake',
  HIT_STOP: 'hitStop',
  AURA: 'aura',
} as const;

export type VisualEffectType = typeof VISUAL_EFFECT[keyof typeof VISUAL_EFFECT];

// Floating effect types
export const FLOATING_EFFECT = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  MISS: 'miss',
  CRIT: 'crit',
} as const;

export type FloatingEffectType = typeof FLOATING_EFFECT[keyof typeof FLOATING_EFFECT];
