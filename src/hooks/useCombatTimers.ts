import { useEffect } from 'react';
import { GameState, Power } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Hook for managing time-based combat effects: power cooldowns.
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
