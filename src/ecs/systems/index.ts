// src/ecs/systems/index.ts
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';
import { EnemyAbilitySystem } from './enemy-ability';
import { CombatSystem } from './combat';
import { PowerSystem } from './power';
import { ItemEffectSystem } from './item-effect';
import { ResourceGenerationSystem } from './resource-generation';
import { PathAbilitySystem } from './path-ability';
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
  EnemyAbilitySystem,   // 4. Process enemy abilities (before combat, intercepts ability attacks)
  CombatSystem,         // 5. Resolve attacks, apply damage
  PowerSystem,          // 5. Process power casting effects
  ItemEffectSystem,         // 6. Process item proc effects (on_hit, on_crit, etc.)
  ResourceGenerationSystem, // 7. Generate path resources from combat events
  PathAbilitySystem,        // 8. Process path ability triggers
  StatusEffectSystem,   // 8. Process DoT effects (poison, bleed, etc.)
  RegenSystem,          // 9. Apply HP/MP regeneration
  DeathSystem,          // 10. Check deaths (after ALL damage)
  ProgressionSystem,    // 11. XP, level-ups (after DeathSystem awards XP)
  FlowSystem,           // 12. Phase transitions, room advancement, enemy spawning
  AnimationSystem,      // 13. Process animation event lifecycle
  CleanupSystem,        // 14. Clean up consumed events and finished entities (MUST BE LAST)
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
