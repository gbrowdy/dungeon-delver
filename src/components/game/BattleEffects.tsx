// Re-export all battle effects from focused modules
export * from './battle-effects';

// Import components for use in EffectsLayer
import {
  DamageNumber,
  SlashEffect,
  SpellEffect,
  HitImpact,
  type SpellEffectProps,
} from './battle-effects';

// Effect manager for coordinating multiple effects
export interface BattleEffect {
  id: string;
  type: 'damage' | 'slash' | 'spell' | 'heal' | 'miss' | 'impact';
  x: number;
  y: number;
  value?: number;
  isCrit?: boolean;
  spellType?: SpellEffectProps['type'];
}

interface EffectsLayerProps {
  effects: BattleEffect[];
  onEffectComplete: (id: string) => void;
}

export function EffectsLayer({ effects, onEffectComplete }: EffectsLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {effects.map((effect) => {
        switch (effect.type) {
          case 'damage':
            return (
              <DamageNumber
                key={effect.id}
                value={effect.value || 0}
                x={effect.x}
                y={effect.y}
                isCrit={effect.isCrit}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'heal':
            return (
              <DamageNumber
                key={effect.id}
                value={effect.value || 0}
                x={effect.x}
                y={effect.y}
                isHeal
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'miss':
            return (
              <DamageNumber
                key={effect.id}
                value={0}
                x={effect.x}
                y={effect.y}
                isMiss
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'slash':
            return (
              <SlashEffect
                key={effect.id}
                x={effect.x}
                y={effect.y}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'spell':
            return (
              <SpellEffect
                key={effect.id}
                type={effect.spellType || 'generic'}
                x={effect.x}
                y={effect.y}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'impact':
            return (
              <HitImpact
                key={effect.id}
                x={effect.x}
                y={effect.y}
                isCrit={effect.isCrit}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
