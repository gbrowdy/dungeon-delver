import type { CombatEntity } from '@/types/game';
import {
  PLAYER_BASE_HP,
  PLAYER_BASE_POWER,
  PLAYER_BASE_FORTITUDE,
  PLAYER_BASE_SPEED,
  PLAYER_BASE_LUCK,
} from '@/math/balance';
import { getMaxHp, getAttackInterval } from '@/math/stats';

export function createInitialPlayer(): CombatEntity {
  const maxHp = getMaxHp(PLAYER_BASE_HP, PLAYER_BASE_FORTITUDE);
  return {
    power: PLAYER_BASE_POWER,
    fortitude: PLAYER_BASE_FORTITUDE,
    speed: PLAYER_BASE_SPEED,
    luck: PLAYER_BASE_LUCK,
    basePower: PLAYER_BASE_POWER,
    baseSpeed: PLAYER_BASE_SPEED,
    hp: maxHp,
    maxHp,
    attackTimer: getAttackInterval(PLAYER_BASE_SPEED),
    statusEffects: [],
    poisonDamageAccumulator: 0,
  };
}
