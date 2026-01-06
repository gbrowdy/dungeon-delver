// src/ecs/systems/path-ability.ts
/**
 * PathAbilitySystem - processes path ability triggers during combat.
 *
 * This system processes path ability effects based on combat events:
 * - on_hit: When player attacks
 * - on_crit: When player lands a critical hit
 * - on_kill: When player kills an enemy
 * - on_damaged: When player takes damage
 * - on_dodge: When player dodges an attack
 * - on_block: When player blocks an attack
 * - on_power_use: When player uses a power
 * - combat_start: At the start of combat
 * - turn_start: At the start of each combat turn
 *
 * Runs after ItemEffectSystem and before StatusEffectSystem.
 */

import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getEffectiveDelta, getTick } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import type {
  PathAbility,
  PathAbilityEffect,
  PathAbilityTrigger,
  PathAbilityCondition,
  PathDefinition,
  StatusApplication,
  StatModifier,
} from '@/types/paths';
import type { StatusEffect, EnemyStatDebuff, ActiveBuff } from '@/types/game';
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';
import { queueAnimationEvent, addCombatLog } from '../utils';

// ============================================================================
// TRIGGER TRACKING
// ============================================================================

/**
 * Context for trigger processing
 */
export interface TriggerContext {
  damage?: number;
  isCrit?: boolean;
  powerId?: string;
  isDodge?: boolean;
  isBlock?: boolean;
}

export interface PathTriggerEvent {
  trigger: PathAbilityTrigger;
  context: TriggerContext;
}

// Module-level tracking for path triggers (reset each tick)
let pendingTriggers: PathTriggerEvent[] = [];

/**
 * Record that a path ability trigger occurred this tick.
 * Called by CombatSystem or other systems when relevant events happen.
 */
export function recordPathTrigger(trigger: PathAbilityTrigger, context: TriggerContext): void {
  pendingTriggers.push({ trigger, context });
}

/**
 * Clear all recorded triggers.
 */
export function clearPathTriggerTracking(): void {
  pendingTriggers = [];
}

/**
 * Get pending triggers for this tick (read-only access).
 * Used by ResourceGenerationSystem to process resource gains.
 */
export function getPendingTriggers(): readonly PathTriggerEvent[] {
  return pendingTriggers;
}

// ============================================================================
// PATH HELPERS
// ============================================================================

/**
 * Normalize path exports to array format.
 */
function normalizePaths(paths: PathDefinition[] | Record<string, PathDefinition>): PathDefinition[] {
  return Array.isArray(paths) ? paths : Object.values(paths);
}

/**
 * Get all path definitions from all classes.
 */
function getAllPaths(): PathDefinition[] {
  return [
    ...normalizePaths(WARRIOR_PATHS),
    ...normalizePaths(MAGE_PATHS),
    ...normalizePaths(ROGUE_PATHS),
    ...normalizePaths(PALADIN_PATHS),
  ];
}

/**
 * Get a path definition by ID.
 */
function getPathById(pathId: string): PathDefinition | null {
  const allPaths = getAllPaths();
  return allPaths.find(p => p.id === pathId) || null;
}

/**
 * Get all active abilities for a player entity.
 */
function getActiveAbilities(player: Entity): PathAbility[] {
  if (!player.path) return [];

  const pathDef = getPathById(player.path.pathId);
  if (!pathDef) return [];

  // Filter abilities that the player has chosen
  return pathDef.abilities.filter(ability =>
    player.path!.abilities.includes(ability.id)
  );
}

// ============================================================================
// CONDITION CHECKING
// ============================================================================

/**
 * Check if a condition is met.
 */
function checkCondition(
  condition: PathAbilityCondition,
  player: Entity,
  enemy: Entity | undefined
): boolean {
  switch (condition.type) {
    case 'hp_below': {
      if (!player.health) return false;
      const hpPercent = (player.health.current / player.health.max) * 100;
      return hpPercent < condition.value;
    }
    case 'hp_above': {
      if (!player.health) return false;
      const hpPercent = (player.health.current / player.health.max) * 100;
      return hpPercent > condition.value;
    }
    case 'hp_threshold': {
      if (!player.health) return false;
      const hpRatio = player.health.current / player.health.max;
      return hpRatio <= condition.value;
    }
    case 'mana_below': {
      if (!player.mana) return false;
      const manaPercent = (player.mana.current / player.mana.max) * 100;
      return manaPercent < condition.value;
    }
    case 'mana_above': {
      if (!player.mana) return false;
      const manaPercent = (player.mana.current / player.mana.max) * 100;
      return manaPercent > condition.value;
    }
    case 'enemy_hp_below': {
      if (!enemy?.health) return false;
      const enemyHpPercent = (enemy.health.current / enemy.health.max) * 100;
      return enemyHpPercent < condition.value;
    }
    case 'combo_count': {
      const comboCount = player.combo?.count ?? 0;
      return comboCount >= condition.value;
    }
    case 'attack_count': {
      const attackCount = player.abilityTracking?.abilityCounters?.[condition.counterId] ?? 0;
      return attackCount >= condition.value;
    }
    case 'enemy_has_status': {
      if (!enemy?.statusEffects) return false;
      return enemy.statusEffects.length > 0;
    }
    default:
      return false;
  }
}

