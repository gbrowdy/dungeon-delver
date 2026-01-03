import { useCallback } from 'react';
import { GameState, Power, PathResource } from '@/types/game';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { COMBAT_BALANCE, POWER_BALANCE, COOLDOWN_FLOOR_SECONDS } from '@/constants/balance';
import { COMBAT_EVENT_DELAYS } from '@/constants/balance';
import { COMBAT_EVENT_TYPE, BUFF_STAT, ITEM_EFFECT_TRIGGER, PAUSE_REASON, STATUS_EFFECT_TYPE } from '@/constants/enums';
import { generateEventId } from '@/utils/eventId';
import { getDropQualityBonus } from '@/utils/fortuneUtils';
import { safeCombatLogAdd } from '@/utils/combatLogUtils';
import { processItemEffects } from '@/hooks/useItemEffects';
import { usePathAbilities, getPathPlaystyleModifiers } from '@/hooks/usePathAbilities';
import { applyTriggerResultToEnemy } from '@/hooks/combatActionHelpers';
import { processLevelUp } from '@/hooks/useRewardCalculation';
import { isFeatureEnabled } from '@/constants/features';
import { PATH_RESOURCES, getResourceDisplayName } from '@/data/pathResources';
import { applyDamageToPlayer, applyDamageToEnemy } from '@/utils/damageUtils';
import { applyStatusToEnemy } from '@/utils/statusEffectUtils';
import { applyPathTriggerToEnemy } from '@/utils/combatUtils';
import { restorePlayerHealth, restorePlayerMana } from '@/utils/statsUtils';

/**
 * Context for power activation - all state needed to execute a power
 */
export interface PowerActivationContext {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setLastCombatEvent: (event: CombatEvent | null) => void;
  scheduleCombatEvent: (event: CombatEvent, delay: number) => void;
  enemyDeathProcessedRef: React.MutableRefObject<string | null>;
  combatSpeed: number;
}

/**
 * Hook for managing power activation logic.
 * Extracted from useGameState to improve code organization and maintainability.
 *
 * Handles:
 * - Power activation with mana cost and cooldown management
 * - Combo system for alternating powers
 * - Power effects: damage, heal, buff
 * - Special power interactions (vampiric touch, mana surge)
 * - Enemy death from power damage
 */
