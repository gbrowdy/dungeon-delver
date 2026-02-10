import type { GameState } from '@/types/game';
import {
  FIRST_BOSS_FLOOR,
  BOSS_INTERVAL,
  DRAFT_FIGHT_INTERVAL,
  FINAL_BOSS_FLOOR,
} from '@/math/balance';
import { generateEnemy } from '@/data/enemies';
import { calculateDamage } from '@/math/damage';
import type { DeathSummary } from '@/types/game';

export function isBossFloor(floor: number): boolean {
  if (floor === FIRST_BOSS_FLOOR) return true;
  return floor >= BOSS_INTERVAL && floor % BOSS_INTERVAL === 0;
}

export function shouldTriggerDraft(fightCount: number): boolean {
  return fightCount > 0 && fightCount % DRAFT_FIGHT_INTERVAL === 0;
}

export function getCheckpoint(floor: number): number {
  if (floor < FIRST_BOSS_FLOOR) return 0;
  if (floor >= FIRST_BOSS_FLOOR && floor < BOSS_INTERVAL) return FIRST_BOSS_FLOOR;
  const highestMultiple = Math.floor(floor / BOSS_INTERVAL) * BOSS_INTERVAL;
  return highestMultiple;
}

export function spawnEnemy(state: GameState, isBoss: boolean): void {
  const generated = generateEnemy(
    state.floor,
    isBoss ? 'boss' : undefined,
  );

  state.enemy = generated.entity;
  state.enemyDefinition = { tier: generated.tier, modifiers: generated.modifiers };

  // Reset per-fight state
  state.combatElapsed = 0;
  state.combatEvents = [];
  state.lastPlayerHitDamage = 0;
  state.combatCounters = {
    playerAttackCount: 0,
    playerHitCount: 0,
    shieldRefreshTimer: 0,
    curseDecayTimer: 0,
  };

  // Clear player status effects from previous fight
  state.player.statusEffects = [];
}

/**
 * Handle enemy death. Determines the next phase based on fight count,
 * room position, floor type.
 */
export function handleEnemyDeath(state: GameState): void {
  state.fightCount += 1;
  state.depth = Math.max(state.depth, state.floor);

  const isLastRoom = state.room >= state.roomsPerFloor;
  const isBoss = isBossFloor(state.floor);

  // Draft check (every 3 fights)
  if (shouldTriggerDraft(state.fightCount)) {
    state.phase = 'draft';
    return;
  }

  // Not last room — advance room and spawn next enemy
  if (!isLastRoom) {
    state.room += 1;
    spawnEnemy(state, false);
    state.phase = 'combat';
    return;
  }

  // Last room of floor
  if (state.floor === FINAL_BOSS_FLOOR) {
    state.checkpoint = FINAL_BOSS_FLOOR;
    state.phase = 'endless-intro';
    return;
  }

  if (isBoss) {
    state.checkpoint = state.floor;
    state.phase = 'shop';
    return;
  }

  // Normal floor complete
  state.phase = 'floor-complete';
}

/**
 * Handle player death. Build death summary, transition to death or endless-defeat.
 */
export function handlePlayerDeath(state: GameState): void {
  state.depth = Math.max(state.depth, state.floor);

  const deathSummary = buildDeathSummary(state);
  state.lastDeathStats = deathSummary;

  if (state.floor > FINAL_BOSS_FLOOR) {
    state.phase = 'endless-defeat';
  } else {
    state.phase = 'death';
  }
}

function buildDeathSummary(state: GameState): DeathSummary {
  const player = state.player;
  const enemy = state.enemy!;
  const enemyDef = state.enemyDefinition!;

  const playerDmg = calculateDamage(player.power, enemy.fortitude, 1.0);
  const enemyDmg = calculateDamage(enemy.power, player.fortitude, 1.0);

  const weaknessHint = generateWeaknessHint(player, enemy, enemyDef);

  return {
    floor: state.floor,
    room: state.room,
    enemyTier: enemyDef.tier,
    enemyModifiers: enemyDef.modifiers,
    playerStats: {
      power: player.power,
      fortitude: player.fortitude,
      speed: player.speed,
      luck: player.luck,
    },
    enemyStats: {
      power: enemy.power,
      fortitude: enemy.fortitude,
      speed: enemy.speed,
    },
    playerDamagePerHit: playerDmg.final,
    enemyDamagePerHit: enemyDmg.final,
    weaknessHint,
  };
}

function generateWeaknessHint(
  player: { power: number; fortitude: number; speed: number; luck: number },
  enemy: { power: number; fortitude: number; speed: number },
  enemyDef: { tier: string; modifiers: string[] },
): string {
  const powerVsFort = player.power / (enemy.fortitude || 1);
  const fortVsPower = player.fortitude / (enemy.power || 1);

  if (powerVsFort < 0.7) {
    return `Your Power (${player.power}) was significantly below the enemy's Fortitude (${enemy.fortitude}). Prioritize Power picks or DoT weapons.`;
  }
  if (fortVsPower < 0.7) {
    return `Your Fortitude (${player.fortitude}) couldn't keep up with enemy Power (${enemy.power}). Consider tankier builds or lifesteal items.`;
  }
  if (enemyDef.modifiers.includes('berserker')) {
    return `The Berserker modifier spiked enemy damage below 30% HP. Burst the enemy down quickly or use stun to control the phase.`;
  }
  if (enemyDef.modifiers.includes('regenerating')) {
    return `The Regenerating modifier outhealed your damage. You need more DPS — consider Power picks or damage-boosting items.`;
  }
  return `A close fight. Keep building your stats and you'll break through.`;
}
