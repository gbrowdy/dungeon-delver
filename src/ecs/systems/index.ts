// src/ecs/systems/index.ts
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';
import { CombatSystem } from './combat';
import { DeathSystem } from './death';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,        // 1. Process player commands first
  CooldownSystem,     // 2. Advance cooldowns
  AttackTimingSystem, // 3. Accumulate attack progress, trigger attacks
  CombatSystem,       // 4. Resolve attacks, apply damage
  DeathSystem,        // 5. Check deaths (after ALL damage)
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
