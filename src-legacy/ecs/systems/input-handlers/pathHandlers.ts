// src/ecs/systems/input-handlers/pathHandlers.ts
/**
 * Handlers for path system commands: path selection, abilities, stances, powers, upgrades.
 */

import type { Command } from '../../commands';
import type { Entity } from '../../components';
import type { CommandHandler } from './types';
import type { StanceEnhancement } from '@/types/paths';
import { world } from '../../world';
import { getPathResource, PATH_RESOURCES } from '@/data/pathResources';
import { getPathById } from '@/utils/pathUtils';
import { getStancesForPath, getDefaultStanceId } from '@/data/stances';
import { computeAllEffectivePowers } from '@/utils/powerUpgrades';
import { computeEffectiveStanceEffects } from '@/utils/stanceUtils';
import {
  initializePassiveEffectState,
  recomputePassiveEffects,
} from '../passive-effect';

type SelectPathCommand = Extract<Command, { type: 'SELECT_PATH' }>;
type SelectAbilityCommand = Extract<Command, { type: 'SELECT_ABILITY' }>;
type SelectSubpathCommand = Extract<Command, { type: 'SELECT_SUBPATH' }>;
type SwitchStanceCommand = Extract<Command, { type: 'SWITCH_STANCE' }>;
type SelectPowerCommand = Extract<Command, { type: 'SELECT_POWER' }>;
type UpgradePowerCommand = Extract<Command, { type: 'UPGRADE_POWER' }>;
type SelectStanceEnhancementCommand = Extract<Command, { type: 'SELECT_STANCE_ENHANCEMENT' }>;

/**
 * Recompute effectivePowers after power changes or upgrades
 */
export function recomputeEffectivePowers(player: Entity): void {
  player.effectivePowers = computeAllEffectivePowers(player);
}

/**
 * Recompute effectiveStanceEffects after stance changes
 */
export function recomputeEffectiveStanceEffects(player: Entity): void {
  player.effectiveStanceEffects = computeEffectiveStanceEffects(player);
}

export const handleSelectPath: CommandHandler<SelectPathCommand> = (cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!player || !gameState) return;

  // Get the path definition to check if it's active
  const pathDef = getPathById(cmd.pathId);

  // Store the selected path on player
  // IMPORTANT: Use 'path' field (not 'pathProgress') - this is what the snapshot system reads
  player.path = {
    pathId: cmd.pathId,
    subpathId: undefined,
    abilities: [],
    abilityCooldowns: {}, // Initialize cooldowns map
  };

  // Initialize pathProgression based on path type
  if (pathDef?.type === 'active') {
    player.pathProgression = {
      pathId: cmd.pathId,
      pathType: 'active',
      powerUpgrades: [],
    };
  } else if (pathDef?.type === 'passive') {
    let stanceProgression: import('@/types/paths').StanceProgressionState;

    if (cmd.pathId === 'guardian') {
      stanceProgression = {
        ironTier: 0,
        retributionTier: 0,
        acquiredEnhancements: [],
      };
    } else if (cmd.pathId === 'enchanter') {
      stanceProgression = {
        arcaneSurgeTier: 0,
        hexVeilTier: 0,
        acquiredEnhancements: [],
      };
    } else {
      // Default fallback for future passive paths
      stanceProgression = { acquiredEnhancements: [] };
    }

    player.pathProgression = {
      pathId: cmd.pathId,
      pathType: 'passive',
      stanceProgression,
    };
  }

  // Initialize pathResource for active paths
  if (pathDef?.type === 'active' && PATH_RESOURCES[cmd.pathId]) {
    player.pathResource = getPathResource(cmd.pathId);
  } else if (pathDef?.type === 'passive') {
    // Remove pathResource for passive paths (they use stances, not powers/resource)
    if (player.pathResource) {
      world.removeComponent(player, 'pathResource');
    }
  }

  // Initialize stance state for passive paths
  if (pathDef?.type === 'passive') {
    // Clear powers - passive paths use stances, not powers
    player.powers = [];

    const defaultStanceId = getDefaultStanceId(cmd.pathId);
    if (defaultStanceId) {
      player.stanceState = {
        activeStanceId: defaultStanceId,
        stanceCooldownRemaining: 0,
        triggerCooldowns: {},
      };
    }

    // Initialize and compute passive effects for passive paths
    initializePassiveEffectState(player);
    recomputePassiveEffects(player);
  }

  // For active paths, trigger power choice if at a power level
  if (pathDef?.type === 'active' && player.progression) {
    const currentLevel = player.progression.level;
    const isPowerLevel = [2, 4, 6, 8].includes(currentLevel);

    if (isPowerLevel) {
      let choices: import('@/types/game').Power[] = [];

      // Use the path's getPowerChoices function if available
      if (pathDef?.getPowerChoices) {
        choices = pathDef.getPowerChoices(currentLevel);
      }

      if (choices.length > 0) {
        world.addComponent(player, 'pendingPowerChoice', {
          level: currentLevel,
          choices,
        });
        // Pause combat while player makes their power choice
        gameState.paused = true;
      }
    }
  }

  // Transition back to combat
  gameState.phase = 'combat';
};

