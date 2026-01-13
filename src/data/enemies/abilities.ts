/**
 * Enemy abilities, pools, and ability selection logic
 */

import type { EnemyAbility } from '@/types/game';
import { ENEMY_ABILITY_CONFIG } from '@/constants/balance';
import { ABILITY_COMBO_PREFIXES } from './names';

// Power cost of each ability (reduces enemy stats as compensation)
export const ABILITY_POWER_COST: Record<string, number> = {
  double_strike: 0.08,   // 8% stat reduction
  triple_strike: 0.12,   // 12% stat reduction
  poison_bite: 0.10,     // 10% stat reduction
  stunning_blow: 0.12,   // 12% stat reduction (stun is powerful)
  regenerate: 0.08,      // 8% stat reduction
  enrage: 0.06,          // 6% stat reduction (temporary buff)
  shield_bash: 0.06,     // 6% stat reduction (defensive)
};

// Enemy abilities pool - chances increased for more dynamic combat
export const ENEMY_ABILITIES: Record<string, EnemyAbility> = {
  // Common abilities
  double_strike: {
    id: 'double_strike',
    name: 'Double Strike',
    type: 'multi_hit',
    value: 2, // Number of hits
    cooldown: 3,
    currentCooldown: 0,
    chance: 0.5, // 50% chance when off cooldown
    icon: 'ability-multi_hit',
    description: 'Attacks twice in quick succession',
  },
  poison_bite: {
    id: 'poison_bite',
    name: 'Poison Bite',
    type: 'poison',
    value: 3, // Damage per turn for 3 turns
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.45, // 45% chance
    icon: 'ability-poison',
    description: 'Inflicts poison dealing damage over time',
  },
  // Uncommon abilities
  stunning_blow: {
    id: 'stunning_blow',
    name: 'Stunning Blow',
    type: 'stun',
    value: 1, // Stun duration in turns
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.35, // 35% chance
    icon: 'ability-stun',
    description: 'A heavy blow that stuns the target',
  },
  regenerate: {
    id: 'regenerate',
    name: 'Regenerate',
    type: 'heal',
    value: 0.15, // Heal 15% of max HP
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.5, // 50% chance
    icon: 'ability-heal',
    description: 'Recovers health over time',
  },
  // Rare/Boss abilities
  enrage: {
    id: 'enrage',
    name: 'Enrage',
    type: 'enrage',
    value: 0.5, // +50% attack
    cooldown: 6,
    currentCooldown: 0,
    chance: 0.4, // 40% chance
    icon: 'ability-enrage',
    description: 'Becomes enraged, increasing attack power',
  },
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    type: 'shield',
    value: 2, // Shield duration in turns
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.35, // 35% chance
    icon: 'ability-shield',
    description: 'Raises a shield, reducing incoming damage',
  },
  triple_strike: {
    id: 'triple_strike',
    name: 'Triple Strike',
    type: 'multi_hit',
    value: 3,
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.4, // 40% chance
    icon: 'ability-triple_strike',
    description: 'Unleashes three rapid attacks',
  },
};

// Which abilities each enemy type can have
export const ENEMY_ABILITY_POOLS: Record<string, string[]> = {
  // Common enemies - simple abilities
  Goblin: ['double_strike'],
  Skeleton: ['double_strike'],
  Slime: ['poison_bite'],
  Rat: ['poison_bite'],
  Spider: ['poison_bite', 'stunning_blow'],
  Imp: ['double_strike'],
  Zombie: ['stunning_blow'],
  // Uncommon enemies - better abilities
  Orc: ['double_strike', 'enrage'],
  'Dark Elf': ['double_strike', 'poison_bite'],
  Werewolf: ['triple_strike', 'enrage'],
  Ghost: ['stunning_blow', 'regenerate'],
  Harpy: ['double_strike', 'stunning_blow'],
  Minotaur: ['stunning_blow', 'enrage'],
  // Rare enemies - powerful abilities
  Vampire: ['regenerate', 'stunning_blow', 'enrage'],
  Demon: ['triple_strike', 'enrage', 'poison_bite'],
  Golem: ['shield_bash', 'stunning_blow', 'enrage'],
  Lich: ['poison_bite', 'regenerate', 'stunning_blow'],
  'Hydra Head': ['triple_strike', 'poison_bite', 'regenerate'],
  // Boss enemies - multiple powerful abilities
  Dragon: ['triple_strike', 'enrage', 'shield_bash'],
  Archdemon: ['triple_strike', 'poison_bite', 'enrage', 'regenerate'],
  'Death Knight': ['stunning_blow', 'enrage', 'shield_bash', 'double_strike'],
  'Elder Lich': ['poison_bite', 'stunning_blow', 'regenerate', 'enrage'],
  Titan: ['triple_strike', 'stunning_blow', 'enrage', 'shield_bash'],
};

