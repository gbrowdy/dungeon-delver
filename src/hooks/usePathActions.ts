import { useCallback } from 'react';
import { GameState, Player } from '@/types/game';
import { PathDefinition, PathAbility, PlayerPath } from '@/types/paths';
import { GAME_PHASE } from '@/constants/enums';
import { deepClonePlayer } from '@/utils/stateUtils';
import { PATH_SELECTION_BONUSES } from '@/constants/paths';

// Import path data for all classes
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';

interface UsePathActionsOptions {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

/**
 * Hook for path system actions: path selection, ability choices, subpath selection.
 *
 * Handles:
 * - Path selection at level 2
 * - Ability choices at levels 3, 4, 5, 6
 * - Subpath selection at level 4
 */
export function usePathActions({ setState }: UsePathActionsOptions) {
  /**
   * Get all paths for a given character class
   */
  const getPathsForClass = useCallback((characterClass: string): PathDefinition[] => {
    switch (characterClass) {
      case 'warrior':
        return [WARRIOR_PATHS.berserker, WARRIOR_PATHS.guardian];
      case 'mage':
        return MAGE_PATHS;
      case 'rogue':
        return ROGUE_PATHS;
      case 'paladin':
        return PALADIN_PATHS;
      default:
        return [];
    }
  }, []);

  /**
   * Get a specific path definition by ID
   */
  const getPathById = useCallback((pathId: string): PathDefinition | null => {
    const allPaths: PathDefinition[] = [
      ...Object.values(WARRIOR_PATHS),
      ...MAGE_PATHS,
      ...ROGUE_PATHS,
      ...PALADIN_PATHS,
    ];
    return allPaths.find(p => p.id === pathId) || null;
  }, []);

  /**
   * Get 2 random abilities for player to choose from
   * Filters out already chosen abilities and abilities above player level
   */
  const getAbilityChoices = useCallback((
    player: Player,
    pathDef: PathDefinition
  ): [PathAbility, PathAbility] | null => {
    // Filter abilities based on:
    // - Not already chosen
    // - Level requirement met
    // - Not capstone unless player is level 6+
    const availableAbilities = pathDef.abilities.filter((ability) => {
      // Check if already chosen
      if (player.path?.abilities.includes(ability.id)) {
        return false;
      }

      // Check level requirement
      if (ability.levelRequired > player.level) {
        return false;
      }

      // Capstones only at level 6+
      if (ability.isCapstone && player.level < 6) {
        return false;
      }

      // If player has a subpath, only offer abilities from that subpath (or general abilities)
      if (player.path?.subpathId && ability.subpath) {
        return ability.subpath === player.path.subpathId;
      }

      return true;
    });

    // Need at least 2 abilities to choose from
    if (availableAbilities.length < 2) {
      return null;
    }

    // Randomly select 2 abilities
    const shuffled = [...availableAbilities].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  }, []);

  /**
   * Select a path at level 2
   */
  const selectPath = useCallback((pathId: string) => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;
      if (prev.player.level !== 2) {
        console.warn('Path selection only available at level 2');
        return prev;
      }

      const updatedPlayer = deepClonePlayer(prev.player);
      updatedPlayer.path = {
        pathId,
        abilities: [],
      };

      // Apply immediate stat bonuses from path selection
      const bonus = PATH_SELECTION_BONUSES[pathId];
      if (bonus) {
        // Apply each bonus stat to current stats
        if (bonus.power !== undefined) {
          updatedPlayer.currentStats.power += bonus.power;
        }
        if (bonus.armor !== undefined) {
          updatedPlayer.currentStats.armor += bonus.armor;
        }
        if (bonus.speed !== undefined) {
          updatedPlayer.currentStats.speed += bonus.speed;
        }
        if (bonus.fortune !== undefined) {
          updatedPlayer.currentStats.fortune += bonus.fortune;
        }
        // Apply maxHealth and health together
        if (bonus.maxHealth !== undefined) {
          updatedPlayer.currentStats.maxHealth += bonus.maxHealth;
          updatedPlayer.currentStats.health += bonus.maxHealth;
        }
        // Apply maxMana and mana together
        if (bonus.maxMana !== undefined) {
          updatedPlayer.currentStats.maxMana += bonus.maxMana;
          updatedPlayer.currentStats.mana += bonus.maxMana;
        }
      }

      // Transition to combat phase
      return {
        ...prev,
        player: updatedPlayer,
        gamePhase: GAME_PHASE.COMBAT,
      };
    });
  }, [setState]);

  /**
   * Select an ability at level-up
   */
  const selectAbility = useCallback((abilityId: string) => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.player.path) return prev;

      const updatedPlayer = deepClonePlayer(prev.player);

      // Add ability to player's chosen abilities
      if (!updatedPlayer.path) return prev;
      updatedPlayer.path.abilities = [...updatedPlayer.path.abilities, abilityId];

      // Clear pending ability choice flag
      updatedPlayer.pendingAbilityChoice = false;

      return {
        ...prev,
        player: updatedPlayer,
        // Unpause the game after ability selection
        isPaused: false,
        pauseReason: null,
      };
    });
  }, [setState]);

  /**
   * Select a subpath at level 4
   */
  const selectSubpath = useCallback((subpathId: string) => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.player.path) return prev;
      if (prev.player.level !== 4) {
        console.warn('Subpath selection only available at level 4');
        return prev;
      }

      const updatedPlayer = deepClonePlayer(prev.player);
      if (!updatedPlayer.path) return prev;

      updatedPlayer.path.subpathId = subpathId;

      return {
        ...prev,
        player: updatedPlayer,
      };
    });
  }, [setState]);

  /**
   * Trigger path selection screen when player reaches level 2
   */
  const checkForPathSelection = useCallback((player: Player): boolean => {
    return player.level === 2 && player.path === null;
  }, []);

  /**
   * Trigger ability choice when player levels up (after path selected)
   */
  const checkForAbilityChoice = useCallback((player: Player, pathDef: PathDefinition | null): boolean => {
    // Only offer ability choice if:
    // - Player has a path
    // - Player is level 3+ (abilities start at level 3)
    // - Not already pending (to avoid duplicates)
    if (!player.path || player.level < 3 || player.pendingAbilityChoice) {
      return false;
    }

    // Check if there are available abilities to choose from
    if (!pathDef) return false;

    const choices = getAbilityChoices(player, pathDef);
    return choices !== null;
  }, [getAbilityChoices]);

  return {
    selectPath,
    selectAbility,
    selectSubpath,
    getPathsForClass,
    getPathById,
    getAbilityChoices,
    checkForPathSelection,
    checkForAbilityChoice,
  };
}
