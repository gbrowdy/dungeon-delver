/**
 * Enemy intent calculation
 */

import type { Enemy, EnemyAbility, EnemyIntent } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Calculate enemy's next intent based on abilities and cooldowns
 */
export function calculateEnemyIntent(enemy: Enemy): EnemyIntent {
  // Check for abilities that are off cooldown
  const readyAbilities = enemy.abilities.filter(
    (a: EnemyAbility) => a.currentCooldown === 0
  );

  // If any abilities are ready, roll for each one and pick the first that succeeds
  // This makes ability usage more predictable while still having randomness
  if (readyAbilities.length > 0) {
    // Shuffle ready abilities for variety
    const shuffled = [...readyAbilities].sort(() => Math.random() - 0.5);

    for (const ability of shuffled) {
      // Roll against the ability's chance
      if (Math.random() < ability.chance) {
        return {
          type: 'ability',
          ability,
          damage: ability.type === 'multi_hit'
            ? Math.floor(enemy.power * COMBAT_BALANCE.MULTI_HIT_DAMAGE_MODIFIER * ability.value) // Multi-hit total damage
            : ability.type === 'poison'
              ? ability.value * COMBAT_BALANCE.DEFAULT_POISON_DURATION // Total poison damage over duration
              : undefined,
          icon: ability.icon,
        };
      }
    }
  }

  // Default: basic attack
  return {
    type: 'attack',
    damage: enemy.power,
    icon: 'ability-attack',
  };
}
