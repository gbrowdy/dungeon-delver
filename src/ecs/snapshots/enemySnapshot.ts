// src/ecs/snapshots/enemySnapshot.ts
/**
 * Enemy snapshot type and creation function.
 */

import type { Entity } from '../components';
import type { StatusEffect, EnemyAbility, EnemyIntent, ModifierEffect, EnemyStatDebuff } from '@/types/game';
import { getTick } from '../loop';
import { ticksToMs } from './types';

/**
 * Snapshot of enemy entity state for React components.
 */
export interface EnemySnapshot {
  // Identity
  id: string;
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'boss';
  isBoss: boolean;
  isFinalBoss: boolean;

  // Combat stats
  health: { current: number; max: number };
  attack: { baseDamage: number };
  defense: { value: number };
  speed: { value: number; attackInterval: number };

  // Abilities
  abilities: EnemyAbility[];
  intent: EnemyIntent | null;
  modifiers: ModifierEffect[];

  // Status
  statusEffects: StatusEffect[];
  statDebuffs: EnemyStatDebuff[];
  isShielded: boolean;
  shieldTurnsRemaining: number;
  isEnraged: boolean;
  enrageTurnsRemaining: number;
  isDying: boolean;

  // Rewards
  xpReward: number;
  goldReward: number;

  // Animation state
  combatAnimation: {
    type: string;
    progress: number;
  } | null;

  visualEffects: {
    flash: boolean;
    aura: 'red' | 'blue' | 'green' | null;
    powerImpact: { powerId: string; untilTick: number } | null;
  };
}

/**
 * Create an enemy snapshot from an entity.
 * Returns null if the entity doesn't have required enemy components.
 */
export function createEnemySnapshot(entity: Entity): EnemySnapshot | null {
  if (!entity.enemy || !entity.health) {
    return null;
  }

  return {
    // Identity
    id: entity.enemy.id,
    name: entity.enemy.name,
    tier: entity.enemy.tier,
    isBoss: entity.enemy.isBoss,
    isFinalBoss: entity.enemy.isFinalBoss ?? false,

    // Combat stats
    health: { ...entity.health },
    attack: entity.attack ? { baseDamage: entity.attack.baseDamage } : { baseDamage: 0 },
    defense: entity.defense ? { value: entity.defense.value } : { value: 0 },
    speed: entity.speed ? {
      value: entity.speed.value,
      attackInterval: entity.speed.attackInterval
    } : { value: 10, attackInterval: 2500 },

    // Abilities
    abilities: entity.enemy.abilities ? [...entity.enemy.abilities] : [],
    intent: entity.enemy.intent,
    modifiers: entity.enemy.modifiers ? [...entity.enemy.modifiers] : [],

    // Status
    statusEffects: entity.statusEffects ? [...entity.statusEffects] : [],
    statDebuffs: entity.statDebuffs ? [...entity.statDebuffs] : [],
    isShielded: entity.enemyFlags?.isShielded ?? false,
    shieldTurnsRemaining: entity.enemyFlags?.shieldTurnsRemaining ?? 0,
    isEnraged: entity.enemyFlags?.isEnraged ?? false,
    enrageTurnsRemaining: entity.enemyFlags?.enrageTurnsRemaining ?? 0,
    isDying: !!entity.dying,

    // Rewards
    xpReward: entity.rewards?.xp ?? 0,
    goldReward: entity.rewards?.gold ?? 0,

    // Animation state
    combatAnimation: entity.combatAnimation ? {
      type: entity.combatAnimation.type,
      progress: Math.min(1, ticksToMs(getTick() - entity.combatAnimation.startedAtTick) / entity.combatAnimation.duration),
    } : null,

    visualEffects: {
      flash: !!entity.visualEffects?.flash,
      aura: entity.visualEffects?.aura?.color ?? null,
      powerImpact: entity.visualEffects?.powerImpact ?? null,
    },
  };
}
