import type { PathDefinition } from '@/types/paths';

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
        icon: 'Sword',
        theme: 'Holy burst damage, light damage bonuses, smite power',
      },
      {
        id: 'inquisitor',
        name: 'Inquisitor',
        description: 'Weaken and debuff enemies through divine judgment',
        icon: 'CrosshairIcon',
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
        levelRequired: 3,
        subpath: 'templar',
        effects: [
          {
            trigger: 'passive',
            damageModifier: { type: 'bonus_damage', value: 0.15 },
          },
        ],
      },
      {
        id: 'righteous_fury',
        name: 'Righteous Fury',
        description: 'Critical hits trigger a burst of holy light, dealing 50% bonus damage',
        icon: 'Sparkles',
        levelRequired: 4,
        subpath: 'templar',
        effects: [
          {
            trigger: 'on_crit',
            damageModifier: { type: 'bonus_damage', value: 0.5 },
          },
        ],
      },
      {
        id: 'smite_the_wicked',
        name: 'Smite the Wicked',
        description: 'Deal 30% increased damage to enemies with debuffs',
        icon: 'Zap',
        levelRequired: 5,
        subpath: 'templar',
        effects: [
          {
            trigger: 'conditional',
            condition: { type: 'enemy_has_status', status: 'any' },
            damageModifier: { type: 'bonus_damage', value: 0.3 },
          },
        ],
      },

      // INQUISITOR SUBPATH - Enemy Debuffs
      {
        id: 'mark_of_judgment',
        name: 'Mark of Judgment',
        description: 'Attacks have a 25% chance to mark enemies, reducing their armor by 20%',
        icon: 'CrosshairIcon',
        levelRequired: 3,
        subpath: 'inquisitor',
        effects: [
          {
            trigger: 'on_hit',
            chance: 0.25,
            statModifiers: [{ stat: 'armor', flatBonus: -0.2, target: 'enemy' }],
            duration: 5,
          },
        ],
      },
      {
        id: 'weakening_light',
        name: 'Weakening Light',
        description: 'Enemies you attack deal 15% reduced damage for 4 seconds',
        icon: 'ShieldAlert',
        levelRequired: 4,
        subpath: 'inquisitor',
        effects: [
          {
            trigger: 'on_hit',
            statModifiers: [{ stat: 'power', percentBonus: -0.15, target: 'enemy' }],
            duration: 4,
          },
        ],
      },
      {
        id: 'divine_condemnation',
        name: 'Divine Condemnation',
        description: 'Marked enemies take 25% increased damage from all sources',
        icon: 'Flame',
        levelRequired: 5,
        subpath: 'inquisitor',
        effects: [
          {
            trigger: 'passive',
            damageModifier: { type: 'amplify', value: 0.25 },
          },
        ],
      },

      // SHARED/CAPSTONE
      {
        id: 'crusader_holy_avenger',
        name: 'Holy Avenger',
        description: 'Every 5th attack unleashes a devastating smite dealing 200% bonus holy damage and applying all debuffs',
        icon: 'Sword',
        levelRequired: 6,
        subpath: 'templar',
        isCapstone: true,
        effects: [
          {
            trigger: 'on_combo',
            condition: { type: 'combo_count', value: 5 },
            damageModifier: { type: 'bonus_damage', value: 2.0 },
          },
        ],
      },
      {
        id: 'crusader_divine_wrath',
        name: 'Divine Wrath',
        description: 'Powers cost 25% less mana and deal 40% increased damage',
        icon: 'Zap',
        levelRequired: 6,
        subpath: 'inquisitor',
        isCapstone: true,
        effects: [
          {
            trigger: 'passive',
            powerModifiers: [
              { type: 'cost_reduction', value: 0.25 },
              { type: 'damage_bonus', value: 0.4 },
            ],
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
        icon: 'Heart',
        theme: 'HP regen scaling, passive healing, heal on block',
      },
      {
        id: 'martyr',
        name: 'Martyr',
        description: 'Reduce incoming damage and endure through sacrifice',
        icon: 'Shield',
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
        levelRequired: 3,
        subpath: 'sentinel',
        effects: [
          {
            trigger: 'passive',
            statModifiers: [{ stat: 'health', percentBonus: 1.0, applyTo: 'regen' }],
          },
        ],
      },
      {
        id: 'healing_ward',
        name: 'Healing Ward',
        description: 'Regenerate 2% of max HP every 3 seconds (passive)',
        icon: 'Plus',
        levelRequired: 4,
        subpath: 'sentinel',
        effects: [
          {
            trigger: 'turn_start',
            heal: 2,
            cooldown: 3,
          },
        ],
      },
      {
        id: 'shield_of_renewal',
        name: 'Shield of Renewal',
        description: 'Blocking an attack heals you for 10% of max HP (passive)',
        icon: 'ShieldPlus',
        levelRequired: 5,
        subpath: 'sentinel',
        effects: [
          {
            trigger: 'on_block',
            heal: 10,
          },
        ],
      },

      // MARTYR SUBPATH - Damage Reduction
      {
        id: 'enduring_faith',
        name: 'Enduring Faith',
        description: 'Reduce all incoming damage by 10% (passive)',
        icon: 'Shield',
        levelRequired: 3,
        subpath: 'martyr',
        effects: [
          {
            trigger: 'passive',
            statModifiers: [{ stat: 'armor', percentBonus: 0.1 }],
          },
        ],
      },
      {
        id: 'armor_of_sacrifice',
        name: 'Armor of Sacrifice',
        description: 'Damage reduction increased by 1% per 10 armor (passive)',
        icon: 'ShieldCheck',
        levelRequired: 4,
        subpath: 'martyr',
        effects: [
          {
            trigger: 'passive',
            statModifiers: [{ stat: 'armor', percentBonus: 0.01, scalingStat: 'armor', scalingRatio: 0.1 }],
          },
        ],
      },
      {
        id: 'last_stand',
        name: 'Last Stand',
        description: 'Once per floor, survive a lethal blow with 1 HP and gain 50% damage reduction for 5 seconds (passive)',
        icon: 'Cross',
        levelRequired: 5,
        subpath: 'martyr',
        effects: [
          {
            trigger: 'on_low_hp',
            condition: { type: 'hp_threshold', value: 0.01 },
            statModifiers: [{ stat: 'armor', percentBonus: 0.5 }],
            duration: 5,
            cooldown: 60,
          },
        ],
      },

      // CAPSTONES
      {
        id: 'protector_eternal_guardian',
        name: 'Eternal Guardian',
        description: 'HP regeneration scales with your armor (1% regen per 10 armor) and you heal for 15% of damage prevented (passive)',
        icon: 'HeartPulse',
        levelRequired: 6,
        subpath: 'sentinel',
        isCapstone: true,
        effects: [
          {
            trigger: 'passive',
            statModifiers: [{ stat: 'health', percentBonus: 0.01, applyTo: 'regen', scalingStat: 'armor', scalingRatio: 0.1 }],
          },
          {
            trigger: 'on_damaged',
            heal: 15,
          },
        ],
      },
      {
        id: 'protector_unbreakable_will',
        name: 'Unbreakable Will',
        description: 'Below 30% HP, gain 30% damage reduction and cannot be reduced below 1 HP for 3 seconds (60s cooldown, passive)',
        icon: 'ShieldBan',
        levelRequired: 6,
        subpath: 'martyr',
        isCapstone: true,
        effects: [
          {
            trigger: 'on_low_hp',
            condition: { type: 'hp_threshold', value: 0.3 },
            statModifiers: [{ stat: 'armor', percentBonus: 0.3 }],
            shield: 1,
            duration: 3,
            cooldown: 60,
          },
        ],
      },
    ],
  },
];
