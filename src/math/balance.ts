// src/math/balance.ts
//
// All tuning constants in one place. See design doc Section 2.
// Every magic number in the game traces back to here.

// ── Stat floors ──────────────────────────────────────────────────
export const MIN_POWER = 1;
export const MIN_FORTITUDE = 0;
export const MIN_SPEED = 3;
export const MIN_LUCK = 0;

// ── Derived stat formulas ────────────────────────────────────────
export const HP_PER_FORTITUDE = 5;
export const ATTACK_INTERVAL_NUMERATOR = 25000;
export const CRIT_CHANCE_BASE = 0.05;
export const CRIT_CHANCE_PER_LUCK = 0.02;
export const CRIT_CHANCE_CAP = 0.60;
export const CRIT_DAMAGE_BASE = 1.5;
export const CRIT_DAMAGE_PER_LUCK = 0.04;
export const CRIT_DAMAGE_CAP = 2.5;
export const DODGE_PER_LUCK = 0.008;
export const DODGE_CHANCE_CAP = 0.30;

// ── Combat timing ────────────────────────────────────────────────
export const TICK_MS = 16;
export const MAX_CATCHUP_TICKS = 10;

// ── Enrage ───────────────────────────────────────────────────────
export const ENRAGE_THRESHOLD_MS = 45_000;
export const ENRAGE_POWER_RAMP = 0.05;

// ── Enemy scaling growth rates ───────────────────────────────────
export const GROWTH_RATES = {
  hp: 0.065,
  power: 0.058,
  fortitude: 0.050,
  speed: 0.020,
} as const;

// ── Boss HP multiplier ───────────────────────────────────────────
export const BOSS_HP_MULT_BASE = 2.5;
export const BOSS_HP_MULT_PER_FLOOR = 0.005;

// ── Status effects ───────────────────────────────────────────────
export const MAX_POISON_STACKS = 5;
export const POISON_DURATION_MS = 3_000;
export const STUN_DURATION_MS = 1_000;
export const STUN_IMMUNITY_MS = 2_000;
export const MAX_CURSE_STACKS = 10;
export const CURSE_DECAY_INTERVAL_MS = 3_000;

// ── Floor structure ──────────────────────────────────────────────
export const FIRST_BOSS_FLOOR = 3;
export const BOSS_INTERVAL = 5;
export const DRAFT_FIGHT_INTERVAL = 3;
export const BREAKPOINT_INTERVAL = 25;
export const BREAKPOINT_STAT_BOOST = 0.20;

// ── Player starting stats ────────────────────────────────────────
export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_POWER = 10;
export const PLAYER_BASE_FORTITUDE = 8;
export const PLAYER_BASE_SPEED = 10;
export const PLAYER_BASE_LUCK = 5;

// ── Class innates ─────────────────────────────────────────────────
export const WARRIOR_FORTITUDE_MULT = 1.5;

// ── Endless mode ─────────────────────────────────────────────────
export const ENDLESS_START_FLOOR = 101;
export const FINAL_BOSS_FLOOR = 100;
