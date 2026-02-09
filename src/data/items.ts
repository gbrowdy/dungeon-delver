// src/data/items.ts
//
// Item definitions. Design doc Section 6.
// Items have NO raw stats — they define how the character fights through procs.
// Each item's effect is expressed as data so the combat tick can process
// any item generically.

import type { ItemId, ItemSlot } from '@/types/game';

// ── Item Effect Types ───────────────────────────────────────────

/**
 * Trigger conditions for item procs.
 *
 * - on_player_attack: fires each time the player completes an attack
 * - on_player_hit: fires each time the player takes a hit
 * - on_dodge: fires when the player dodges an attack
 * - passive: always active, modifies stats or rates
 */
export type ItemTrigger = 'on_player_attack' | 'on_player_hit' | 'on_dodge' | 'passive';

/**
 * What the proc does when triggered.
 *
 * Each effect type maps to a specific handler in the combat tick.
 * The `value` field is the T1 base value — tier upgrades scale it.
 */
export type ItemEffectType =
  | 'apply_poison'       // % chance to apply poison stack
  | 'apply_stun'         // stun every N hits
  | 'damage_mult'        // multiply outgoing damage
  | 'speed_mult'         // multiply attack speed
  | 'double_hit'         // hit twice at reduced damage each
  | 'apply_curse'        // apply curse stack per hit
  | 'reflect_damage'     // reflect % of damage taken
  | 'lifesteal'          // heal % of damage dealt
  | 'damage_reduction'   // reduce incoming damage by %
  | 'dodge_bonus'        // add flat dodge chance
  | 'incoming_damage_mult' // multiply incoming damage (>1 = more, <1 = less)
  | 'outgoing_damage_mult' // multiply outgoing damage (>1 = more, <1 = less)
  | 'counter_attack'     // attack on dodge at % power
  | 'bonus_attack'       // every N attacks, trigger a free attack
  | 'intimidate'         // reduce enemy damage based on your last hit
  | 'damage_per_missing_hp' // +X% damage per Y% HP missing
  | 'regen';             // heal % max HP per second

export interface ItemEffect {
  trigger: ItemTrigger;
  effect: ItemEffectType;
  /** Base value at tier 1. Interpretation depends on effect type. */
  value: number;
  /** For "every Nth hit" effects, the hit counter interval */
  interval?: number;
}

// ── Tier Scaling ────────────────────────────────────────────────

/**
 * Returns the scaled value for an item effect at a given tier.
 * Diminishing returns: each tier adds (baseValue * scaleFactor / tier).
 * T1→T2 is noticeable. T10→T11 is marginal.
 */
export function getScaledValue(baseValue: number, tier: number): number {
  if (tier <= 1) return baseValue;

  // Each additional tier adds a fraction of the base, diminishing
  let total = baseValue;
  for (let t = 2; t <= tier; t++) {
    total += baseValue * 0.15 / Math.sqrt(t - 1);
  }
  return Math.round(total * 1000) / 1000; // avoid floating point noise
}

// ── Item Definitions ────────────────────────────────────────────

export interface ItemDefinition {
  id: ItemId;
  name: string;
  slot: ItemSlot;
  philosophy: string;
  description: string;
  effects: ItemEffect[];
}

// ── Weapons (how you deal damage) ───────────────────────────────

const VENOMOUS_FANG: ItemDefinition = {
  id: 'venomous_fang',
  name: 'Venomous Fang',
  slot: 'weapon',
  philosophy: 'Inevitability',
  description: 'Chance to poison on hit. Poison ignores 50% enemy fortitude.',
  effects: [
    { trigger: 'on_player_attack', effect: 'apply_poison', value: 0.25 },
  ],
};

const SHOCKING_EDGE: ItemDefinition = {
  id: 'shocking_edge',
  name: 'Shocking Edge',
  slot: 'weapon',
  philosophy: 'Control',
  description: 'Every 4th hit stuns the enemy for 1s.',
  effects: [
    { trigger: 'on_player_attack', effect: 'apply_stun', value: 1, interval: 4 },
  ],
};

const HEAVY_CLEAVER: ItemDefinition = {
  id: 'heavy_cleaver',
  name: 'Heavy Cleaver',
  slot: 'weapon',
  philosophy: 'Commitment',
  description: '+25% damage, -15% attack speed.',
  effects: [
    { trigger: 'passive', effect: 'damage_mult', value: 1.25 },
    { trigger: 'passive', effect: 'speed_mult', value: 0.85 },
  ],
};

const TWIN_FANG: ItemDefinition = {
  id: 'twin_fang',
  name: 'Twin Fang',
  slot: 'weapon',
  philosophy: 'Variance',
  description: 'Hit twice at 55% damage each (double crit rolls).',
  effects: [
    { trigger: 'on_player_attack', effect: 'double_hit', value: 0.55 },
  ],
};

const HEX_BLADE: ItemDefinition = {
  id: 'hex_blade',
  name: 'Hex Blade',
  slot: 'weapon',
  philosophy: 'Erosion',
  description: 'Each hit curses the enemy, reducing Power or Speed by 3% per stack (max 10).',
  effects: [
    { trigger: 'on_player_attack', effect: 'apply_curse', value: 0.03 },
  ],
};

// ── Armors (how you survive) ────────────────────────────────────

const THORNED_MAIL: ItemDefinition = {
  id: 'thorned_mail',
  name: 'Thorned Mail',
  slot: 'armor',
  philosophy: 'Retaliation',
  description: 'Reflect 12% of damage taken.',
  effects: [
    { trigger: 'on_player_hit', effect: 'reflect_damage', value: 0.12 },
  ],
};

