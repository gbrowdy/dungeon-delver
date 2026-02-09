import type { CharacterClass } from '@/types/game';
import type { IconType } from '@/components/ui/PixelIcon';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { CLASS_DATA } from '@/data/classes';
import { CLASS_COLORS } from '@/constants/icons';
import { CLASS_ICONS, STAT_LABELS } from './constants';

interface ClassDetailsPanelProps {
  activeClass: CharacterClass | null;
}

/**
 * Panel displaying detailed information about the selected/hovered class.
 * Shows full stats grid, class description, and starting power details.
 * Displays placeholder content when no class is active.
 */
export function ClassDetailsPanel({ activeClass }: ClassDetailsPanelProps) {
  const classColors = CLASS_COLORS;

  return (
    <div
      className={`pixel-details-panel mt-4 sm:mt-6 p-4 sm:p-6 transition-opacity duration-150 min-h-[200px] sm:min-h-[180px] ${
        activeClass ? 'opacity-100' : 'opacity-40'
      }`}
      role="region"
      aria-live="polite"
      aria-label={activeClass ? `${CLASS_DATA[activeClass].name} details` : 'Hero details'}
      style={{ borderColor: activeClass ? `${classColors[activeClass].border}40` : 'rgba(100, 100, 120, 0.2)' }}
    >
      {activeClass ? (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Left: Class info */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0"
                style={{
                  filter: `drop-shadow(0 0 12px ${classColors[activeClass].glow})`,
                  color: classColors[activeClass].primary
                }}
                aria-hidden="true"
              >
                <PixelIcon type={CLASS_ICONS[activeClass]} size={48} />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="pixel-text text-pixel-base uppercase"
                  style={{ color: classColors[activeClass].primary }}
                >
                  {CLASS_DATA[activeClass].name}
                </h3>
                <p className="pixel-text text-pixel-xs text-slate-400 mt-1 leading-relaxed min-h-[2.5rem]">
                  {CLASS_DATA[activeClass].description}
                </p>
              </div>
            </div>

            {/* Full stats grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2">
              {[
                { label: 'HP', value: CLASS_DATA[activeClass].baseStats.maxHealth, color: 'text-red-400' },
                { label: 'PWR', value: CLASS_DATA[activeClass].baseStats.power, color: 'text-orange-400' },
                { label: 'ARM', value: CLASS_DATA[activeClass].baseStats.armor, color: 'text-blue-400' },
                { label: 'SPD', value: CLASS_DATA[activeClass].baseStats.speed, color: 'text-green-400' },
                { label: 'FOR', value: CLASS_DATA[activeClass].baseStats.fortune, color: 'text-purple-400' },
              ].map((stat) => (
                <div key={stat.label} className="pixel-stat-box-lg">
                  <abbr title={STAT_LABELS[stat.label]} className={`${stat.color} text-pixel-xs no-underline`}>
                    {stat.label}
                  </abbr>
                  <span className="text-slate-200 font-mono text-pixel-sm">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Starting power */}
          <div className="md:w-64 min-w-0 flex-shrink-0">
            <div className="pixel-power-box h-full" style={{ borderColor: classColors[activeClass].border }}>
              <div className="flex items-center gap-2 mb-2">
                <div style={{ color: classColors[activeClass].primary }} aria-hidden="true">
                  <PixelIcon type={CLASS_DATA[activeClass].startingPower.icon as IconType} size={24} />
                </div>
                <span
                  className="pixel-text text-pixel-sm uppercase"
                  style={{ color: classColors[activeClass].primary }}
                >
                  {CLASS_DATA[activeClass].startingPower.name}
                </span>
              </div>
              <p className="pixel-text text-pixel-2xs text-slate-400 leading-relaxed min-h-[2rem]">
                {CLASS_DATA[activeClass].startingPower.description}
              </p>
              <div className="flex gap-3 mt-2 pixel-text text-pixel-2xs">
                <span className="text-blue-400">
                  Cost: <span className="text-slate-200">{CLASS_DATA[activeClass].startingPower.resourceCost}</span>
                </span>
                <span className="text-orange-400">
                  CD: <span className="text-slate-200">{CLASS_DATA[activeClass].startingPower.cooldown}s</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Placeholder content when no class is selected */
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 opacity-30" aria-hidden="true">
                <PixelIcon type="ui-question" size={48} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="pixel-text text-pixel-base uppercase text-slate-500">
                  Select a Hero
                </h3>
                <p className="pixel-text text-pixel-xs text-slate-600 mt-1 leading-relaxed">
                  Hover over or click a hero above to see their stats and abilities
                </p>
              </div>
            </div>

            {/* Placeholder stats grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2">
              {['HP', 'PWR', 'ARM', 'SPD', 'FOR'].map((label) => (
                <div key={label} className="pixel-stat-box-lg opacity-50">
                  <span className="text-slate-500 text-pixel-xs">{label}</span>
                  <span className="text-slate-600 font-mono text-pixel-sm">--</span>
                </div>
              ))}
            </div>
          </div>

          {/* Placeholder power box */}
          <div className="md:w-64 min-w-0 flex-shrink-0">
            <div className="pixel-power-box h-full opacity-50" style={{ borderColor: 'rgba(100, 100, 120, 0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="opacity-30" aria-hidden="true">
                  <PixelIcon type="ui-sparkle" size={24} />
                </div>
                <span className="pixel-text text-pixel-sm uppercase text-slate-500">
                  Starting Power
                </span>
              </div>
              <p className="pixel-text text-pixel-2xs text-slate-600 leading-relaxed">
                Each hero begins with a unique ability
              </p>
              <div className="flex gap-3 mt-2 pixel-text text-pixel-2xs">
                <span className="text-slate-600">Cost: --</span>
                <span className="text-slate-600">CD: --</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
