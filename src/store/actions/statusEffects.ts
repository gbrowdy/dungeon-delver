import type { CombatEntity, StatusEffectType, StatusEffect } from '@/types/game';
import {
  MAX_POISON_STACKS,
  POISON_DURATION_MS,
  STUN_DURATION_MS,
  STUN_IMMUNITY_MS,
  MAX_CURSE_STACKS,
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
