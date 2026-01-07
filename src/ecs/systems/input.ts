// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Runs first each tick to translate user input into component changes.
 */

import { drainCommands, clearCommands, type Command } from '../commands';
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
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { computeAllEffectivePowers } from '@/utils/powerUpgrades';
import { computeEffectiveStanceEffects } from '@/utils/stanceUtils';
import { recomputeDerivedStats } from '@/utils/statUtils';
import type { Entity } from '../components';

/**
 * Recompute effectivePowers after power changes or upgrades
 */
function recomputeEffectivePowers(player: Entity): void {
  player.effectivePowers = computeAllEffectivePowers(player);
}

/**
 * Recompute effectiveStanceEffects after stance changes
 */
function recomputeEffectiveStanceEffects(player: Entity): void {
  player.effectiveStanceEffects = computeEffectiveStanceEffects(player);
}

export function InputSystem(_deltaMs: number): void {
  const commands = drainCommands();
  const player = getPlayer();
  const gameState = getGameState();

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'ACTIVATE_POWER': {
        if (!player || !player.powers) break;

        // Cannot use powers while dying or dead
        if (player.dying || (player.health && player.health.current <= 0)) break;

        const power = player.powers.find((p) => p.id === cmd.powerId);
        if (!power) break;

        // Check cooldown
        const cooldown = player.cooldowns?.get(cmd.powerId);
        if (cooldown && cooldown.remaining > 0) break;

        // Check resource - pre-path players use mana, post-path use pathResource
        // Note: Pre-path players have pathResource.type === 'stamina' but should use mana
        const hasActivePath = player.path && player.pathResource && player.pathResource.type !== 'stamina';

        if (hasActivePath && player.pathResource) {
          // Active path: use path resource (fury, momentum, arcane charges, etc.)
          const cost = power.resourceCost ?? power.manaCost;
          if (player.pathResource.resourceBehavior === 'spend') {
            // Fury/Momentum/Zeal: check if enough resource to spend
            if (player.pathResource.current < cost) break;
          } else {
            // Arcane Charges: check if would overflow
            if (player.pathResource.current + cost > player.pathResource.max) break;
          }
        } else if (player.mana) {
          // Pre-path: use mana
          if (player.mana.current < power.manaCost) break;
        } else {
          // No resource system - can't cast (passive paths shouldn't have powers)
          break;
        }

        // Mark as casting - PowerSystem will handle the effect
        // IMPORTANT: Use world.addComponent for miniplex query reactivity
        world.addComponent(player, 'casting', {
          powerId: cmd.powerId,
          startedAtTick: getTick(),
        });
        break;
      }

      case 'ACTIVATE_BLOCK': {
        if (!player) break;

        // Cannot block while dying or dead
        if (player.dying || (player.health && player.health.current <= 0)) break;

        // Already blocking
        if (player.isBlocking) break;

        // Check mana cost (if using mana system) - active paths get free blocks
        if (player.mana) {
          if (player.mana.current < COMBAT_BALANCE.BLOCK_MANA_COST) break;
          player.mana.current -= COMBAT_BALANCE.BLOCK_MANA_COST;
        }
        // Active paths (with pathResource) don't pay mana for block

        // Activate block - CombatSystem will check this flag when applying damage
        player.isBlocking = true;
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
            }

            // Always clear pendingLevelUp after dismissing level-up popup
            gameState.pendingLevelUp = null;

            // Only unpause if no other popups are pending
            // (power choice, upgrade choice, stance enhancement need the game paused)
            const hasOtherPendingPopup =
              player.pendingPowerChoice ||
              player.pendingUpgradeChoice ||
              player.pendingStanceEnhancement;

            if (!hasOtherPendingPopup) {
              gameState.paused = false;
            }
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
          if (item.statBonus.fortune) {
            // Apply fortune bonus and recompute derived stats
            player.fortune = (player.fortune ?? 0) + item.statBonus.fortune;
            recomputeDerivedStats(player);
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
        let fortuneChanged = false;
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
          if (equippedItem.statBonus.fortune) {
            player.fortune = (player.fortune ?? 0) + bonusPerStat;
            fortuneChanged = true;
          }
        }

        // Recompute derived stats if fortune changed
        if (fortuneChanged) {
          recomputeDerivedStats(player);
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
          // Clear any pending commands
          clearCommands();
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

        // Clear any pending commands from previous game
        clearCommands();

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

        // Initialize pathProgression based on path type
        if (pathDef?.type === 'active') {
          player.pathProgression = {
            pathId: cmd.pathId,
            pathType: 'active',
            powerUpgrades: [],
          };
        } else if (pathDef?.type === 'passive') {
          player.pathProgression = {
            pathId: cmd.pathId,
            pathType: 'passive',
            stanceProgression: {
              ironTier: 0,
              retributionTier: 0,
              acquiredEnhancements: [],
            },
          };
        }

        // Remove mana for ALL paths (active uses pathResource, passive uses nothing)
        if (player.mana) {
          world.removeComponent(player, 'mana');
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
        }

        // For active paths, trigger power choice if at a power level
        if (pathDef?.type === 'active' && player.progression) {
          const currentLevel = player.progression.level;
          const isPowerLevel = [2, 4, 6, 8].includes(currentLevel);

          if (isPowerLevel) {
            const choices = getBerserkerPowerChoices(currentLevel);
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

        // Recompute effective stance effects after switching
        recomputeEffectiveStanceEffects(player);
        break;
      }

      case 'SELECT_POWER': {
        if (!player?.pendingPowerChoice || !gameState) break;

        const selectedPower = player.pendingPowerChoice.choices.find(
          (p) => p.id === cmd.powerId
        );
        if (!selectedPower) break;

        // Remove starting power (Strike/Zap/Slash/Smite) - they have id starting with 'basic-'
        const powersWithoutStarter = (player.powers ?? []).filter(
          (p) => !p.id.startsWith('basic-')
        );

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
        break;
      }

      case 'UPGRADE_POWER': {
        if (!player?.pendingUpgradeChoice || !gameState) break;

        // Verify the power is in the upgrade choices
        if (!player.pendingUpgradeChoice.powerIds.includes(cmd.powerId)) break;

        // Find and upgrade the power if pathProgression exists
        if (player.pathProgression?.powerUpgrades) {
          const powerState = player.pathProgression.powerUpgrades.find(
            (p) => p.powerId === cmd.powerId
          );
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
        break;
      }

      case 'SELECT_STANCE_ENHANCEMENT': {
        if (!player?.pendingStanceEnhancement || !gameState) break;

        // Apply enhancement if pathProgression exists
        if (player.pathProgression?.stanceProgression) {
          const stanceState = player.pathProgression.stanceProgression;
          const enhancement =
            cmd.stanceId === 'iron'
              ? player.pendingStanceEnhancement.ironChoice
              : player.pendingStanceEnhancement.retributionChoice;

          // Update stance tier
          if (cmd.stanceId === 'iron') {
            stanceState.ironTier = enhancement.tier;
          } else {
            stanceState.retributionTier = enhancement.tier;
          }

          // Track acquired enhancement
          stanceState.acquiredEnhancements.push(enhancement.id);
        }

        // Clear pending choice
        world.removeComponent(player, 'pendingStanceEnhancement');

        // Unpause combat now that choice is made
        gameState.paused = false;

        // Recompute effective stance effects with new enhancement
        recomputeEffectiveStanceEffects(player);
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

          // Reset player combat state for new floor
          if (player) {
            if (player.pathResource) {
              // Stamina resets to max, other resources reset to 0
              player.pathResource.current = player.pathResource.type === 'stamina'
                ? player.pathResource.max
                : 0;
            }
          }

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

          // Clear cooldowns
          if (player.cooldowns) {
            player.cooldowns.clear();
          }

          player.statusEffects = [];

          // Reset pathResource (stamina to max, others to 0)
          if (player.pathResource) {
            player.pathResource.current = player.pathResource.type === 'stamina'
              ? player.pathResource.max
              : 0;
          }

          floor.room = 1;
        } else {
          // Came from floor-complete: advance to next floor
          floor.number += 1;
          floor.room = 1;
          floor.totalRooms = FLOOR_CONFIG.ROOMS_PER_FLOOR[floor.number - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;

          // Reset player combat state for new floor
          if (player.pathResource) {
            // Stamina resets to max, other resources reset to 0
            player.pathResource.current = player.pathResource.type === 'stamina'
              ? player.pathResource.max
              : 0;
          }
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

        // Clear cooldowns
        if (player.cooldowns) {
          player.cooldowns.clear();
        }

        // Clear status effects
        player.statusEffects = [];

        // Reset pathResource (stamina to max, others to 0)
        if (player.pathResource) {
          player.pathResource.current = player.pathResource.type === 'stamina'
            ? player.pathResource.max
            : 0;
        }

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

        // Clear any pending commands
        clearCommands();

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
