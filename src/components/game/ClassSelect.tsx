import { useState, useCallback } from 'react';
import { CharacterClass } from '@/types/game';
import { CLASS_DATA } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { PixelIcon, IconType } from '@/components/ui/PixelIcon';
import { CLASS_COLORS } from '@/constants/icons';

interface ClassSelectProps {
  onSelect: (characterClass: CharacterClass) => void;
}

export function ClassSelect({ onSelect }: ClassSelectProps) {
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [hoveredClass, setHoveredClass] = useState<CharacterClass | null>(null);
  const classes = Object.entries(CLASS_DATA) as [CharacterClass, typeof CLASS_DATA[CharacterClass]][];

  // Map class IDs to PixelIcon types
  const classIcons: Record<CharacterClass, IconType> = {
    warrior: 'class-warrior',
    mage: 'class-mage',
    rogue: 'class-rogue',
    paladin: 'class-paladin',
  };

  // Use shared class colors from constants
  const classColors = CLASS_COLORS;

  const activeClass = hoveredClass || selectedClass;

  // Keyboard navigation handler (Issue #4)
  const handleKeyDown = useCallback((e: React.KeyboardEvent, classId: CharacterClass) => {
    const classArray = classes.map(([id]) => id);
    const currentIndex = classArray.indexOf(classId);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % classArray.length;
      const nextElement = document.querySelector(`[data-class="${classArray[nextIndex]}"]`) as HTMLElement;
      nextElement?.focus();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + classArray.length) % classArray.length;
      const prevElement = document.querySelector(`[data-class="${classArray[prevIndex]}"]`) as HTMLElement;
      prevElement?.focus();
    }
  }, [classes]);

  // Stat label full names for accessibility (Issue #12)
  const statLabels: Record<string, string> = {
    HP: 'Health Points',
    PWR: 'Power',
    ARM: 'Armor',
    SPD: 'Speed',
    FOR: 'Fortune',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-900/5 rounded-full blur-[120px]" />
      </div>

      {/* Pixel art torches - matching MainMenu positioning (Issue #5) */}
      <div className="absolute left-8 sm:left-16 top-1/4 pixel-torch" aria-hidden="true">
        <div className="torch-flame" />
        <div className="torch-stick" />
      </div>

      <div className="absolute right-8 sm:right-16 top-1/4 pixel-torch" aria-hidden="true">
        <div className="torch-flame" />
        <div className="torch-stick" />
      </div>

      {/* Pixel stars scattered in background */}
      <div className="pixel-stars" aria-hidden="true">
        <div className="pixel-star" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '20%', right: '10%', animationDelay: '0.5s' }} />
        <div className="pixel-star" style={{ top: '70%', left: '8%', animationDelay: '1s' }} />
        <div className="pixel-star" style={{ top: '75%', right: '20%', animationDelay: '1.5s' }} />
        <div className="pixel-star" style={{ top: '5%', left: '45%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '85%', left: '55%', animationDelay: '1.2s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-5xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="pixel-title text-base sm:text-xl md:text-2xl font-bold tracking-wider uppercase">
            <span className="pixel-glow bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Choose Your Hero
            </span>
          </h1>

          {/* Pixel divider - matching MainMenu widths (Issue #6) */}
          <PixelDivider color="orange" />

          <p className="pixel-text text-pixel-xs text-slate-400 tracking-wider">
            Each hero has unique paths and abilities to master
          </p>

          {/* Instructional text for two-step flow (Issue #8) */}
          <p className="pixel-text text-pixel-xs text-slate-500 tracking-wider">
            Choose wisely — your path awaits at level 2
          </p>
        </div>

        {/* Class selection grid - single column on mobile for better touch targets (Issue #1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {classes.map(([id, data]) => {
            const isSelected = selectedClass === id;
            const isHovered = hoveredClass === id;
            const colors = classColors[id];

            return (
              <button
                key={id}
                data-class={id}
                onClick={() => setSelectedClass(id)}
                onMouseEnter={() => setHoveredClass(id)}
                onMouseLeave={() => setHoveredClass(null)}
                onKeyDown={(e) => handleKeyDown(e, id)}
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
                aria-label={`${data.name}: ${data.description}`}
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
                    <PixelIcon type={classIcons[id]} size={48} />
                  </div>
                </div>

                {/* Class name */}
                <h2
                  className="pixel-text text-pixel-sm text-center mb-2 uppercase tracking-wider"
                  style={{ color: isSelected || isHovered ? colors.primary : '#e2e8f0' }}
                >
                  {data.name}
                </h2>

                {/* Stats preview - improved mobile readability (Issue #17) */}
                <div className="grid grid-cols-2 gap-1 text-pixel-xs">
                  <div className="pixel-stat-box">
                    <abbr title="Health Points" className="text-red-400 no-underline">HP</abbr>
                    <span className="text-slate-200 font-mono">{data.baseStats.maxHealth}</span>
                  </div>
                  <div className="pixel-stat-box">
                    <abbr title="Power" className="text-orange-400 no-underline">PWR</abbr>
                    <span className="text-slate-200 font-mono">{data.baseStats.power}</span>
                  </div>
                  <div className="pixel-stat-box">
                    <abbr title="Armor" className="text-blue-400 no-underline">ARM</abbr>
                    <span className="text-slate-200 font-mono">{data.baseStats.armor}</span>
                  </div>
                  <div className="pixel-stat-box">
                    <abbr title="Speed" className="text-green-400 no-underline">SPD</abbr>
                    <span className="text-slate-200 font-mono">{data.baseStats.speed}</span>
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
          })}
        </div>

        {/* Class details panel - always present to prevent layout shift */}
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
                    <PixelIcon type={classIcons[activeClass]} size={48} />
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
                      <abbr title={statLabels[stat.label]} className={`${stat.color} text-pixel-xs no-underline`}>
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

        {/* Start button */}
        <div className="text-center pt-2 sm:pt-4">
          <Button
            onClick={() => selectedClass && onSelect(selectedClass)}
            disabled={!selectedClass}
            size="lg"
            className={`
              pixel-button-main text-pixel-sm px-6 sm:px-10 py-3 sm:py-4
              transition-all duration-150 uppercase font-bold
              ${selectedClass
                ? 'bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 hover:border-orange-700 active:border-b-2 active:translate-y-[2px]'
                : 'bg-slate-700 border-b-4 border-slate-800 cursor-not-allowed opacity-50'
              }
            `}
          >
            {selectedClass ? `Begin as ${CLASS_DATA[selectedClass].name}` : 'Select a Hero'}
          </Button>
        </div>
      </div>

      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-orange-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      </div>

      {/* CSS for pixel art effects */}
      <style>{`
        /* Pixel art torch */
        .pixel-torch {
          position: absolute;
          width: 8px;
          height: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .torch-flame {
          width: 8px;
          height: 12px;
          background: #ff6b00;
          box-shadow:
            0 -4px 0 0 #ffaa00,
            0 -8px 0 0 #ffdd00,
            4px -4px 0 0 #ff8800,
            -4px -4px 0 0 #ff8800;
          animation: flicker 1.5s infinite;
          image-rendering: pixelated;
        }

        @keyframes flicker {
          0%, 100% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              0 -8px 0 0 #ffdd00,
              4px -4px 0 0 #ff8800,
              -4px -4px 0 0 #ff8800;
            opacity: 1;
          }
          25% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              0 -8px 0 0 #ffdd00,
              4px -4px 0 0 #ff8800;
            opacity: 0.9;
          }
          50% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              4px -4px 0 0 #ff8800,
              -4px -4px 0 0 #ff8800;
            opacity: 1;
          }
          75% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              0 -8px 0 0 #ffdd00,
              -4px -4px 0 0 #ff8800;
            opacity: 0.95;
          }
        }

        .torch-stick {
          width: 4px;
          height: 20px;
          background: #654321;
          box-shadow:
            0 4px 0 0 #4a3216,
            0 8px 0 0 #4a3216;
        }

        /* Pixel stars */
        .pixel-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .pixel-star {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ffd700;
          box-shadow:
            4px 0 0 0 #ffd700,
            -4px 0 0 0 #ffd700,
            0 4px 0 0 #ffd700,
            0 -4px 0 0 #ffd700;
          animation: twinkle 3s infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* Pixel glow effect for title */
        .pixel-glow {
          filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))
                  drop-shadow(0 0 20px rgba(251, 146, 60, 0.3));
        }

        /* Pixel-style title text */
        .pixel-title {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          text-shadow:
            3px 3px 0 #1a1a2e,
            -1px -1px 0 #1a1a2e,
            1px -1px 0 #1a1a2e,
            -1px 1px 0 #1a1a2e;
          letter-spacing: 0.05em;
        }

        /* Pixel-style body text */
        .pixel-text {
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        /* Pixel card styling */
        .pixel-card {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 2px solid rgba(100, 100, 120, 0.3);
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        /* Only apply hover transform on devices with hover capability (Issue #13) */
        @media (hover: hover) and (pointer: fine) {
          .pixel-card:hover {
            transform: translateY(-2px);
          }
        }

        .pixel-card-hover {
          border-color: var(--card-border);
          box-shadow:
            0 0 20px var(--card-glow),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.1);
        }

        .pixel-card-selected {
          border-color: var(--card-color);
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
          box-shadow:
            0 0 30px var(--card-glow),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.15);
        }

        /* Focus indicator for keyboard navigation (Issue #11) */
        .pixel-card:focus-visible {
          outline: 3px solid var(--card-color);
          outline-offset: 2px;
          border-color: var(--card-border);
          box-shadow:
            0 0 20px var(--card-glow),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.1);
        }

        /* Pixel corner decorations */
        .pixel-corner {
          position: absolute;
          width: 6px;
          height: 6px;
          opacity: 0.6;
          pointer-events: none;
        }

        .pixel-card-selected .pixel-corner,
        .pixel-card-hover .pixel-corner,
        .pixel-card:focus-visible .pixel-corner {
          opacity: 1;
        }

        .pixel-corner-tl { top: -3px; left: -3px; }
        .pixel-corner-tr { top: -3px; right: -3px; }
        .pixel-corner-bl { bottom: -3px; left: -3px; }
        .pixel-corner-br { bottom: -3px; right: -3px; }

        /* Pixel stat box */
        .pixel-stat-box {
          display: flex;
          justify-content: space-between;
          padding: 3px 5px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(100, 100, 120, 0.2);
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        .pixel-stat-box-lg {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4px 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(100, 100, 120, 0.3);
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        /* Abbreviation styling */
        abbr {
          text-decoration: none;
          cursor: help;
        }

        /* Pixel checkmark */
        .pixel-checkmark {
          clip-path: polygon(
            0% 50%,
            33% 100%,
            100% 0%,
            100% 33%,
            33% 100%,
            0% 66%
          );
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
        }

        /* Details panel */
        .pixel-details-panel {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%);
          border: 2px solid rgba(203, 166, 247, 0.2);
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.3),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        /* Power box */
        .pixel-power-box {
          background: rgba(0, 0, 0, 0.4);
          border: 2px solid;
          padding: 12px;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        /* Button pixel style */
        .pixel-button-main {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.3),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        /* Icon styling */
        .pixel-icon {
          image-rendering: pixelated;
          transition: filter 0.15s ease;
        }

        /* Responsive adjustments */
        @media (min-width: 640px) {
          .torch-flame {
            width: 10px;
            height: 14px;
          }
          .torch-stick {
            width: 5px;
            height: 24px;
          }
          .pixel-star {
            width: 5px;
            height: 5px;
            box-shadow:
              5px 0 0 0 #ffd700,
              -5px 0 0 0 #ffd700,
              0 5px 0 0 #ffd700,
              0 -5px 0 0 #ffd700;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .torch-flame,
          .pixel-star {
            animation: none;
          }
          .pixel-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