// ============================================================================
// EFFECT PROCESSING
// ============================================================================

/**
 * Generate a unique ID for buffs/debuffs.
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get status effect icon ID.
 */
function getStatusIcon(type: 'poison' | 'stun' | 'slow' | 'bleed'): string {
  switch (type) {
    case 'poison':
      return 'status-poison';
    case 'stun':
      return 'status-stun';
    case 'slow':
      return 'status-slow';
    case 'bleed':
      return 'status-bleed';
    default:
      return 'status-unknown';
  }
}

/**
 * Apply heal effect to player.
 */
function applyHeal(player: Entity, amount: number, abilityName: string, isPercentage: boolean = false): void {
  if (!player.health) return;

  let healAmount = amount;

  // If the heal value is small (< 100), treat it as percentage of max health
  if (isPercentage || (amount > 0 && amount < 100)) {
    healAmount = Math.floor(player.health.max * (amount / 100));
  }

  const oldHealth = player.health.current;
  const newHealth = Math.min(player.health.max, oldHealth + healAmount);
  const actualHeal = newHealth - oldHealth;

  if (actualHeal > 0) {
    player.health.current = newHealth;
    addCombatLog(`${abilityName}: Healed ${actualHeal} HP`);
    queueAnimationEvent('item_proc', {
      type: 'heal',
      value: actualHeal,
      source: abilityName,
    });
  }
}

/**
 * Apply mana restore to player.
 */
function applyManaRestore(player: Entity, amount: number, abilityName: string): void {
  if (!player.mana) return;

  const oldMana = player.mana.current;
  const newMana = Math.min(player.mana.max, oldMana + amount);
  const actualMana = newMana - oldMana;

  if (actualMana > 0) {
    player.mana.current = newMana;
    addCombatLog(`${abilityName}: Restored ${actualMana} mana`);
  }
}

/**
 * Apply damage to enemy.
 */
function applyDamageToEnemy(enemy: Entity, amount: number, abilityName: string, isReflect: boolean = false): void {
  if (!enemy.health || enemy.dying) return;

  enemy.health.current = Math.max(0, enemy.health.current - amount);

  const logMessage = isReflect
    ? `${abilityName}: Reflected ${amount} damage`
    : `${abilityName}: +${amount} bonus damage`;

  addCombatLog(logMessage);
  queueAnimationEvent('item_proc', {
    type: 'item',
    itemName: abilityName,
    effectDescription: `${amount} damage`,
  });
}

/**
 * Apply status effect to enemy.
 */
function applyStatusToEnemy(enemy: Entity, status: StatusApplication, abilityName: string, baseDamage?: number): void {
  if (!enemy || enemy.dying) return;

  // Check proc chance
  if (Math.random() > status.chance) return;

  if (!enemy.statusEffects) {
    enemy.statusEffects = [];
  }

  // Calculate damage for bleed (percentage of base damage)
  let statusDamage = status.damage;
  if (status.statusType === 'bleed' && baseDamage && status.damage) {
    statusDamage = Math.floor(baseDamage * (status.damage / 100));
  }

  const newStatus: StatusEffect = {
    id: `${status.statusType}_${Date.now()}`,
    type: status.statusType,
    damage: statusDamage,
    remainingTurns: status.duration,
    icon: getStatusIcon(status.statusType),
  };

  enemy.statusEffects.push(newStatus);
  addCombatLog(`${abilityName}: Applied ${status.statusType}!`);
  queueAnimationEvent('status_applied', {
    type: 'status',
    effectType: status.statusType,
    applied: true,
  });
}

/**
 * Apply shield to player.
 */
function applyShield(player: Entity, amount: number, duration: number, abilityName: string): void {
  if (!player.shield) {
    player.shield = { value: 0, remaining: 0, maxDuration: 0 };
  }

  player.shield.value = (player.shield.value || 0) + amount;
  player.shield.remaining = Math.max(player.shield.remaining || 0, duration);
  player.shield.maxDuration = Math.max(player.shield.maxDuration || 0, duration);

  addCombatLog(`${abilityName}: Gained ${amount} shield`);
}

