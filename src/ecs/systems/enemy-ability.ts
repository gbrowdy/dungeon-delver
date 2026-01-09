// src/ecs/systems/enemy-ability.ts
/**
 * EnemyAbilitySystem - processes enemy special abilities.
 * Handles abilities like heal, enrage, shield, poison, stun, multi_hit.
 * Runs after attack timing but before combat to intercept ability-based attacks.
 */

import { world } from '../world';
import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getTick } from '../loop';
import { COMBAT_BALANCE } from '@/constants/balance';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import type { EnemyAbility } from '@/types/game';
import { queueAnimationEvent, addCombatLog } from '../utils';
import { calculateEnemyIntent } from '@/data/enemies';

/**
 * Execute an enemy ability and apply its effects.
 */
function executeAbility(
  enemy: Entity,
  player: Entity,
  ability: EnemyAbility,
  floor: number
): void {
  const enemyName = enemy.enemy?.name ?? 'Enemy';

  addCombatLog(`${enemyName} uses ${ability.name}!`);

  // Put ability on cooldown (both in Map and in abilities array)
  if (enemy.cooldowns) {
    enemy.cooldowns.set(ability.id, { remaining: ability.cooldown, base: ability.cooldown });
  }

  // Update currentCooldown in the abilities array so calculateEnemyIntent sees it
  if (enemy.enemy) {
    const abilityInArray = enemy.enemy.abilities.find(a => a.id === ability.id);
    if (abilityInArray) {
      abilityInArray.currentCooldown = ability.cooldown;
    }
  }

  switch (ability.type) {
    case 'multi_hit': {
      // Multiple attacks - each hit does reduced damage
      const hits = ability.value;
      const baseDamage = enemy.attack?.baseDamage ?? 10;
      const damagePerHit = Math.floor(baseDamage * 0.7);
      let totalDamage = 0;

      for (let i = 0; i < hits; i++) {
        const variance = 0.8 + Math.random() * 0.4;
        const hitDamage = Math.floor(damagePerHit * variance);
        totalDamage += hitDamage;
      }

      // Apply defense
      const defense = player.defense?.value ?? 0;
      totalDamage = Math.max(hits, totalDamage - defense); // At least 1 damage per hit

      if (player.health) {
        player.health.current = Math.max(0, player.health.current - totalDamage);
      }

      addCombatLog(`${hits} hits deal ${totalDamage} total damage!`);
      queueAnimationEvent('player_hit', {
        type: 'damage',
        value: totalDamage,
        isCrit: false,
        blocked: false,
      });
      break;
    }

    case 'poison': {
      // Apply poison status effect
      const poisonDamage = Math.floor(
        ability.value * (1 + (floor - 1) * COMBAT_BALANCE.POISON_SCALING_PER_FLOOR)
      );

      if (!player.statusEffects) {
        player.statusEffects = [];
      }

      // Add or refresh poison
      const existingPoison = player.statusEffects.find(e => e.type === 'poison');
      if (existingPoison) {
        existingPoison.damage = Math.max(existingPoison.damage ?? 0, poisonDamage);
        existingPoison.remainingTurns = 3;
      } else {
        player.statusEffects.push({
          id: crypto.randomUUID(),
          type: 'poison',
          remainingTurns: 3,
          damage: poisonDamage,
          icon: 'Skull',
        });
      }

      addCombatLog(`${enemyName} poisons you for ${poisonDamage} damage per turn!`);
      queueAnimationEvent('status_applied', {
        type: 'status',
        effectType: 'poison',
        applied: true,
      });
      break;
    }

    case 'stun': {
      // Apply stun status effect
      if (!player.statusEffects) {
        player.statusEffects = [];
      }

      // Check if already stunned
      const existingStun = player.statusEffects.find(e => e.type === 'stun');
      if (!existingStun) {
        player.statusEffects.push({
          id: crypto.randomUUID(),
          type: 'stun',
          remainingTurns: ability.value,
          icon: 'Zap',
        });
        addCombatLog(`You are stunned for ${ability.value} turn(s)!`);
      } else {
        existingStun.remainingTurns = Math.max(existingStun.remainingTurns, ability.value);
        addCombatLog(`Stun duration refreshed!`);
      }

      queueAnimationEvent('status_applied', {
        type: 'status',
        effectType: 'stun',
        applied: true,
      });
      break;
    }

    case 'heal': {
      // Enemy heals itself
      if (!enemy.health) break;

      const healAmount = Math.floor(enemy.health.max * ability.value);
      const oldHealth = enemy.health.current;
      enemy.health.current = Math.min(enemy.health.max, enemy.health.current + healAmount);
      const actualHeal = enemy.health.current - oldHealth;

      addCombatLog(`${enemyName} heals for ${actualHeal} HP!`);
      queueAnimationEvent('enemy_ability', {
        type: 'enemy_ability',
        abilityType: 'heal',
        abilityName: ability.name,
      });
      break;
    }

    case 'enrage': {
      // Enemy increases power
      if (!enemy.enemyFlags) {
        enemy.enemyFlags = {};
      }

      if (!enemy.enemyFlags.isEnraged) {
        enemy.enemyFlags.basePower = enemy.attack?.baseDamage ?? 10;
        enemy.enemyFlags.isEnraged = true;
        enemy.enemyFlags.enrageTurnsRemaining = 5;

        if (enemy.attack) {
          enemy.attack.baseDamage = Math.floor(enemy.attack.baseDamage * (1 + ability.value));
        }

        addCombatLog(`${enemyName} becomes enraged! Attack increased!`);
      } else {
        enemy.enemyFlags.enrageTurnsRemaining = 5;
        addCombatLog(`${enemyName}'s rage is renewed!`);
      }

      queueAnimationEvent('enemy_ability', {
        type: 'enemy_ability',
        abilityType: 'enrage',
        abilityName: ability.name,
      });
      break;
    }

    case 'shield': {
      // Enemy raises a shield
      if (!enemy.enemyFlags) {
        enemy.enemyFlags = {};
      }

      enemy.enemyFlags.isShielded = true;
      enemy.enemyFlags.shieldTurnsRemaining = 3;

      addCombatLog(`${enemyName} raises a shield!`);
      queueAnimationEvent('enemy_ability', {
        type: 'enemy_ability',
        abilityType: 'shield',
        abilityName: ability.name,
      });
      break;
    }
  }
}

