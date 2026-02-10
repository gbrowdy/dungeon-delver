// src/store/actions/draft.ts
//
// Draft card generation. Called when a draft pick is triggered (every 3 fights).
// Generates 3 stat cards weighted by class stat probabilities.

import type { GameState, DraftCard, StatType } from '@/types/game';
import { getStatProbabilities } from '@/data/classes';
import { getDraftPickValue } from '@/math/scaling';
import { calculateEffectiveness } from '@/math/damage';
import { getAttackInterval, getCritChance, getDodgeChance } from '@/math/stats';

const ALL_STATS: StatType[] = ['power', 'fortitude', 'speed', 'luck'];

/**
 * Generate 3 draft cards weighted by class stat probabilities.
 * Each card has a unique stat (no duplicate stats in a single draft).
 */
export function generateDraftCards(state: GameState): DraftCard[] {
  const probs = getStatProbabilities(state.classId);
  const cards: DraftCard[] = [];
  const usedStats = new Set<StatType>();

  for (let i = 0; i < 3; i++) {
    const stat = pickWeightedStat(probs, usedStats);
    usedStats.add(stat);

    const value = getDraftPickValue(state.floor, stat);
    const impactPreview = computeImpactPreview(state, stat, value);

    cards.push({ stat, value, impactPreview });
  }

  return cards;
}

function pickWeightedStat(
  probs: Record<StatType, number>,
  exclude: Set<StatType>,
): StatType {
  const available = ALL_STATS.filter(s => !exclude.has(s));
  if (available.length === 0) return ALL_STATS[0]; // fallback

  // Compute weights for available stats
  const weights = available.map(s => probs[s]);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }

  return available[available.length - 1];
}

function computeImpactPreview(state: GameState, stat: StatType, value: number): string {
  const player = state.player;
  const enemy = state.enemy;

  switch (stat) {
    case 'power': {
      if (!enemy) return `+${value} Power`;
      const currentEff = calculateEffectiveness(player.power, enemy.fortitude);
      const newEff = calculateEffectiveness(player.power + value, enemy.fortitude);
      const percentChange = Math.round((newEff / currentEff - 1) * 100);
      return `+${percentChange}% damage`;
    }

    case 'fortitude': {
      if (!enemy) return `+${value} Fortitude`;
      const currentEff = calculateEffectiveness(enemy.power, player.fortitude);
      const newEff = calculateEffectiveness(enemy.power, player.fortitude + value);
      const percentChange = Math.round((1 - newEff / currentEff) * 100);
      return `-${percentChange}% dmg taken`;
    }

    case 'speed': {
      const currentInterval = getAttackInterval(player.speed);
      const newInterval = getAttackInterval(player.speed + value);
      const diff = currentInterval - newInterval;
      return `-${diff}ms interval`;
    }

    case 'luck': {
      const currentCrit = getCritChance(player.luck);
      const newCrit = getCritChance(player.luck + value);
      const critDiff = Math.round((newCrit - currentCrit) * 100);
      if (critDiff > 0) return `+${critDiff}% crit`;

      const currentDodge = getDodgeChance(player.luck);
      const newDodge = getDodgeChance(player.luck + value);
      const dodgeDiff = Math.round((newDodge - currentDodge) * 1000) / 10;
      return `+${dodgeDiff}% dodge`;
    }
  }
}
