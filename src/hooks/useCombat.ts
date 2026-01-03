import { useCallback } from 'react';
import { Player, Enemy, Item, StatusEffect, ActiveBuff, EnemyAbility } from '@/types/game';
import { calculateEnemyIntent } from '@/data/enemies';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';
import { getDodgeChance } from '@/utils/fortuneUtils';
import { usePathAbilities } from '@/hooks/usePathAbilities';
import { applyDamageToPlayer } from '@/utils/damageUtils';
import { applyStatusToPlayer } from '@/utils/statusEffectUtils';
import { STATUS_EFFECT_TYPE } from '@/constants/enums';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Combat result from a single combat tick
 */
export interface CombatTickResult {
  player: Player;
  enemy: Enemy;
  logs: string[];
  playerDamage: number;
  playerCrit: boolean;
  enemyDamage: number;
  enemyDefeated: boolean;
  playerDefeated: boolean;
  isStunned: boolean;
}

/**
 * Hook for combat damage calculations and tick processing.
 * Separates combat logic from state management.
 */
export function useCombat() {
  // Initialize path abilities hook for status immunity checks
  const { getStatusImmunities } = usePathAbilities();
  /**
   * Calculate damage dealt by attacker to defender
   */
  const calculateDamage = useCallback((
    attackerAttack: number,
    defenderDefense: number,
    isShielded: boolean = false
  ): { baseDamage: number; variance: number } => {
    const effectiveDefense = isShielded ? defenderDefense * 1.5 : defenderDefense;
    const baseDamage = Math.max(1, attackerAttack - effectiveDefense / 2);
    const variance = 0.8 + Math.random() * 0.4;
    return { baseDamage, variance };
  }, []);

  /**
   * Process item effects for a specific trigger
   */
  const processItemEffects = useCallback((
    player: Player,
    trigger: 'on_hit' | 'on_crit' | 'on_kill' | 'on_damaged' | 'combat_start' | 'turn_start',
    context: { damage?: number; logs: string[] }
  ): { player: Player; bonusDamage: number } => {
    let bonusDamage = 0;
    const updatedPlayer = deepClonePlayer(player);

    player.equippedItems.forEach((item: Item) => {
      if (item.effect?.trigger === trigger) {
        const chance = item.effect.chance ?? 1;
        if (Math.random() < chance) {
          switch (item.effect.type) {
            case 'heal':
              updatedPlayer.currentStats.health = Math.min(
                updatedPlayer.currentStats.maxHealth,
                updatedPlayer.currentStats.health + item.effect.value
              );
              context.logs.push(`${item.icon} +${item.effect.value} HP`);
              break;
            case 'damage':
              if (trigger === 'on_crit' && context.damage) {
                bonusDamage += context.damage * item.effect.value;
              } else {
                bonusDamage += item.effect.value;
                context.logs.push(`${item.icon} Bonus damage: +${item.effect.value}`);
              }
              break;
            case 'mana':
              updatedPlayer.currentStats.mana = Math.min(
                updatedPlayer.currentStats.maxMana,
                updatedPlayer.currentStats.mana + item.effect.value
              );
              break;
            case 'buff':
              updatedPlayer.activeBuffs.push({
                id: `${trigger}-buff-${Date.now()}`,
                name: 'Combat Ready',
                stat: 'armor',
                multiplier: 1 + (item.effect.value / player.baseStats.armor),
                remainingTurns: 3,
                icon: 'stat-armor',
              });
              context.logs.push(`${item.icon} Defense boosted!`);
              break;
          }
        }
      }
    });

    return { player: updatedPlayer, bonusDamage };
  }, []);

  /**
   * Process status effects at turn start (poison damage, etc.)
   */
  const processStatusEffects = useCallback((
    player: Player,
    logs: string[]
  ): { player: Player; isStunned: boolean } => {
    let updatedPlayer = deepClonePlayer(player);

    // Collect poison effects before processing (to avoid iteration issues)
    const poisonEffects = updatedPlayer.statusEffects.filter(
      (effect: StatusEffect) => effect.type === 'poison' && effect.damage
    );

    // Process poison damage from all poison effects
    for (const effect of poisonEffects) {
      const poisonResult = applyDamageToPlayer(updatedPlayer, effect.damage!, 'status_effect');
      updatedPlayer = poisonResult.player;
      if (poisonResult.actualDamage > 0) {
        logs.push(`☠️ Poison deals ${poisonResult.actualDamage} damage!`);
      }
    }

    // Tick down and filter expired status effects
    updatedPlayer.statusEffects = updatedPlayer.statusEffects
      .map((effect: StatusEffect) => ({ ...effect, remainingTurns: effect.remainingTurns - 1 }))
      .filter((effect: StatusEffect) => effect.remainingTurns > 0);

    // Check for stun
    const isStunned = updatedPlayer.statusEffects.some((e: StatusEffect) => e.type === 'stun');
    if (isStunned) {
      logs.push(`💫 You are stunned and cannot act!`);
    }

    return { player: updatedPlayer, isStunned };
  }, []);

  /**
   * Process buff duration ticks
   */
  const tickBuffDurations = useCallback((player: Player): Player => {
    return {
      ...player,
      activeBuffs: player.activeBuffs.map((buff: ActiveBuff) => ({
        ...buff,
        remainingTurns: buff.remainingTurns - 1,
      })).filter((buff: ActiveBuff) => buff.remainingTurns > 0),
    };
  }, []);

  /**
   * Tick enemy ability cooldowns
   */
  const tickEnemyCooldowns = useCallback((enemy: Enemy): Enemy => {
    return {
      ...enemy,
      abilities: enemy.abilities.map((a: EnemyAbility) => ({
        ...a,
        currentCooldown: Math.max(0, a.currentCooldown - 1),
      })),
    };
  }, []);

  /**
   * Execute enemy ability
   */
  const executeEnemyAbility = useCallback((
    enemy: Enemy,
    player: Player,
    ability: EnemyAbility,
    floor: number,
    logs: string[]
  ): { enemy: Enemy; player: Player; damage: number } => {
    const updatedEnemy = deepCloneEnemy(enemy);
    // Start with original player - utility functions (applyDamageToPlayer, applyStatusToPlayer)
    // handle their own deep cloning, so we avoid double-cloning
    let updatedPlayer = player;
    let damage = 0;

    logs.push(`${ability.icon} ${enemy.name} uses ${ability.name}!`);

    // Put ability on cooldown
    updatedEnemy.abilities = enemy.abilities.map((a: EnemyAbility) =>
      a.id === ability.id ? { ...a, currentCooldown: a.cooldown } : a
    );

    switch (ability.type) {
      case 'multi_hit': {
        const hits = ability.value;
        const damagePerHit = Math.max(1, Math.floor((enemy.power * 0.7 - player.currentStats.armor / 2)));
        let totalDamage = 0;
        for (let i = 0; i < hits; i++) {
          const dodged = Math.random() * 100 < getDodgeChance(player.currentStats.fortune);
          if (!dodged) {
            let hitDamage = Math.floor(damagePerHit * (0.8 + Math.random() * 0.4));
            if (player.isBlocking) {
              hitDamage = Math.floor(hitDamage * 0.5);
            }
            totalDamage += hitDamage;
          } else {
            logs.push(`💨 Dodged hit ${i + 1}!`);
          }
        }
        if (totalDamage > 0) {
          if (player.isBlocking) {
            logs.push(`🛡️ Block reduced multi-hit damage!`);
          }
          const multiHitResult = applyDamageToPlayer(updatedPlayer, totalDamage, 'enemy_ability');
          updatedPlayer = multiHitResult.player;
          if (multiHitResult.actualDamage > 0) {
            logs.push(`${ability.icon} ${hits} hits deal ${multiHitResult.actualDamage} total damage!`);
          }
          damage = multiHitResult.actualDamage;
        }
        break;
      }
      case 'poison': {
        const poisonDamage = Math.floor(ability.value * (1 + (floor - 1) * COMBAT_BALANCE.POISON_SCALING_PER_FLOOR));
        const immunities = getStatusImmunities(player);
        const poisonResult = applyStatusToPlayer(
          updatedPlayer,
          { type: STATUS_EFFECT_TYPE.POISON, damage: poisonDamage },
          'enemy_ability',
          immunities
        );
        updatedPlayer = poisonResult.player;
        logs.push(...poisonResult.logs);
        break;
      }
      case 'stun': {
        const immunities = getStatusImmunities(player);
        const stunResult = applyStatusToPlayer(
          updatedPlayer,
          { type: STATUS_EFFECT_TYPE.STUN, duration: ability.value },
          'enemy_ability',
          immunities
        );
        updatedPlayer = stunResult.player;
        logs.push(...stunResult.logs);
        break;
      }
      case 'heal': {
        const healAmount = Math.floor(enemy.maxHealth * ability.value);
        updatedEnemy.health = Math.min(enemy.maxHealth, enemy.health + healAmount);
        logs.push(`💚 ${enemy.name} heals for ${healAmount} HP!`);
        break;
      }
      case 'enrage': {
        updatedEnemy.isEnraged = true;
        updatedEnemy.power = Math.floor(enemy.power * (1 + ability.value));
        logs.push(`😤 ${enemy.name} becomes enraged! Attack increased!`);
        break;
      }
      case 'shield': {
        updatedEnemy.isShielded = true;
        logs.push(`🛡️ ${enemy.name} raises a shield!`);
        break;
      }
    }

    return { enemy: updatedEnemy, player: updatedPlayer, damage };
  }, [getStatusImmunities]);

  /**
   * Calculate and update enemy intent for next turn
   */
  const updateEnemyIntent = useCallback((enemy: Enemy): Enemy => {
    return {
      ...enemy,
      intent: calculateEnemyIntent(enemy),
    };
  }, []);

  return {
    calculateDamage,
    processItemEffects,
    processStatusEffects,
    tickBuffDurations,
    tickEnemyCooldowns,
    executeEnemyAbility,
    updateEnemyIntent,
  };
}