export interface AbilityResult {
  abilities: EnemyAbility[];
  powerCost: number; // Total stat reduction multiplier (0.0 to 1.0)
  prefix: string | null; // Name prefix based on primary ability
}

/**
 * Get abilities for an enemy based on its name and difficulty
 * Returns abilities, their total power cost, and a name prefix
 */
export function getEnemyAbilities(baseName: string, floor: number, isBoss: boolean): AbilityResult {
  const abilityPool = ENEMY_ABILITY_POOLS[baseName] || [];
  if (abilityPool.length === 0) {
    return { abilities: [], powerCost: 0, prefix: null };
  }

  // Determine how many abilities this enemy gets
  // Floor-based scaling for better new player experience (see ENEMY_ABILITY_CONFIG.FLOOR_SCALING)
  let numAbilities = 0;

  if (isBoss) {
    // Bosses always get 2-3 abilities based on floor progression
    numAbilities = Math.min(2 + Math.floor(floor / 3), abilityPool.length);
  } else {
    // Non-boss ability scaling uses config-driven approach
    const floorConfig = ENEMY_ABILITY_CONFIG.FLOOR_SCALING[floor];

    if (floorConfig) {
      // Floors 1-4: use scaling table
      if (Math.random() < floorConfig.chance) {
        // Random count from 1 to maxAbilities (inclusive)
        // When maxAbilities=1: always 1
        // When maxAbilities=2: 50% chance of 1, 50% chance of 2
        numAbilities = 1 + Math.floor(Math.random() * floorConfig.maxAbilities);
      }
    } else {
      // Floor 5+: always has 2-3 abilities
      const { LATE_FLOOR_MIN_ABILITIES, LATE_FLOOR_MAX_ABILITIES } = ENEMY_ABILITY_CONFIG;
      const range = LATE_FLOOR_MAX_ABILITIES - LATE_FLOOR_MIN_ABILITIES + 1;
      numAbilities = LATE_FLOOR_MIN_ABILITIES + Math.floor(Math.random() * range);
    }

    // Cap by available ability pool
    numAbilities = Math.min(numAbilities, abilityPool.length);
  }

  if (numAbilities === 0) {
    return { abilities: [], powerCost: 0, prefix: null };
  }

  // Randomly select abilities
  const shuffled = [...abilityPool].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, numAbilities);

  let totalPowerCost = 0;
  const abilities = selectedIds.map(id => {
    const ability = ENEMY_ABILITIES[id];
    if (!ability) return null;

    // Add power cost
    totalPowerCost += ABILITY_POWER_COST[id] ?? 0;

    // Scale ability damage with floor
    const scaledAbility = { ...ability };
    if (scaledAbility.type === 'poison') {
      scaledAbility.value = Math.floor(scaledAbility.value * (1 + (floor - 1) * 0.2));
    }
    return scaledAbility;
  }).filter((a): a is EnemyAbility => a !== null);

  // Generate combo key by sorting ability IDs and joining with '+'
  const comboKey = [...selectedIds].sort().join('+');
  const prefix = ABILITY_COMBO_PREFIXES[comboKey] ?? null;

  return { abilities, powerCost: totalPowerCost, prefix };
}

/**
 * Get an ability by its ID (for testing)
 */
export function getAbilityById(id: string): EnemyAbility | undefined {
  return ENEMY_ABILITIES[id] ? { ...ENEMY_ABILITIES[id] } : undefined;
}
