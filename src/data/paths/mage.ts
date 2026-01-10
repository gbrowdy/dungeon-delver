// Placeholder imports - types will be defined in src/types/paths.ts (Task 2.1)
import type { PathDefinition, PathAbility, PathAbilityEffect } from '@/types/paths';

/**
 * MAGE CLASS PATHS
 *
 * ARCHMAGE (Active Path) - "Spell timing mastery"
 * - Spell damage bonuses, resource efficiency, cooldown manipulation
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
    icon: 'ability-paths-mage-archmage_spell_power',
    levelRequired: 3,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'power', percentBonus: 0.2 }],
      },
    ],
  },
  {
    id: 'archmage_mana_efficiency',
    name: 'Efficient Casting',
    description: 'Powers cost 15% less resource.',
    icon: 'ability-paths-mage-archmage_mana_efficiency',
    levelRequired: 3,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        powerModifiers: [{ type: 'cost_reduction', value: 0.15 }],
      },
    ],
  },
  {
    id: 'archmage_cooldown_mastery',
    name: 'Quickcast',
    description: 'Power cooldowns recover 20% faster.',
    icon: 'ability-paths-mage-archmage_cooldown_mastery',
    levelRequired: 4,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        powerModifiers: [{ type: 'cooldown_reduction', value: 0.2 }],
      },
    ],
  },
  {
    id: 'archmage_spell_crit',
    name: 'Critical Magic',
    description: 'Powers have a 25% chance to deal double damage.',
    icon: 'ability-paths-mage-archmage_spell_crit',
    levelRequired: 4,
    subpath: null,
    effects: [
      {
        trigger: 'on_power_use',
        damageModifier: { type: 'bonus_damage', value: 1.0 },
        chance: 0.25,
      },
    ],
  },

  // === ELEMENTALIST SUBPATH - Multi-element combos ===
  {
    id: 'elementalist_fire_mastery',
    name: 'Flame Affinity',
    description: 'Fire spells burn enemies for 30% additional damage over 3 seconds.',
    icon: 'ability-paths-mage-elementalist_fire_mastery',
    levelRequired: 3,
    subpath: 'elementalist',
    effects: [
      {
        trigger: 'on_power_use',
        statusApplication: {
          statusType: 'bleed',
          damage: 10,
          duration: 3,
          chance: 1.0,
        },
      },
    ],
  },
  {
    id: 'elementalist_ice_mastery',
    name: 'Frost Affinity',
    description: 'Ice spells slow enemies by 30% for 2 seconds.',
    icon: 'ability-paths-mage-elementalist_ice_mastery',
    levelRequired: 4,
    subpath: 'elementalist',
    effects: [
      {
        trigger: 'on_power_use',
        statusApplication: {
          statusType: 'slow',
          duration: 2,
          chance: 1.0,
        },
      },
    ],
  },
  {
    id: 'elementalist_lightning_mastery',
    name: 'Storm Affinity',
    description: 'Lightning spells chain to deal 40% damage to the enemy again.',
    icon: 'ability-paths-mage-elementalist_lightning_mastery',
    levelRequired: 5,
    subpath: 'elementalist',
    effects: [
      {
        trigger: 'on_power_use',
        damage: 0.4,
      },
    ],
  },
  {
    id: 'elementalist_elemental_convergence',
    name: 'Elemental Convergence',
    description: 'After using 3 different elemental powers, your next power deals 100% bonus damage.',
    icon: 'ability-paths-mage-elementalist_elemental_convergence',
    levelRequired: 6,
    subpath: 'elementalist',
    isCapstone: true,
    effects: [
      {
        trigger: 'on_combo',
        condition: { type: 'combo_count', value: 3 },
        damageModifier: { type: 'bonus_damage', value: 1.0 },
      },
    ],
  },

  // === DESTROYER SUBPATH - Raw power and big numbers ===
  {
    id: 'destroyer_overwhelming_power',
    name: 'Overwhelming Power',
    description: 'Powers deal 35% more damage but cost 20% more resource.',
    icon: 'ability-paths-mage-destroyer_overwhelming_power',
    levelRequired: 3,
    subpath: 'destroyer',
    effects: [
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'power', percentBonus: 0.35 }],
      },
      {
        trigger: 'passive',
        powerModifiers: [{ type: 'cost_reduction', value: -0.2 }],
      },
    ],
  },
  {
    id: 'destroyer_spell_surge',
    name: 'Spell Surge',
    description: 'Powers have a 15% chance to reset their cooldown.',
    icon: 'ability-paths-mage-destroyer_spell_surge',
    levelRequired: 4,
    subpath: 'destroyer',
    effects: [
      {
        trigger: 'on_power_use',
        powerModifiers: [{ type: 'cooldown_reduction', value: 1.0 }],
        chance: 0.15,
      },
    ],
  },
  {
    id: 'destroyer_glass_cannon',
    name: 'Glass Cannon',
    description: 'Your spells deal 50% more damage, but you take 20% more damage.',
    icon: 'ability-paths-mage-destroyer_glass_cannon',
    levelRequired: 5,
    subpath: 'destroyer',
    effects: [
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'power', percentBonus: 0.5 }],
      },
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'armor', percentBonus: -0.2 }],
      },
    ],
  },
  {
    id: 'destroyer_apocalypse',
    name: 'Apocalypse',
    description: 'Every 10 seconds, your next power deals triple damage and costs no resource.',
    icon: 'ability-paths-mage-destroyer_apocalypse',
    levelRequired: 6,
    subpath: 'destroyer',
    isCapstone: true,
    effects: [
      {
        trigger: 'on_power_use',
        damageModifier: { type: 'bonus_damage', value: 2.0 },
        powerModifiers: [{ type: 'cost_reduction', value: 1.0 }],
        cooldown: 10,
      },
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
    icon: 'ability-paths-mage-enchanter_passive_power',
    levelRequired: 3,
    subpath: null,
    effects: [
      {
        trigger: 'on_hit',
        damageModifier: { type: 'bonus_damage', value: 0.3 },
      },
    ],
  },
  {
    id: 'enchanter_mana_regen',
    name: 'Arcane Flow',
    description: 'Build 2 additional Arcane Charges per second.',
    icon: 'ability-paths-mage-enchanter_mana_regen',
    levelRequired: 3,
    subpath: null,
    effects: [
      {
        trigger: 'turn_start',
        manaRestore: 2,
      },
    ],
  },
  {
    id: 'enchanter_damage_aura',
    name: 'Arcane Aura',
    description: 'Passively deal 5 magic damage per second to enemies.',
    icon: 'ability-paths-mage-enchanter_damage_aura',
    levelRequired: 4,
    subpath: null,
    effects: [
      {
        trigger: 'turn_start',
        damage: 5,
      },
    ],
  },
  {
    id: 'enchanter_dot_amplify',
    name: 'Lingering Magic',
    description: 'Your damage over time effects last 50% longer and deal 25% more damage.',
    icon: 'ability-paths-mage-enchanter_dot_amplify',
    levelRequired: 4,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        damageModifier: { type: 'bonus_damage', value: 0.25 },
      },
    ],
  },

  // === SPELLWEAVER SUBPATH - Auto-casting ===
  {
    id: 'spellweaver_auto_cast',
    name: 'Automated Magic',
    description: 'Your first power automatically casts when off cooldown.',
    icon: 'ability-paths-mage-spellweaver_auto_cast',
    levelRequired: 3,
    subpath: 'spellweaver',
    effects: [
      {
        trigger: 'turn_start',
        powerModifiers: [{ type: 'cooldown_reduction', value: 0.1 }],
      },
    ],
  },
  {
    id: 'spellweaver_chain_cast',
    name: 'Chain Casting',
    description: 'When you manually cast a power, automatically cast another random power if available.',
    icon: 'ability-paths-mage-spellweaver_chain_cast',
    levelRequired: 4,
    subpath: 'spellweaver',
    effects: [
      {
        trigger: 'on_power_use',
        powerModifiers: [{ type: 'combo_bonus', value: 0.2 }],
        chance: 1.0,
      },
    ],
  },
  {
    id: 'spellweaver_efficient_automation',
    name: 'Efficient Automation',
    description: 'Powers cost 30% less resource and have 20% faster cooldown recovery.',
    icon: 'ability-paths-mage-spellweaver_efficient_automation',
    levelRequired: 5,
    subpath: 'spellweaver',
    effects: [
      {
        trigger: 'passive',
        powerModifiers: [
          { type: 'cost_reduction', value: 0.3 },
          { type: 'cooldown_reduction', value: 0.2 }
        ],
      },
    ],
  },
  {
    id: 'spellweaver_arcane_assembly',
    name: 'Arcane Assembly Line',
    description: 'ALL powers auto-cast when off cooldown. Gain 50% cooldown recovery speed.',
    icon: 'ability-paths-mage-spellweaver_arcane_assembly',
    levelRequired: 6,
    subpath: 'spellweaver',
    isCapstone: true,
    effects: [
      {
        trigger: 'turn_start',
        powerModifiers: [{ type: 'cooldown_reduction', value: 0.5 }],
      },
    ],
  },

  // === SAGE SUBPATH - Passive auras and fields ===
  {
    id: 'sage_wisdom_aura',
    name: 'Aura of Wisdom',
    description: 'Build 1 Arcane Charge per second for each enemy status effect active.',
    icon: 'ability-paths-mage-sage_wisdom_aura',
    levelRequired: 3,
    subpath: 'sage',
    effects: [
      {
        trigger: 'turn_start',
        condition: { type: 'enemy_has_status', value: 1 },
        manaRestore: 1,
      },
    ],
  },
  {
    id: 'sage_toxic_field',
    name: 'Toxic Field',
    description: 'Enemies are poisoned for 8 damage per second while in combat.',
    icon: 'ability-paths-mage-sage_toxic_field',
    levelRequired: 4,
    subpath: 'sage',
    effects: [
      {
        trigger: 'combat_start',
        statusApplication: {
          statusType: 'poison',
          damage: 8,
          duration: 999,
          chance: 1.0,
        },
      },
    ],
  },
  {
    id: 'sage_arcane_field',
    name: 'Arcane Disruption Field',
    description: 'Enemies attack 20% slower while in combat with you.',
    icon: 'ability-paths-mage-sage_arcane_field',
    levelRequired: 5,
    subpath: 'sage',
    effects: [
      {
        trigger: 'combat_start',
        statusApplication: {
          statusType: 'slow',
          duration: 999,
          chance: 1.0,
        },
      },
    ],
  },
  {
    id: 'sage_overwhelming_presence',
    name: 'Overwhelming Presence',
    description: 'Your passive auras deal triple damage and apply all status effects (poison, slow, burn).',
    icon: 'ability-paths-mage-sage_overwhelming_presence',
    levelRequired: 6,
    subpath: 'sage',
    isCapstone: true,
    effects: [
      {
        trigger: 'passive',
        damageModifier: { type: 'bonus_damage', value: 2.0 },
      },
      {
        trigger: 'turn_start',
        damage: 15,
        statusApplication: {
          statusType: 'poison',
          damage: 5,
          duration: 3,
          chance: 1.0,
        },
      },
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
  icon: 'ability-paths-mage-archmage',
  abilities: ARCHMAGE_ABILITIES,
  subpaths: [
    {
      id: 'battlemage',
      name: 'Battlemage',
      description: 'Sustained spell pressure - never stop casting',
      icon: 'ability-paths-mage-battlemage',
      theme: 'sustained',
    },
    {
      id: 'destroyer',
      name: 'Destroyer',
      description: 'Explosive burst damage - wait for the perfect moment',
      icon: 'ability-paths-mage-destroyer',
      theme: 'burst',
    },
  ],
  hasComboMechanic: true
};

const ENCHANTER_PATH: PathDefinition = {
  id: 'enchanter',
  name: 'Enchanter',
  description: 'Magic works for you automatically. Passive auras, damage over time, and hex effects.',
  className: 'Mage',
  type: 'passive',
  icon: 'ability-paths-mage-enchanter',
  abilities: ENCHANTER_ABILITIES,
  subpaths: [], // Passive paths don't use subpaths (they use stances)
  hasComboMechanic: false
};

// ============================================================================
// EXPORTS
// ============================================================================

export const MAGE_PATHS: PathDefinition[] = [
  ARCHMAGE_PATH,
  ENCHANTER_PATH,
];

export default MAGE_PATHS;
