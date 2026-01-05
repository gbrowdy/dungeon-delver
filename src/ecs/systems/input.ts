// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Runs first each tick to translate user input into component changes.
 */

import { drainCommands, type Command } from '../commands';
import { getPlayer, getGameState } from '../queries';
import { getTick } from '../loop';
import { world } from '../world';
import { createPlayerEntity, createEnemyEntity } from '../factories';
import { COMBAT_BALANCE } from '@/constants/balance';
import { FLOOR_CONFIG } from '@/constants/game';
import type { CharacterClass } from '@/types/game';
import { getDevModeParams } from '@/utils/devMode';
import { getPathResource, PATH_RESOURCES } from '@/data/pathResources';
import { getPathById } from '@/utils/pathUtils';
import { getStancesForPath, getDefaultStanceId } from '@/data/stances';

export function InputSystem(_deltaMs: number): void {
  const commands = drainCommands();
  const player = getPlayer();
  const gameState = getGameState();

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'ACTIVATE_POWER': {
        if (!player || !player.powers) break;

        const power = player.powers.find((p) => p.id === cmd.powerId);
        if (!power) break;

        // Check cooldown
        const cooldown = player.cooldowns?.get(cmd.powerId);
        if (cooldown && cooldown.remaining > 0) break;

        // Check mana
        if (!player.mana || player.mana.current < power.manaCost) break;

        // Mark as casting - PowerSystem will handle the effect
        // IMPORTANT: Use world.addComponent for miniplex query reactivity
        world.addComponent(player, 'casting', {
          powerId: cmd.powerId,
          startedAtTick: getTick(),
        });
        break;
      }

      case 'BLOCK': {
        if (!player || !player.mana) break;
        if (player.mana.current < COMBAT_BALANCE.BLOCK_MANA_COST) break;
        if (player.blocking) break; // Already blocking

        player.blocking = { reduction: COMBAT_BALANCE.BLOCK_DAMAGE_REDUCTION };
        player.mana.current -= COMBAT_BALANCE.BLOCK_MANA_COST;
        break;
      }

      case 'SET_COMBAT_SPEED': {
        if (gameState) {
          gameState.combatSpeed = { multiplier: cmd.speed };
        }
        break;
      }

      case 'TOGGLE_PAUSE': {
        if (gameState) {
          gameState.paused = !gameState.paused;
        }
        break;
      }

      case 'DISMISS_POPUP': {
        if (gameState?.popups) {
          // Clear the specific popup
          const popupKey = cmd.popupType as keyof typeof gameState.popups;
          if (popupKey in gameState.popups) {
            delete gameState.popups[popupKey];
          }

          // After dismissing level-up, check if player needs to select a path
          if (cmd.popupType === 'levelUp' && player) {
            const level = player.progression?.level ?? 1;
            const hasPath = !!player.path;

            // At level 2+, if player hasn't selected a path yet, go to path selection
            if (level >= 2 && !hasPath) {
              gameState.phase = 'path-select';
              // Clear pendingLevelUp so popup doesn't show again
              if (gameState.pendingLevelUp !== undefined) {
                gameState.pendingLevelUp = null;
              }
            }

            // IMPORTANT: Unpause combat after level-up popup is dismissed
            // (ProgressionSystem pauses when level-up occurs)
            gameState.paused = false;
          }
        }
        break;
      }

      case 'MARK_ANIMATIONS_CONSUMED': {
        if (gameState?.animationEvents) {
          for (const event of gameState.animationEvents) {
            if (cmd.ids.includes(event.id)) {
              event.consumed = true;
            }
          }
        }
        break;
      }

      case 'PURCHASE_ITEM': {
        if (!player?.inventory) break;
        if (player.inventory.gold < cmd.cost) break;

        // Deduct gold
        player.inventory.gold -= cmd.cost;

        // Initialize equipment if needed
        if (!player.equipment) {
          player.equipment = { weapon: null, armor: null, accessory: null };
        }

        // Add item to appropriate equipment slot (replacing existing)
        const item = cmd.item;
        if (item.type === 'weapon') {
          player.equipment.weapon = item;
        } else if (item.type === 'armor') {
          player.equipment.armor = item;
        } else if (item.type === 'accessory') {
          player.equipment.accessory = item;
        }

        // Apply item stat bonuses to player stats
        if (item.statBonus) {
          if (player.health && item.statBonus.maxHealth) {
            player.health.max += item.statBonus.maxHealth;
            player.health.current += item.statBonus.maxHealth;
          }
          if (player.attack && item.statBonus.power) {
            player.attack.baseDamage += item.statBonus.power;
          }
          if (player.defense && item.statBonus.armor) {
            player.defense.value += item.statBonus.armor;
          }
          if (player.speed && item.statBonus.speed) {
            player.speed.value += item.statBonus.speed;
            // Recalculate attack interval
            player.speed.attackInterval = Math.floor(2500 * (10 / player.speed.value));
          }
          if (player.mana && item.statBonus.maxMana) {
            player.mana.max += item.statBonus.maxMana;
            player.mana.current += item.statBonus.maxMana;
          }
        }
        break;
      }

      case 'ENHANCE_ITEM': {
        if (!player?.equipment || !player.inventory) break;

        // Get the item in the specified slot
        const equippedItem = player.equipment[cmd.slot];
        if (!equippedItem) break;

        // Check if can enhance (not at max level)
        if (equippedItem.enhancementLevel >= (equippedItem.maxEnhancement ?? 3)) break;

        // Calculate enhancement cost
        // Import logic from enhancementUtils - use tier-based pricing
        const tier = equippedItem.tier || 'starter';
        const SHOP_PRICE_RANGES: Record<string, { min: number; max: number }> = {
          starter: { min: 30, max: 60 },
          class: { min: 100, max: 150 },
          specialty: { min: 180, max: 280 },
          legendary: { min: 350, max: 500 },
        };
        const ENHANCEMENT_COST_PERCENT = 0.2;
        const priceRange = SHOP_PRICE_RANGES[tier] ?? SHOP_PRICE_RANGES.starter;
        const basePrice = Math.floor((priceRange.min + priceRange.max) / 2);
        const rawCost = Math.floor(basePrice * ENHANCEMENT_COST_PERCENT);
        const enhancementCost = Math.max(5, Math.round(rawCost / 5) * 5);

        // Check if player can afford
        if (player.inventory.gold < enhancementCost) break;

        // Deduct gold
        player.inventory.gold -= enhancementCost;

        // Get the stat bonus per enhancement (tier-based)
        const ENHANCEMENT_BONUSES: Record<string, { perStatPerLevel: number }> = {
          starter: { perStatPerLevel: 1 },
          class: { perStatPerLevel: 2 },
          specialty: { perStatPerLevel: 3 },
          legendary: { perStatPerLevel: 4 },
        };
        const enhancementConfig = ENHANCEMENT_BONUSES[tier] ?? ENHANCEMENT_BONUSES.starter;
        const bonusPerStat = enhancementConfig.perStatPerLevel;

        // Apply stat bonuses to player (one level's worth)
        if (equippedItem.statBonus) {
          if (player.health && equippedItem.statBonus.maxHealth) {
            player.health.max += bonusPerStat;
            player.health.current += bonusPerStat;
          }
          if (player.attack && equippedItem.statBonus.power) {
            player.attack.baseDamage += bonusPerStat;
          }
          if (player.defense && equippedItem.statBonus.armor) {
            player.defense.value += bonusPerStat;
          }
          if (player.speed && equippedItem.statBonus.speed) {
            player.speed.value += bonusPerStat;
            // Recalculate attack interval
            player.speed.attackInterval = Math.floor(2500 * (10 / player.speed.value));
          }
          if (player.mana && equippedItem.statBonus.maxMana) {
            player.mana.max += bonusPerStat;
            player.mana.current += bonusPerStat;
          }
        }

        // Upgrade the item's enhancement level
        equippedItem.enhancementLevel = (equippedItem.enhancementLevel ?? 0) + 1;
        break;
      }

      case 'START_GAME': {
        if (gameState) {
          gameState.phase = 'class-select';
        }
        break;
      }

      case 'RESTART_GAME': {
        if (gameState) {
          gameState.phase = 'menu';
        }
        break;
      }

      case 'SELECT_CLASS': {
        if (!gameState) break;

        // Remove existing player if any
        const existingPlayer = getPlayer();
        if (existingPlayer) {
          world.remove(existingPlayer);
        }

        // Get dev mode overrides
        const devParams = getDevModeParams();
        const devOverrides = devParams.enabled
          ? {
              attackOverride: devParams.attackOverride,
              defenseOverride: devParams.defenseOverride,
              goldOverride: devParams.goldOverride,
            }
          : undefined;

        // Create new player with selected class
        const playerEntity = createPlayerEntity({
          name: 'Hero',
          characterClass: cmd.classId as CharacterClass,
          devOverrides,
        });
        world.add(playerEntity);

        // Set up floor state (with possible startFloor override)
        const startFloor = devParams.enabled && devParams.startFloor ? devParams.startFloor : 1;
        gameState.floor = {
          number: startFloor,
          room: 0,
          totalRooms: FLOOR_CONFIG.ROOMS_PER_FLOOR[startFloor - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR,
          theme: undefined,
        };

        // Transition to combat and spawn first enemy
        gameState.phase = 'combat';

        // Spawn first enemy
        const floor = gameState.floor;
        floor.room = 1;
        const enemy = createEnemyEntity({
          floor: floor.number,
          room: floor.room,
          roomsPerFloor: floor.totalRooms,
        });
        world.add(enemy);

        // Start entering animation phase
        gameState.battlePhase = {
          phase: 'entering',
          startedAtTick: getTick(),
          duration: 800, // matches CSS --anim-entering-phase
        };
        gameState.groundScrolling = true;

        break;
      }

      case 'SELECT_PATH': {
        if (!player || !gameState) break;

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

        // Remove mana for ALL paths (active uses pathResource, passive uses nothing)
        if (player.mana) {
          world.removeComponent(player, 'mana');
        }

        // Initialize pathResource for active paths
        if (pathDef?.type === 'active' && PATH_RESOURCES[cmd.pathId]) {
          player.pathResource = getPathResource(cmd.pathId);
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
        }

        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }

      case 'SELECT_ABILITY': {
        if (!player?.path || !gameState) break;
        // Add ability to unlocked list
        if (!player.path.abilities.includes(cmd.abilityId)) {
          player.path.abilities.push(cmd.abilityId);
        }
        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }

      case 'SELECT_SUBPATH': {
        if (!player?.path || !gameState) break;
        player.path.subpathId = cmd.subpathId;
        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }

      case 'SWITCH_STANCE': {
        if (!player?.stanceState || !player.path) break;

        // Check if on cooldown
        if (player.stanceState.stanceCooldownRemaining > 0) break;

        // Check if switching to same stance
        if (player.stanceState.activeStanceId === cmd.stanceId) break;

        // Get stance definition to validate and get cooldown
        const stances = getStancesForPath(player.path.pathId);
        const newStance = stances.find(s => s.id === cmd.stanceId);
        if (!newStance) break;

        // Switch stance and set cooldown
        player.stanceState.activeStanceId = cmd.stanceId;
        player.stanceState.stanceCooldownRemaining = newStance.switchCooldown;
        break;
      }

      case 'ADVANCE_ROOM': {
        if (!gameState?.floor) break;

        const floor = gameState.floor;

        // Remove any existing enemy (including dying ones)
        for (const e of world.with('enemy')) {
          world.remove(e);
        }

        // If already on floor-complete, advance to next floor (same as leaving shop)
        if (gameState.phase === 'floor-complete') {
          floor.number += 1;
          floor.room = 1;
          floor.totalRooms = FLOOR_CONFIG.ROOMS_PER_FLOOR[floor.number - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;

          // Spawn first enemy of new floor
          const enemy = createEnemyEntity({
            floor: floor.number,
            room: floor.room,
            roomsPerFloor: floor.totalRooms,
          });
          world.add(enemy);

          // Start entering animation phase
          gameState.battlePhase = {
            phase: 'entering',
            startedAtTick: getTick(),
            duration: 800,
          };
          gameState.groundScrolling = true;

          gameState.phase = 'combat';
          break;
        }

        // Check if floor is complete
        if (floor.room >= floor.totalRooms) {
          // Check for victory
          if (floor.number >= FLOOR_CONFIG.FINAL_BOSS_FLOOR) {
            gameState.phase = 'victory';
          } else {
            gameState.phase = 'floor-complete';
          }
          break;
        }

        // Advance to next room
        floor.room += 1;

        // Spawn next enemy
        const nextEnemy = createEnemyEntity({
          floor: floor.number,
          room: floor.room,
          roomsPerFloor: floor.totalRooms,
        });
        world.add(nextEnemy);

        // Start entering animation phase
        gameState.battlePhase = {
          phase: 'entering',
          startedAtTick: getTick(),
          duration: 800,
        };
        gameState.groundScrolling = true;

        gameState.phase = 'combat';
        break;
      }

      case 'GO_TO_SHOP': {
        if (gameState) {
          // Track where we came from (for proper exit behavior)
          gameState.shopEnteredFrom = gameState.phase === 'defeat' ? 'defeat' : 'floor-complete';
          gameState.phase = 'shop';
        }
        break;
      }

      case 'LEAVE_SHOP': {
        if (!gameState?.floor || !player) break;

        const floor = gameState.floor;
        const cameFromDefeat = gameState.shopEnteredFrom === 'defeat';

        // Clear the tracking field
        gameState.shopEnteredFrom = undefined;

        // Remove any existing enemy (including dying ones)
        for (const e of world.with('enemy')) {
          world.remove(e);
        }

        if (cameFromDefeat) {
          // CRITICAL: Remove dying component so player can attack again
          if (player.dying) {
            world.removeComponent(player, 'dying');
          }

          // Came from defeat: retry floor (reset health/mana, stay on same floor)
          if (player.health) {
            player.health.current = player.health.max;
          }
          if (player.mana) {
            player.mana.current = player.mana.max;
          }

          // Reset attack timing so player starts fresh
          if (player.speed) {
            player.speed.accumulated = 0;
          }

          // Clear cooldowns
          if (player.cooldowns) {
            player.cooldowns.clear();
          }

          player.statusEffects = [];
          floor.room = 1;
        } else {
          // Came from floor-complete: advance to next floor
          floor.number += 1;
          floor.room = 1;
          floor.totalRooms = FLOOR_CONFIG.ROOMS_PER_FLOOR[floor.number - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;
        }

        // Spawn first enemy
        const shopEnemy = createEnemyEntity({
          floor: floor.number,
          room: floor.room,
          roomsPerFloor: floor.totalRooms,
        });
        world.add(shopEnemy);

        // Start entering animation phase
        gameState.battlePhase = {
          phase: 'entering',
          startedAtTick: getTick(),
          duration: 800,
        };
        gameState.groundScrolling = true;

        gameState.phase = 'combat';
        break;
      }

      case 'RETRY_FLOOR': {
        if (!gameState?.floor || !player) break;

        const floor = gameState.floor;

        // CRITICAL: Remove dying component so player can attack again
        // The dying component excludes entities from attackersQuery
        if (player.dying) {
          world.removeComponent(player, 'dying');
        }

        // Reset player health/mana
        if (player.health) {
          player.health.current = player.health.max;
        }
        if (player.mana) {
          player.mana.current = player.mana.max;
        }

        // Reset attack timing so player starts fresh
        if (player.speed) {
          player.speed.accumulated = 0;
        }

        // Clear cooldowns
        if (player.cooldowns) {
          player.cooldowns.clear();
        }

        // Clear status effects
        player.statusEffects = [];

        // Reset room to 1
        floor.room = 1;

        // Remove any existing enemy (including dying ones)
        for (const e of world.with('enemy')) {
          world.remove(e);
        }

        // Spawn first enemy of floor
        const retryEnemy = createEnemyEntity({
          floor: floor.number,
          room: floor.room,
          roomsPerFloor: floor.totalRooms,
        });
        world.add(retryEnemy);

        // Start entering animation phase
        gameState.battlePhase = {
          phase: 'entering',
          startedAtTick: getTick(),
          duration: 800,
        };
        gameState.groundScrolling = true;

        gameState.phase = 'combat';
        break;
      }

      case 'ABANDON_RUN': {
        if (!gameState) break;

        // Remove player and enemy (including dying ones)
        const oldPlayer = getPlayer();
        if (oldPlayer) {
          world.remove(oldPlayer);
        }
        for (const e of world.with('enemy')) {
          world.remove(e);
        }

        // Reset to menu
        gameState.phase = 'menu';
        break;
      }

      default:
        // Unknown command - ignore for now
        break;
    }
  }
}
