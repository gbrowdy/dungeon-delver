import { useState } from 'react';
import type { CharacterClass } from '@/types/game';
import { CLASS_DATA } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { CLASS_COLORS } from '@/constants/icons';

import { BackgroundDecor } from './BackgroundDecor';
import { ClassCard } from './ClassCard';
import { ClassDetailsPanel } from './ClassDetailsPanel';
import { useClassNavigation } from './hooks';

interface ClassSelectProps {
  onSelect: (characterClass: CharacterClass) => void;
}

export function ClassSelect({ onSelect }: ClassSelectProps) {
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [hoveredClass, setHoveredClass] = useState<CharacterClass | null>(null);
  const classes = Object.entries(CLASS_DATA) as [CharacterClass, typeof CLASS_DATA[CharacterClass]][];
  const classIds = classes.map(([id]) => id);

  const handleKeyDown = useClassNavigation(classIds);

  const activeClass = hoveredClass || selectedClass;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <BackgroundDecor />

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
            const colors = CLASS_COLORS[id];

            return (
              <ClassCard
                key={id}
                classId={id}
                classData={data}
                isSelected={isSelected}
                isHovered={isHovered}
                onSelect={() => setSelectedClass(id)}
                onHover={(hovered) => setHoveredClass(hovered ? id : null)}
                onKeyDown={(e) => handleKeyDown(e, id)}
                colors={colors}
              />
            );
          })}
        </div>

        <ClassDetailsPanel activeClass={activeClass} />

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
