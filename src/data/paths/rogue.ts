/**
 * Rogue Class Path Definitions
 *
 * ROGUE - Master of precision and evasion
 * ├── ASSASSIN (Active) - "Burst windows and resets"
 * │   ├── Shadowblade - Massive crit burst
 * │   └── Nightstalker - Cooldown resets on kill
 * │
 * └── DUELIST (Passive) - "Counter and evade"
 *     ├── Swashbuckler - Dodging grants crit chance
 *     └── Phantom - Automatic dodge every X attacks
 */

import type { PathDefinition, PathAbility, PathAbilityEffect, SubpathDefinition } from '@/types/paths';

// ============================================================================
// ASSASSIN PATH - Active burst damage and kill chains
// ============================================================================

const ASSASSIN_PATH: PathDefinition = {
  id: 'assassin',
  name: 'Assassin',
  type: 'active',
  description: 'Strike from the shadows with devastating burst damage and chain your kills into unstoppable momentum.',
  icon: 'ability-paths-rogue-assassin',
  subpaths: [
    {
      id: 'shadowblade',
      name: 'Shadowblade',
      description: 'Master of critical strikes - guaranteed crits and massive damage multipliers',
      icon: 'ability-paths-rogue-shadowblade'
    },
    {
      id: 'nightstalker',
      name: 'Nightstalker',
      description: 'Kill chain specialist - resets and bonuses that snowball with each takedown',
      icon: 'ability-paths-rogue-nightstalker'
    }
  ],
  abilities: [
    // Shadowblade abilities - Crit mastery
    {
      id: 'rogue_assassin_vital_strike',
      name: 'Vital Strike',
      description: 'Your power abilities have a guaranteed critical hit chance. Increases power crit damage by 50%.',
      icon: 'ability-paths-rogue-rogue_assassin_vital_strike',
      levelRequired: 3,
      subpath: 'shadowblade',
      effects: [
        {
          trigger: 'on_power_use',
          chance: 1.0,
          damageModifier: { type: 'bonus_damage', value: 0.5 }
        }
      ]
    },
    {
      id: 'rogue_assassin_ambush',
      name: 'Ambush',
      description: 'Your first attack against each enemy is a guaranteed critical hit that deals 100% bonus damage.',
      icon: 'ability-paths-rogue-rogue_assassin_ambush',
      levelRequired: 4,
      subpath: 'shadowblade',
      effects: [
        {
          trigger: 'combat_start',
          chance: 1.0,
          damageModifier: { type: 'bonus_damage', value: 1.0 }
        }
      ]
    },
    {
      id: 'rogue_assassin_precision',
      name: 'Deadly Precision',
      description: 'Increase critical hit chance by 15% and critical damage by 75%.',
      icon: 'ability-paths-rogue-rogue_assassin_precision',
      levelRequired: 5,
      subpath: 'shadowblade',
      effects: [
        {
          trigger: 'passive',
          statModifiers: [
            { stat: 'power', percentBonus: 0.15 }
          ],
          damageModifier: { type: 'bonus_damage', value: 0.75 }
        }
      ]
    },

    // Nightstalker abilities - Reset mechanics
    {
      id: 'rogue_assassin_ruthless_efficiency',
      name: 'Ruthless Efficiency',
      description: 'Killing an enemy reduces all power cooldowns by 50% and restores 25 mana.',
      icon: 'ability-paths-rogue-rogue_assassin_ruthless_efficiency',
      levelRequired: 3,
      subpath: 'nightstalker',
      effects: [
        {
          trigger: 'on_kill',
          powerModifiers: [{ type: 'cooldown_reduction', value: 0.5 }],
          manaRestore: 25
        }
      ]
    },
    {
      id: 'rogue_assassin_killing_spree',
      name: 'Killing Spree',
      description: 'Each kill grants 25% increased damage for 8 seconds. Stacks up to 3 times.',
      icon: 'ability-paths-rogue-rogue_assassin_killing_spree',
      levelRequired: 4,
      subpath: 'nightstalker',
      effects: [
        {
          trigger: 'on_kill',
          damageModifier: { type: 'bonus_damage', value: 0.25 },
          duration: 8
        }
      ]
    },
    {
      id: 'rogue_assassin_execute',
      name: 'Executioner',
      description: 'Deal 100% bonus damage to enemies below 30% health. Kills grant 3 seconds of increased attack speed.',
      icon: 'ability-paths-rogue-rogue_assassin_execute',
      levelRequired: 5,
      subpath: 'nightstalker',
      effects: [
        {
          trigger: 'conditional',
          condition: { type: 'enemy_hp_below', value: 0.30 },
          damageModifier: { type: 'bonus_damage', value: 1.0 }
        },
        {
          trigger: 'on_kill',
          statModifiers: [{ stat: 'speed', percentBonus: 0.5 }],
          duration: 3
        }
      ]
    },

    // Shared/Capstone abilities
    {
      id: 'rogue_assassin_shadow_dance',
      name: 'Shadow Dance',
      description: 'Powers cost 50% less mana and deal 50% more damage. Your next 3 attacks after using a power are guaranteed critical hits.',
      icon: 'ability-paths-rogue-rogue_assassin_shadow_dance',
      levelRequired: 6,
      subpath: 'shadowblade',
      isCapstone: true,
      effects: [
        {
          trigger: 'passive',
          powerModifiers: [
            { type: 'cost_reduction', value: 0.5 },
            { type: 'power_bonus', value: 0.5 }
          ]
        },
        {
          trigger: 'on_power_use',
          chance: 1.0,
          duration: 3
        }
      ]
    },
    {
      id: 'rogue_assassin_death_mark',
      name: 'Death Mark',
      description: 'CAPSTONE: Enemies you damage take 25% increased damage from all sources. Killing a marked enemy instantly resets all power cooldowns.',
      icon: 'ability-paths-rogue-rogue_assassin_death_mark',
      levelRequired: 6,
      subpath: 'nightstalker',
      isCapstone: true,
      effects: [
        {
          trigger: 'on_hit',
          damageModifier: { type: 'bonus_damage', value: 0.25 },
          duration: 10
        },
        {
          trigger: 'on_kill',
          powerModifiers: [{ type: 'cooldown_reduction', value: 1.0 }]
        }
      ]
    }
  ]
};

