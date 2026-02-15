import type { CombatEntity, StatusEffectType, StatusEffect, GameState } from '@/types/game';
import { calculateDamage } from '@/math/damage';
import {
  MAX_POISON_STACKS,
  POISON_DURATION_MS,
  STUN_DURATION_MS,
  STUN_IMMUNITY_MS,
  MAX_CURSE_STACKS,
  CURSE_DECAY_INTERVAL_MS,
} from '@/math/balance';

export function hasEffect(entity: CombatEntity, type: StatusEffectType): boolean {
  return entity.statusEffects.some(e => e.type === type && e.remainingMs > 0);
}

export function getEffect(entity: CombatEntity, type: StatusEffectType): StatusEffect | undefined {
  return entity.statusEffects.find(e => e.type === type);
}

export function addStatusEffect(
  entity: CombatEntity,
  type: StatusEffectType,
  currentTimeMs: number,
  amount?: number,
): void {
  const existing = getEffect(entity, type);

  switch (type) {
    case 'poison': {
      if (existing) {
        if (existing.stacks < MAX_POISON_STACKS) {
          existing.stacks += 1;
        }
        existing.remainingMs = POISON_DURATION_MS;
      } else {
        entity.statusEffects.push({
          type: 'poison',
          stacks: 1,
          remainingMs: POISON_DURATION_MS,
        });
      }
      break;
    }

    case 'stun': {
      if (existing?.immuneUntilMs && currentTimeMs < existing.immuneUntilMs) {
        return;
      }
      if (existing) {
        existing.remainingMs = STUN_DURATION_MS;
        existing.immuneUntilMs = undefined;
      } else {
        entity.statusEffects.push({
          type: 'stun',
          stacks: 1,
          remainingMs: STUN_DURATION_MS,
        });
      }
      break;
    }

    case 'curse': {
      if (existing) {
        if (existing.stacks < MAX_CURSE_STACKS) {
          existing.stacks += 1;
        }
      } else {
        entity.statusEffects.push({
          type: 'curse',
          stacks: 1,
          remainingMs: Infinity,
        });
      }
      break;
    }

    case 'shield': {
      const shieldHp = amount ?? 1;
      if (existing) {
        existing.stacks = shieldHp;
        existing.remainingMs = Infinity;
      } else {
        entity.statusEffects.push({
          type: 'shield',
          stacks: shieldHp,
          remainingMs: Infinity,
        });
      }
      break;
    }

    case 'regen': {
      if (!existing) {
        entity.statusEffects.push({
          type: 'regen',
          stacks: 1,
          remainingMs: Infinity,
        });
      }
      break;
    }
  }
}

export function removeExpiredEffects(entity: CombatEntity, currentTimeMs?: number): void {
  entity.statusEffects = entity.statusEffects.filter(effect => {
    if (effect.remainingMs <= 0) {
      if (effect.type === 'stun' && currentTimeMs !== undefined) {
        effect.immuneUntilMs = currentTimeMs + STUN_IMMUNITY_MS;
        effect.remainingMs = 0;
        return true;
      }
      return false;
    }
    return true;
  });
}

/**
 * Tick all status effects. Order: poison → stun duration → curse decay → cleanup.
 * Mutates state in-place.
 */
export function tickStatusEffects(state: GameState, dt: number): void {
  if (!state.enemy) return;

  const player = state.player;
  const enemy = state.enemy;

  // Tick poison on both entities
  tickPoison(state, enemy, player.power, dt);
  tickPoison(state, player, enemy.power, dt);

  // Tick stun durations
  tickStunDuration(enemy, dt, state.combatElapsed);
  tickStunDuration(player, dt, state.combatElapsed);

  // Tick curse decay timer
  state.combatCounters.curseDecayTimer += dt;
  if (state.combatCounters.curseDecayTimer >= CURSE_DECAY_INTERVAL_MS) {
    state.combatCounters.curseDecayTimer -= CURSE_DECAY_INTERVAL_MS;
    decayCurse(enemy);
  }

  // Clean up expired effects
  removeExpiredEffects(player, state.combatElapsed);
  removeExpiredEffects(enemy, state.combatElapsed);
}

function tickPoison(state: GameState, target: CombatEntity, sourcePower: number, dt: number): void {
  const poison = getEffect(target, 'poison');
  if (!poison || poison.remainingMs <= 0) return;

  const result = calculateDamage(sourcePower, target.fortitude, 1.0, true);
  const damagePerTick = (result.final * poison.stacks * dt) / POISON_DURATION_MS;

  // Accumulate fractional damage — only apply integer damage
  const accumulator = (target.poisonDamageAccumulator ?? 0) + damagePerTick;
  const damage = Math.floor(accumulator);
  target.poisonDamageAccumulator = accumulator - damage;

  if (damage > 0) {
    target.hp -= damage;
    state.combatEvents.push({
      type: 'dot',
      target: target === state.player ? 'player' : 'enemy',
      value: damage,
      tick: state.gameTick,
    });
  }

  poison.remainingMs -= dt;
}

function tickStunDuration(entity: CombatEntity, dt: number, currentTimeMs: number): void {
  const stun = getEffect(entity, 'stun');
  if (!stun) return;

  if (stun.remainingMs > 0) {
    stun.remainingMs -= dt;
    if (stun.remainingMs <= 0) {
      stun.remainingMs = 0;
      stun.immuneUntilMs = currentTimeMs + STUN_IMMUNITY_MS;
    }
  }
}

function decayCurse(entity: CombatEntity): void {
  const curse = getEffect(entity, 'curse');
  if (!curse) return;

  curse.stacks -= 1;
  if (curse.stacks <= 0) {
    entity.statusEffects = entity.statusEffects.filter(e => e.type !== 'curse');
  }
}
