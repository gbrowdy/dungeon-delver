// src/ecs/systems/index.ts
import { InputSystem } from './input';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem, // 1. Process player commands first
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