/**
 * Apply buff to player.
 */
function applyBuff(
  player: Entity,
  stat: 'power' | 'armor' | 'speed' | 'fortune',
  percentBonus: number,
  duration: number,
  abilityName: string,
  abilityId: string,
  icon: string
): void {
  if (!player.buffs) {
    player.buffs = [];
  }

  // Check if a buff from this ability+stat already exists
  const existingBuffIndex = player.buffs.findIndex(b => {
    const parts = b.id.split('_');
    return parts.length >= 2 && parts[0] === abilityId && parts[1] === stat;
  });

  if (existingBuffIndex >= 0) {
    // Refresh the existing buff's duration
    player.buffs[existingBuffIndex] = {
      ...player.buffs[existingBuffIndex],
      remainingTurns: duration,
    };
    const percentDisplay = Math.round(percentBonus * 100);
    addCombatLog(`${abilityName}: ${stat} buff refreshed (+${percentDisplay}%) for ${duration}s`);
  } else {
    // Create a new buff
    const buff: ActiveBuff = {
      id: generateUniqueId(`${abilityId}_${stat}`),
      name: abilityName,
      stat,
      multiplier: 1 + percentBonus,
      remainingTurns: duration,
      icon: icon || 'buff',
    };
    player.buffs.push(buff);
    const percentDisplay = Math.round(percentBonus * 100);
    addCombatLog(`${abilityName}: ${stat} increased by ${percentDisplay}% for ${duration}s`);
  }
}

/**
 * Apply debuff to enemy.
 */
function applyDebuffToEnemy(
  enemy: Entity,
  stat: 'power' | 'armor' | 'speed',
  percentReduction: number,
  duration: number,
  abilityName: string,
  abilityId: string
): void {
  if (!enemy || enemy.dying) return;

  if (!enemy.statDebuffs) {
    enemy.statDebuffs = [];
  }

  const debuff: EnemyStatDebuff = {
    id: generateUniqueId(`${abilityId}_${stat}`),
    stat,
    percentReduction,
    remainingDuration: duration,
    sourceName: abilityName,
  };

  enemy.statDebuffs.push(debuff);
  const percentDisplay = Math.round(percentReduction * 100);
  addCombatLog(`${abilityName}: Enemy ${stat} reduced by ${percentDisplay}% for ${duration}s`);
}

/**
 * Process a single effect for an ability.
 */
function processEffect(
  effect: PathAbilityEffect,
  ability: PathAbility,
  player: Entity,
  enemy: Entity | undefined,
  context: TriggerContext
): void {
  // Process heal effect
  if (effect.heal !== undefined && effect.heal > 0) {
    applyHeal(player, effect.heal, ability.name, true);
  }

  // Process damage effect (bonus damage)
  if (effect.damage !== undefined && effect.damage > 0 && enemy) {
    applyDamageToEnemy(enemy, effect.damage, ability.name);
  }

  // Process mana restore
  if (effect.manaRestore !== undefined && effect.manaRestore > 0) {
    applyManaRestore(player, effect.manaRestore, ability.name);
  }

  // Process damage modifier
  if (effect.damageModifier) {
    const mod = effect.damageModifier;

    // Check modifier condition if present
    if (mod.condition && !checkCondition(mod.condition, player, enemy)) {
      return;
    }

    switch (mod.type) {
      case 'reflect': {
        if (context.damage && enemy) {
          // mod.value can be a decimal (0.15) or percentage-like (15)
          const reflectRatio = mod.value < 1 ? mod.value : mod.value / 100;
          const reflected = Math.floor(context.damage * reflectRatio);
          applyDamageToEnemy(enemy, reflected, ability.name, true);
        }
        break;
      }
      case 'lifesteal': {
        if (context.damage) {
          const lifestealAmount = Math.floor(context.damage * (mod.value / 100));
          applyHeal(player, lifestealAmount, ability.name, false);
        }
        break;
      }
      case 'bonus_damage': {
        if (enemy) {
          const baseDamage = context.damage || player.attack?.baseDamage || 0;
          const bonusDmg = Math.floor(baseDamage * mod.value);
          applyDamageToEnemy(enemy, bonusDmg, ability.name);
        }
        break;
      }
      case 'convert_heal': {
        if (context.damage) {
          const converted = Math.floor(context.damage * (mod.value / 100));
          applyHeal(player, converted, ability.name, false);
        }
        break;
      }
      // damage_reduction is a passive effect, handled in stat calculation
    }
  }

  // Process status application
  if (effect.statusApplication && enemy) {
    applyStatusToEnemy(enemy, effect.statusApplication, ability.name, context.damage);
  }

  // Process stat modifiers (buffs and debuffs)
  if (effect.statModifiers) {
    effect.statModifiers.forEach(mod => {
      // Process enemy-targeted modifiers (debuffs)
      if (mod.target === 'enemy' && enemy) {
        const stat = mod.stat;
        if (stat === 'power' || stat === 'armor' || stat === 'speed') {
          const reduction = Math.abs(mod.percentBonus || 0);
          if (reduction > 0) {
            applyDebuffToEnemy(enemy, stat, reduction, effect.duration || 5, ability.name, ability.id);
          }
        }
      }
      // Process player-targeted modifiers (buffs)
      else if (!mod.target || mod.target === 'self') {
        const stat = mod.stat;
        if ((stat === 'power' || stat === 'armor' || stat === 'speed' || stat === 'fortune') && effect.duration) {
          const bonus = mod.percentBonus || 0;
          if (bonus > 0) {
            applyBuff(player, stat, bonus, effect.duration, ability.name, ability.id, ability.icon);
          }
        }
      }
    });
  }

  // Process cleanse
  if (effect.cleanse && player.statusEffects) {
    player.statusEffects = [];
    addCombatLog(`${ability.name}: Cleansed all status effects`);
  }

  // Process shield
  if (effect.shield && effect.shield > 0) {
    applyShield(player, effect.shield, effect.duration || 5, ability.name);
  }
}

