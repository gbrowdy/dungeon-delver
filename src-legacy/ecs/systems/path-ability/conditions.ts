// src/ecs/systems/path-ability/conditions.ts
/**
 * Condition checking for path abilities.
 * Evaluates whether ability conditions are met.
 */

import type { Entity } from '@/ecs/components';
import type { PathAbilityCondition } from '@/types/paths';

/**
 * Check if a condition is met.
 */
export function checkCondition(
  condition: PathAbilityCondition,
  player: Entity,
  enemy: Entity | undefined
): boolean {
  switch (condition.type) {
    case 'hp_below': {
      if (!player.health) return false;
      const hpPercent = (player.health.current / player.health.max) * 100;
      return hpPercent < condition.value;
    }
    case 'hp_above': {
      if (!player.health) return false;
      const hpPercent = (player.health.current / player.health.max) * 100;
      return hpPercent > condition.value;
    }
    case 'hp_threshold': {
      if (!player.health) return false;
      const hpRatio = player.health.current / player.health.max;
      return hpRatio <= condition.value;
    }
    case 'enemy_hp_below': {
      if (!enemy?.health) return false;
      const enemyHpPercent = (enemy.health.current / enemy.health.max) * 100;
      return enemyHpPercent < condition.value;
    }
    case 'combo_count': {
      const comboCount = player.combo?.count ?? 0;
      return comboCount >= condition.value;
    }
    case 'attack_count': {
      const attackCount = player.abilityTracking?.abilityCounters?.[condition.counterId] ?? 0;
      return attackCount >= condition.value;
    }
    case 'enemy_has_status': {
      if (!enemy?.statusEffects) return false;
      return enemy.statusEffects.length > 0;
    }
    default:
      return false;
  }
}
