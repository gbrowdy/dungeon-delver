// src/math/stats.ts
//
// Derived stats from the 4 core stats.
// Design doc Section 2: HP, attack interval, crit chance, crit damage, dodge chance.

const MIN_SPEED = 3;

export function getMaxHp(baseHp: number, fortitude: number): number {
  return baseHp + fortitude * 5;
}

export function getAttackInterval(speed: number): number {
  const effectiveSpeed = Math.max(speed, MIN_SPEED);
  return Math.round(25000 / effectiveSpeed);
}

export function getCritChance(luck: number): number {
  return Math.min(0.05 + luck * 0.02, 0.60);
}

export function getCritDamage(luck: number): number {
  return 1.5 + Math.min(luck * 0.04, 1.0);
}

export function getDodgeChance(luck: number): number {
  return Math.min(luck * 0.008, 0.30);
}