/**
 * Process all abilities for a given trigger.
 */
function processTrigger(
  trigger: PathAbilityTrigger,
  context: TriggerContext,
  player: Entity,
  enemy: Entity | undefined,
  abilities: PathAbility[]
): void {
  for (const ability of abilities) {
    for (const effect of ability.effects) {
      // Check if this effect matches the trigger
      if (effect.trigger !== trigger) continue;

      // Check condition if present
      if (effect.condition && !checkCondition(effect.condition, player, enemy)) {
        continue;
      }

      // Check if ability is on cooldown (from previous uses)
      if (player.path?.abilityCooldowns?.[ability.id] && player.path.abilityCooldowns[ability.id] > 0) {
        // Ability is on cooldown, skip
        continue;
      }

      // If effect has a cooldown, set it after processing
      let shouldSetCooldown = false;
      if (effect.cooldown && effect.cooldown > 0) {
        shouldSetCooldown = true;
      }

      // Check proc chance
      if (effect.chance !== undefined && Math.random() > effect.chance) {
        continue;
      }

      // Process the effect
      processEffect(effect, ability, player, enemy, context);

      // Set cooldown after processing (if effect has one)
      if (shouldSetCooldown && player.path) {
        if (!player.path.abilityCooldowns) {
          player.path.abilityCooldowns = {};
        }
        // Convert seconds to milliseconds
        player.path.abilityCooldowns[ability.id] = effect.cooldown! * 1000;
      }
    }
  }
}

/**
 * Update cooldowns for all abilities.
 */
function updateCooldowns(player: Entity, deltaMs: number): void {
  if (!player.path?.abilityCooldowns) return;

  const cooldowns = player.path.abilityCooldowns;
  for (const abilityId of Object.keys(cooldowns)) {
    const remaining = cooldowns[abilityId];
    if (remaining > 0) {
      cooldowns[abilityId] = Math.max(0, remaining - deltaMs);
    }
  }
}

// ============================================================================
// SYSTEM
// ============================================================================

/**
 * PathAbilitySystem - processes path ability triggers during combat.
 *
 * @param deltaMs - Time since last tick
 */
export function PathAbilitySystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') {
    clearPathTriggerTracking();
    return;
  }

  const player = getPlayer();
  if (!player) {
    clearPathTriggerTracking();
    return;
  }

  // Check if player has a path
  if (!player.path) {
    clearPathTriggerTracking();
    return;
  }

  const enemy = getActiveEnemy();
  const effectiveDelta = getEffectiveDelta(deltaMs);

  // Update cooldowns
  updateCooldowns(player, effectiveDelta);

  // Get active abilities
  const abilities = getActiveAbilities(player);
  if (abilities.length === 0) {
    clearPathTriggerTracking();
    return;
  }

  // Process all pending triggers
  for (const event of pendingTriggers) {
    processTrigger(event.trigger, event.context, player, enemy, abilities);
  }

  // Clear triggers for next tick
  clearPathTriggerTracking();
}