const VAMPIRIC_SHROUD: ItemDefinition = {
  id: 'vampiric_shroud',
  name: 'Vampiric Shroud',
  slot: 'armor',
  philosophy: 'Sustain',
  description: 'Heal 8% of damage you deal.',
  effects: [
    { trigger: 'on_player_attack', effect: 'lifesteal', value: 0.08 },
  ],
};

const STONE_SKIN: ItemDefinition = {
  id: 'stone_skin',
  name: 'Stone Skin',
  slot: 'armor',
  philosophy: 'Endurance',
  description: '-20% incoming damage, -10% attack speed.',
  effects: [
    { trigger: 'passive', effect: 'damage_reduction', value: 0.20 },
    { trigger: 'passive', effect: 'speed_mult', value: 0.90 },
  ],
};

const PHASE_CLOAK: ItemDefinition = {
  id: 'phase_cloak',
  name: 'Phase Cloak',
  slot: 'armor',
  philosophy: 'Evasion',
  description: '+15% dodge chance (caps at 30% total).',
  effects: [
    { trigger: 'passive', effect: 'dodge_bonus', value: 0.15 },
  ],
};

const BERSERKER_PLATE: ItemDefinition = {
  id: 'berserker_plate',
  name: 'Berserker Plate',
  slot: 'armor',
  philosophy: 'Aggression',
  description: 'Take 10% more damage, deal 15% more.',
  effects: [
    { trigger: 'passive', effect: 'incoming_damage_mult', value: 1.10 },
    { trigger: 'passive', effect: 'outgoing_damage_mult', value: 1.15 },
  ],
};

// ── Accessories (build amplifiers) ──────────────────────────────

const RIPOSTE_CHARM: ItemDefinition = {
  id: 'riposte_charm',
  name: 'Riposte Charm',
  slot: 'accessory',
  philosophy: 'Counter',
  description: 'Attack for 80% Power when you dodge.',
  effects: [
    { trigger: 'on_dodge', effect: 'counter_attack', value: 0.80 },
  ],
};

const FLURRY_RING: ItemDefinition = {
  id: 'flurry_ring',
  name: 'Flurry Ring',
  slot: 'accessory',
  philosophy: 'Tempo',
  description: 'Every 5th attack triggers a bonus free attack.',
  effects: [
    { trigger: 'on_player_attack', effect: 'bonus_attack', value: 1, interval: 5 },
  ],
};

const WAR_CRY_TOTEM: ItemDefinition = {
  id: 'war_cry_totem',
  name: 'War Cry Totem',
  slot: 'accessory',
  philosophy: 'Intimidation',
  description: 'Enemy damage reduced based on your last hit.',
  effects: [
    { trigger: 'on_player_attack', effect: 'intimidate', value: 0.15 },
  ],
};

const BLOODSTONE: ItemDefinition = {
  id: 'bloodstone',
  name: 'Bloodstone',
  slot: 'accessory',
  philosophy: 'Risk/reward',
  description: '+1% damage per 5% HP missing.',
  effects: [
    { trigger: 'passive', effect: 'damage_per_missing_hp', value: 0.01 },
  ],
};

const REGENERATION_BAND: ItemDefinition = {
  id: 'regeneration_band',
  name: 'Regeneration Band',
  slot: 'accessory',
  philosophy: 'Sustain',
  description: 'Heal 1% max HP per second.',
  effects: [
    { trigger: 'passive', effect: 'regen', value: 0.01 },
  ],
};

// ── Lookup Tables ───────────────────────────────────────────────

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  venomous_fang: VENOMOUS_FANG,
  shocking_edge: SHOCKING_EDGE,
  heavy_cleaver: HEAVY_CLEAVER,
  twin_fang: TWIN_FANG,
  hex_blade: HEX_BLADE,
  thorned_mail: THORNED_MAIL,
  vampiric_shroud: VAMPIRIC_SHROUD,
  stone_skin: STONE_SKIN,
  phase_cloak: PHASE_CLOAK,
  berserker_plate: BERSERKER_PLATE,
  riposte_charm: RIPOSTE_CHARM,
  flurry_ring: FLURRY_RING,
  war_cry_totem: WAR_CRY_TOTEM,
  bloodstone: BLOODSTONE,
  regeneration_band: REGENERATION_BAND,
};

export const WEAPONS: ItemDefinition[] = [
  VENOMOUS_FANG, SHOCKING_EDGE, HEAVY_CLEAVER, TWIN_FANG, HEX_BLADE,
];

export const ARMORS: ItemDefinition[] = [
  THORNED_MAIL, VAMPIRIC_SHROUD, STONE_SKIN, PHASE_CLOAK, BERSERKER_PLATE,
];

export const ACCESSORIES: ItemDefinition[] = [
  RIPOSTE_CHARM, FLURRY_RING, WAR_CRY_TOTEM, BLOODSTONE, REGENERATION_BAND,
];

export const ALL_ITEMS: ItemDefinition[] = [...WEAPONS, ...ARMORS, ...ACCESSORIES];

/** Get all items for a given slot */
export function getItemsBySlot(slot: ItemSlot): ItemDefinition[] {
  switch (slot) {
    case 'weapon': return WEAPONS;
    case 'armor': return ARMORS;
    case 'accessory': return ACCESSORIES;
  }
}
