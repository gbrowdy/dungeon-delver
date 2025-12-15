import { useEffect } from 'react';
import { GameState, Power } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';
import { COMBAT_MECHANICS } from '@/constants/game';
import { deepCloneEnemy, deepClonePlayer } from '@/utils/stateUtils';

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

        prev.combatLog.add(`💚 ${enemy.name} regenerates ${regenAmount} HP!`);

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
          prev.combatLog.add(`${d.sourceName} effect on enemy expired`);
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
        const tickSeconds = (COOLDOWN_TICK_INTERVAL / 1000) * prev.combatSpeed;

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
  }, [enabled, setState]);

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
  useEffect(() => {
    if (!enabled) return;

    const SHIELD_TICK_INTERVAL = COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL; // 100ms

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const player = prev.player;

        // Check if player has an active shield
        if (!player.shieldRemainingDuration || player.shieldRemainingDuration <= 0) return prev;

        // Calculate shield duration reduction per tick
        // COOLDOWN_TICK_INTERVAL is in ms, we want to reduce by (tickInterval/1000) seconds
        // Also scale with combat speed so shields expire faster at higher speeds
        const tickSeconds = (SHIELD_TICK_INTERVAL / 1000) * prev.combatSpeed;

        const updatedPlayer = deepClonePlayer(player);
        updatedPlayer.shieldRemainingDuration -= tickSeconds;

        if (updatedPlayer.shieldRemainingDuration <= 0) {
          updatedPlayer.shield = 0;
          updatedPlayer.shieldRemainingDuration = 0;
          prev.combatLog.add('🛡️ Shield expired');
        }

        return {
          ...prev,
          player: updatedPlayer,
        };
      });
    }, SHIELD_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);
}
