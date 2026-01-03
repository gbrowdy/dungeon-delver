// src/ecs/systems/index.ts
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';
import { CombatSystem } from './combat';
import { PowerSystem } from './power';
import { ItemEffectSystem } from './item-effect';
import { StatusEffectSystem } from './status-effect';
import { RegenSystem } from './regen';
import { DeathSystem } from './death';
import { ProgressionSystem } from './progression';
import { FlowSystem } from './flow';
import { AnimationSystem } from './animation';
import { CleanupSystem } from './cleanup';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,          // 1. Process player commands first
  CooldownSystem,       // 2. Advance cooldowns
  AttackTimingSystem,   // 3. Accumulate attack progress, trigger attacks
  CombatSystem,         // 4. Resolve attacks, apply damage
  PowerSystem,          // 5. Process power casting effects
  ItemEffectSystem,     // 6. Process item proc effects (on_hit, on_crit, etc.)
  StatusEffectSystem,   // 7. Process DoT effects (poison, bleed, etc.)
  RegenSystem,          // 8. Apply HP/MP regeneration
  DeathSystem,          // 9. Check deaths (after ALL damage)
  ProgressionSystem,    // 10. XP, level-ups (after DeathSystem awards XP)
  FlowSystem,           // 11. Phase transitions, room advancement, enemy spawning
  AnimationSystem,      // 12. Process animation event lifecycle
  CleanupSystem,        // 13. Clean up consumed events and finished entities (MUST BE LAST)
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
