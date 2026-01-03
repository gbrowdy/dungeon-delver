import { useEffect } from 'react';
import { GameState, Power } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';
import { COMBAT_MECHANICS } from '@/constants/game';
import { deepCloneEnemy, deepClonePlayer } from '@/utils/stateUtils';
import { safeCombatLogAdd } from '@/utils/combatLogUtils';
import { usePathAbilities } from './usePathAbilities';

/**
 * Hook for managing time-based combat effects: power cooldowns, enemy regen, and MP regen.
 *
 * These effects tick independently of attack timing and scale with combat speed.
 * This is separated from the main game state hook for better organization and testability.
 */
export function useCombatTimers(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  enabled: boolean
) {
  const { getRegenModifiers, getPowerModifiers } = usePathAbilities();

  // MP regeneration - base regen that makes powers usable
  // Ticks every second, scaled by combat speed
  useEffect(() => {
    if (!enabled) return;

    const MP_REGEN_INTERVAL = 1000; // 1 second per tick

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const { player } = prev;
        const { mana, maxMana } = player.currentStats;

        // Don't regen if already at max
        if (mana >= maxMana) return prev;

        // Base mana regen scaled by combat speed
        const regenAmount = COMBAT_MECHANICS.MANA_REGEN_PER_TICK * prev.combatSpeed;
        const newMana = Math.min(maxMana, mana + regenAmount);

        // Skip if no change
        if (newMana === mana) return prev;

        const updatedPlayer = deepClonePlayer(player);
        updatedPlayer.currentStats.mana = newMana;

        return {
          ...prev,
          player: updatedPlayer,
        };
      });
    }, MP_REGEN_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);

  // HP regeneration - includes class-based regen and path ability bonuses
  // Ticks every second, scaled by combat speed
  useEffect(() => {
    if (!enabled) return;

    const HP_REGEN_INTERVAL = 1000; // 1 second per tick

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const { player } = prev;
        const { health, maxHealth } = player.currentStats;

        // Don't regen if already at max
        if (health >= maxHealth) return prev;

        // Get base HP regen from class (e.g., Paladin has +0.5)
        const baseHpRegen = player.hpRegen || 0;

        // Get bonus HP regen from path abilities
        const regenMods = getRegenModifiers(player);
        const flatBonusHpRegen = regenMods.hpRegen;
        const percentBonusHpRegen = regenMods.hpRegenPercent; // e.g., 1.0 = +100%

        // Total HP regen per second: (base + flat) * (1 + percent)
        const baseAndFlat = baseHpRegen + flatBonusHpRegen;
        const totalHpRegenPerSecond = baseAndFlat * (1 + percentBonusHpRegen);

        // Skip if no regen
        if (totalHpRegenPerSecond <= 0) return prev;

        // Scale by combat speed
        const regenAmount = totalHpRegenPerSecond * prev.combatSpeed;
        const newHealth = Math.min(maxHealth, health + regenAmount);

        // Skip if no change
        if (newHealth === health) return prev;

        const updatedPlayer = deepClonePlayer(player);
        updatedPlayer.currentStats.health = newHealth;

        return {
          ...prev,
          player: updatedPlayer,
        };
      });
    }, HP_REGEN_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState, getRegenModifiers]);

  // Enemy regenerating modifier - heals 2% HP per tick (every 500ms)
  useEffect(() => {
    if (!enabled) return;

    const REGEN_TICK_INTERVAL = 500; // 500ms per tick

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.currentEnemy || prev.isPaused) return prev;

        const enemy = prev.currentEnemy;

        // Check if enemy has regenerating modifier
        const hasRegenerating = enemy.modifiers?.some(m => m.id === 'regenerating');
        if (!hasRegenerating) return prev;

        // Don't regen if dying
        if (enemy.isDying || enemy.health <= 0) return prev;

        const regenAmount = Math.floor(enemy.maxHealth * 0.02);
        const newHealth = Math.min(enemy.maxHealth, enemy.health + regenAmount);

        // Only update if health actually changed
        if (newHealth === enemy.health) return prev;

        const updatedEnemy = deepCloneEnemy(enemy);
        updatedEnemy.health = newHealth;

        safeCombatLogAdd(prev.combatLog, `${enemy.name} regenerates ${regenAmount} HP!`, 'useCombatTimers:enemyRegen');

        return {
          ...prev,
          currentEnemy: updatedEnemy,
        };
      });
    }, REGEN_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);

  // Enemy stat debuff tick-down - reduces duration every second
  useEffect(() => {
    if (!enabled) return;

    const DEBUFF_TICK_INTERVAL = 1000; // 1 second per tick

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.currentEnemy || prev.isPaused) return prev;

        const enemy = prev.currentEnemy;

        // No debuffs to process
        const currentDebuffs = enemy.statDebuffs;
        if (!currentDebuffs || currentDebuffs.length === 0) return prev;

        // Skip if dying
        if (enemy.isDying || enemy.health <= 0) return prev;

        // Tick down all debuff durations, remove expired ones
        const tickAmount = prev.combatSpeed; // Scale with combat speed
        const updatedDebuffs = currentDebuffs
          .map(debuff => ({
            ...debuff,
            remainingDuration: debuff.remainingDuration - tickAmount,
          }))
          .filter(debuff => debuff.remainingDuration > 0);

        // Only update if something changed
        if (updatedDebuffs.length === currentDebuffs.length) {
          // Check if any durations actually changed
          const changed = updatedDebuffs.some((d, i) =>
            d.remainingDuration !== currentDebuffs[i].remainingDuration
          );
          if (!changed) return prev;
        }

        const updatedEnemy = deepCloneEnemy(enemy);
        updatedEnemy.statDebuffs = updatedDebuffs;

        // Log when debuffs expire
        const expiredDebuffs = currentDebuffs.filter(
          d => !updatedDebuffs.some(ud => ud.id === d.id)
        );
        expiredDebuffs.forEach(d => {
          safeCombatLogAdd(prev.combatLog, `${d.sourceName} effect on enemy expired`, 'useCombatTimers:debuffExpired');
        });

        return {
          ...prev,
          currentEnemy: updatedEnemy,
        };
      });
    }, DEBUFF_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);

  // Time-based power cooldown ticker - independent of turns
  // Cooldowns tick down in real-time at constant speed (cooldownSpeed stat removed)
  useEffect(() => {
    if (!enabled) return;

    const COOLDOWN_TICK_INTERVAL = COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL; // 100ms

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const { powers } = prev.player;

        // Check if any powers are on cooldown
        const hasCooldowns = powers.some((p: Power) => p.currentCooldown > 0);
        if (!hasCooldowns) return prev;

        // Calculate cooldown reduction per tick
        // COOLDOWN_TICK_INTERVAL is in ms, we want to reduce by (tickInterval/1000) seconds
        // Also scale with combat speed so cooldowns recover faster at higher speeds
        const baseTickSeconds = (COOLDOWN_TICK_INTERVAL / 1000) * prev.combatSpeed;

        // Apply cooldown recovery bonus from path abilities (e.g., Quickcast gives 20% faster recovery)
        const powerMods = getPowerModifiers(prev.player);
        const cooldownMultiplier = 1 + powerMods.cooldownReduction; // e.g., 0.2 = 20% faster = 1.2x tick rate
        const tickSeconds = baseTickSeconds * cooldownMultiplier;

        // Update powers with reduced cooldowns
        let anyChanged = false;
        const updatedPowers = powers.map((p: Power) => {
          let newCooldown = Math.max(0, p.currentCooldown - tickSeconds);
          // Snap to 0 if very close (prevents floating point issues causing cooldown to "freeze" near 0)
          if (newCooldown > 0 && newCooldown < 0.05) {
            newCooldown = 0;
          }
          // Track if any meaningful change occurred (avoid floating point noise)
          if (Math.abs(newCooldown - p.currentCooldown) >= 0.001) {
            anyChanged = true;
          }
          return {
            ...p,
            currentCooldown: newCooldown,
          };
        });

        // Skip setState if no meaningful changes (performance optimization)
        if (!anyChanged) return prev;

        return {
          ...prev,
          player: {
            ...prev.player,
            powers: updatedPowers,
          },
        };
      });
    }, COOLDOWN_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState, getPowerModifiers]);

  // Path ability cooldown ticker - independent of turns
  // Cooldowns tick down in real-time, scaled by combat speed
  useEffect(() => {
    if (!enabled) return;

    const COOLDOWN_TICK_INTERVAL = COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL; // 100ms

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || !prev.player.path || prev.isPaused) return prev;

        const abilityCooldowns = prev.player.path.abilityCooldowns;

        // Check if any abilities are on cooldown
        if (!abilityCooldowns || Object.keys(abilityCooldowns).length === 0) return prev;

        const hasCooldowns = Object.values(abilityCooldowns).some(cd => cd > 0);
        if (!hasCooldowns) return prev;

        // Calculate cooldown reduction per tick
        // COOLDOWN_TICK_INTERVAL is in ms, we want to reduce by (tickInterval/1000) seconds
        // Also scale with combat speed so cooldowns recover faster at higher speeds
        const tickSeconds = (COOLDOWN_TICK_INTERVAL / 1000) * prev.combatSpeed;

        // Update ability cooldowns
        let anyChanged = false;
        const updatedCooldowns: Record<string, number> = {};
        Object.entries(abilityCooldowns).forEach(([abilityId, cooldown]) => {
          let newCooldown = Math.max(0, cooldown - tickSeconds);
          // Snap to 0 if very close (prevents floating point issues)
          if (newCooldown > 0 && newCooldown < 0.05) {
            newCooldown = 0;
          }
          // Track if any meaningful change occurred
          if (Math.abs(newCooldown - cooldown) >= 0.001) {
            anyChanged = true;
          }
          updatedCooldowns[abilityId] = newCooldown;
        });

        // Skip setState if no meaningful changes (performance optimization)
        if (!anyChanged) return prev;

        const updatedPlayer = deepClonePlayer(prev.player);
        updatedPlayer.path!.abilityCooldowns = updatedCooldowns;

        return {
          ...prev,
          player: updatedPlayer,
        };
      });
    }, COOLDOWN_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);

  // Shield duration tick-down - expires shields over time
  // Also ticks down buff durations (time-based, not turn-based)
  useEffect(() => {
    if (!enabled) return;

    const SHIELD_TICK_INTERVAL = COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL; // 100ms

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const player = prev.player;
        const logs: string[] = [];
        let needsUpdate = false;

        // Calculate tick amount in seconds
        const tickSeconds = (SHIELD_TICK_INTERVAL / 1000) * prev.combatSpeed;

        const updatedPlayer = deepClonePlayer(player);

        // Validate shield state consistency
        const hasShield = player.shield && player.shield > 0;
        const hasDuration = player.shieldRemainingDuration && player.shieldRemainingDuration > 0;
        if (hasShield !== hasDuration) {
          console.warn('[useCombatTimers] Inconsistent shield state:', {
            shield: player.shield,
            duration: player.shieldRemainingDuration
          });
          // Normalize state: if shield exists without duration, clear it
          if (hasShield && !hasDuration) {
            updatedPlayer.shield = 0;
            logs.push('Shield cleared (no duration)');
            needsUpdate = true;
          }
        }

        // Tick down shield duration
        if (player.shieldRemainingDuration && player.shieldRemainingDuration > 0) {
          updatedPlayer.shieldRemainingDuration -= tickSeconds;
          needsUpdate = true;

          if (updatedPlayer.shieldRemainingDuration <= 0) {
            updatedPlayer.shield = 0;
            updatedPlayer.shieldRemainingDuration = 0;
            logs.push('Shield expired');
          }
        }

        // Tick down buff durations (time-based, not turn-based)
        // NOTE: ActiveBuff.remainingTurns is a legacy field name - it now stores seconds, not turns.
        // Renaming would require changes across 12+ files. The name is kept for backwards compatibility.
        if (player.activeBuffs && player.activeBuffs.length > 0) {
          const expiredBuffs: string[] = [];

          updatedPlayer.activeBuffs = player.activeBuffs.map(buff => {
            const newRemaining = buff.remainingTurns - tickSeconds;
            if (newRemaining <= 0) {
              expiredBuffs.push(buff.name);
            }
            return { ...buff, remainingTurns: newRemaining };
          }).filter(buff => buff.remainingTurns > 0);

          // Always update when buffs are ticking (so UI shows countdown)
          needsUpdate = true;

          if (expiredBuffs.length > 0) {
            expiredBuffs.forEach(buffName => {
              logs.push(`${buffName} buff expired`);
            });
          }
        }

        // Only update if something changed
        if (!needsUpdate) return prev;

        // Add logs to combat log
        logs.forEach(log => safeCombatLogAdd(prev.combatLog, log, 'useCombatTimers:shieldTick'));

        return {
          ...prev,
          player: updatedPlayer,
        };
      });
    }, SHIELD_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);
}
