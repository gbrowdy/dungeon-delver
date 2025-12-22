/**
 * Standard test fixtures for balance verification
 * These represent "typical" game states at various progression points
 *
 * Used by:
 * - Unit tests for balance changes
 * - Simulation tests for combat statistics
 * - Regression tests when tuning constants
 */

import type { Player, Enemy, Stats, CharacterClass, Power } from '@/types/game';
import type { PlayerPath } from '@/types/paths';
import { CLASS_DATA } from '@/data/classes';
import { generateEnemy } from '@/data/enemies';
import { getCritChance, getCritDamage, getDodgeChance } from '@/utils/fortuneUtils';

/**
 * Base stats for each class (from CLASS_DATA)
 */
const CLASS_BASE_STATS: Record<CharacterClass, Stats> = {
  warrior: CLASS_DATA.warrior.baseStats,
  mage: CLASS_DATA.mage.baseStats,
  rogue: CLASS_DATA.rogue.baseStats,
  paladin: CLASS_DATA.paladin.baseStats,
};

/**
 * Level-up stat bonuses (per level gained)
 */
const LEVEL_UP_BONUSES = {
  maxHealth: 5,
  power: 2,
  maxMana: 8,
};

/**
 * Create a test player with specified class and level
 * Includes proper stat scaling for the given level
 */
export function createTestPlayer(
  classId: CharacterClass,
  level: number = 1,
  overrides?: Partial<Player>
): Player {
  const classData = CLASS_DATA[classId];
  const baseStats = { ...classData.baseStats };

  // Apply level-up bonuses
  const levelBonus = level - 1;
  const scaledStats: Stats = {
    ...baseStats,
    health: baseStats.maxHealth + (levelBonus * LEVEL_UP_BONUSES.maxHealth),
    maxHealth: baseStats.maxHealth + (levelBonus * LEVEL_UP_BONUSES.maxHealth),
    power: baseStats.power + (levelBonus * LEVEL_UP_BONUSES.power),
    mana: baseStats.maxMana + (levelBonus * LEVEL_UP_BONUSES.maxMana),
    maxMana: baseStats.maxMana + (levelBonus * LEVEL_UP_BONUSES.maxMana),
  };

  const startingPower: Power = {
    ...classData.startingPower,
    currentCooldown: 0,
  };

  return {
    name: `Test ${classData.name}`,
    class: classId,
    level,
    experience: 0,
    experienceToNext: Math.floor(100 * Math.pow(1.5, level - 1)),
    gold: 0,
    baseStats,
    currentStats: scaledStats,
    powers: [startingPower],
    inventory: [],
    equippedItems: [],
    activeBuffs: [],
    statusEffects: [],
    isBlocking: false,
    comboCount: 0,
    lastPowerUsed: null,
    isDying: false,
    path: null,
    pendingAbilityChoice: false,
    enemyAttackCounter: 0,
    usedCombatAbilities: [],
    usedFloorAbilities: [],
    shield: 0,
    shieldMaxDuration: 0,
    shieldRemainingDuration: 0,
    abilityCounters: {},
    attackModifiers: [],
    hpRegen: classData.hpRegen ?? 0,
    ...overrides,
  };
}

/**
 * Create a test player with a specific path selected
 */
export function createTestPlayerWithPath(
  classId: CharacterClass,
  level: number,
  path: PlayerPath
): Player {
  return createTestPlayer(classId, level, { path });
}

/**
 * Create a test enemy at specified floor/room
 * Uses the actual generateEnemy function for realistic stats
 */
export function createTestEnemy(
  floor: number,
  room: number,
  roomsPerFloor: number = 5
): Enemy {
  return generateEnemy(floor, room, roomsPerFloor);
}

/**
 * Create a boss enemy at specified floor
 */
export function createTestBoss(floor: number): Enemy {
  // Bosses appear at the last room
  const roomsPerFloor = 5;
  return generateEnemy(floor, roomsPerFloor, roomsPerFloor);
}

/**
 * Combat simulation result statistics
 */
export interface CombatSimulationResult {
  totalDamage: number;
  attackCount: number;
  critCount: number;
  critRate: number;
  averageDamage: number;
  minDamage: number;
  maxDamage: number;
  dodgeCount: number;
  dodgeRate: number;
  dpsEstimate: number; // Damage per theoretical second
}

/**
 * Simulate N attacks and return aggregate statistics
 * Uses current fortune formulas for accurate balance testing
 *
 * @param attackerPower - Attacker's power stat
 * @param defenderArmor - Defender's armor stat
 * @param attackerFortune - Attacker's fortune stat (for crits)
 * @param defenderFortune - Defender's fortune stat (for dodges)
 * @param attackCount - Number of attacks to simulate
 * @param attackSpeed - Attacker's speed stat (for DPS calculation)
 */
