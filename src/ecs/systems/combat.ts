// src/ecs/systems/combat.ts
/**
 * CombatSystem - resolves attacks and applies damage.
 * Processes all entities with attackReady component.
 */

import { world } from '../world';
import { entitiesWithAttackReady, getPlayer, getActiveEnemy, getGameState } from '../queries';
import type { Entity } from '../components';
import { getDodgeChance } from '@/utils/fortuneUtils';
import { recordPathTrigger } from './path-ability';
import { getStanceDamageMultiplier, getStanceBehavior, getStanceStatModifier } from '@/utils/stanceUtils';
import { queueAnimationEvent, addCombatLog, getEntityName } from '../utils';

function getTarget(attacker: Entity): Entity | undefined {
  if (attacker.player) {
    return getActiveEnemy();
  } else if (attacker.enemy) {
    return getPlayer();
  }
  return undefined;
}

export function CombatSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Process all entities ready to attack
  for (const entity of entitiesWithAttackReady) {
    const attackData = entity.attackReady;
    if (!attackData) continue;

    // Skip if attacker is dying or already dead (prevents posthumous attacks)
    if (entity.dying || (entity.health && entity.health.current <= 0)) {
      world.removeComponent(entity, 'attackReady');
      continue;
    }

    const target = getTarget(entity);
    if (!target || target.dying) {
      // No valid target - clear attack
      world.removeComponent(entity, 'attackReady');
      continue;
    }

    const attackerName = getEntityName(entity);
    const targetName = getEntityName(target);

    // Check for dodge (only player can dodge enemy attacks)
    if (entity.enemy && target.player) {
      // Fortune is stored as critChance (fortune / 100), so multiply back to get fortune value
      // Also check identity for base fortune stat
      const critChance = target.attack?.critChance ?? 0;
      const baseFortune = target.identity?.class?.baseStats?.fortune ?? 0;
      // Use the higher of derived fortune or base fortune
      const playerFortune = Math.max(critChance * 100, baseFortune);
      const dodgeChance = getDodgeChance(playerFortune);

      if (Math.random() < dodgeChance) {
        // Player dodged!
        addCombatLog(`${targetName} dodges ${attackerName}'s attack!`);
        queueAnimationEvent('player_dodge', { type: 'dodge' });
        recordPathTrigger('on_dodge', { isDodge: true });
        world.removeComponent(entity, 'attackReady');
        continue;
      }

      // Check for stance auto-block (passive paths)
      const autoBlockChance = getStanceBehavior(target, 'auto_block');
      if (autoBlockChance > 0 && Math.random() < autoBlockChance) {
        addCombatLog(`${targetName} auto-blocks ${attackerName}'s attack!`);
        queueAnimationEvent('player_block', { type: 'block', reduction: 1 });
        recordPathTrigger('on_block', { isBlock: true });
        world.removeComponent(entity, 'attackReady');
        continue;
      }
    }

    let damage = attackData.damage;

    // Apply hex aura damage reduction (passive aura weakens enemies)
    if (entity.enemy && target.player) {
      const hexReduction = getStanceBehavior(target, 'hex_aura');
      if (hexReduction > 0) {
        damage = Math.round(damage * (1 - hexReduction));
        damage = Math.max(1, damage);
      }
    }

    // Apply weaken status effect (enemy attacking with damage debuff)
    if (entity.enemy && entity.statusEffects) {
      const weakenEffect = entity.statusEffects.find(
        effect => effect.type === 'weaken' && effect.remainingTurns > 0
      );
      if (weakenEffect && weakenEffect.value) {
        const reduction = weakenEffect.value / 100; // Convert percentage to decimal
        damage = Math.round(damage * (1 - reduction));
        damage = Math.max(1, damage);
      }
    }

    // Apply stance power modifier to outgoing damage (player attacking)
    if (entity.player) {
      const powerMod = getStanceStatModifier(entity, 'power');
      if (powerMod !== 0) {
        damage = Math.round(damage * (1 + powerMod));
      }
      // Apply outgoing damage multiplier
      const outgoingMult = getStanceDamageMultiplier(entity, 'outgoing');
      if (outgoingMult !== 1) {
        damage = Math.round(damage * outgoingMult);
      }
    }

    // Apply defense
    const defense = target.defense?.value ?? 0;
    // Apply stance armor modifier to defense (when player is target)
    let effectiveDefense = defense;
    if (target.player) {
      const armorMod = getStanceStatModifier(target, 'armor');
      if (armorMod !== 0) {
        effectiveDefense = Math.round(defense * (1 + armorMod));
      }
    }
    damage -= effectiveDefense;
    damage = Math.max(1, damage); // Minimum 1 damage

    // Apply stance incoming damage reduction (when player is target)
    if (target.player) {
      const incomingMult = getStanceDamageMultiplier(target, 'incoming');
      if (incomingMult !== 1) {
        damage = Math.round(damage * incomingMult);
        damage = Math.max(1, damage); // Still minimum 1
      }
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

    // Check if this attack killed the target
    const targetDied = target.health ? target.health.current <= 0 : false;

    // If target died, immediately clear their pending attack to prevent posthumous hits
    if (targetDied && target.attackReady) {
      world.removeComponent(target, 'attackReady');
    }

    // Queue combat animation event (hit event triggers both attack and hit animations)
    const isPlayerAttacking = !!entity.player;
    queueAnimationEvent(isPlayerAttacking ? 'enemy_hit' : 'player_hit', {
      type: 'damage',
      value: damage,
      isCrit: attackData.isCrit,
      targetDied,
    });

    // Combat log
    const critText = attackData.isCrit ? ' (CRIT!)' : '';
    addCombatLog(
      `${attackerName} attacks ${targetName} for ${damage} damage${critText}`
    );

    // Record path ability triggers
    if (isPlayerAttacking) {
      // Player hit enemy
      recordPathTrigger('on_hit', { damage, isCrit: attackData.isCrit });

      // Player crit
      if (attackData.isCrit) {
        recordPathTrigger('on_crit', { damage, isCrit: true });
      }

      // Player killed enemy
      if (targetDied) {
        recordPathTrigger('on_kill', { damage });
      }

      // Apply lifesteal from stance
      const lifestealPercent = getStanceBehavior(entity, 'lifesteal');
      if (lifestealPercent > 0 && entity.health) {
        const healAmount = Math.round(damage * lifestealPercent);
        if (healAmount > 0) {
          entity.health.current = Math.min(
            entity.health.max,
            entity.health.current + healAmount
          );
          addCombatLog(`${attackerName} heals for ${healAmount} HP (lifesteal)`);
        }
      }

      // Apply arcane burn from stance (chance to deal bonus damage + apply burn DoT)
      const arcaneBurnChance = getStanceBehavior(entity, 'arcane_burn');
      if (arcaneBurnChance > 0 && Math.random() < arcaneBurnChance) {
        // Bonus damage: 30% of attack damage
        const bonusDamage = Math.round(damage * 0.3);
        if (bonusDamage > 0 && target.health) {
          target.health.current = Math.max(0, target.health.current - bonusDamage);
        }

        // Apply burn DoT: 5 damage per second for 3 seconds
        if (!target.statusEffects) {
          target.statusEffects = [];
        }
        target.statusEffects.push({
          id: `burn-${Date.now()}`,
          type: 'burn',
          damage: 5,
          remainingTurns: 3,
          icon: 'flame',
        });

        addCombatLog(`Arcane Burn! ${bonusDamage} bonus damage + burning for 15`);
      }
    } else {
      // Enemy hit player
      recordPathTrigger('on_damaged', { damage });

      // Apply reflect damage from stance
      const reflectPercent = getStanceBehavior(target, 'reflect_damage');
      if (reflectPercent > 0 && entity.health) {
        const reflectDamage = Math.round(damage * reflectPercent);
        if (reflectDamage > 0) {
          entity.health.current = Math.max(0, entity.health.current - reflectDamage);
          addCombatLog(`${targetName} reflects ${reflectDamage} damage!`);
        }
      }

      // Check for counter-attack from stance
      const counterChance = getStanceBehavior(target, 'counter_attack');
      if (counterChance > 0 && Math.random() < counterChance && target.attack) {
        const counterDamage = Math.round(target.attack.baseDamage * 0.5);
        if (counterDamage > 0 && entity.health) {
          entity.health.current = Math.max(0, entity.health.current - counterDamage);
          addCombatLog(`${targetName} counter-attacks for ${counterDamage} damage!`);
        }
      }
    }

    // Clear attack ready
    world.removeComponent(entity, 'attackReady');
  }
}
