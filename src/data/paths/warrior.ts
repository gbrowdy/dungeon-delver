// Placeholder imports - these types will be defined in src/types/paths.ts
// Task 2.1 is creating these types in parallel
type PathDefinition = any;
type PathAbility = any;
type SubpathDefinition = any;
type PathAbilityEffect = any;

/**
 * WARRIOR CLASS PATHS
 *
 * Two main paths representing different Warrior playstyles:
 * - BERSERKER: Active, risk/reward gameplay with power enhancement
 * - GUARDIAN: Passive survivability with auto-mechanics
 */

// ============================================================================
// BERSERKER PATH - Active playstyle focused on rage and power usage
// ============================================================================

const BERSERKER_ABILITIES: PathAbility[] = [
  // Core Berserker abilities
  {
    id: 'blood_rage',
    name: 'Blood Rage',
    description: 'Deal 15% more damage when below 50% HP',
    icon: 'Flame',
    levelRequirement: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'conditional_damage',
        value: 15,
        condition: 'hp_below_50',
        stat: 'power'
      }
    ]
  },
  {
    id: 'pain_fueled',
    name: 'Pain Fueled',
    description: 'Gain +1 Power for every 10% missing HP',
    icon: 'Zap',
    levelRequirement: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'scaling_stat',
        value: 1,
        scalingFactor: 10,
        condition: 'missing_hp_percent',
        stat: 'power'
      }
    ]
  },
  {
    id: 'adrenaline_rush',
    name: 'Adrenaline Rush',
    description: 'Gain 20% Speed when below 30% HP',
    icon: 'Zap',
    levelRequirement: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'conditional_stat',
        value: 20,
        condition: 'hp_below_30',
        stat: 'speed',
        isPercentage: true
      }
    ]
  },
  {
    id: 'bloodbath',
    name: 'Bloodbath',
    description: 'Killing an enemy heals you for 15% of your max HP',
    icon: 'Heart',
    levelRequirement: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'on_kill',
        trigger: 'kill',
        effect: 'heal',
        value: 15,
        isPercentage: true
      }
    ]
  },
  {
    id: 'reckless_fury',
    name: 'Reckless Fury',
    description: 'Powers cost HP instead of Mana (50% of mana cost)',
    icon: 'Skull',
    levelRequirement: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'modify_cost',
        costType: 'hp_instead_of_mana',
        multiplier: 0.5
      }
    ]
  },
  {
    id: 'battle_trance',
    name: 'Battle Trance',
    description: 'Power cooldowns reduced by 20%',
    icon: 'Timer',
    levelRequirement: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'cooldown_reduction',
        value: 20,
        isPercentage: true
      }
    ]
  },

  // Warlord Subpath - Control and battlefield dominance
  {
    id: 'intimidating_presence',
    name: 'Intimidating Presence',
    description: 'Enemies attack 10% slower',
    icon: 'Shield',
    levelRequirement: 3,
    isCapstone: false,
    subpath: 'warlord',
    effects: [
      {
        type: 'enemy_debuff',
        stat: 'speed',
        value: -10,
        isPercentage: true
      }
    ]
  },
  {
    id: 'warlord_command',
    name: 'Warlord Command',
    description: 'Your powers have a 25% chance to stun enemies for 1.5s',
    icon: 'Swords',
    levelRequirement: 4,
    isCapstone: false,
    subpath: 'warlord',
    effects: [
      {
        type: 'on_power_hit',
        trigger: 'power_use',
        effect: 'stun',
        chance: 25,
        duration: 1.5
      }
    ]
  },
  {
    id: 'crushing_blows',
    name: 'Crushing Blows',
    description: 'Critical hits slow enemies by 30% for 3s',
    icon: 'Hammer',
    levelRequirement: 5,
    isCapstone: false,
    subpath: 'warlord',
    effects: [
      {
        type: 'on_crit',
        trigger: 'critical_hit',
        effect: 'slow',
        value: 30,
        duration: 3
      }
    ]
  },

  // Executioner Subpath - Burst damage and execution
  {
    id: 'executioners_strike',
    name: "Executioner's Strike",
    description: 'Deal 25% more damage to enemies below 30% HP',
    icon: 'Sword',
    levelRequirement: 3,
    isCapstone: false,
    subpath: 'executioner',
    effects: [
      {
        type: 'conditional_damage',
        value: 25,
        condition: 'enemy_hp_below_30',
        stat: 'power'
      }
    ]
  },
  {
    id: 'killing_spree',
    name: 'Killing Spree',
    description: 'Killing an enemy grants +30% Power for 4s',
    icon: 'Sparkles',
    levelRequirement: 4,
    isCapstone: false,
    subpath: 'executioner',
    effects: [
      {
        type: 'on_kill',
        trigger: 'kill',
        effect: 'buff',
        stat: 'power',
        value: 30,
        duration: 4,
        isPercentage: true
      }
    ]
  },
  {
    id: 'mortal_wounds',
    name: 'Mortal Wounds',
    description: 'Your attacks apply Bleed, dealing 5% of damage dealt over 3s',
    icon: 'Droplet',
    levelRequirement: 5,
    isCapstone: false,
    subpath: 'executioner',
    effects: [
      {
        type: 'on_hit',
        trigger: 'attack',
        effect: 'bleed',
        value: 5,
        duration: 3,
        isPercentage: true
      }
    ]
  },

  // Berserker Capstone
  {
    id: 'undying_fury',
    name: 'Undying Fury',
    description: 'Once per combat, survive a lethal hit with 1 HP and gain 50% Power and Speed for 5s',
    icon: 'Flame',
    levelRequirement: 6,
    isCapstone: true,
    subpath: null,
    effects: [
      {
        type: 'cheat_death',
        trigger: 'lethal_damage',
        effect: 'survive',
        remainingHp: 1,
        usesPerCombat: 1,
        buff: {
          stats: ['power', 'speed'],
          value: 50,
          duration: 5,
          isPercentage: true
        }
      }
    ]
  }
];

