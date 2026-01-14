import {
  getIcon,
  CLASS_ICONS,
  CLASS_COLORS,
  type CharacterClassKey,
} from '@/lib/icons';

interface PlayerInfoProps {
  name: string;
  playerClass: string;
  level: number;
}

export function PlayerInfo({ name, playerClass, level }: PlayerInfoProps) {
  const ClassIcon = getClassIcon(playerClass);
  const classColor = CLASS_COLORS[playerClass as CharacterClassKey] || CLASS_COLORS.warrior;

  return (
    <div className="flex items-center gap-1 xs:gap-2">
      <div style={{ color: classColor.primary }}>
        <ClassIcon className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8" />
      </div>
      <div>
        <div
          data-testid="player-path-name"
          className="pixel-text text-pixel-xs xs:text-pixel-sm sm:text-pixel-base font-bold"
          style={{ color: classColor.primary }}
        >
          {name}
        </div>
        <div className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">Level {level}</div>
      </div>
    </div>
  );
}

function getClassIcon(playerClass: string): React.ComponentType<{ className?: string }> {
  const iconNames: Record<string, string> = {
    warrior: CLASS_ICONS.WARRIOR,
    mage: CLASS_ICONS.MAGE,
    rogue: CLASS_ICONS.ROGUE,
    paladin: CLASS_ICONS.PALADIN,
  };
  const iconName = iconNames[playerClass] || CLASS_ICONS.WARRIOR;
  return getIcon(iconName);
}
