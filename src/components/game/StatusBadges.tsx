import type { EnemyModifier, StatusEffect } from '@/types/game';
import { cn } from '@/lib/utils';

const MODIFIER_COLORS: Record<EnemyModifier, string> = {
  swift: 'bg-yellow-600 text-yellow-100',
  armored: 'bg-blue-700 text-blue-100',
  berserker: 'bg-red-700 text-red-100',
  regenerating: 'bg-green-700 text-green-100',
  venomous: 'bg-purple-700 text-purple-100',
  shielded: 'bg-cyan-700 text-cyan-100',
};

const STATUS_COLORS: Record<string, string> = {
  poison: 'bg-green-600 text-green-100',
  stun: 'bg-yellow-600 text-yellow-100',
  curse: 'bg-purple-600 text-purple-100',
  shield: 'bg-cyan-600 text-cyan-100',
  regen: 'bg-emerald-600 text-emerald-100',
};

export function ModifierBadges({ modifiers }: { modifiers: EnemyModifier[] }) {
  if (modifiers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {modifiers.map(mod => (
        <span
          key={mod}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase', MODIFIER_COLORS[mod])}
        >
          {mod}
        </span>
      ))}
    </div>
  );
}

export function StatusEffectBadges({ effects }: { effects: StatusEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {effects.map((effect, i) => (
        <span
          key={`${effect.type}-${i}`}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase', STATUS_COLORS[effect.type])}
        >
          {effect.type}{effect.stacks > 1 ? ` x${effect.stacks}` : ''}
        </span>
      ))}
    </div>
  );
}
