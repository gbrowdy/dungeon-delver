// src/store/actions/combat.ts
//
// Core combat tick. Mutates state in-place.
// Called with a fixed dt (TICK_MS = 16ms) every logical tick.
// Integrates: item procs, status effects, modifiers, enrage, attack resolution.

import type { GameState, CombatEntity, CombatEvent } from '@/types/game';
import { calculateDamage } from '@/math/damage';
import { getAttackInterval, getCritChance, getCritDamage, getDodgeChance } from '@/math/stats';
import { WARRIOR_FORTITUDE_MULT, ROGUE_CRIT_MULT, MAGE_AMPLIFY_PER_LUCK, DODGE_CHANCE_CAP, MIN_SPEED, MIN_POWER, CURSE_REDUCTION_PER_STACK } from '@/math/balance';
import { tickStatusEffects, hasEffect, addStatusEffect } from './statusEffects';
import { tickEnrage } from './enrage';
import { tickModifierBehaviors } from './modifiers';
import { processItemProcs } from './itemProcs';
import type { PassiveEffects } from './itemProcs';
import { ITEM_DEFINITIONS, getScaledValue } from '@/data/items';
import { handleEnemyDeath, handlePlayerDeath } from './flow';

/**
 * Core combat tick. Mutates state in-place.
 */
export function tickCombat(state: GameState, dt: number): void {
  if (state.phase !== 'combat') return;
  if (!state.enemy) return;

  const player = state.player;
  const enemy = state.enemy;
  if (player.hp <= 0 || enemy.hp <= 0) return;

  // Track combat duration
  state.combatElapsed += dt;

  // Reset enemy power/speed to base each tick so modifiers compose cleanly
  enemy.power = enemy.basePower;
  enemy.speed = enemy.baseSpeed;

  // Tick enrage (sets power from basePower with ramp multiplier)
  tickEnrage(state);

  // Tick modifier behaviors (berserker multiplies current power, regen, shielded)
  tickModifierBehaviors(state, dt);

  // Apply curse stat reduction (multiplies current power — composes with enrage + berserker)
  const curse = enemy.statusEffects.find(e => e.type === 'curse');
  if (curse && curse.stacks > 0) {
    const reductionPercent = curse.stacks * CURSE_REDUCTION_PER_STACK;
    enemy.power = Math.max(MIN_POWER, Math.round(enemy.power * (1 - reductionPercent)));
    enemy.speed = Math.max(MIN_SPEED, Math.round(enemy.speed * (1 - reductionPercent)));
  }

  // Compute passive item effects
  const passives = processItemProcs(state, 'passive', {});

  // Tick player regen from items (no rounding — let fractions accumulate)
  if (passives.regenPerSecond > 0) {
    const regenPerTick = (player.maxHp * passives.regenPerSecond * dt) / 1000;
    player.hp = Math.min(player.maxHp, player.hp + regenPerTick);
  }

  // Compute effective speed (apply item speed modifiers)
  const playerEffectiveSpeed = Math.max(MIN_SPEED, Math.round(player.speed * passives.speedMult));

  // Tick attack timers
  player.attackTimer -= dt;
  enemy.attackTimer -= dt;

  // Player attacks (skip if stunned)
  if (player.attackTimer <= 0 && !hasEffect(player, 'stun')) {
    state.combatCounters.playerAttackCount += 1;
    resolvePlayerAttack(state, player, enemy, passives);
    player.attackTimer = getAttackInterval(playerEffectiveSpeed);
  }

  // Early exit if enemy died from player attack
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'enemy', tick: state.gameTick });
    handleEnemyDeath(state);
    return;
  }

  // Enemy attacks (skip if stunned)
  if (enemy.attackTimer <= 0 && !hasEffect(enemy, 'stun')) {
    resolveEnemyAttack(state, player, enemy, passives);
    enemy.attackTimer = getAttackInterval(enemy.speed);
  }

  // Early exit if player died from enemy attack
  if (player.hp <= 0) {
    player.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'player', tick: state.gameTick });
    handlePlayerDeath(state);
    return;
  }

  // Tick status effects (poison, curse decay, regen, shield)
  tickStatusEffects(state, dt);

  // Death checks after status effects (poison/reflect kills)
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'enemy', tick: state.gameTick });
    handleEnemyDeath(state);
    return;
  }
  if (player.hp <= 0) {
    player.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'player', tick: state.gameTick });
    handlePlayerDeath(state);
    return;
  }
}

function rollCrit(luck: number): { isCrit: boolean; multiplier: number } {
  const chance = getCritChance(luck);
  const isCrit = Math.random() < chance;
  return {
    isCrit,
    multiplier: isCrit ? getCritDamage(luck) : 1.0,
  };
}

function getEffectiveCritMultiplier(multiplier: number, classId: string): number {
  if (classId === 'rogue') {
    return multiplier * ROGUE_CRIT_MULT;
  }
  return multiplier;
}

function getAmplifyMultiplier(luck: number, classId: string): number {
  if (classId === 'mage') {
    return 1 + luck * MAGE_AMPLIFY_PER_LUCK;
  }
  return 1.0;
}

function getEffectiveFortitude(fortitude: number, classId: string, isDefender: boolean): number {
  if (isDefender && classId === 'warrior') {
    return Math.round(fortitude * WARRIOR_FORTITUDE_MULT);
  }
  return fortitude;
}

