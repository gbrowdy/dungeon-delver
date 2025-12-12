// Placeholder types - will be defined in src/types/paths.ts
type PathAbilityEffect = {
  type: string;
  value: number;
  target?: string;
  duration?: number;
  condition?: string;
};

type PathAbility = {
  id: string;
  name: string;
  description: string;
  icon: string;
  levelRequirement: number;
  subpath: string;
  isCapstone?: boolean;
  effects: PathAbilityEffect[];
};

type SubpathDefinition = {
  id: string;
  name: string;
  description: string;
  theme: string;
};

type PathDefinition = {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive';
  theme: string;
  subpaths: SubpathDefinition[];
  abilities: PathAbility[];
};

/**
 * PALADIN CLASS PATHS
 *
 * CRUSADER (Active) - Holy damage and smite timing
 * - Templar: Holy damage burst and righteous fury
 * - Inquisitor: Enemy debuffs and weakness application
 *
 * PROTECTOR (Passive) - Self-sustaining survival
 * - Sentinel: HP regeneration scaling and healing
 * - Martyr: Damage reduction and lethal survival
 */

export const PALADIN_PATHS: PathDefinition[] = [
  {
    id: 'paladin_crusader',
    name: 'Crusader',
    description: 'Channel holy power through timed strikes and righteous judgment',
    type: 'active',
    theme: 'Holy damage bursts, smite mechanics, enemy weakening',
    subpaths: [
      {
        id: 'templar',
        name: 'Templar',
        description: 'Unleash devastating holy damage through righteous fury',
        theme: 'Holy burst damage, light damage bonuses, smite power',
      },
      {
        id: 'inquisitor',
        name: 'Inquisitor',
        description: 'Weaken and debuff enemies through divine judgment',
        theme: 'Enemy debuffs, armor reduction, marking enemies',
      },
    ],
    abilities: [
      // TEMPLAR SUBPATH - Holy Burst Damage
      {
        id: 'holy_strike',
        name: 'Holy Strike',
        description: 'Your attacks deal bonus holy damage based on your armor stat',
        icon: 'Sun',
        levelRequirement: 3,
        subpath: 'templar',
        effects: [
          {
            type: 'damage_bonus',
            value: 0.15,
            condition: 'scales_with_armor',
          },
          {
            type: 'damage_type',
            value: 1,
            target: 'holy',
          },
        ],
      },
      {
        id: 'righteous_fury',
        name: 'Righteous Fury',
        description: 'Critical hits trigger a burst of holy light, dealing 50% bonus damage',
        icon: 'Sparkles',
        levelRequirement: 4,
        subpath: 'templar',
        effects: [
          {
            type: 'on_crit',
            value: 0.5,
            target: 'bonus_damage',
          },
          {
            type: 'damage_type',
            value: 1,
            target: 'holy',
          },
        ],
      },
      {
        id: 'smite_the_wicked',
        name: 'Smite the Wicked',
        description: 'Deal 30% increased damage to enemies with debuffs',
        icon: 'Zap',
        levelRequirement: 5,
        subpath: 'templar',
        effects: [
          {
            type: 'conditional_damage',
            value: 0.3,
            condition: 'enemy_has_debuff',
          },
        ],
      },

      // INQUISITOR SUBPATH - Enemy Debuffs
      {
        id: 'mark_of_judgment',
        name: 'Mark of Judgment',
        description: 'Attacks have a 25% chance to mark enemies, reducing their armor by 20%',
        icon: 'CrosshairIcon',
        levelRequirement: 3,
        subpath: 'inquisitor',
        effects: [
          {
            type: 'on_hit_chance',
            value: 0.25,
            target: 'apply_debuff',
          },
          {
            type: 'armor_reduction',
            value: 0.2,
            duration: 5,
          },
        ],
      },
      {
        id: 'weakening_light',
        name: 'Weakening Light',
        description: 'Enemies you attack deal 15% reduced damage for 4 seconds',
        icon: 'ShieldAlert',
        levelRequirement: 4,
        subpath: 'inquisitor',
        effects: [
          {
            type: 'on_hit',
            value: 0.15,
            target: 'damage_reduction_debuff',
            duration: 4,
          },
        ],
      },
      {
        id: 'divine_condemnation',
        name: 'Divine Condemnation',
        description: 'Marked enemies take 25% increased damage from all sources',
        icon: 'Flame',
        levelRequirement: 5,
        subpath: 'inquisitor',
        effects: [
          {
            type: 'amplify_damage',
            value: 0.25,
            condition: 'target_is_marked',
          },
        ],
      },

      // SHARED/CAPSTONE
      {
        id: 'crusader_holy_avenger',
        name: 'Holy Avenger',
        description: 'Every 5th attack unleashes a devastating smite dealing 200% bonus holy damage and applying all debuffs',
        icon: 'Sword',
        levelRequirement: 6,
        subpath: 'templar',
        isCapstone: true,
        effects: [
          {
            type: 'every_nth_attack',
            value: 5,
            target: 'smite',
          },
          {
            type: 'smite_damage',
            value: 2.0,
          },
          {
            type: 'apply_all_debuffs',
            value: 1,
          },
        ],
      },
      {
        id: 'crusader_divine_wrath',
        name: 'Divine Wrath',
        description: 'Powers cost 25% less mana and deal 40% increased damage',
        icon: 'Zap',
        levelRequirement: 6,
        subpath: 'inquisitor',
        isCapstone: true,
        effects: [
          {
            type: 'power_cost_reduction',
            value: 0.25,
          },
          {
            type: 'power_damage_bonus',
            value: 0.4,
          },
        ],
      },
    ],
  },
  {
    id: 'paladin_protector',
    name: 'Protector',
    description: 'Sustain yourself through divine resilience and unwavering endurance',
    type: 'passive',
    theme: 'Self-sustaining without player input, HP regen, damage reduction',
    subpaths: [
      {
        id: 'sentinel',
        name: 'Sentinel',
        description: 'Enhance health regeneration and self-healing capabilities',
        theme: 'HP regen scaling, passive healing, heal on block',
      },
      {
        id: 'martyr',
        name: 'Martyr',
        description: 'Reduce incoming damage and endure through sacrifice',
        theme: 'Damage reduction, survive lethal, defensive scaling',
      },
    ],
    abilities: [
      // SENTINEL SUBPATH - Regen Scaling
      {
        id: 'blessed_recovery',
        name: 'Blessed Recovery',
        description: 'HP regeneration increased by 100% (passive)',
        icon: 'Heart',
        levelRequirement: 3,
        subpath: 'sentinel',
        effects: [
          {
            type: 'hp_regen_multiplier',
            value: 1.0,
          },
        ],
      },
      {
        id: 'healing_ward',
        name: 'Healing Ward',
        description: 'Regenerate 2% of max HP every 3 seconds (passive)',
        icon: 'Plus',
        levelRequirement: 4,
        subpath: 'sentinel',
        effects: [
          {
            type: 'periodic_heal',
            value: 0.02,
            duration: 3,
          },
        ],
      },
      {
        id: 'shield_of_renewal',
        name: 'Shield of Renewal',
        description: 'Blocking an attack heals you for 10% of max HP (passive)',
        icon: 'ShieldPlus',
        levelRequirement: 5,
        subpath: 'sentinel',
        effects: [
          {
            type: 'on_block',
            value: 0.1,
            target: 'heal_max_hp_percent',
          },
        ],
      },

      // MARTYR SUBPATH - Damage Reduction
      {
        id: 'enduring_faith',
        name: 'Enduring Faith',
        description: 'Reduce all incoming damage by 10% (passive)',
        icon: 'Shield',
        levelRequirement: 3,
        subpath: 'martyr',
        effects: [
          {
            type: 'damage_reduction',
            value: 0.1,
          },
        ],
      },
      {
        id: 'armor_of_sacrifice',
        name: 'Armor of Sacrifice',
        description: 'Damage reduction increased by 1% per 10 armor (passive)',
        icon: 'ShieldCheck',
        levelRequirement: 4,
        subpath: 'martyr',
        effects: [
          {
            type: 'damage_reduction_scaling',
            value: 0.01,
            condition: 'per_10_armor',
          },
        ],
      },
      {
        id: 'last_stand',
        name: 'Last Stand',
        description: 'Once per floor, survive a lethal blow with 1 HP and gain 50% damage reduction for 5 seconds (passive)',
        icon: 'Cross',
        levelRequirement: 5,
        subpath: 'martyr',
        effects: [
          {
            type: 'survive_lethal',
            value: 1,
            condition: 'once_per_floor',
          },
          {
            type: 'damage_reduction_on_proc',
            value: 0.5,
            duration: 5,
          },
        ],
      },

      // CAPSTONES
      {
        id: 'protector_eternal_guardian',
        name: 'Eternal Guardian',
        description: 'HP regeneration scales with your armor (1% regen per 10 armor) and you heal for 15% of damage prevented (passive)',
        icon: 'HeartPulse',
        levelRequirement: 6,
        subpath: 'sentinel',
        isCapstone: true,
        effects: [
          {
            type: 'hp_regen_scaling',
            value: 0.01,
            condition: 'per_10_armor',
          },
          {
            type: 'heal_from_prevention',
            value: 0.15,
          },
        ],
      },
      {
        id: 'protector_unbreakable_will',
        name: 'Unbreakable Will',
        description: 'Below 30% HP, gain 30% damage reduction and cannot be reduced below 1 HP for 3 seconds (60s cooldown, passive)',
        icon: 'ShieldBan',
        levelRequirement: 6,
        subpath: 'martyr',
        isCapstone: true,
        effects: [
          {
            type: 'low_hp_trigger',
            value: 0.3,
            target: 'damage_reduction',
          },
          {
            type: 'damage_reduction',
            value: 0.3,
            duration: 3,
          },
          {
            type: 'prevent_death',
            value: 1,
            duration: 3,
          },
          {
            type: 'cooldown',
            value: 60,
          },
        ],
      },
    ],
  },
];
