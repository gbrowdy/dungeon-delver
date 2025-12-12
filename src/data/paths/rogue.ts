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

// Placeholder types - will be defined in src/types/paths.ts by Task 2.1
interface PathAbilityEffect {
  type: string;
  value: number;
  target?: string;
  trigger?: string;
  duration?: number;
}

interface PathAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  levelRequired: number;
  subpath: string;
  effects: PathAbilityEffect[];
  isCapstone?: boolean;
}

interface SubpathDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface PathDefinition {
  id: string;
  name: string;
  description: string;
  playStyle: 'active' | 'passive';
  icon: string;
  subpaths: SubpathDefinition[];
  abilities: PathAbility[];
}

// ============================================================================
// ASSASSIN PATH - Active burst damage and kill chains
// ============================================================================

const ASSASSIN_PATH: PathDefinition = {
  id: 'assassin',
  name: 'Assassin',
  description: 'Strike from the shadows with devastating burst damage and chain your kills into unstoppable momentum.',
  type: 'active',
  icon: 'Crosshair',
  subpaths: [
    {
      id: 'shadowblade',
      name: 'Shadowblade',
      description: 'Master of critical strikes - guaranteed crits and massive damage multipliers',
      icon: 'Target'
    },
    {
      id: 'nightstalker',
      name: 'Nightstalker',
      description: 'Kill chain specialist - resets and bonuses that snowball with each takedown',
      icon: 'Zap'
    }
  ],
  abilities: [
    // Shadowblade abilities - Crit mastery
    {
      id: 'rogue_assassin_vital_strike',
      name: 'Vital Strike',
      description: 'Your power abilities have a guaranteed critical hit chance. Increases power crit damage by 50%.',
      icon: 'Target',
      levelRequired: 3,
      subpath: 'shadowblade',
      effects: [
        { type: 'power_guaranteed_crit', value: 1 },
        { type: 'power_crit_damage_bonus', value: 0.5 }
      ]
    },
    {
      id: 'rogue_assassin_ambush',
      name: 'Ambush',
      description: 'Your first attack against each enemy is a guaranteed critical hit that deals 100% bonus damage.',
      icon: 'Eye',
      levelRequired: 4,
      subpath: 'shadowblade',
      effects: [
        { type: 'first_strike_guaranteed_crit', value: 1 },
        { type: 'first_strike_damage_bonus', value: 1.0 }
      ]
    },
    {
      id: 'rogue_assassin_precision',
      name: 'Deadly Precision',
      description: 'Increase critical hit chance by 15% and critical damage by 75%.',
      icon: 'Crosshair',
      levelRequired: 5,
      subpath: 'shadowblade',
      effects: [
        { type: 'crit_chance_bonus', value: 0.15 },
        { type: 'crit_damage_bonus', value: 0.75 }
      ]
    },

    // Nightstalker abilities - Reset mechanics
    {
      id: 'rogue_assassin_ruthless_efficiency',
      name: 'Ruthless Efficiency',
      description: 'Killing an enemy reduces all power cooldowns by 50% and restores 25 mana.',
      icon: 'Zap',
      levelRequired: 3,
      subpath: 'nightstalker',
      effects: [
        { type: 'cooldown_reduction_on_kill', value: 0.5, trigger: 'on_kill' },
        { type: 'mana_restore_on_kill', value: 25, trigger: 'on_kill' }
      ]
    },
    {
      id: 'rogue_assassin_killing_spree',
      name: 'Killing Spree',
      description: 'Each kill grants 25% increased damage for 8 seconds. Stacks up to 3 times.',
      icon: 'Flame',
      levelRequired: 4,
      subpath: 'nightstalker',
      effects: [
        { type: 'damage_bonus_on_kill', value: 0.25, trigger: 'on_kill', duration: 8 },
        { type: 'max_stacks', value: 3 }
      ]
    },
    {
      id: 'rogue_assassin_execute',
      name: 'Executioner',
      description: 'Deal 100% bonus damage to enemies below 30% health. Kills grant 3 seconds of increased attack speed.',
      icon: 'Skull',
      levelRequired: 5,
      subpath: 'nightstalker',
      effects: [
        { type: 'low_health_damage_bonus', value: 1.0, trigger: 'health_threshold', target: 'enemy_below_30' },
        { type: 'attack_speed_on_kill', value: 0.5, trigger: 'on_kill', duration: 3 }
      ]
    },

    // Shared/Capstone abilities
    {
      id: 'rogue_assassin_shadow_dance',
      name: 'Shadow Dance',
      description: 'Powers cost 50% less mana and deal 50% more damage. Your next 3 attacks after using a power are guaranteed critical hits.',
      icon: 'Swords',
      levelRequired: 6,
      subpath: 'shadowblade',
      isCapstone: true,
      effects: [
        { type: 'power_mana_cost_reduction', value: 0.5 },
        { type: 'power_damage_bonus', value: 0.5 },
        { type: 'guaranteed_crits_after_power', value: 3, trigger: 'after_power_use' }
      ]
    },
    {
      id: 'rogue_assassin_death_mark',
      name: 'Death Mark',
      description: 'CAPSTONE: Enemies you damage take 25% increased damage from all sources. Killing a marked enemy instantly resets all power cooldowns.',
      icon: 'Crosshair',
      levelRequired: 6,
      subpath: 'nightstalker',
      isCapstone: true,
      effects: [
        { type: 'vulnerability_debuff', value: 0.25, trigger: 'on_damage_dealt', target: 'enemy', duration: 10 },
        { type: 'full_cooldown_reset_on_kill', value: 1, trigger: 'on_marked_kill' }
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
  description: 'Dance between attacks with superior evasion, turning defense into devastating counter-strikes.',
  type: 'passive',
  icon: 'Shield',
  subpaths: [
    {
      id: 'swashbuckler',
      name: 'Swashbuckler',
      description: 'Convert evasion into offense - dodges grant critical hits and riposte damage',
      icon: 'Swords'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Pure avoidance master - guaranteed dodges and untargetable windows',
      icon: 'EyeOff'
    }
  ],
  abilities: [
    // Swashbuckler abilities - Dodge-to-offense
    {
      id: 'rogue_duelist_riposte',
      name: 'Riposte',
      description: 'When you dodge an attack, immediately counter-attack for 150% damage. This counter cannot miss.',
      icon: 'Swords',
      levelRequired: 3,
      subpath: 'swashbuckler',
      effects: [
        { type: 'counter_attack_on_dodge', value: 1.5, trigger: 'on_dodge' },
        { type: 'counter_cannot_miss', value: 1 }
      ]
    },
    {
      id: 'rogue_duelist_en_garde',
      name: 'En Garde',
      description: 'Each successful dodge grants 20% critical hit chance for your next 2 attacks. Stacks up to 3 times.',
      icon: 'Sparkles',
      levelRequired: 4,
      subpath: 'swashbuckler',
      effects: [
        { type: 'crit_chance_on_dodge', value: 0.2, trigger: 'on_dodge' },
        { type: 'buff_duration_attacks', value: 2 },
        { type: 'max_stacks', value: 3 }
      ]
    },
    {
      id: 'rogue_duelist_blade_dancer',
      name: 'Blade Dancer',
      description: 'Increase dodge chance by 15%. Your critical hits increase your dodge chance by 10% for 5 seconds.',
      icon: 'Wind',
      levelRequired: 5,
      subpath: 'swashbuckler',
      effects: [
        { type: 'dodge_chance_bonus', value: 0.15 },
        { type: 'dodge_chance_on_crit', value: 0.1, trigger: 'on_crit', duration: 5 }
      ]
    },

    // Phantom abilities - Pure evasion
    {
      id: 'rogue_duelist_evasion',
      name: 'Evasion',
      description: 'Increase dodge chance by 20%. You cannot be reduced below 10% dodge chance by any means.',
      icon: 'EyeOff',
      levelRequired: 3,
      subpath: 'phantom',
      effects: [
        { type: 'dodge_chance_bonus', value: 0.2 },
        { type: 'dodge_chance_floor', value: 0.1 }
      ]
    },
    {
      id: 'rogue_duelist_uncanny_dodge',
      name: 'Uncanny Dodge',
      description: 'Every 5th enemy attack against you is automatically dodged. Taking damage reduces this counter by 1.',
      icon: 'Shield',
      levelRequired: 4,
      subpath: 'phantom',
      effects: [
        { type: 'guaranteed_dodge_every_n_attacks', value: 5 },
        { type: 'counter_reduction_on_hit', value: 1 }
      ]
    },
    {
      id: 'rogue_duelist_blur',
      name: 'Blur',
      description: 'After dodging 3 attacks in a row, become untargetable for 2 seconds. Cooldown: 15 seconds.',
      icon: 'Ghost',
      levelRequired: 5,
      subpath: 'phantom',
      effects: [
        { type: 'untargetable_on_dodge_streak', value: 3, trigger: 'dodge_streak' },
        { type: 'untargetable_duration', value: 2 },
        { type: 'internal_cooldown', value: 15 }
      ]
    },

    // Shared/Capstone abilities
    {
      id: 'rogue_duelist_perfect_form',
      name: 'Perfect Form',
      description: 'CAPSTONE: Your dodge chance is increased by 25%. Each dodge grants a stack of Momentum (max 5). At 5 stacks, your next attack deals 300% damage and consumes all stacks.',
      icon: 'Zap',
      levelRequired: 6,
      subpath: 'swashbuckler',
      isCapstone: true,
      effects: [
        { type: 'dodge_chance_bonus', value: 0.25 },
        { type: 'momentum_stack_on_dodge', value: 1, trigger: 'on_dodge' },
        { type: 'max_momentum_stacks', value: 5 },
        { type: 'momentum_burst_damage', value: 3.0, trigger: 'at_max_stacks' }
      ]
    },
    {
      id: 'rogue_duelist_shadowstep',
      name: 'Shadowstep',
      description: 'CAPSTONE: Become permanently untargetable during your attack animations. The first attack you take after dodging deals 75% reduced damage.',
      icon: 'Ghost',
      levelRequired: 6,
      subpath: 'phantom',
      isCapstone: true,
      effects: [
        { type: 'untargetable_during_attack', value: 1 },
        { type: 'damage_reduction_after_dodge', value: 0.75, trigger: 'first_hit_after_dodge' }
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
