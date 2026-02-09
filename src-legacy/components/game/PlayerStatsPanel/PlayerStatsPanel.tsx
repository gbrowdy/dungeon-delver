import * as Icons from 'lucide-react';
import type { Item } from '@/types/game';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import { ActiveEffectsBar } from '../ActiveEffectsBar';

import { PlayerInfo } from './PlayerInfo';
import { EquipmentDisplay } from './EquipmentDisplay';
import { StatsGrid } from './StatsGrid';
import { AbilitiesDisplay } from './AbilitiesDisplay';
import { XPProgressBar } from './XPProgressBar';

interface PlayerStatsPanelProps {
  player: PlayerSnapshot;
}

export function PlayerStatsPanel({ player }: PlayerStatsPanelProps) {
  const playerForUtils = {
    ...player,
    class: player.characterClass,
    currentStats: {
      power: player.effectiveStats.power.value,
      armor: player.effectiveStats.armor.value,
      speed: player.effectiveStats.speed.value,
      fortune: player.attack.critChance * 100,
    },
    experience: player.xp,
    experienceToNext: player.xpToNext,
    equippedItems: [
      player.equipment.weapon,
      player.equipment.armor,
      player.equipment.accessory,
    ].filter((item): item is Item => item !== null),
  };

  return (
    <div className="pixel-panel rounded-lg p-1.5 xs:p-2 sm:p-3">
      <div className="flex items-center justify-between flex-wrap gap-1 xs:gap-2">
        <PlayerInfo
          name={getPlayerDisplayName(player)}
          playerClass={playerForUtils.class}
          level={playerForUtils.level}
        />
        <EquipmentDisplay items={playerForUtils.equippedItems} />
      </div>

      <StatsGrid
        power={playerForUtils.currentStats.power}
        armor={playerForUtils.currentStats.armor}
        speed={playerForUtils.currentStats.speed}
        fortune={playerForUtils.currentStats.fortune}
        derivedStats={player.derivedStats}
        modifiers={{
          power: player.effectiveStats.power.modifier,
          armor: player.effectiveStats.armor.modifier,
          speed: player.effectiveStats.speed.modifier,
        }}
      />

      {player.path && player.path.abilities.length > 0 && (
        <AbilitiesDisplay abilityIds={player.path.abilities} />
      )}

      {player.passiveEffects && <ActiveEffectsBar player={player} />}

      <div className="mt-1.5 xs:mt-2 space-y-1">
        <div className="flex items-center gap-1 pixel-text text-pixel-2xs xs:text-pixel-xs">
          <span className="text-slate-400">Gold:</span>
          <span className="text-gold font-bold flex items-center gap-0.5">
            {player.gold}
            <Icons.Coins className="w-4 h-4 text-amber-400" />
          </span>
        </div>
        <XPProgressBar
          current={playerForUtils.experience}
          max={playerForUtils.experienceToNext}
        />
      </div>
    </div>
  );
}
