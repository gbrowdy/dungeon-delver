/**
 * Icon type definitions for the PixelIcon component
 *
 * Icons are organized by category (stat, status, power, item, ability, ui, class)
 * and stored in /public/assets/icons/{category}/{name}.png
 */

// Stat icons
export const STAT_ICONS = {
  HEALTH: 'stat-health',
  MANA: 'stat-mana',
  POWER: 'stat-power',
  ARMOR: 'stat-armor',
  SPEED: 'stat-speed',
  FORTUNE: 'stat-fortune',
  GOLD: 'stat-gold',
} as const;

// Status effect icons
export const STATUS_ICONS = {
  POISON: 'status-poison',
  STUN: 'status-stun',
  SLOW: 'status-slow',
  BLEED: 'status-bleed',
  REGENERATION: 'status-regeneration',
} as const;

// Power/ability icons
export const POWER_ICONS = {
  FIREBALL: 'power-fireball',
  HEAL: 'power-heal',
  SHIELD: 'power-shield',
  STRIKE: 'power-strike',
  CRUSHING_BLOW: 'power-crushing_blow',
  POWER_STRIKE: 'power-power_strike',
  FAN_OF_KNIVES: 'power-fan_of_knives',
  FLURRY: 'power-flurry',
  AMBUSH: 'power-ambush',
  COUP_DE_GRACE: 'power-coup_de_grace',
  FROST_NOVA: 'power-frost_nova',
  STUNNING_BLOW: 'power-stunning_blow',
  BATTLE_CRY: 'power-battle_cry',
  INNER_FOCUS: 'power-inner_focus',
  RECKLESS_SWING: 'power-reckless_swing',
  BLOOD_PACT: 'power-blood_pact',
  DIVINE_HEAL: 'power-divine_heal',
  REGENERATION: 'power-regeneration',
  EARTHQUAKE: 'power-earthquake',
  VAMPIRIC_TOUCH: 'power-vampiric_touch',
} as const;

// Enemy ability icons
export const ABILITY_ICONS = {
  ATTACK: 'ability-attack',
  MULTI_HIT: 'ability-multi_hit',
  POISON: 'ability-poison',
  STUN: 'ability-stun',
  HEAL: 'ability-heal',
  ENRAGE: 'ability-enrage',
  SHIELD: 'ability-shield',
  TRIPLE_STRIKE: 'ability-triple_strike',
} as const;

// Item type icons
export const ITEM_ICONS = {
  // Base types
  WEAPON: 'item-weapon',
  ARMOR: 'item-armor',
  ACCESSORY: 'item-accessory',
  POTION: 'item-potion',
  // Weapon variants
  SWORD: 'item-sword',
  AXE: 'item-axe',
  STAFF: 'item-staff',
  DAGGER: 'item-dagger',
  // Armor variants
  PLATE_ARMOR: 'item-plate_armor',
  CHAINMAIL: 'item-chainmail',
  LEATHER_ARMOR: 'item-leather_armor',
  ROBE: 'item-robe',
  // Accessory variants
  RING: 'item-ring',
  AMULET: 'item-amulet',
  BELT: 'item-belt',
  BOOTS: 'item-boots',
} as const;

// UI control icons
export const UI_ICONS = {
  PAUSE: 'ui-pause',
  PLAY: 'ui-play',
  SPEED_1X: 'ui-speed_1x',
  SPEED_2X: 'ui-speed_2x',
  SPEED_3X: 'ui-speed_3x',
  TROPHY: 'ui-trophy',
  STAR: 'ui-star',
  SKULL: 'ui-skull',
  HAMMER: 'ui-hammer',
  QUESTION: 'ui-question',
  SPARKLE: 'ui-sparkle',
} as const;

// Class icons
export const CLASS_ICONS = {
  WARRIOR: 'class-warrior',
  MAGE: 'class-mage',
  ROGUE: 'class-rogue',
  PALADIN: 'class-paladin',
} as const;

// Export all icon constants
export const ALL_ICONS = {
  ...STAT_ICONS,
  ...STATUS_ICONS,
  ...POWER_ICONS,
  ...ABILITY_ICONS,
  ...ITEM_ICONS,
  ...UI_ICONS,
  ...CLASS_ICONS,
} as const;
