// src/ecs/systems/index.ts
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,        // 1. Process player commands first
  CooldownSystem,     // 2. Advance cooldowns
  AttackTimingSystem, // 3. Accumulate attack progress, trigger attacks
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
