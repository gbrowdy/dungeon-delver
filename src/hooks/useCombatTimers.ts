import { useEffect } from 'react';
import { GameState, Power } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';
import { deepCloneEnemy } from '@/utils/stateUtils';

/**
 * Hook for managing time-based combat effects: power cooldowns and enemy regen.
 *
 * These effects tick independently of attack timing and scale with combat speed.
 * This is separated from the main game state hook for better organization and testability.
 *
 * Note: HP/MP regeneration removed - will be added via path abilities later.
 */
export function useCombatTimers(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  enabled: boolean
) {
  // HP and MP regeneration disabled for now - will be added via path abilities later

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
        const tickSeconds = (COOLDOWN_TICK_INTERVAL / 1000) * 1.0 * prev.combatSpeed;

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
}