function resolvePlayerAttack(
  state: GameState,
  player: CombatEntity,
  enemy: CombatEntity,
  passives: PassiveEffects,
): void {
  // Check for Twin Fang double hit
  const hasTwinFang = state.equippedItems.weapon?.id === 'twin_fang';
  const hitCount = hasTwinFang ? 2 : 1;
  const hitDamageMult = hasTwinFang ? 0.55 : 1.0;

  for (let hit = 0; hit < hitCount; hit++) {
    const crit = rollCrit(player.luck);
    const critMultiplier = crit.isCrit
      ? getEffectiveCritMultiplier(crit.multiplier, state.classId)
      : 1.0;
    const result = calculateDamage(player.power, enemy.fortitude, critMultiplier);

    let damageMultiplier = getAmplifyMultiplier(player.luck, state.classId)
      * passives.damageMult * passives.outgoingDamageMult * hitDamageMult;

    if (passives.damagePerMissingHpPercent > 0) {
      const missingHpPercent = (1 - player.hp / player.maxHp) * 100;
      const bonusPercent = Math.floor(missingHpPercent / 5) * passives.damagePerMissingHpPercent;
      damageMultiplier *= (1 + bonusPercent);
    }

    let finalDamage = Math.max(1, Math.round(result.final * damageMultiplier));

    // Shield absorption — shield.stacks is the shield HP pool
    const shield = enemy.statusEffects.find(e => e.type === 'shield');
    if (shield && shield.stacks > 0) {
      const absorbed = Math.min(shield.stacks, finalDamage);
      shield.stacks -= absorbed;
      finalDamage -= absorbed;
      if (shield.stacks <= 0) {
        enemy.statusEffects = enemy.statusEffects.filter(e => e.type !== 'shield');
      }
    }

    enemy.hp -= finalDamage;
    state.lastPlayerHitDamage = finalDamage;

    emitCombatEvent(state, {
      type: crit.isCrit ? 'crit' : 'damage',
      target: 'enemy',
      value: finalDamage,
      tick: state.gameTick,
    });

    // Process on_player_attack item procs per hit (so Twin Fang double-hit procs twice)
    processItemProcs(state, 'on_player_attack', { damage: finalDamage });
  }

  // Flurry Ring: bonus attack every 5th hit
  const hasFlurryRing = state.equippedItems.accessory?.id === 'flurry_ring';
  if (hasFlurryRing && state.combatCounters.playerAttackCount % 5 === 0) {
    const crit = rollCrit(player.luck);
    const critMultiplier = crit.isCrit
      ? getEffectiveCritMultiplier(crit.multiplier, state.classId)
      : 1.0;
    const result = calculateDamage(player.power, enemy.fortitude, critMultiplier);
    const amplify = getAmplifyMultiplier(player.luck, state.classId);
    const finalDamage = Math.max(1, Math.round(result.final * amplify));
    enemy.hp -= finalDamage;

    emitCombatEvent(state, {
      type: crit.isCrit ? 'crit' : 'damage',
      target: 'enemy',
      value: finalDamage,
      tick: state.gameTick,
    });

    state.lastPlayerHitDamage = finalDamage;
    processItemProcs(state, 'on_player_attack', { damage: finalDamage });
  }
}

function resolveEnemyAttack(
  state: GameState,
  player: CombatEntity,
  enemy: CombatEntity,
  passives: PassiveEffects,
): void {
  // Dodge check (base + item bonus, capped at 30%)
  const totalDodgeChance = Math.min(
    getDodgeChance(player.luck) + passives.dodgeBonus,
    DODGE_CHANCE_CAP,
  );
  if (Math.random() < totalDodgeChance) {
    emitCombatEvent(state, { type: 'dodge', target: 'player', tick: state.gameTick });

    // Riposte Charm: counter attack on dodge (80% player power)
    if (state.equippedItems.accessory?.id === 'riposte_charm') {
      const counterPower = Math.round(player.power * 0.80);
      const counterResult = calculateDamage(counterPower, enemy.fortitude, 1.0);
      enemy.hp -= counterResult.final;
      emitCombatEvent(state, {
        type: 'damage',
        target: 'enemy',
        value: counterResult.final,
        tick: state.gameTick,
      });
    }

    // Process any other on_dodge procs
    processItemProcs(state, 'on_dodge', { damage: 0 });
    return;
  }

  const effectiveFortitude = getEffectiveFortitude(player.fortitude, state.classId, true);
  const result = calculateDamage(enemy.power, effectiveFortitude, 1.0);

  // Apply incoming damage modifiers
  let incomingDamage = result.final * passives.incomingDamageMult;
  incomingDamage *= (1 - passives.damageReduction);

  // War Cry Totem (intimidate): reduce enemy damage based on last player hit
  if (state.lastPlayerHitDamage > 0 && state.equippedItems.accessory?.id === 'war_cry_totem') {
    const totemDef = ITEM_DEFINITIONS['war_cry_totem'];
    const intimidateEffect = totemDef.effects.find(e => e.effect === 'intimidate')!;
    const scaledValue = getScaledValue(intimidateEffect.value, state.equippedItems.accessory!.tier);
    const reduction = state.lastPlayerHitDamage * scaledValue;
    incomingDamage = Math.max(1, incomingDamage - reduction);
  }

  const finalDamage = Math.max(1, Math.round(incomingDamage));
  player.hp -= finalDamage;
  state.combatCounters.playerHitCount += 1;

  emitCombatEvent(state, {
    type: 'damage',
    target: 'player',
    value: finalDamage,
    tick: state.gameTick,
  });

  // Process on_player_hit procs (Thorned Mail reflect)
  processItemProcs(state, 'on_player_hit', { damage: finalDamage });

  // Venomous modifier: enemy attacks apply poison to player
  if (state.enemyDefinition?.modifiers.includes('venomous')) {
    addStatusEffect(player, 'poison', state.combatElapsed);
  }
}

function emitCombatEvent(state: GameState, event: CombatEvent): void {
  state.combatEvents.push(event);
}
