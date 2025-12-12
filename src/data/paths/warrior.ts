import type { PathDefinition, PathAbility, SubpathDefinition } from '@/types/paths';

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
    levelRequired: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 50 },
        statModifiers: [{ stat: 'power', percentBonus: 0.15 }]
      }
    ]
  },
  {
    id: 'pain_fueled',
    name: 'Pain Fueled',
    description: 'Gain +1 Power for every 10% missing HP',
    icon: 'Zap',
    levelRequired: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 90 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 80 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 70 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 60 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 50 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 40 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 30 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 20 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      },
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 10 },
        statModifiers: [{ stat: 'power', flatBonus: 1 }]
      }
    ]
  },
  {
    id: 'adrenaline_rush',
    name: 'Adrenaline Rush',
    description: 'Gain 20% Speed when below 30% HP',
    icon: 'Zap',
    levelRequired: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 30 },
        statModifiers: [{ stat: 'speed', percentBonus: 0.20 }]
      }
    ]
  },
  {
    id: 'bloodbath',
    name: 'Bloodbath',
    description: 'Killing an enemy heals you for 15% of your max HP',
    icon: 'Heart',
    levelRequired: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'on_kill',
        heal: 15 // Percentage heal - implementation should use player.maxHealth * 0.15
      }
    ]
  },
  {
    id: 'reckless_fury',
    name: 'Reckless Fury',
    description: 'Powers cost HP instead of Mana (50% of mana cost)',
    icon: 'Skull',
    levelRequired: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'on_power_use',
        // This is a special mechanic that needs custom implementation
        // The effect modifies power cost type from mana to HP
        powerModifiers: [{ type: 'cost_reduction', value: 0.5 }]
      }
    ]
  },
  {
    id: 'battle_trance',
    name: 'Battle Trance',
    description: 'Power cooldowns reduced by 20%',
    icon: 'Timer',
    levelRequired: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        powerModifiers: [{ type: 'cooldown_reduction', value: 0.20 }]
      }
    ]
  },

  // Warlord Subpath - Control and battlefield dominance
  {
    id: 'intimidating_presence',
    name: 'Intimidating Presence',
    description: 'Enemies attack 10% slower',
    icon: 'Shield',
    levelRequired: 3,
    isCapstone: false,
    subpath: 'warlord',
    effects: [
      {
        trigger: 'passive',
        // Enemy debuff - needs custom implementation
        // This reduces enemy speed by 10%
        damageModifier: { type: 'bonus_damage', value: 0 }
      }
    ]
  },
  {
    id: 'warlord_command',
    name: 'Warlord Command',
    description: 'Your powers have a 25% chance to stun enemies for 1.5s',
    icon: 'Swords',
    levelRequired: 4,
    isCapstone: false,
    subpath: 'warlord',
    effects: [
      {
        trigger: 'on_power_use',
        statusApplication: {
          statusType: 'stun',
          duration: 1.5,
          chance: 0.25
        }
      }
    ]
  },
  {
    id: 'crushing_blows',
    name: 'Crushing Blows',
    description: 'Critical hits slow enemies by 30% for 3s',
    icon: 'Hammer',
    levelRequired: 5,
    isCapstone: false,
    subpath: 'warlord',
    effects: [
      {
        trigger: 'on_crit',
        statusApplication: {
          statusType: 'slow',
          duration: 3,
          chance: 1.0
        }
      }
    ]
  },

  // Executioner Subpath - Burst damage and execution
  {
    id: 'executioners_strike',
    name: "Executioner's Strike",
    description: 'Deal 25% more damage to enemies below 30% HP',
    icon: 'Sword',
    levelRequired: 3,
    isCapstone: false,
    subpath: 'executioner',
    effects: [
      {
        trigger: 'conditional',
        condition: { type: 'enemy_hp_below', value: 30 },
        statModifiers: [{ stat: 'power', percentBonus: 0.25 }]
      }
    ]
  },
  {
    id: 'killing_spree',
    name: 'Killing Spree',
    description: 'Killing an enemy grants +30% Power for 4s',
    icon: 'Sparkles',
    levelRequired: 4,
    isCapstone: false,
    subpath: 'executioner',
    effects: [
      {
        trigger: 'on_kill',
        statModifiers: [{ stat: 'power', percentBonus: 0.30 }],
        duration: 4
      }
    ]
  },
  {
    id: 'mortal_wounds',
    name: 'Mortal Wounds',
    description: 'Your attacks apply Bleed, dealing 5% of damage dealt over 3s',
    icon: 'Droplet',
    levelRequired: 5,
    isCapstone: false,
    subpath: 'executioner',
    effects: [
      {
        trigger: 'on_hit',
        statusApplication: {
          statusType: 'bleed',
          damage: 5, // 5% of damage dealt
          duration: 3,
          chance: 1.0
        }
      }
    ]
  },

  // Berserker Capstone
  {
    id: 'undying_fury',
    name: 'Undying Fury',
    description: 'Once per combat, survive a lethal hit with 1 HP and gain 50% Power and Speed for 5s',
    icon: 'Flame',
    levelRequired: 6,
    isCapstone: true,
    subpath: null,
    effects: [
      {
        trigger: 'on_damaged',
        condition: { type: 'hp_below', value: 1 },
        heal: 1, // Set HP to 1
        statModifiers: [
          { stat: 'power', percentBonus: 0.50 },
          { stat: 'speed', percentBonus: 0.50 }
        ],
        duration: 5,
        cooldown: 999999 // Once per combat (very high cooldown)
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
  type: 'active',
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
    levelRequired: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'armor', flatBonus: 3 }]
      }
    ]
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Increase HP regeneration by +1.0 per second',
    icon: 'Heart',
    levelRequired: 3,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        heal: 1.0 // Per second heal
      }
    ]
  },
  {
    id: 'damage_reduction',
    name: 'Stalwart',
    description: 'Reduce all incoming damage by 10%',
    icon: 'ShieldCheck',
    levelRequired: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        // Damage reduction - needs custom implementation
        damageModifier: { type: 'bonus_damage', value: -0.10 }
      }
    ]
  },
  {
    id: 'auto_block',
    name: 'Auto Block',
    description: 'Automatically block the first attack every 8 seconds',
    icon: 'ShieldAlert',
    levelRequired: 4,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'on_damaged',
        cooldown: 8,
        shield: 999 // Block entire attack
      }
    ]
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    description: 'Gain +2 Armor and +20% damage when below 40% HP',
    icon: 'Shield',
    levelRequired: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'conditional',
        condition: { type: 'hp_below', value: 40 },
        statModifiers: [
          { stat: 'armor', flatBonus: 2 },
          { stat: 'power', percentBonus: 0.20 }
        ]
      }
    ]
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Gain +15% maximum HP',
    icon: 'HeartPulse',
    levelRequired: 5,
    isCapstone: false,
    subpath: null,
    effects: [
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'maxHealth', percentBonus: 0.15 }]
      }
    ]
  },

  // Fortress Subpath - Pure tank focus
  {
    id: 'fortress_stance',
    name: 'Fortress Stance',
    description: 'Your Armor is 30% more effective',
    icon: 'Castle',
    levelRequired: 3,
    isCapstone: false,
    subpath: 'fortress',
    effects: [
      {
        trigger: 'passive',
        statModifiers: [{ stat: 'armor', percentBonus: 0.30 }]
      }
    ]
  },
  {
    id: 'immovable_object',
    name: 'Immovable Object',
    description: 'Immune to stuns and slows',
    icon: 'Mountain',
    levelRequired: 4,
    isCapstone: false,
    subpath: 'fortress',
    effects: [
      {
        trigger: 'passive',
        cleanse: true // Immune to stun/slow - needs custom implementation
      }
    ]
  },
  {
    id: 'healing_aura',
    name: 'Healing Aura',
    description: 'Regenerate 2% of max HP every second',
    icon: 'Sparkles',
    levelRequired: 5,
    isCapstone: false,
    subpath: 'fortress',
    effects: [
      {
        trigger: 'turn_start',
        heal: 2 // 2% of max HP - implementation should calculate based on maxHealth
      }
    ]
  },

  // Avenger Subpath - Counter-attack and retaliation
  {
    id: 'thorns',
    name: 'Thorns',
    description: 'Reflect 15% of damage taken back to attackers',
    icon: 'Swords',
    levelRequired: 3,
    isCapstone: false,
    subpath: 'avenger',
    effects: [
      {
        trigger: 'on_damaged',
        damageModifier: { type: 'reflect', value: 0.15 }
      }
    ]
  },
  {
    id: 'vengeful_strike',
    name: 'Vengeful Strike',
    description: 'After taking damage, your next attack deals 40% more damage',
    icon: 'Sword',
    levelRequired: 4,
    isCapstone: false,
    subpath: 'avenger',
    effects: [
      {
        trigger: 'on_damaged',
        statModifiers: [{ stat: 'power', percentBonus: 0.40 }],
        duration: 1 // Next attack only
      }
    ]
  },
  {
    id: 'retribution',
    name: 'Retribution',
    description: 'When you block, your next attack is a guaranteed critical hit',
    icon: 'Zap',
    levelRequired: 5,
    isCapstone: false,
    subpath: 'avenger',
    effects: [
      {
        trigger: 'on_block',
        // Guaranteed crit - needs custom implementation
        damage: 100 // Placeholder for guaranteed crit boost
      }
    ]
  },

  // Guardian Capstone
  {
    id: 'immortal_guardian',
    name: 'Immortal Guardian',
    description: 'When you would die, instead heal to 40% HP. Can occur once per floor.',
    icon: 'ShieldCheck',
    levelRequired: 6,
    isCapstone: true,
    subpath: null,
    effects: [
      {
        trigger: 'on_damaged',
        condition: { type: 'hp_below', value: 1 },
        heal: 40, // 40% of max HP
        cooldown: 999999 // Once per floor (very high cooldown)
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
  type: 'passive',
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
