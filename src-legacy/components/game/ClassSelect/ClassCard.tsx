import type { CharacterClass, ClassData } from '@/types/game';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { CLASS_ICONS } from './constants';

interface ClassCardProps {
  classId: CharacterClass;
  classData: ClassData;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  colors: {
    primary: string;
    glow: string;
    border: string;
  };
}

/**
 * Individual class selection card displaying class icon, name, and base stats.
 * Supports keyboard navigation, hover states, and selection indication.
 */
export function ClassCard({
  classId,
  classData,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onKeyDown,
  colors,
}: ClassCardProps) {
  return (
    <button
      data-class={classId}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onKeyDown={onKeyDown}
      className={`
        pixel-card relative p-4 text-left transition-all duration-150
        min-h-[140px] sm:min-h-0
        ${isSelected ? 'pixel-card-selected' : ''}
        ${isHovered && !isSelected ? 'pixel-card-hover' : ''}
      `}
      style={{
        '--card-color': colors.primary,
        '--card-glow': colors.glow,
        '--card-border': colors.border,
      } as React.CSSProperties}
      aria-pressed={isSelected}
      aria-label={`${classData.name}: ${classData.description}`}
    >
      {/* Corner decorations */}
      <div className="pixel-corner pixel-corner-tl" style={{ background: colors.primary }} />
      <div className="pixel-corner pixel-corner-tr" style={{ background: colors.primary }} />
      <div className="pixel-corner pixel-corner-bl" style={{ background: colors.primary }} />
      <div className="pixel-corner pixel-corner-br" style={{ background: colors.primary }} />

      {/* Class icon */}
      <div className="text-center mb-2 sm:mb-3">
        <div
          className="inline-block"
          style={{
            filter: isSelected || isHovered ? `drop-shadow(0 0 8px ${colors.glow})` : 'none',
            color: isSelected || isHovered ? colors.primary : '#94a3b8'
          }}
          aria-hidden="true"
        >
          <PixelIcon type={CLASS_ICONS[classId]} size={48} />
        </div>
      </div>

      {/* Class name */}
      <h2
        className="pixel-text text-pixel-sm text-center mb-2 uppercase tracking-wider"
        style={{ color: isSelected || isHovered ? colors.primary : '#e2e8f0' }}
      >
        {classData.name}
      </h2>

      {/* Stats preview - improved mobile readability (Issue #17) */}
      <div className="grid grid-cols-2 gap-1 text-pixel-xs">
        <div className="pixel-stat-box">
          <abbr title="Health Points" className="text-red-400 no-underline">HP</abbr>
          <span className="text-slate-200 font-mono">{classData.baseStats.maxHealth}</span>
        </div>
        <div className="pixel-stat-box">
          <abbr title="Power" className="text-orange-400 no-underline">PWR</abbr>
          <span className="text-slate-200 font-mono">{classData.baseStats.power}</span>
        </div>
        <div className="pixel-stat-box">
          <abbr title="Armor" className="text-blue-400 no-underline">ARM</abbr>
          <span className="text-slate-200 font-mono">{classData.baseStats.armor}</span>
        </div>
        <div className="pixel-stat-box">
          <abbr title="Speed" className="text-green-400 no-underline">SPD</abbr>
          <span className="text-slate-200 font-mono">{classData.baseStats.speed}</span>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true">
          <div
            className="w-full h-full pixel-checkmark"
            style={{ background: colors.primary }}
          />
        </div>
      )}
    </button>
  );
}
