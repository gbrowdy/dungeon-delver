import type { EnemyTier } from '@/types/game';
import type { SpriteType } from '@/data/sprites';

const COMMON_SPRITES: SpriteType[] = ['goblin', 'slime', 'rat', 'spider', 'imp', 'zombie'];
const UNCOMMON_SPRITES: SpriteType[] = ['orc', 'skeleton', 'dark-elf', 'ghost', 'harpy'];
const RARE_SPRITES: SpriteType[] = ['werewolf', 'minotaur', 'vampire', 'demon', 'golem'];
const BOSS_SPRITES: SpriteType[] = ['dragon', 'archdemon', 'death-knight', 'elder-lich', 'titan'];

const TIER_SPRITES: Record<EnemyTier, SpriteType[]> = {
  common: COMMON_SPRITES,
  uncommon: UNCOMMON_SPRITES,
  rare: RARE_SPRITES,
  boss: BOSS_SPRITES,
};

/**
 * Deterministic mapping from (tier, floor, room) to an enemy sprite type.
 * Uses floor+room as a seed to cycle through available sprites.
 */
export function getEnemySpriteType(tier: EnemyTier, floor: number, room: number): SpriteType {
  const pool = TIER_SPRITES[tier];
  const index = ((floor * 7) + (room * 13)) % pool.length;
  return pool[index];
}
