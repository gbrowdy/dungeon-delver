// src/store/actions/itemProcs.ts
//
// Generic item proc dispatcher. Iterates equipped items, looks up definitions,
// and for each effect matching the trigger, applies or accumulates the result.
// No per-item code paths — everything is data-driven via ITEM_DEFINITIONS.

import type { GameState, Item } from '@/types/game';
import { ITEM_DEFINITIONS, getScaledValue } from '@/data/items';
import type { ItemTrigger } from '@/data/items';
import { addStatusEffect } from './statusEffects';

export interface ProcContext {
  damage?: number;
}

export interface PassiveEffects {
  damageMult: number;
  speedMult: number;
  incomingDamageMult: number;
  outgoingDamageMult: number;
  damageReduction: number;
  dodgeBonus: number;
  regenPerSecond: number;
  damagePerMissingHpPercent: number;
}

function getDefaultPassiveEffects(): PassiveEffects {
  return {
    damageMult: 1.0,
    speedMult: 1.0,
    incomingDamageMult: 1.0,
    outgoingDamageMult: 1.0,
    damageReduction: 0,
    dodgeBonus: 0,
    regenPerSecond: 0,
    damagePerMissingHpPercent: 0,
  };
}

function getEquippedItems(items: GameState['equippedItems']): Item[] {
  return [items.weapon, items.armor, items.accessory].filter(
    (i): i is Item => i !== null,
  );
}

export function processItemProcs(
  state: GameState,
  trigger: ItemTrigger,
  context: ProcContext,
): PassiveEffects {
  const passives = getDefaultPassiveEffects();
  const items = getEquippedItems(state.equippedItems);

  for (const item of items) {
    const def = ITEM_DEFINITIONS[item.id];
    for (const effect of def.effects) {
      if (effect.trigger !== trigger) continue;

      const value = getScaledValue(effect.value, item.tier);

      switch (effect.effect) {
        // ── Passive stat modifiers ──────────────────────────────
        case 'damage_mult':
          passives.damageMult *= value;
          break;
        case 'speed_mult':
          passives.speedMult *= value;
          break;
        case 'incoming_damage_mult':
          passives.incomingDamageMult *= value;
          break;
        case 'outgoing_damage_mult':
          passives.outgoingDamageMult *= value;
          break;
        case 'damage_reduction':
          passives.damageReduction += value;
          break;
        case 'dodge_bonus':
          passives.dodgeBonus += value;
          break;
        case 'regen':
          passives.regenPerSecond += value;
          break;
        case 'damage_per_missing_hp':
          passives.damagePerMissingHpPercent += value;
          break;

        // ── Triggered effects ───────────────────────────────────
        case 'apply_poison':
          if (state.enemy && Math.random() < value) {
            addStatusEffect(state.enemy, 'poison', state.combatElapsed);
          }
          break;

        case 'apply_stun':
          if (state.enemy && effect.interval) {
            if (
              state.combatCounters.playerAttackCount % effect.interval === 0
            ) {
              addStatusEffect(state.enemy, 'stun', state.combatElapsed);
              state.combatEvents.push({
                type: 'stun',
                target: 'enemy',
                tick: state.gameTick,
              });
            }
          }
          break;

        case 'apply_curse':
          if (state.enemy) {
            addStatusEffect(state.enemy, 'curse', state.combatElapsed);
            state.combatEvents.push({
              type: 'curse',
              target: 'enemy',
              tick: state.gameTick,
            });
          }
          break;

        case 'reflect_damage':
          if (state.enemy && context.damage) {
            const reflected = Math.max(1, Math.round(context.damage * value));
            state.enemy.hp -= reflected;
            state.combatEvents.push({
              type: 'reflect',
              target: 'enemy',
              value: reflected,
              tick: state.gameTick,
            });
          }
          break;

        case 'lifesteal':
          if (context.damage) {
            const heal = Math.round(context.damage * value);
            state.player.hp = Math.min(
              state.player.maxHp,
              state.player.hp + heal,
            );
            if (heal > 0) {
              state.combatEvents.push({
                type: 'heal',
                target: 'player',
                value: heal,
                tick: state.gameTick,
              });
            }
          }
          break;

        // ── Effects handled in combat.ts (dispatcher is a no-op) ─
        case 'double_hit':
          break;
        case 'counter_attack':
          break;
        case 'bonus_attack':
          break;
        case 'intimidate':
          break;
      }
    }
  }

  return passives;
}
