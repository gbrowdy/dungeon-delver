// Placeholder imports - types will be defined in src/types/paths.ts (Task 2.1)
import type { PathDefinition, PathAbility, PathAbilityEffect } from '@/types/paths';

/**
 * MAGE CLASS PATHS
 *
 * ARCHMAGE (Active Path) - "Spell timing mastery"
 * - Spell damage bonuses, mana efficiency, cooldown manipulation
 * - Rewards skilled power usage and timing
 *
 * ENCHANTER (Passive Path) - "Magic works for you"
 * - Auto-cast mechanics, passive auras, DoT effects
 * - Magic that works automatically
 */

// ============================================================================
// ARCHMAGE PATH - Active spell mastery
// ============================================================================

const ARCHMAGE_ABILITIES: PathAbility[] = [
  // === Core Archmage Abilities ===
  {
    id: 'archmage_spell_power',
    name: 'Arcane Mastery',
    description: 'Your spells deal 20% increased damage.',
    icon: 'Sparkles',
    levelRequired: 3,
    effects: [
      {
        type: 'stat_bonus',
        stat: 'spell_damage',
        value: 0.2,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'archmage_mana_efficiency',
    name: 'Efficient Casting',
    description: 'Powers cost 15% less mana.',
    icon: 'Droplets',
    levelRequired: 3,
    effects: [
      {
        type: 'mana_cost_reduction',
        value: 0.15,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'archmage_cooldown_mastery',
    name: 'Quickcast',
    description: 'Power cooldowns recover 20% faster.',
    icon: 'Clock',
    levelRequired: 4,
    effects: [
      {
        type: 'cooldown_reduction',
        value: 0.2,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'archmage_spell_crit',
    name: 'Critical Magic',
    description: 'Powers have a 25% chance to deal double damage.',
    icon: 'Zap',
    levelRequired: 4,
    effects: [
      {
        type: 'spell_crit_chance',
        value: 0.25,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },

  // === ELEMENTALIST SUBPATH - Multi-element combos ===
  {
    id: 'elementalist_fire_mastery',
    name: 'Flame Affinity',
    description: 'Fire spells burn enemies for 30% additional damage over 3 seconds.',
    icon: 'Flame',
    levelRequired: 3,
    subpath: 'elementalist',
    effects: [
      {
        type: 'on_power_hit',
        trigger: 'fire',
        applyEffect: {
          type: 'burn',
          damagePercent: 0.3,
          duration: 3000,
        },
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'elementalist_ice_mastery',
    name: 'Frost Affinity',
    description: 'Ice spells slow enemies by 30% for 2 seconds.',
    icon: 'Snowflake',
    levelRequired: 4,
    subpath: 'elementalist',
    effects: [
      {
        type: 'on_power_hit',
        trigger: 'ice',
        applyEffect: {
          type: 'slow',
          amount: 0.3,
          duration: 2000,
        },
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'elementalist_lightning_mastery',
    name: 'Storm Affinity',
    description: 'Lightning spells chain to deal 40% damage to the enemy again.',
    icon: 'Zap',
    levelRequired: 5,
    subpath: 'elementalist',
    effects: [
      {
        type: 'on_power_hit',
        trigger: 'lightning',
        additionalHit: {
          damagePercent: 0.4,
        },
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'elementalist_elemental_convergence',
    name: 'Elemental Convergence',
    description: 'After using 3 different elemental powers, your next power deals 100% bonus damage.',
    icon: 'Sparkles',
    levelRequired: 6,
    subpath: 'elementalist',
    isCapstone: true,
    effects: [
      {
        type: 'combo_tracker',
        requireElements: ['fire', 'ice', 'lightning'],
        bonusDamage: 1.0,
      } as PathAbilityEffect,
    ],
  },

  // === DESTROYER SUBPATH - Raw power and big numbers ===
  {
    id: 'destroyer_overwhelming_power',
    name: 'Overwhelming Power',
    description: 'Powers deal 35% more damage but cost 20% more mana.',
    icon: 'Flame',
    levelRequired: 3,
    subpath: 'destroyer',
    effects: [
      {
        type: 'stat_bonus',
        stat: 'spell_damage',
        value: 0.35,
        valueType: 'percentage',
      } as PathAbilityEffect,
      {
        type: 'mana_cost_increase',
        value: 0.2,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'destroyer_spell_surge',
    name: 'Spell Surge',
    description: 'Powers have a 15% chance to reset their cooldown.',
    icon: 'RefreshCw',
    levelRequired: 4,
    subpath: 'destroyer',
    effects: [
      {
        type: 'on_power_cast',
        chance: 0.15,
        effect: 'reset_cooldown',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'destroyer_glass_cannon',
    name: 'Glass Cannon',
    description: 'Your spells deal 50% more damage, but you take 20% more damage.',
    icon: 'Flame',
    levelRequired: 5,
    subpath: 'destroyer',
    effects: [
      {
        type: 'stat_bonus',
        stat: 'spell_damage',
        value: 0.5,
        valueType: 'percentage',
      } as PathAbilityEffect,
      {
        type: 'stat_penalty',
        stat: 'damage_taken',
        value: 0.2,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'destroyer_apocalypse',
    name: 'Apocalypse',
    description: 'Every 10 seconds, your next power deals triple damage and costs no mana.',
    icon: 'Skull',
    levelRequired: 6,
    subpath: 'destroyer',
    isCapstone: true,
    effects: [
      {
        type: 'timed_buff',
        interval: 10000,
        buffType: 'next_power',
        damageMultiplier: 3.0,
        freeCast: true,
      } as PathAbilityEffect,
    ],
  },
];

// ============================================================================
// ENCHANTER PATH - Passive magic automation
// ============================================================================

const ENCHANTER_ABILITIES: PathAbility[] = [
  // === Core Enchanter Abilities ===
  {
    id: 'enchanter_passive_power',
    name: 'Enchanted Strikes',
    description: 'Your basic attacks deal bonus magic damage equal to 30% of your power.',
    icon: 'Wand2',
    levelRequired: 3,
    effects: [
      {
        type: 'on_attack',
        bonusDamage: {
          type: 'scaling',
          stat: 'power',
          value: 0.3,
        },
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'enchanter_mana_regen',
    name: 'Arcane Flow',
    description: 'Regenerate 2 additional mana per second.',
    icon: 'Droplets',
    levelRequired: 3,
    effects: [
      {
        type: 'stat_bonus',
        stat: 'mana_regen',
        value: 2,
        valueType: 'flat',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'enchanter_damage_aura',
    name: 'Arcane Aura',
    description: 'Passively deal 5 magic damage per second to enemies.',
    icon: 'Sparkles',
    levelRequired: 4,
    effects: [
      {
        type: 'damage_aura',
        damage: 5,
        interval: 1000,
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'enchanter_dot_amplify',
    name: 'Lingering Magic',
    description: 'Your damage over time effects last 50% longer and deal 25% more damage.',
    icon: 'Timer',
    levelRequired: 4,
    effects: [
      {
        type: 'dot_amplification',
        durationBonus: 0.5,
        damageBonus: 0.25,
      } as PathAbilityEffect,
    ],
  },

  // === SPELLWEAVER SUBPATH - Auto-casting ===
  {
    id: 'spellweaver_auto_cast',
    name: 'Automated Magic',
    description: 'Your first power automatically casts when off cooldown.',
    icon: 'Sparkles',
    levelRequired: 3,
    subpath: 'spellweaver',
    effects: [
      {
        type: 'auto_cast',
        powerSlot: 1,
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'spellweaver_chain_cast',
    name: 'Chain Casting',
    description: 'When you manually cast a power, automatically cast another random power if available.',
    icon: 'Link',
    levelRequired: 4,
    subpath: 'spellweaver',
    effects: [
      {
        type: 'on_power_cast',
        trigger: 'manual',
        effect: 'cast_random_power',
        chance: 1.0,
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'spellweaver_efficient_automation',
    name: 'Efficient Automation',
    description: 'Auto-cast powers cost 50% less mana.',
    icon: 'Zap',
    levelRequired: 5,
    subpath: 'spellweaver',
    effects: [
      {
        type: 'conditional_cost_reduction',
        condition: 'auto_cast',
        value: 0.5,
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'spellweaver_arcane_assembly',
    name: 'Arcane Assembly Line',
    description: 'ALL powers auto-cast when off cooldown. Gain 50% cooldown recovery speed.',
    icon: 'Factory',
    levelRequired: 6,
    subpath: 'spellweaver',
    isCapstone: true,
    effects: [
      {
        type: 'auto_cast',
        powerSlot: 'all',
      } as PathAbilityEffect,
      {
        type: 'cooldown_reduction',
        value: 0.5,
        valueType: 'percentage',
      } as PathAbilityEffect,
    ],
  },

  // === SAGE SUBPATH - Passive auras and fields ===
  {
    id: 'sage_wisdom_aura',
    name: 'Aura of Wisdom',
    description: 'Gain 1 mana per second for each enemy status effect active.',
    icon: 'Brain',
    levelRequired: 3,
    subpath: 'sage',
    effects: [
      {
        type: 'conditional_mana_regen',
        condition: 'enemy_status_effects',
        valuePerEffect: 1,
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'sage_toxic_field',
    name: 'Toxic Field',
    description: 'Enemies are poisoned for 8 damage per second while in combat.',
    icon: 'Droplet',
    levelRequired: 4,
    subpath: 'sage',
    effects: [
      {
        type: 'damage_aura',
        damage: 8,
        interval: 1000,
        effectType: 'poison',
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'sage_arcane_field',
    name: 'Arcane Disruption Field',
    description: 'Enemies attack 20% slower while in combat with you.',
    icon: 'Shield',
    levelRequired: 5,
    subpath: 'sage',
    effects: [
      {
        type: 'enemy_debuff_aura',
        stat: 'attack_speed',
        value: -0.2,
      } as PathAbilityEffect,
    ],
  },
  {
    id: 'sage_overwhelming_presence',
    name: 'Overwhelming Presence',
    description: 'Your passive auras deal triple damage and apply all status effects (poison, slow, burn).',
    icon: 'Crown',
    levelRequired: 6,
    subpath: 'sage',
    isCapstone: true,
    effects: [
      {
        type: 'aura_amplification',
        damageMultiplier: 3.0,
      } as PathAbilityEffect,
      {
        type: 'damage_aura',
        damage: 15,
        interval: 1000,
        effectType: 'multi',
        applyEffects: ['poison', 'slow', 'burn'],
      } as PathAbilityEffect,
    ],
  },
];

// ============================================================================
// PATH DEFINITIONS
// ============================================================================

const ARCHMAGE_PATH: PathDefinition = {
  id: 'archmage',
  name: 'Archmage',
  description: 'Master of spell timing and power. Rewards skilled power usage with devastating magical damage.',
  className: 'Mage',
  type: 'active',
  icon: 'Sparkles',
  abilities: ARCHMAGE_ABILITIES,
  subpaths: [
    {
      id: 'elementalist',
      name: 'Elementalist',
      description: 'Multi-element mastery with combo effects',
      icon: 'Flame',
    },
    {
      id: 'destroyer',
      name: 'Destroyer',
      description: 'Raw spell power and devastating damage',
      icon: 'Skull',
    },
  ],
};

const ENCHANTER_PATH: PathDefinition = {
  id: 'enchanter',
  name: 'Enchanter',
  description: 'Magic works for you automatically. Passive auras, auto-casting powers, and damage over time.',
  className: 'Mage',
  type: 'passive',
  icon: 'Wand2',
  abilities: ENCHANTER_ABILITIES,
  subpaths: [
    {
      id: 'spellweaver',
      name: 'Spellweaver',
      description: 'Powers auto-cast and chain together',
      icon: 'Link',
    },
    {
      id: 'sage',
      name: 'Sage',
      description: 'Passive auras and damage fields',
      icon: 'Brain',
    },
  ],
};

// ============================================================================
// EXPORTS
// ============================================================================

export const MAGE_PATHS: PathDefinition[] = [
  ARCHMAGE_PATH,
  ENCHANTER_PATH,
];

export default MAGE_PATHS;