export const handleSelectAbility: CommandHandler<SelectAbilityCommand> = (cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!player?.path || !gameState) return;
  // Add ability to unlocked list
  if (!player.path.abilities.includes(cmd.abilityId)) {
    player.path.abilities.push(cmd.abilityId);
  }
  // Transition back to combat
  gameState.phase = 'combat';
};

export const handleSelectSubpath: CommandHandler<SelectSubpathCommand> = (cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!player?.path || !gameState) return;
  player.path.subpathId = cmd.subpathId;
  // Transition back to combat
  gameState.phase = 'combat';
};

export const handleSwitchStance: CommandHandler<SwitchStanceCommand> = (cmd, ctx) => {
  const { player } = ctx;
  if (!player?.stanceState || !player.path) return;

  // Check if on cooldown
  if (player.stanceState.stanceCooldownRemaining > 0) return;

  // Check if switching to same stance
  if (player.stanceState.activeStanceId === cmd.stanceId) return;

  // Get stance definition to validate and get cooldown
  const stances = getStancesForPath(player.path.pathId);
  const newStance = stances.find((s) => s.id === cmd.stanceId);
  if (!newStance) return;

  // Switch stance and set cooldown
  player.stanceState.activeStanceId = cmd.stanceId;
  player.stanceState.stanceCooldownRemaining = newStance.switchCooldown;

  // Recompute effective stance effects after switching
  recomputeEffectiveStanceEffects(player);

  // Recompute passive effects for new stance
  if (player.passiveEffectState) {
    recomputePassiveEffects(player);
  }
};

export const handleSelectPower: CommandHandler<SelectPowerCommand> = (cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!player?.pendingPowerChoice || !gameState) return;

  const selectedPower = player.pendingPowerChoice.choices.find((p) => p.id === cmd.powerId);
  if (!selectedPower) return;

  // Remove starting power (Strike/Zap/Slash/Smite) - they have id starting with 'basic-'
  const powersWithoutStarter = (player.powers ?? []).filter((p) => !p.id.startsWith('basic-'));

  // Add new power to player's powers array
  player.powers = [...powersWithoutStarter, selectedPower];

  // Initialize power upgrade tracking if pathProgression exists
  if (player.pathProgression?.powerUpgrades) {
    player.pathProgression.powerUpgrades.push({
      powerId: selectedPower.id,
      currentTier: 0,
    });
  }

  // Clear pending choice
  world.removeComponent(player, 'pendingPowerChoice');

  // Unpause combat now that choice is made
  gameState.paused = false;

  // Recompute effective powers with new power
  recomputeEffectivePowers(player);
};

export const handleUpgradePower: CommandHandler<UpgradePowerCommand> = (cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!player?.pendingUpgradeChoice || !gameState) return;

  // Verify the power is in the upgrade choices
  if (!player.pendingUpgradeChoice.powerIds.includes(cmd.powerId)) return;

  // Find and upgrade the power if pathProgression exists
  if (player.pathProgression?.powerUpgrades) {
    const powerState = player.pathProgression.powerUpgrades.find((p) => p.powerId === cmd.powerId);
    if (powerState && powerState.currentTier < 2) {
      powerState.currentTier = (powerState.currentTier + 1) as 0 | 1 | 2;
    }
  }

  // Clear pending choice
  world.removeComponent(player, 'pendingUpgradeChoice');

  // Unpause combat now that choice is made
  gameState.paused = false;

  // Recompute effective powers with upgraded stats
  recomputeEffectivePowers(player);
};

export const handleSelectStanceEnhancement: CommandHandler<SelectStanceEnhancementCommand> = (
  cmd,
  ctx
) => {
  const { player, gameState } = ctx;
  if (!player?.pendingStanceEnhancement || !gameState) return;

  const pending = player.pendingStanceEnhancement;
  const stanceState = player.pathProgression?.stanceProgression;
  if (!stanceState) return;

  let enhancement: StanceEnhancement;

  if (pending.pathId === 'guardian') {
    enhancement =
      cmd.stanceId === 'iron' ? pending.ironChoice : pending.retributionChoice;

    // Update stance tier
    if (cmd.stanceId === 'iron') {
      stanceState.ironTier = enhancement.tier;
    } else {
      stanceState.retributionTier = enhancement.tier;
    }
  } else {
    // Enchanter path uses arcane_surge/hex_veil
    enhancement =
      cmd.stanceId === 'arcane_surge' ? pending.arcaneSurgeChoice : pending.hexVeilChoice;

    // Update stance tier
    if (cmd.stanceId === 'arcane_surge') {
      stanceState.arcaneSurgeTier = enhancement.tier;
    } else {
      stanceState.hexVeilTier = enhancement.tier;
    }
  }

  // Track acquired enhancement
  stanceState.acquiredEnhancements.push(enhancement.id);

  // Clear pending choice
  world.removeComponent(player, 'pendingStanceEnhancement');

  // Unpause combat now that choice is made
  gameState.paused = false;

  // Recompute effective stance effects with new enhancement
  recomputeEffectiveStanceEffects(player);

  // Recompute passive effects with new enhancement
  if (player.passiveEffectState) {
    recomputePassiveEffects(player);
  }
};
