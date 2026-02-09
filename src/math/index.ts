// src/math/index.ts
export { calculateEffectiveness, calculateDamage } from './damage';
export type { DamageResult } from './damage';

export {
  getMaxHp,
  getAttackInterval,
  getCritChance,
  getCritDamage,
  getDodgeChance,
} from './stats';

export {
  getGrowthMultiplier,
  getDraftPickValue,
  getRoomsPerFloor,
  getBossHpMultiplier,
} from './scaling';
export type { ScalingStat } from './scaling';

export * from './balance';
