import { useEffect } from 'react';
import { GameState, Power } from '@/types/game';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Hook for managing time-based combat effects: HP/MP regeneration and power cooldowns.
 *
 * These effects tick independently of attack timing and scale with combat speed.
 * This is separated from the main game state hook for better organization and testability.
 */
export function useCombatTimers(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  enabled: boolean
) {
  // Smooth HP and MP regeneration - independent of attack timing
  // Uses player's hpRegen and mpRegen stats (per second), scales with combat speed
  useEffect(() => {
    if (!enabled) return;

    const REGEN_INTERVAL = 500; // Check every 500ms (half second)

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const { currentStats } = prev.player;
        const { health, maxHealth, mana, maxMana, hpRegen, mpRegen } = currentStats;

        // Check if any regen is needed
        const needsHpRegen = hpRegen > 0 && health < maxHealth;
        const needsMpRegen = mpRegen > 0 && mana < maxMana;

        if (!needsHpRegen && !needsMpRegen) return prev;

        // Calculate regen amounts (half the per-second rate since we tick every 500ms)
        // Scale by combat speed so regen feels consistent with game pace
        const hpRegenAmount = needsHpRegen ? (hpRegen / 2) * prev.combatSpeed : 0;
        const mpRegenAmount = needsMpRegen ? (mpRegen / 2) * prev.combatSpeed : 0;

        // Skip setState if the amounts are negligible (optimization)
        if (hpRegenAmount === 0 && mpRegenAmount === 0) return prev;

        const newHealth = Math.min(maxHealth, health + hpRegenAmount);
        const newMana = Math.min(maxMana, mana + mpRegenAmount);

        // Skip setState if values haven't meaningfully changed (within 0.01)
        if (Math.abs(newHealth - health) < 0.01 && Math.abs(newMana - mana) < 0.01) {
          return prev;
        }

        return {
          ...prev,
          player: {
            ...prev.player,
            currentStats: {
              ...currentStats,
              health: newHealth,
              mana: newMana,
            },
          },
        };
      });
    }, REGEN_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, setState]);

  // Time-based power cooldown ticker - independent of turns
  // Cooldowns tick down in real-time, affected by player's cooldownSpeed stat
  useEffect(() => {
    if (!enabled) return;

    const COOLDOWN_TICK_INTERVAL = COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL; // 100ms

    const interval = setInterval(() => {
      setState((prev: GameState) => {
        if (!prev.player || prev.isPaused) return prev;

        const { powers, currentStats } = prev.player;
        const cooldownSpeed = currentStats.cooldownSpeed || COMBAT_BALANCE.BASE_COOLDOWN_SPEED;

        // Check if any powers are on cooldown
        const hasCooldowns = powers.some((p: Power) => p.currentCooldown > 0);
        if (!hasCooldowns) return prev;

        // Calculate cooldown reduction per tick
        // COOLDOWN_TICK_INTERVAL is in ms, we want to reduce by (tickInterval/1000) * cooldownSpeed seconds
        // Also scale with combat speed so cooldowns recover faster at higher speeds
        const tickSeconds = (COOLDOWN_TICK_INTERVAL / 1000) * cooldownSpeed * prev.combatSpeed;

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