export function usePowerActions(context: PowerActivationContext) {
  const {
    setState,
    setLastCombatEvent,
    scheduleCombatEvent,
    enemyDeathProcessedRef,
    combatSpeed,
  } = context;

  const { processTrigger, hasAbility, addAttackModifier, getPowerModifiers, hasComboMechanic } = usePathAbilities();

  const usePower = useCallback((powerId: string) => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.currentEnemy) return prev;
      // Skip if player or enemy is dying
      if (prev.player.isDying || prev.currentEnemy.isDying) return prev;

      const powerIndex = prev.player.powers.findIndex((p: Power) => p.id === powerId);
      if (powerIndex === -1) return prev;

      const power = prev.player.powers[powerIndex];
      if (!power) return prev;

      // Check if player has Reckless Fury - uses HP instead of mana
      const useHpForMana = hasAbility(prev.player, 'reckless_fury');

      // Get power modifiers from path abilities (e.g., Efficient Casting reduces mana cost)
      const powerMods = getPowerModifiers(prev.player);

      // Check if using path resource system (Phase 6)
      const pathId = prev.player.path?.pathId;
      const usesPathResource = isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM') &&
        pathId !== undefined &&
        pathId in PATH_RESOURCES;
      const pathResource = usesPathResource ? prev.player.pathResource : undefined;

      // Calculate effective cost with threshold reductions for path resources
      let effectiveManaCost = Math.max(1, Math.floor(power.manaCost * (1 - powerMods.costReduction)));
      if (usesPathResource && pathResource) {
        // Apply threshold-based cost reduction
        const thresholdReductions = pathResource.thresholds?.filter(
          t => pathResource.current >= t.value && t.effect.type === 'cost_reduction'
        ) ?? [];
        for (const threshold of thresholdReductions) {
          effectiveManaCost = Math.floor(effectiveManaCost * (1 - (threshold.effect.value ?? 0)));
        }
        effectiveManaCost = Math.max(1, effectiveManaCost);
      }

      if (power.currentCooldown > 0) {
        // Power is on cooldown - provide feedback
        const newLog = `${power.name} is on cooldown (${power.currentCooldown.toFixed(1)}s)`;
        safeCombatLogAdd(prev.combatLog, newLog, 'usePower:onCooldown');
        return prev;
      }

      // Check resource cost (HP, Mana, or Path Resource)
      if (useHpForMana) {
        const hpCost = Math.floor(effectiveManaCost * 0.5);
        // Need at least hpCost + 1 HP to use power (can't kill yourself)
        if (prev.player.currentStats.health <= hpCost) {
          const newLog = `Not enough HP for ${power.name} (need ${hpCost + 1} HP)`;
          safeCombatLogAdd(prev.combatLog, newLog, 'usePower:notEnoughHP');
          return prev;
        }
      } else if (usesPathResource && pathResource) {
        // Path resource check
        if (pathResource.current < effectiveManaCost) {
          const resourceName = getResourceDisplayName(pathResource.type);
          const newLog = `Not enough ${resourceName} for ${power.name} (${Math.floor(pathResource.current)}/${effectiveManaCost})`;
          safeCombatLogAdd(prev.combatLog, newLog, 'usePower:notEnoughResource');
          return prev;
        }
      } else {
        // Normal mana check
        if (prev.player.currentStats.mana < effectiveManaCost) {
          const newLog = `Not enough mana for ${power.name} (${prev.player.currentStats.mana}/${effectiveManaCost})`;
          safeCombatLogAdd(prev.combatLog, newLog, 'usePower:notEnoughMana');
          return prev;
        }
      }

      let player = { ...prev.player };
      let enemy = { ...prev.currentEnemy };
      const logs: string[] = [];

      // Track different powers used for combo system (e.g., Elemental Convergence)
      // If this is a different power than the last one used, increment combo count
      if (player.lastPowerUsed && player.lastPowerUsed !== power.id) {
        player.comboCount = (player.comboCount || 0) + 1;
      } else if (!player.lastPowerUsed) {
        // First power used, initialize combo count
        player.comboCount = 1;
      }
      // If same power, don't increment (but don't reset either)

      player.lastPowerUsed = power.id;

      // Check for vanilla combo bonus (only for active paths)
      // Combo bonus starts at 2+ different powers: subtract 1 so 2 powers = 1x bonus, 3 powers = 2x bonus, etc.
      // MAX_COMBO_COUNT - 1 caps the bonus levels (e.g., if max is 5, cap at 4 bonus levels)
      let comboMultiplier = 1;
      const playerHasCombo = hasComboMechanic(player);

      if (playerHasCombo && player.comboCount >= 2) {
        comboMultiplier = 1 + (Math.min(player.comboCount - 1, COMBAT_BALANCE.MAX_COMBO_COUNT - 1) * COMBAT_BALANCE.COMBO_DAMAGE_BONUS_PER_LEVEL);
        if (comboMultiplier > 1) {
          logs.push(`${player.comboCount}x COMBO! (+${Math.floor((comboMultiplier - 1) * 100)}% damage)`);
        }
      }

      // Save path resource current value BEFORE deduction for damage calculation
      // This ensures Arcane Charges damage bonus uses the value before spending
      const pathResourceCurrentBeforeDeduction = player.pathResource?.current ?? 0;

      // Deduct resource cost (HP, Mana, or Path Resource)
      if (useHpForMana) {
        const hpCost = Math.floor(effectiveManaCost * 0.5);
        const hpCostResult = applyDamageToPlayer(player, hpCost, 'hp_cost', { minHealth: 1 });
        player = hpCostResult.player;
        logs.push(`Reckless Fury: Paid ${hpCostResult.actualDamage} HP for ${power.name}`);
      } else if (usesPathResource && player.pathResource) {
        // Deduct from path resource
        const resourceName = getResourceDisplayName(player.pathResource.type);
        player.pathResource = {
          ...player.pathResource,
          current: player.pathResource.current - effectiveManaCost,
        };
        // Log cost reduction if applicable
        if (powerMods.costReduction > 0 || (pathResource?.thresholds?.some(t => pathResource.current >= t.value && t.effect.type === 'cost_reduction'))) {
          logs.push(`Cost reduced: ${power.manaCost} → ${effectiveManaCost} ${resourceName}`);
        }
        // Generate resource on power use if applicable
        const onPowerUseGen = player.pathResource.generation.onPowerUse ?? 0;
        if (onPowerUseGen > 0) {
          player.pathResource = {
            ...player.pathResource,
            current: Math.min(player.pathResource.max, player.pathResource.current + onPowerUseGen),
          };
          logs.push(`+${onPowerUseGen} ${resourceName} from power use`);
        }
      } else {
        player.currentStats.mana -= effectiveManaCost;
        // Log mana cost reduction if applicable
        if (powerMods.costReduction > 0) {
          logs.push(`Efficient Casting: ${power.manaCost} → ${effectiveManaCost} mana`);
        }
      }

      // Set cooldown - subtract one tick worth immediately so the countdown starts right away
      // This prevents the visual "pause" before the cooldown bar starts moving
      const cooldownSpeed = 1.0; // Constant cooldown speed (stat removed)
      const initialTickReduction = (COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL / 1000) * cooldownSpeed * prev.combatSpeed;

      // Get path playstyle cooldown modifier (Phase 2)
      // Active paths: 0.6x cooldowns (40% faster), Passive paths: 2.0x cooldowns (slower)
      const pathCooldownModifiers = getPathPlaystyleModifiers(player);

      player.powers = player.powers.map((p: Power, i: number) => {
        if (i !== powerIndex) return p;

        // Apply cooldown modifier with minimum floor
        const modifiedCooldown = p.cooldown * pathCooldownModifiers.cooldownMultiplier;
        const effectiveCooldown = Math.max(COOLDOWN_FLOOR_SECONDS, modifiedCooldown);

        return { ...p, currentCooldown: Math.max(0, effectiveCooldown - initialTickReduction) };
      });

      logs.push(`${power.icon} Used ${power.name}!`);

      // Process ON_POWER_CAST item effects (pass mana cost as damage parameter for refund effects)
      const powerCastResult = processItemEffects({
        trigger: ITEM_EFFECT_TRIGGER.ON_POWER_CAST,
        player,
        damage: power.manaCost,
      });
      Object.assign(player, powerCastResult.player);
      logs.push(...powerCastResult.logs);

      // Process path ability triggers: on_power_use
      const pathOnPowerResult = processTrigger('on_power_use', {
        player,
        enemy,
        powerUsed: power.id,
      });
      player.currentStats = pathOnPowerResult.player.currentStats;
      logs.push(...pathOnPowerResult.logs);

      // Apply trigger damage to enemy (on_power_use abilities, etc.)
      const powerUseTriggerResult = applyPathTriggerToEnemy(enemy, pathOnPowerResult);
      enemy = powerUseTriggerResult.enemy;
      logs.push(...powerUseTriggerResult.logs);
      applyTriggerResultToEnemy(enemy, pathOnPowerResult);

      // Shadow Dance: Next 3 attacks after using a power are guaranteed critical hits
      if (hasAbility(player, 'rogue_assassin_shadow_dance')) {
        const updatedPlayer = addAttackModifier(player, {
          effect: 'guaranteed_crit',
          remainingAttacks: 3,
          sourceName: 'Shadow Dance',
        });
        Object.assign(player, updatedPlayer);
        logs.push(`Shadow Dance: Next 3 attacks will be guaranteed critical hits!`);
      }

      // Get path playstyle modifiers for power damage scaling (Phase 2)
      // Active paths: 2.0x power damage, Passive paths: 0.5x power damage
      const pathPlaystyleModifiers = getPathPlaystyleModifiers(player);

      // Calculate path resource damage multiplier (Phase 6)
      // e.g., Archmage gets +10% per charge, Berserker gets +30% at 80+ fury
      // IMPORTANT: Use pathResourceCurrentBeforeDeduction to calculate damage BEFORE resource was spent
      let pathResourceDamageMultiplier = 1;
      if (usesPathResource && player.pathResource) {
        const damageEffects = player.pathResource.thresholds?.filter(
          t => pathResourceCurrentBeforeDeduction >= t.value && t.effect.type === 'damage_bonus'
        ) ?? [];

        // Special case for arcane charges: stacking per charge
        if (player.pathResource.type === 'arcane_charges') {
          const chargeBonus = damageEffects.find(t => t.effect.value);
          if (chargeBonus) {
            // Use the value BEFORE deduction for damage calculation
            pathResourceDamageMultiplier += (chargeBonus.effect.value ?? 0) * pathResourceCurrentBeforeDeduction;
            if (pathResourceCurrentBeforeDeduction > 0) {
              logs.push(`Arcane Charges: +${Math.floor((chargeBonus.effect.value ?? 0) * pathResourceCurrentBeforeDeduction * 100)}% spell damage`);
            }
          }
        } else {
          // Standard: add all damage bonuses (based on resource value before deduction)
          for (const threshold of damageEffects) {
            pathResourceDamageMultiplier += threshold.effect.value ?? 0;
          }
          if (pathResourceDamageMultiplier > 1) {
            const resourceName = getResourceDisplayName(player.pathResource.type);
            logs.push(`${resourceName} bonus: +${Math.floor((pathResourceDamageMultiplier - 1) * 100)}% damage`);
          }
        }
      }

      switch (power.effect) {
        case 'damage': {
          // Apply power bonus from path abilities (e.g., Lethal Momentum gives +50% power damage)
          const powerBonusMultiplier = 1 + powerMods.powerBonus;
          let baseDamage = Math.floor(player.currentStats.power * power.value * comboMultiplier * powerBonusMultiplier * pathPlaystyleModifiers.powerDamageMultiplier * pathResourceDamageMultiplier);

          // Apply power damage multiplier from items (e.g., Archmage's Staff)
          if (powerCastResult.powerDamageMultiplier) {
            baseDamage = Math.floor(baseDamage * powerCastResult.powerDamageMultiplier);
          }

          let totalDamage = 0;

          // Handle category-specific mechanics
          if (power.category === 'burst') {
            // Multi-hit powers - divide damage across hits and proc on-hit effects
            const hitCount = power.id === 'fan-of-knives' ? 5 : 3;
            const damagePerHit = Math.floor(baseDamage / hitCount);
            let hitsConnected = 0;

            for (let i = 0; i < hitCount; i++) {
              // Each hit can crit independently
              let hitDamage = damagePerHit;

              // Process ON_HIT item effects for each hit
              const hitResult = processItemEffects({
                trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
                player,
                damage: hitDamage,
                enemy,
              });
              Object.assign(player, hitResult.player);
              logs.push(...hitResult.logs);

              // Add any additional damage from on-hit effects
              hitDamage += hitResult.additionalDamage;

              const burstHitResult = applyDamageToEnemy(enemy, hitDamage, 'power');
              enemy = burstHitResult.enemy;
              if (burstHitResult.blocked) {
                logs.push(...burstHitResult.logs);
              } else {
                totalDamage += burstHitResult.actualDamage;
                hitsConnected++;
              }
            }
            if (hitsConnected > 0) {
              logs.push(`Dealt ${totalDamage} damage in ${hitsConnected} hits!`);
            }
          } else if (power.category === 'execute') {
            // Execute powers - bonus damage vs low HP enemies
            const hpPercent = enemy.health / enemy.maxHealth;
            let executeThreshold = 0.25;
            let executeMultiplier = 2;

            if (power.id === 'coup-de-grace') {
              executeThreshold = 0.30;
              executeMultiplier = 250 / 80; // 250% damage vs 80% base
            }

            if (hpPercent < executeThreshold) {
              baseDamage = Math.floor(baseDamage * executeMultiplier);
              logs.push(`EXECUTE! Enemy below ${Math.floor(executeThreshold * 100)}% HP!`);
            }

            const executeDamageResult = applyDamageToEnemy(enemy, baseDamage, 'power');
            enemy = executeDamageResult.enemy;
            if (executeDamageResult.blocked) {
              logs.push(...executeDamageResult.logs);
            } else {
              totalDamage = baseDamage;
              logs.push(`Dealt ${totalDamage} damage!`);
            }
          } else if (power.category === 'sacrifice') {
            // Sacrifice powers - spend HP for damage
            const hpCostPercent = power.id === 'reckless-swing' ? 0.15 : 0.20;
            const hpCost = Math.floor(player.currentStats.maxHealth * hpCostPercent);
            const sacrificeResult = applyDamageToPlayer(player, hpCost, 'hp_cost', { minHealth: 1 });
            player = sacrificeResult.player;
            logs.push(`Sacrificed ${sacrificeResult.actualDamage} HP!`);

            const sacrificeDamageResult = applyDamageToEnemy(enemy, baseDamage, 'power');
            enemy = sacrificeDamageResult.enemy;
            if (sacrificeDamageResult.blocked) {
              logs.push(...sacrificeDamageResult.logs);
            } else {
              totalDamage = baseDamage;
              logs.push(`Dealt ${totalDamage} damage!`);
            }
          } else {
            // Strike and other damage powers
            const strikeDamageResult = applyDamageToEnemy(enemy, baseDamage, 'power');
            enemy = strikeDamageResult.enemy;
            if (strikeDamageResult.blocked) {
              logs.push(...strikeDamageResult.logs);
            } else {
              totalDamage = baseDamage;
              logs.push(`Dealt ${totalDamage} magical damage!`);
            }
          }

          // Process path ability triggers: on_combo (for power-based combos like Elemental Convergence)
          // This must happen AFTER base damage is calculated
          const onComboResult = processTrigger('on_combo', {
            player,
            enemy,
            damage: totalDamage,
            powerUsed: power.id,
          });
          player.currentStats = onComboResult.player.currentStats;

          // Apply combo bonus damage if any
          if (onComboResult.damageAmount && onComboResult.damageAmount > 0) {
            const comboDamageResult = applyDamageToEnemy(enemy, onComboResult.damageAmount, 'path_ability');
            enemy = comboDamageResult.enemy;
            totalDamage += comboDamageResult.actualDamage;
            logs.push(...onComboResult.logs);

            // Reset combo count after combo triggers
            player.comboCount = 0;
          }

          const damage = totalDamage;

          // Check if enemy will die from this hit
          const enemyWillDie = enemy.health <= 0;

          // Emit power event for animation (with powerId for special effects)
          const powerHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / prev.combatSpeed);
          const playerPowerEvent: import('@/hooks/useBattleAnimation').PlayerPowerEvent = {
            type: COMBAT_EVENT_TYPE.PLAYER_POWER,
            powerId: power.id,
            damage: damage,
            isCrit: comboMultiplier > 1, // Treat combo as crit for visual effect
            timestamp: Date.now(),
            id: generateEventId(),
          };
          setLastCombatEvent(playerPowerEvent);

          // Schedule enemy hit event with targetDied flag
          const enemyHitEvent: import('@/hooks/useBattleAnimation').EnemyHitEvent = {
            type: COMBAT_EVENT_TYPE.ENEMY_HIT,
            damage: damage,
            isCrit: comboMultiplier > 1,
            timestamp: Date.now(),
            id: generateEventId(),
            targetDied: enemyWillDie,
          };
          scheduleCombatEvent(enemyHitEvent, powerHitDelay);

          // Vampiric touch heals
          if (power.id === 'vampiric-touch') {
            const heal = Math.floor(damage * POWER_BALANCE.VAMPIRIC_HEAL_RATIO);
            const healResult = restorePlayerHealth(player, heal, { source: 'Vampiric Touch' });
            player = healResult.player;
            if (healResult.log) logs.push(healResult.log);
          }
          break;
        }
        case 'heal': {
          if (power.id === 'blood-pact') {
            // Sacrifice power - spend HP to restore mana
            const hpCostPercent = 0.20;
            const hpCost = Math.floor(player.currentStats.maxHealth * hpCostPercent);
            const sacrificeResult = applyDamageToPlayer(player, hpCost, 'hp_cost', { minHealth: 1 });
            player = sacrificeResult.player;
            logs.push(`Sacrificed ${sacrificeResult.actualDamage} HP!`);

            const manaRestored = power.value; // Flat 50 mana
            const manaResult = restorePlayerMana(player, manaRestored, { source: 'Blood Pact' });
            player = manaResult.player;
            if (manaResult.log) logs.push(manaResult.log);
          } else if (power.id === 'mana-surge') {
            const manaRestored = Math.floor(player.currentStats.maxMana * power.value);
            const manaResult = restorePlayerMana(player, manaRestored, { source: 'Mana Surge' });
            player = manaResult.player;
            if (manaResult.log) logs.push(manaResult.log);
          } else {
            const heal = Math.floor(player.currentStats.maxHealth * power.value);
            const healResult = restorePlayerHealth(player, heal, { source: power.name });
            player = healResult.player;
            if (healResult.log) logs.push(healResult.log);
          }
          break;
        }
        case 'buff': {
          // Create temporary buff with duration
          const buffDuration = COMBAT_BALANCE.DEFAULT_BUFF_DURATION;

          if (power.id === 'battle-cry') {
            // Power buff
            player.activeBuffs.push({
              id: `buff-power-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.POWER,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Attack increased by ${Math.floor(power.value * 100)}% for ${buffDuration} turns!`);
          } else if (power.id === 'shield-wall') {
            // Armor buff
            player.activeBuffs.push({
              id: `buff-armor-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.ARMOR,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Defense doubled for ${buffDuration} turns!`);
          } else if (power.id === 'inner-focus') {
            // Fortune buff
            player.activeBuffs.push({
              id: `buff-fortune-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.FORTUNE,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Fortune increased by ${Math.floor(power.value * 100)}% for ${buffDuration} turns!`);
          } else {
            // Generic power buff for unknown buff powers
            player.activeBuffs.push({
              id: `buff-generic-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.POWER,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Stats boosted for ${buffDuration} turns!`);
          }

          // Recalculate stats with new buff
          player.currentStats = calculateStats(player);
          break;
        }
        case 'debuff': {
          // Control powers - apply status effects to enemy
          if (power.category === 'control') {
            let statusApplied = false;

            if (power.id === 'frost-nova') {
              // Deal damage first
              const damage = Math.floor(player.currentStats.power * power.value * comboMultiplier);
              const frostResult = applyDamageToEnemy(enemy, damage, 'power');
              enemy = frostResult.enemy;
              if (frostResult.blocked) {
                logs.push(...frostResult.logs);
              } else {
                logs.push(`Dealt ${damage} frost damage!`);
              }

              // Apply slow effect
              const slowResult = applyStatusToEnemy(
                enemy,
                { type: STATUS_EFFECT_TYPE.SLOW, value: 0.3, duration: 4 },
                'power'
              );
              enemy = slowResult.enemy;
              logs.push(...slowResult.logs);
              statusApplied = true;
            } else if (power.id === 'stunning-blow') {
              // Deal damage first
              const damage = Math.floor(player.currentStats.power * power.value * comboMultiplier);
              const stunBlowResult = applyDamageToEnemy(enemy, damage, 'power');
              enemy = stunBlowResult.enemy;
              if (stunBlowResult.blocked) {
                logs.push(...stunBlowResult.logs);
              } else {
                logs.push(`Dealt ${damage} damage!`);
              }

              // 40% chance to stun
              const stunChance = 0.4;
              if (Math.random() < stunChance) {
                const stunResult = applyStatusToEnemy(
                  enemy,
                  { type: STATUS_EFFECT_TYPE.STUN, duration: 2 },
                  'power'
                );
                enemy = stunResult.enemy;
                logs.push(...stunResult.logs);
                statusApplied = true;
              } else {
                logs.push(`Stun failed!`);
              }
            }

            // Process path ability triggers: on_status_inflict (when status was successfully applied)
            if (statusApplied) {
              const onStatusInflictResult = processTrigger('on_status_inflict', {
                player,
                enemy,
              });
              player.currentStats = onStatusInflictResult.player.currentStats;

              // Apply any heal/damage/mana from on_status_inflict
              if (onStatusInflictResult.healAmount) {
                const healResult = restorePlayerHealth(player, onStatusInflictResult.healAmount);
                player = healResult.player;
              }
              if (onStatusInflictResult.manaRestored) {
                const manaResult = restorePlayerMana(player, onStatusInflictResult.manaRestored);
                player = manaResult.player;
              }

              // Apply trigger damage to enemy (on_status_inflict abilities, etc.)
              const statusInflictTriggerResult = applyPathTriggerToEnemy(enemy, onStatusInflictResult);
              enemy = statusInflictTriggerResult.enemy;
              logs.push(...statusInflictTriggerResult.logs);

              // Apply results to enemy (status effects, debuffs)
              applyTriggerResultToEnemy(enemy, onStatusInflictResult);

              // Only add logs if there were actual effects
              if (onStatusInflictResult.logs.length > 0) {
                logs.push(...onStatusInflictResult.logs);
              }
            }
          }
          break;
        }
      }

      // Check if enemy died from power - mark as dying, don't remove
      // Use ref for atomic check to prevent race conditions from async setState
      if (enemy.health <= 0 && enemyDeathProcessedRef.current !== enemy.id) {
        enemyDeathProcessedRef.current = enemy.id;
        enemy.isDying = true;

        // Apply fortune-based gold bonus
        const dropQualityBonus = getDropQualityBonus(player.currentStats.fortune);
        const bonusGold = Math.floor(enemy.goldReward * dropQualityBonus);

        player.experience += enemy.experienceReward;
        player.gold += bonusGold;

        const bonusText = dropQualityBonus > 0 ? ` (+${Math.floor(dropQualityBonus * 100)}% fortune bonus)` : '';
        logs.push(`${enemy.name} defeated! +${enemy.experienceReward} XP, +${bonusGold} gold${bonusText}`);

        // Process level-ups (handles multiple level-ups if enough XP)
        const levelUpResult = processLevelUp(player);
        player.experience = levelUpResult.updatedPlayer.experience;
        player.level = levelUpResult.updatedPlayer.level;
        player.experienceToNext = levelUpResult.updatedPlayer.experienceToNext;
        player.baseStats = levelUpResult.updatedPlayer.baseStats;
        logs.push(...levelUpResult.levelUpLogs);

        player.currentStats = calculateStats(player);

        // Determine pause reason if level-up occurred
        const newPauseReason = levelUpResult.leveledUp ? PAUSE_REASON.LEVEL_UP : null;

        // Keep enemy in state with isDying flag - animation system will remove it
        safeCombatLogAdd(prev.combatLog, logs, 'usePower:enemyDeath');
        return {
          ...prev,
          player,
          currentEnemy: enemy,
          // If leveled up, set pending level up and pause (same as regular attack flow)
          pendingLevelUp: levelUpResult.leveledUp ? player.level : prev.pendingLevelUp,
          isPaused: newPauseReason !== null,
          pauseReason: newPauseReason,
        };
      }

      safeCombatLogAdd(prev.combatLog, logs, 'usePower:complete');
      return {
        ...prev,
        player,
        currentEnemy: enemy,
      };
    });
  }, [setState, setLastCombatEvent, scheduleCombatEvent, enemyDeathProcessedRef, processTrigger, hasAbility, addAttackModifier, getPowerModifiers, hasComboMechanic]);

  return {
    usePower,
  };
}
