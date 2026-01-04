// src/ecs/systems/combat.ts
/**
 * CombatSystem - resolves attacks and applies damage.
 * Processes all entities with attackReady component.
 */

import { world } from '../world';
import { entitiesWithAttackReady, getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getTick } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';

let nextAnimationId = 0;

function getNextAnimationId(): string {
  return `anim-${nextAnimationId++}`;
}

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 30
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: getNextAnimationId(),
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);

  // Keep last 50 entries
  if (gameState.combatLog.length > 50) {
    gameState.combatLog.shift();
  }
}

function getTarget(attacker: Entity): Entity | undefined {
  if (attacker.player) {
    return getActiveEnemy();
  } else if (attacker.enemy) {
    return getPlayer();
  }
  return undefined;
}

function getEntityName(entity: Entity): string {
  if (entity.player) {
    return entity.identity?.name ?? 'Hero';
  }
  if (entity.enemy) {
    return entity.enemy.name;
  }
  return 'Unknown';
}

export function CombatSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Process all entities ready to attack
  for (const entity of entitiesWithAttackReady) {
    const attackData = entity.attackReady;
    if (!attackData) continue;

    const target = getTarget(entity);
    if (!target || target.dying) {
      // No valid target - clear attack
      world.removeComponent(entity, 'attackReady');
      continue;
    }

    let damage = attackData.damage;
    const attackerName = getEntityName(entity);
    const targetName = getEntityName(target);

    // Apply defense
    const defense = target.defense?.value ?? 0;
    damage -= defense;
    damage = Math.max(1, damage); // Minimum 1 damage

    // Check for block
    let blocked = false;
    if (target.blocking) {
      damage = Math.floor(damage * (1 - target.blocking.reduction));
      blocked = true;
      delete target.blocking;

      // Queue block animation
      queueAnimationEvent('player_block', {
        type: 'block',
        reduction: target.blocking?.reduction ?? 0.4,
      });
    }

    // Apply shield first (if target has shield)
    if (target.shield && target.shield.value > 0) {
      if (target.shield.value >= damage) {
        target.shield.value -= damage;
        damage = 0;
        addCombatLog(`${targetName}'s shield absorbs the attack!`);
      } else {
        damage -= target.shield.value;
        target.shield.value = 0;
        addCombatLog(`${targetName}'s shield breaks!`);
      }
    }

    // Apply damage to health
    if (damage > 0 && target.health) {
      target.health.current = Math.max(0, target.health.current - damage);
    }

    // Queue damage animation
    const isPlayerAttacking = !!entity.player;
    queueAnimationEvent(isPlayerAttacking ? 'enemy_hit' : 'player_hit', {
      type: 'damage',
      value: damage,
      isCrit: attackData.isCrit,
      blocked,
    });

    // Combat log
    const critText = attackData.isCrit ? ' (CRIT!)' : '';
    const blockText = blocked ? ' (blocked)' : '';
    addCombatLog(
      `${attackerName} attacks ${targetName} for ${damage} damage${critText}${blockText}`
    );

    // Clear attack ready
    world.removeComponent(entity, 'attackReady');
  }
}
