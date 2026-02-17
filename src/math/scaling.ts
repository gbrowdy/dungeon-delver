// src/math/scaling.ts
//
// Enemy scaling, draft pick values, and floor structure formulas.
// Design doc Sections 4 (floor structure) and 5 (enemy scaling).

import {
  DAMPING_START,
  DRAFT_PICK_SCALE_COEFF,
  DRAFT_PICK_VARIANCE_FACTOR,
  SPEED_LUCK_SCALE_COEFF,
  BOSS_HP_MULT_BASE,
  BOSS_HP_MULT_PER_FLOOR,
} from './balance';

export function getGrowthMultiplier(floor: number, baseRate: number): number {
  if (floor <= 1) return 1;

  if (floor <= DAMPING_START) {
    return Math.pow(1 + baseRate, floor - 1);
  }

  const thresholdMult = Math.pow(1 + baseRate, DAMPING_START - 1);
  const beyondFloors = floor - DAMPING_START;
  const dampingFactor = DAMPING_START / (DAMPING_START + beyondFloors * 0.5);
  const dampedRate = baseRate * dampingFactor;

  return thresholdMult * Math.pow(1 + dampedRate, beyondFloors);
}

export type ScalingStat = 'power' | 'fortitude' | 'speed' | 'luck';

export function getDraftPickValue(floor: number, stat: ScalingStat): number {
  if (stat === 'speed' || stat === 'luck') {
    const base = 1 + Math.floor(floor * SPEED_LUCK_SCALE_COEFF);
    return base + (Math.random() < 0.5 ? 0 : 1);
  }

  const base = 3 + Math.floor(floor * DRAFT_PICK_SCALE_COEFF);
  const variance = Math.max(1, Math.floor(base * DRAFT_PICK_VARIANCE_FACTOR));
  return base + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
}

export function getRoomsPerFloor(floor: number): number {
  if (floor <= 2) return 2;
  return 4 + Math.floor(floor / 50);
}

export function getBossHpMultiplier(floor: number): number {
  return BOSS_HP_MULT_BASE + floor * BOSS_HP_MULT_PER_FLOOR;
}