/**
 * Check if an ability should be used based on intent and cooldowns.
 */
function shouldUseAbility(enemy: Entity): EnemyAbility | null {
  if (!enemy.enemy?.intent) return null;
  if (enemy.enemy.intent.type !== 'ability') return null;
  if (!enemy.enemy.intent.ability) return null;

  const ability = enemy.enemy.intent.ability;

  // Check cooldown
  if (enemy.cooldowns?.has(ability.id)) {
    const cooldown = enemy.cooldowns.get(ability.id);
    if (cooldown && cooldown.remaining > 0) return null;
  }

  return ability;
}

export function EnemyAbilitySystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Check if hex disables enemy abilities (before entity scope is established)
  const player = getPlayer();
  if (player && !player.dying && player.stanceState?.activeStanceId === 'hex_veil') {
    const computed = player.passiveEffectState?.computed;
    if (computed?.hexDisableAbilities) {
      return; // Skip all enemy ability processing
    }
  }

  const enemy = getActiveEnemy();

  if (!enemy || !player || enemy.dying || player.dying) return;

  // Check if enemy has attackReady and should use ability instead
  if (!enemy.attackReady) return;

  const ability = shouldUseAbility(enemy);
  if (!ability) return;

  // Use ability instead of normal attack
  const floor = gameState.floor?.number ?? 1;
  executeAbility(enemy, player, ability, floor);

  // Clear attackReady since ability was used
  world.removeComponent(enemy, 'attackReady');

  // Recalculate intent for next attack
  if (enemy.enemy) {
    enemy.enemy.intent = calculateEnemyIntent(enemy.enemy);
  }
}