// ============================================================================
// DUELIST PATH - Passive evasion and counter-attacks
// ============================================================================

const DUELIST_PATH: PathDefinition = {
  id: 'duelist',
  name: 'Duelist',
  type: 'passive',
  description: 'Dance between attacks with superior evasion, turning defense into devastating counter-strikes.',
  icon: 'ability-paths-rogue-duelist',
  subpaths: [
    {
      id: 'swashbuckler',
      name: 'Swashbuckler',
      description: 'Convert evasion into offense - dodges grant critical hits and riposte damage',
      icon: 'ability-paths-rogue-swashbuckler'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Pure avoidance master - guaranteed dodges and untargetable windows',
      icon: 'ability-paths-rogue-phantom'
    }
  ],
  abilities: [
    // Swashbuckler abilities - Dodge-to-offense
    {
      id: 'rogue_duelist_riposte',
      name: 'Riposte',
      description: 'When you dodge an attack, immediately counter-attack for 150% of your power stat. This counter cannot miss.',
      icon: 'ability-paths-rogue-rogue_duelist_riposte',
      levelRequired: 3,
      subpath: 'swashbuckler',
      effects: [
        {
          trigger: 'on_dodge',
          damageModifier: { type: 'bonus_damage', value: 1.5 },
          chance: 1.0
        }
      ]
    },
    {
      id: 'rogue_duelist_en_garde',
      name: 'En Garde',
      description: 'Each successful dodge grants 20% critical hit chance for your next 2 attacks. Stacks up to 3 times.',
      icon: 'ability-paths-rogue-rogue_duelist_en_garde',
      levelRequired: 4,
      subpath: 'swashbuckler',
      effects: [
        {
          trigger: 'on_dodge',
          statModifiers: [{ stat: 'power', percentBonus: 0.2 }],
          duration: 2
        }
      ]
    },
    {
      id: 'rogue_duelist_blade_dancer',
      name: 'Blade Dancer',
      description: 'Increase dodge chance by 15%. Your critical hits increase your dodge chance by 10% for 5 seconds.',
      icon: 'ability-paths-rogue-rogue_duelist_blade_dancer',
      levelRequired: 5,
      subpath: 'swashbuckler',
      effects: [
        {
          trigger: 'passive',
          statModifiers: [{ stat: 'speed', percentBonus: 0.15 }]
        },
        {
          trigger: 'on_crit',
          statModifiers: [{ stat: 'speed', percentBonus: 0.1 }],
          duration: 5
        }
      ]
    },

    // Phantom abilities - Pure evasion
    {
      id: 'rogue_duelist_evasion',
      name: 'Evasion',
      description: 'Increase dodge chance by 20%. You cannot be reduced below 10% dodge chance by any means.',
      icon: 'ability-paths-rogue-rogue_duelist_evasion',
      levelRequired: 3,
      subpath: 'phantom',
      effects: [
        {
          trigger: 'passive',
          statModifiers: [{ stat: 'speed', percentBonus: 0.2 }]
        }
      ]
    },
    {
      id: 'rogue_duelist_uncanny_dodge',
      name: 'Uncanny Dodge',
      description: 'Every 5th enemy attack against you is automatically dodged. Taking damage reduces this counter by 1.',
      icon: 'ability-paths-rogue-rogue_duelist_uncanny_dodge',
      levelRequired: 4,
      subpath: 'phantom',
      effects: [
        {
          trigger: 'passive',
          chance: 1.0
        }
      ]
    },
    {
      id: 'rogue_duelist_blur',
      name: 'Blur',
      description: 'After dodging 3 attacks in a row, become untargetable for 2 seconds. Cooldown: 15 seconds.',
      icon: 'ability-paths-rogue-rogue_duelist_blur',
      levelRequired: 5,
      subpath: 'phantom',
      effects: [
        {
          trigger: 'on_dodge',
          shield: 100,
          duration: 2,
          cooldown: 15
        }
      ]
    },

    // Shared/Capstone abilities
    {
      id: 'rogue_duelist_perfect_form',
      name: 'Perfect Form',
      description: 'CAPSTONE: Your dodge chance is increased by 25%. Each dodge grants a stack of Momentum (max 5). At 5 stacks, your next attack deals 300% damage and consumes all stacks.',
      icon: 'ability-paths-rogue-rogue_duelist_perfect_form',
      levelRequired: 6,
      subpath: 'swashbuckler',
      isCapstone: true,
      effects: [
        {
          trigger: 'passive',
          statModifiers: [{ stat: 'speed', percentBonus: 0.25 }]
        },
        {
          trigger: 'on_dodge',
          damageModifier: { type: 'bonus_damage', value: 3.0 }
        }
      ]
    },
    {
      id: 'rogue_duelist_shadowstep',
      name: 'Shadowstep',
      description: 'CAPSTONE: Become permanently untargetable during your attack animations. The first attack you take after dodging deals 75% reduced damage.',
      icon: 'ability-paths-rogue-rogue_duelist_shadowstep',
      levelRequired: 6,
      subpath: 'phantom',
      isCapstone: true,
      effects: [
        {
          trigger: 'passive',
          shield: 1000
        },
        {
          trigger: 'on_dodge',
          damageModifier: { type: 'reflect', value: 0.75 },
          duration: 1
        }
      ]
    }
  ]
};

// ============================================================================
// EXPORT
// ============================================================================

export const ROGUE_PATHS: PathDefinition[] = [
  ASSASSIN_PATH,
  DUELIST_PATH
];

export default ROGUE_PATHS;
