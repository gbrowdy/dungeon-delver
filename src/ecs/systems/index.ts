// src/ecs/systems/index.ts
/**
 * System registration and execution order.
 * Systems are functions that process entities each tick.
 * Order matters - earlier systems' changes are visible to later systems.
 */

// System type - all systems have the same signature
export type System = (deltaMs: number) => void;

// Systems will be added here as we implement them
// For now, start with an empty array
export const systems: System[] = [];

/**
 * Run all systems in order.
 * Called once per tick by the game loop.
 */
export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
