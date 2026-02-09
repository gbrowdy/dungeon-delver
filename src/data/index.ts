// src/data/index.ts
export { CLASSES, CLASS_LIST, getStatProbabilities } from './classes';
export type { ClassDefinition, ClassInnate } from './classes';

export {
  ITEM_DEFINITIONS,
  WEAPONS,
  ARMORS,
  ACCESSORIES,
  ALL_ITEMS,
  getItemsBySlot,
  getScaledValue,
} from './items';
export type { ItemDefinition, ItemEffect, ItemTrigger, ItemEffectType } from './items';

export {
  ENEMY_TIERS,
  MODIFIER_EFFECTS,
  MODIFIER_LIST,
  selectEnemyTier,
  selectModifiers,
  generateEnemy,
} from './enemies';
export type { EnemyTierStats, ModifierDefinition, ModifierEffect, GeneratedEnemy } from './enemies';
