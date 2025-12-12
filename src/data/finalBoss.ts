import { Enemy, EnemyAbility, EnemyIntent } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Final Boss Definition - "The Void Sentinel"
 * A climactic end-game challenge that appears on Floor 5, Room 5
 *
 * Design philosophy:
 * - High stats appropriate for end-game content
 * - Multiple phases triggered by health thresholds
 * - Unique combination of abilities that test all player capabilities
 * - Feels dangerous but fair with clear telegraphing
 */

// Final boss unique abilities
const FINAL_BOSS_ABILITIES: Record<string, EnemyAbility> = {
  void_strike: {
    id: 'void_strike',
    name: 'Void Strike',
    type: 'multi_hit',
    value: 3, // Triple hit
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.6, // 60% chance
    icon: '💀⚔️',
    description: 'Unleashes a devastating triple strike from the void',
  },
  entropy_wave: {
    id: 'entropy_wave',
    name: 'Entropy Wave',
    type: 'poison',
    value: 8, // Strong poison damage
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.45, // 45% chance
    icon: '🌀',
    description: 'A wave of corruption that poisons and weakens',
  },
  eternal_fury: {
    id: 'eternal_fury',
    name: 'Eternal Fury',
    type: 'enrage',
    value: 0.75, // +75% attack (stronger than normal enrage)
    cooldown: 6,
    currentCooldown: 0,
    chance: 0.5, // 50% chance
    icon: '😡',
    description: 'Channels ancient rage, greatly increasing power',
  },
  aegis_of_eternity: {
    id: 'aegis_of_eternity',
    name: 'Aegis of Eternity',
    type: 'shield',
    value: 3, // Longer shield duration
    cooldown: 7,
    currentCooldown: 0,
    chance: 0.4, // 40% chance
    icon: '🛡️✨',
    description: 'Summons an eternal shield, reducing incoming damage',
  },
  restoration: {
    id: 'restoration',
    name: 'Void Restoration',
    type: 'heal',
    value: 0.20, // Heal 20% of max HP
    cooldown: 8,
    currentCooldown: 1, // Starts on cooldown to prevent first-turn heal
    chance: 0.35, // 35% chance
    icon: '💜',
    description: 'Draws power from the void to regenerate health',
  },
};

/**
 * Generate the final boss for Floor 5
 * This boss has significantly higher stats than normal floor 5 bosses
 * and uses all abilities to create a challenging final encounter
 */
export function generateFinalBoss(): Enemy {
  // Final boss stats - tuned for end-game challenge
  // These are ~40% stronger than a regular Floor 5 boss
  const baseHealth = 200;
  const basePower = 22;
  const baseArmor = 10;
  const baseSpeed = 12;

  // Calculate rewards - generous for beating the game
  const experienceReward = 500; // Massive XP bonus
  const goldReward = 250; // Huge gold reward

  // All abilities available to the boss
  const abilities = [
    { ...FINAL_BOSS_ABILITIES.void_strike },
    { ...FINAL_BOSS_ABILITIES.entropy_wave },
    { ...FINAL_BOSS_ABILITIES.eternal_fury },
    { ...FINAL_BOSS_ABILITIES.aegis_of_eternity },
    { ...FINAL_BOSS_ABILITIES.restoration },
  ];

  // Initial intent calculation (same as regular enemies)
  const initialIntent: EnemyIntent = {
    type: 'attack',
    damage: basePower,
    icon: '⚔️',
  };

  const boss: Enemy = {
    id: `final-boss-${Date.now()}`,
    name: 'The Void Sentinel',
    health: baseHealth,
    maxHealth: baseHealth,
    power: basePower,
    armor: baseArmor,
    speed: baseSpeed,
    experienceReward,
    goldReward,
    isBoss: true,
    abilities,
    intent: initialIntent,
    statusEffects: [],
    isShielded: false,
    isEnraged: false,
    // Special flag to identify this as the final boss
    // This can be used for special victory conditions
    isFinalBoss: true,
  };

  return boss;
}

/**
 * Check if an enemy is the final boss
 * @param enemy The enemy to check
 * @returns true if this is the final boss
 */
export function isFinalBoss(enemy: Enemy): boolean {
  return enemy.isFinalBoss === true;
}

/**
 * Get phase description based on boss health percentage
 * This can be used for UI feedback or special mechanics
 * @param healthPercent Current health as percentage of max (0-100)
 */
export function getFinalBossPhase(healthPercent: number): {
  phase: number;
  description: string;
} {
  if (healthPercent > 66) {
    return {
      phase: 1,
      description: 'The Void Sentinel stands at full strength',
    };
  } else if (healthPercent > 33) {
    return {
      phase: 2,
      description: 'The Sentinel channels the void\'s fury',
    };
  } else {
    return {
      phase: 3,
      description: 'The Sentinel fights with desperate power',
    };
  }
}