export function simulateAttacks(
  attackerPower: number,
  defenderArmor: number,
  attackerFortune: number,
  defenderFortune: number,
  attackCount: number = 100,
  attackSpeed: number = 10
): CombatSimulationResult {
  const critChance = getCritChance(attackerFortune);
  const critDamage = getCritDamage(attackerFortune);
  const dodgeChance = getDodgeChance(defenderFortune);

  let totalDamage = 0;
  let critCount = 0;
  let dodgeCount = 0;
  let minDamage = Infinity;
  let maxDamage = 0;

  // Damage formula: (Power - Armor/2) * variance * crit
  const baseDamage = Math.max(1, attackerPower - defenderArmor / 2);

  for (let i = 0; i < attackCount; i++) {
    // Check dodge first
    if (Math.random() < dodgeChance) {
      dodgeCount++;
      continue;
    }

    // Calculate damage with variance (0.85 - 1.15)
    const variance = 0.85 + Math.random() * 0.3;
    let damage = baseDamage * variance;

    // Check for crit
    if (Math.random() < critChance) {
      damage *= critDamage;
      critCount++;
    }

    damage = Math.floor(damage);
    totalDamage += damage;
    minDamage = Math.min(minDamage, damage);
    maxDamage = Math.max(maxDamage, damage);
  }

  const hitsLanded = attackCount - dodgeCount;
  const averageDamage = hitsLanded > 0 ? totalDamage / hitsLanded : 0;

  // DPS estimate: attacks per second = speed / 10, multiplied by average damage
  const attacksPerSecond = attackSpeed / 10;
  const hitRate = 1 - dodgeChance;
  const dpsEstimate = averageDamage * attacksPerSecond * hitRate;

  return {
    totalDamage,
    attackCount,
    critCount,
    critRate: hitsLanded > 0 ? critCount / hitsLanded : 0,
    averageDamage: Math.round(averageDamage * 100) / 100,
    minDamage: minDamage === Infinity ? 0 : minDamage,
    maxDamage,
    dodgeCount,
    dodgeRate: attackCount > 0 ? dodgeCount / attackCount : 0,
    dpsEstimate: Math.round(dpsEstimate * 100) / 100,
  };
}

/**
 * Simulate a full combat encounter and return outcome
 */
export interface CombatOutcome {
  playerWon: boolean;
  turnsElapsed: number;
  playerHealthRemaining: number;
  playerHealthPercent: number;
  totalPlayerDamageDealt: number;
  totalPlayerDamageTaken: number;
  playerCrits: number;
  playerDodges: number;
}

/**
 * Simulate combat between player and enemy
 * Simplified simulation (no powers, no abilities) for balance testing
 */
export function simulateCombat(
  player: Player,
  enemy: Enemy,
  maxTurns: number = 100
): CombatOutcome {
  let playerHealth = player.currentStats.health;
  let enemyHealth = enemy.health;
  let turnsElapsed = 0;

  let totalPlayerDamageDealt = 0;
  let totalPlayerDamageTaken = 0;
  let playerCrits = 0;
  let playerDodges = 0;

  const playerCritChance = getCritChance(player.currentStats.fortune);
  const playerCritDamage = getCritDamage(player.currentStats.fortune);
  const playerDodgeChance = getDodgeChance(player.currentStats.fortune);

  // Simple turn-based simulation
  // Speed determines attack order within each "turn"
  const playerSpeed = player.currentStats.speed;
  const enemySpeed = enemy.speed;

  while (turnsElapsed < maxTurns && playerHealth > 0 && enemyHealth > 0) {
    turnsElapsed++;

    // Determine who attacks first this turn
    const playerFirst = playerSpeed >= enemySpeed;

    const doPlayerAttack = () => {
      if (enemyHealth <= 0) return;

      const baseDamage = Math.max(1, player.currentStats.power - enemy.armor / 2);
      const variance = 0.85 + Math.random() * 0.3;
      let damage = baseDamage * variance;

      if (Math.random() < playerCritChance) {
        damage *= playerCritDamage;
        playerCrits++;
      }

      damage = Math.floor(damage);
      enemyHealth -= damage;
      totalPlayerDamageDealt += damage;
    };

    const doEnemyAttack = () => {
      if (playerHealth <= 0) return;

      // Check player dodge
      if (Math.random() < playerDodgeChance) {
        playerDodges++;
        return;
      }

      const baseDamage = Math.max(1, enemy.power - player.currentStats.armor / 2);
      const variance = 0.85 + Math.random() * 0.3;
      const damage = Math.floor(baseDamage * variance);

      playerHealth -= damage;
      totalPlayerDamageTaken += damage;
    };

    if (playerFirst) {
      doPlayerAttack();
      doEnemyAttack();
    } else {
      doEnemyAttack();
      doPlayerAttack();
    }
  }

  return {
    playerWon: enemyHealth <= 0,
    turnsElapsed,
    playerHealthRemaining: Math.max(0, playerHealth),
    playerHealthPercent: Math.max(0, playerHealth) / player.currentStats.maxHealth,
    totalPlayerDamageDealt,
    totalPlayerDamageTaken,
    playerCrits,
    playerDodges,
  };
}

/**
 * Run multiple combat simulations and aggregate results
 */
export interface AggregatedCombatResults {
  winRate: number;
  averageTurns: number;
  averageHealthRemaining: number;
  averageHealthPercent: number;
  averageDamageDealt: number;
  averageDamageTaken: number;
  sampleSize: number;
}

export function runCombatSimulations(
  player: Player,
  enemy: Enemy,
  simulationCount: number = 100
): AggregatedCombatResults {
  let wins = 0;
  let totalTurns = 0;
  let totalHealthRemaining = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;

  for (let i = 0; i < simulationCount; i++) {
    // Create fresh copies for each simulation
    const playerCopy = {
      ...player,
      currentStats: { ...player.currentStats },
    };
    const enemyCopy = { ...enemy };

    const result = simulateCombat(playerCopy, enemyCopy);

    if (result.playerWon) wins++;
    totalTurns += result.turnsElapsed;
    totalHealthRemaining += result.playerHealthRemaining;
    totalDamageDealt += result.totalPlayerDamageDealt;
    totalDamageTaken += result.totalPlayerDamageTaken;
  }

  return {
    winRate: wins / simulationCount,
    averageTurns: totalTurns / simulationCount,
    averageHealthRemaining: totalHealthRemaining / simulationCount,
    averageHealthPercent: (totalHealthRemaining / simulationCount) / player.currentStats.maxHealth,
    averageDamageDealt: totalDamageDealt / simulationCount,
    averageDamageTaken: totalDamageTaken / simulationCount,
    sampleSize: simulationCount,
  };
}
