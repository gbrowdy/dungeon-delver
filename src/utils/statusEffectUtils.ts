import { Player, Enemy, StatusEffect } from '@/types/game';
import { STATUS_EFFECT_TYPE, StatusEffectType } from '@/constants/enums';
import { COMBAT_BALANCE } from '@/constants/balance';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

// ============================================================================
// TYPES
// ============================================================================

export type StatusEffectSource =
  | 'enemy_ability'
  | 'power'
  | 'path_ability'
  | 'item_effect';

export interface StatusEffectConfig {
  type: StatusEffectType;
  duration?: number;
  damage?: number;
  value?: number;
}

export interface PlayerStatusResult {
  player: Player;
  logs: string[];
  applied: boolean;
}

export interface EnemyStatusResult {
  enemy: Enemy;
  logs: string[];
  applied: boolean;
}

// ============================================================================
// INTERNAL HELPERS (not exported)
// ============================================================================

const DEFAULT_DURATIONS: Record<StatusEffectType, number> = {
  [STATUS_EFFECT_TYPE.POISON]: COMBAT_BALANCE.DEFAULT_POISON_DURATION,
  [STATUS_EFFECT_TYPE.STUN]: COMBAT_BALANCE.DEFAULT_STUN_DURATION,
  [STATUS_EFFECT_TYPE.SLOW]: COMBAT_BALANCE.DEFAULT_BUFF_DURATION,
  [STATUS_EFFECT_TYPE.BLEED]: COMBAT_BALANCE.DEFAULT_POISON_DURATION,
};

const STATUS_ICONS: Record<StatusEffectType, string> = {
  [STATUS_EFFECT_TYPE.POISON]: 'status-poison',
  [STATUS_EFFECT_TYPE.STUN]: 'status-stun',
  [STATUS_EFFECT_TYPE.SLOW]: 'status-slow',
  [STATUS_EFFECT_TYPE.BLEED]: 'status-bleed',
};

function getDefaultDuration(type: StatusEffectType): number {
  return DEFAULT_DURATIONS[type] ?? COMBAT_BALANCE.DEFAULT_BUFF_DURATION;
}

function getStatusIcon(type: StatusEffectType): string {
  return STATUS_ICONS[type] ?? 'status-unknown';
}

function generateStatusId(type: StatusEffectType): string {
  return `${type}-${Date.now()}`;
}

/**
 * Format status effect type for display in log messages.
 * Converts 'poison' -> 'Poison', 'slow' -> 'Slow', etc.
 */
export function formatStatusTypeName(type: StatusEffectType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ============================================================================
// CORE LOGIC
// ============================================================================

function applyOrRefreshStatus(
  statusEffects: StatusEffect[],
  config: StatusEffectConfig
): { effect: StatusEffect; refreshed: boolean } {
  const duration = config.duration ?? getDefaultDuration(config.type);
  const existingIndex = statusEffects.findIndex(e => e.type === config.type);

  if (existingIndex >= 0) {
    const existing = statusEffects[existingIndex];
    const newDamage = config.damage !== undefined
      ? Math.max(existing.damage ?? 0, config.damage)
      : existing.damage;
    const newValue = config.value !== undefined
      ? Math.max(existing.value ?? 0, config.value)
      : existing.value;

    const refreshedEffect: StatusEffect = {
      ...existing,
      damage: newDamage,
      value: newValue,
      remainingTurns: duration,
    };
    statusEffects[existingIndex] = refreshedEffect;
    return { effect: refreshedEffect, refreshed: true };
  }

  const newEffect: StatusEffect = {
    id: generateStatusId(config.type),
    type: config.type,
    damage: config.damage,
    value: config.value,
    remainingTurns: duration,
    icon: getStatusIcon(config.type),
  };
  statusEffects.push(newEffect);
  return { effect: newEffect, refreshed: false };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function hasStatusEffect(
  statusEffects: StatusEffect[],
  type: StatusEffectType
): boolean {
  return statusEffects.some(e => e.type === type);
}

export function applyStatusToPlayer(
  player: Player,
  config: StatusEffectConfig,
  source: StatusEffectSource,
  immunities: StatusEffectType[] = []
): PlayerStatusResult {
  const updatedPlayer = deepClonePlayer(player);
  const logs: string[] = [];

  if (immunities.includes(config.type)) {
    logs.push(`Resisted ${formatStatusTypeName(config.type)}!`);
    return { player: updatedPlayer, logs, applied: false };
  }

  const { effect } = applyOrRefreshStatus(
    updatedPlayer.statusEffects,
    config
  );

  const logMessage = formatStatusLogMessage('You', config.type, effect);
  logs.push(logMessage);

  return { player: updatedPlayer, logs, applied: true };
}

/**
 * Generate a combat log message for status application.
 * Uses proper verb conjugation: "You are" vs "Enemy is"
 */
function formatStatusLogMessage(
  targetName: string,
  type: StatusEffectType,
  effect: StatusEffect
): string {
  const beVerb = targetName === 'You' ? 'are' : 'is';

  switch (type) {
    case STATUS_EFFECT_TYPE.POISON:
      return `${targetName} ${beVerb} poisoned! (${effect.damage} damage/turn for ${effect.remainingTurns} turns)`;
    case STATUS_EFFECT_TYPE.STUN:
      return `${targetName} ${beVerb} stunned for ${effect.remainingTurns} turn(s)!`;
    case STATUS_EFFECT_TYPE.SLOW: {
      const slowPercent = Math.round((effect.value ?? 0) * 100);
      return `${targetName} ${beVerb} slowed by ${slowPercent}% for ${effect.remainingTurns} turns!`;
    }
    case STATUS_EFFECT_TYPE.BLEED:
      return `${targetName} ${beVerb} bleeding! (${effect.damage} damage/turn for ${effect.remainingTurns} turns)`;
    default:
      return `${targetName} ${beVerb} affected by ${formatStatusTypeName(type)}!`;
  }
}

export function applyStatusToEnemy(
  enemy: Enemy,
  config: StatusEffectConfig,
  source: StatusEffectSource
): EnemyStatusResult {
  const updatedEnemy = deepCloneEnemy(enemy);
  const logs: string[] = [];

  if (!updatedEnemy.statusEffects) {
    updatedEnemy.statusEffects = [];
  }

  const { effect } = applyOrRefreshStatus(
    updatedEnemy.statusEffects,
    config
  );

  const logMessage = formatStatusLogMessage(
    updatedEnemy.name,
    config.type,
    effect
  );
  logs.push(logMessage);

  return { enemy: updatedEnemy, logs, applied: true };
}
