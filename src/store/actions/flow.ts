import type { GameState } from '@/types/game';
import {
  FIRST_BOSS_FLOOR,
  BOSS_INTERVAL,
  DRAFT_FIGHT_INTERVAL,
  FINAL_BOSS_FLOOR,
} from '@/math/balance';
import { generateEnemy } from '@/data/enemies';

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
