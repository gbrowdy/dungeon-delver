/**
 * ActiveEffectsBar - displays active passive effect indicators
 *
 * RENDER ONLY - reads from snapshot, no game logic.
 */

import { Sparkles, TrendingUp, Shield, Zap, Heart, Lock } from 'lucide-react';
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface ActiveEffectsBarProps {
  player: PlayerSnapshot;
}

interface EffectIconProps {
  icon: React.ReactNode;
  active: boolean;
  label: string;
  tooltip?: string;
}

function EffectIcon({ icon, active, label, tooltip }: EffectIconProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
        active
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-gray-700/50 text-gray-500 border border-gray-600/30'
      }`}
      title={tooltip}
    >
      <span className="w-4 h-4">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function ActiveEffectsBar({ player }: ActiveEffectsBarProps) {
  const effects = player.passiveEffects;
  if (!effects) return null;

  return (
    <div className="flex flex-wrap gap-1 px-2 py-1">
      {effects.hasSurviveLethal && (
        <EffectIcon
          icon={<Sparkles className="w-4 h-4" />}
          active={!effects.survivedLethalUsed}
          label={effects.survivedLethalUsed ? 'Used' : 'Ready'}
          tooltip="Immortal Bulwark: Survive lethal once per floor"
        />
      )}

      {effects.damageStacksMax > 0 && (
        <EffectIcon
          icon={<TrendingUp className="w-4 h-4" />}
          active={effects.damageStacks > 0}
          label={`${effects.damageStacks}/${effects.damageStacksMax}`}
          tooltip={`Vengeful Strikes: +${effects.damageStacks * 10}% damage`}
        />
      )}

      {effects.nextAttackBonus > 0 && (
        <EffectIcon
          icon={<Zap className="w-4 h-4" />}
          active={true}
          label={`+${effects.nextAttackBonus}%`}
          tooltip="Retaliation: Bonus damage on next attack"
        />
      )}

      {effects.lastBastionActive && (
        <EffectIcon
          icon={<Shield className="w-4 h-4" />}
          active={true}
          label="Last Bastion"
          tooltip="Last Bastion: +50% Armor below 30% HP"
        />
      )}

      {effects.painConduitActive && (
        <EffectIcon
          icon={<Zap className="w-4 h-4" />}
          active={true}
          label="Pain Conduit"
          tooltip="Pain Conduit: Reflect doubled below 50% HP"
        />
      )}

      {effects.regenSurgeActive && (
        <EffectIcon
          icon={<Heart className="w-4 h-4" />}
          active={true}
          label="Regen Surge"
          tooltip="Regeneration Surge: HP regen doubled above 70% HP"
        />
      )}

      {(effects.isImmuneToStuns || effects.isImmuneToSlows) && (
        <EffectIcon
          icon={<Lock className="w-4 h-4" />}
          active={true}
          label="Immovable"
          tooltip="Immovable: Immune to stuns and slows"
        />
      )}

      {effects.totalReflectPercent > 0 && effects.reflectBonusPercent > 0 && (
        <EffectIcon
          icon={<Shield className="w-4 h-4" />}
          active={true}
          label={`${Math.round(effects.totalReflectPercent)}% Reflect`}
          tooltip={`Escalating Revenge: +${effects.reflectBonusPercent}% bonus reflect`}
        />
      )}
    </div>
  );
}