const WARLORD_SUBPATH: SubpathDefinition = {
  id: 'warlord',
  name: 'Warlord',
  description: 'Master of battlefield control. Your powers dominate enemies with stuns and slows.',
  icon: 'Crown',
  theme: 'control'
};

const EXECUTIONER_SUBPATH: SubpathDefinition = {
  id: 'executioner',
  name: 'Executioner',
  description: 'Specialize in burst damage and finishing wounded foes. Strike hardest when enemies are weakest.',
  icon: 'Skull',
  theme: 'burst_damage'
};

const BERSERKER_PATH: PathDefinition = {
  id: 'berserker',
  name: 'Berserker',
  description: 'Risk and reward. Gain power as you take damage, enhanced abilities at low HP.',
  playstyle: 'active',
  icon: 'Flame',
  abilities: BERSERKER_ABILITIES,
  subpaths: [WARLORD_SUBPATH, EXECUTIONER_SUBPATH]
};

// ============================================================================
// GUARDIAN PATH - Passive survivability focused on outlasting enemies
// ============================================================================

const GUARDIAN_ABILITIES: PathAbility[] = [
  // Core Guardian abilities
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    description: 'Gain +3 Armor permanently',
    icon: 'Shield',
    levelRequirement: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'stat_bonus',
        stat: 'armor',
        value: 3
      }
    ]
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Increase HP regeneration by +1.0 per second',
    icon: 'Heart',
    levelRequirement: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'stat_bonus',
        stat: 'hp_regen',
        value: 1.0
      }
    ]
  },
  {
    id: 'damage_reduction',
    name: 'Stalwart',
    description: 'Reduce all incoming damage by 10%',
    icon: 'ShieldCheck',
    levelRequirement: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'damage_reduction',
        value: 10,
        isPercentage: true
      }
    ]
  },
  {
    id: 'auto_block',
    name: 'Auto Block',
    description: 'Automatically block the first attack every 8 seconds',
    icon: 'ShieldAlert',
    levelRequirement: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'auto_trigger',
        trigger: 'periodic',
        effect: 'block',
        interval: 8
      }
    ]
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    description: 'Gain +2 Armor and +20% damage when below 40% HP',
    icon: 'Shield',
    levelRequirement: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'conditional_stats',
        condition: 'hp_below_40',
        bonuses: [
          { stat: 'armor', value: 2 },
          { stat: 'power', value: 20, isPercentage: true }
        ]
      }
    ]
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Gain +15% maximum HP',
    icon: 'HeartPulse',
    levelRequirement: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        type: 'stat_bonus',
        stat: 'max_hp',
        value: 15,
        isPercentage: true
      }
    ]
  },

  // Fortress Subpath - Pure tank focus
  {
    id: 'fortress_stance',
    name: 'Fortress Stance',
    description: 'Your Armor is 30% more effective',
    icon: 'Castle',
    levelRequirement: 3,
    isCapstone: false,
    subpath: 'fortress',
    effects: [
      {
        type: 'stat_multiplier',
        stat: 'armor',
        value: 30,
        isPercentage: true
      }
    ]
  },
  {
    id: 'immovable_object',
    name: 'Immovable Object',
    description: 'Immune to stuns and slows',
    icon: 'Mountain',
    levelRequirement: 4,
    isCapstone: false,
    subpath: 'fortress',
    effects: [
      {
        type: 'immunity',
        statusEffects: ['stun', 'slow']
      }
    ]
  },
  {
    id: 'healing_aura',
    name: 'Healing Aura',
    description: 'Regenerate 2% of max HP every second',
    icon: 'Sparkles',
    levelRequirement: 5,
    isCapstone: false,
    subpath: 'fortress',
    effects: [
      {
        type: 'stat_bonus',
        stat: 'hp_regen',
        value: 2,
        isPercentage: true,
        basedOn: 'max_hp'
      }
    ]
  },

  // Avenger Subpath - Counter-attack and retaliation
  {
    id: 'thorns',
    name: 'Thorns',
    description: 'Reflect 15% of damage taken back to attackers',
    icon: 'Swords',
    levelRequirement: 3,
    isCapstone: false,
    subpath: 'avenger',
    effects: [
      {
        type: 'on_damaged',
        trigger: 'take_damage',
        effect: 'reflect',
        value: 15,
        isPercentage: true
      }
    ]
  },
  {
    id: 'vengeful_strike',
    name: 'Vengeful Strike',
    description: 'After taking damage, your next attack deals 40% more damage',
    icon: 'Sword',
    levelRequirement: 4,
    isCapstone: false,
    subpath: 'avenger',
    effects: [
      {
        type: 'on_damaged',
        trigger: 'take_damage',
        effect: 'buff',
        stat: 'power',
        value: 40,
        duration: 'next_attack',
        isPercentage: true
      }
    ]
  },
  {
    id: 'retribution',
    name: 'Retribution',
    description: 'When you block, your next attack is a guaranteed critical hit',
    icon: 'Zap',
    levelRequirement: 5,
    isCapstone: false,
    subpath: 'avenger',
    effects: [
      {
        type: 'on_block',
        trigger: 'block',
        effect: 'guaranteed_crit',
        duration: 'next_attack'
      }
    ]
  },

  // Guardian Capstone
  {
    id: 'immortal_guardian',
    name: 'Immortal Guardian',
    description: 'When you would die, instead heal to 40% HP. Can occur once per floor.',
    icon: 'ShieldCheck',
    levelRequirement: 6,
    isCapstone: true,
    subpath: null,
    effects: [
      {
        type: 'cheat_death',
        trigger: 'lethal_damage',
        effect: 'heal',
        value: 40,
        isPercentage: true,
        usesPerFloor: 1
      }
    ]
  }
];

const FORTRESS_SUBPATH: SubpathDefinition = {
  id: 'fortress',
  name: 'Fortress',
  description: 'Become an impenetrable wall. Focus on maximum survivability and damage reduction.',
  icon: 'Castle',
  theme: 'tank'
};

const AVENGER_SUBPATH: SubpathDefinition = {
  id: 'avenger',
  name: 'Avenger',
  description: 'Turn damage into opportunity. Punish attackers with thorns and devastating counters.',
  icon: 'Swords',
  theme: 'retaliation'
};

const GUARDIAN_PATH: PathDefinition = {
  id: 'guardian',
  name: 'Guardian',
  description: 'Passive survivability. Outlast your enemies with regeneration and damage reduction.',
  playstyle: 'passive',
  icon: 'Shield',
  abilities: GUARDIAN_ABILITIES,
  subpaths: [FORTRESS_SUBPATH, AVENGER_SUBPATH]
};

// ============================================================================
// EXPORTS
// ============================================================================

export const WARRIOR_PATHS = {
  berserker: BERSERKER_PATH,
  guardian: GUARDIAN_PATH
};

// Export individual paths for convenience
export { BERSERKER_PATH, GUARDIAN_PATH };

// Export subpaths
export { WARLORD_SUBPATH, EXECUTIONER_SUBPATH, FORTRESS_SUBPATH, AVENGER_SUBPATH };
