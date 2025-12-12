import { useState } from 'react';
import { CharacterClass } from '@/types/game';
import { PathDefinition } from '@/types/paths';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

// Import path data for all classes
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import ROGUE_PATHS from '@/data/paths/rogue';
import PALADIN_PATHS from '@/data/paths/paladin';

interface PathSelectionScreenProps {
  characterClass: CharacterClass;
  onSelectPath: (pathId: string) => void;
}

// Map of all class paths
const CLASS_PATHS: Record<CharacterClass, PathDefinition[]> = {
  warrior: [WARRIOR_PATHS.berserker, WARRIOR_PATHS.guardian],
  mage: MAGE_PATHS,
  rogue: ROGUE_PATHS,
  paladin: PALADIN_PATHS,
};

// Type colors matching ClassSelect component
const TYPE_COLORS = {
  active: {
    primary: '#ef4444', // red-500
    secondary: '#dc2626', // red-600
    glow: 'rgba(239, 68, 68, 0.5)',
    bg: 'rgba(239, 68, 68, 0.1)',
  },
  passive: {
    primary: '#3b82f6', // blue-500
    secondary: '#2563eb', // blue-600
    glow: 'rgba(59, 130, 246, 0.5)',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
};

export function PathSelectionScreen({ characterClass, onSelectPath }: PathSelectionScreenProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const paths = CLASS_PATHS[characterClass];

  if (!paths || paths.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>No paths available for {characterClass}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSelect = () => {
    if (selectedPath) {
      onSelectPath(selectedPath);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-900/5 rounded-full blur-[120px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="pixel-title text-base sm:text-xl md:text-2xl font-bold tracking-wider uppercase">
            <span className="pixel-glow bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Choose Your Path
            </span>
          </h1>

          {/* Pixel divider */}
          <div className="flex justify-center items-center gap-2" aria-hidden="true">
            <div className="pixel-diamond bg-orange-500" />
            <div className="w-16 sm:w-24 h-[2px] bg-gradient-to-r from-orange-500/80 to-transparent" />
            <div className="pixel-diamond bg-amber-400" />
            <div className="w-16 sm:w-24 h-[2px] bg-gradient-to-l from-orange-500/80 to-transparent" />
            <div className="pixel-diamond bg-orange-500" />
          </div>

          <p className="pixel-text text-pixel-xs text-slate-400 tracking-wider">
            Each path offers a unique playstyle and powerful abilities
          </p>

          <p className="pixel-text text-pixel-xs text-slate-500 tracking-wider">
            This choice defines your journey - choose wisely
          </p>
        </div>

        {/* Path cards grid - single column on mobile, 2 columns on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {paths.map((path) => {
            const isSelected = selectedPath === path.id;
            const isHovered = hoveredPath === path.id;
            const typeColors = TYPE_COLORS[path.type];

            // Get the icon component dynamically
            const IconComponent = (Icons as any)[path.icon] || Icons.HelpCircle;

            // Get first 3-4 abilities for preview
            const previewAbilities = path.abilities
              .filter(ability => !ability.isCapstone)
              .slice(0, 4);

            return (
              <Card
                key={path.id}
                className={cn(
                  'pixel-card relative transition-all duration-200 cursor-pointer',
                  'border-2 hover:shadow-xl',
                  isSelected && 'pixel-card-selected ring-2 ring-offset-2 ring-offset-slate-950',
                  isHovered && !isSelected && 'pixel-card-hover'
                )}
                style={{
                  borderColor: isSelected || isHovered ? typeColors.primary : 'rgba(100, 100, 120, 0.3)',
                  boxShadow: isSelected || isHovered ? `0 0 30px ${typeColors.glow}` : undefined,
                  backgroundColor: isSelected ? typeColors.bg : undefined,
                  '--ring-color': typeColors.primary,
                } as React.CSSProperties}
                onClick={() => setSelectedPath(path.id)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${path.name} path - ${path.type} playstyle`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPath(path.id);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="flex-shrink-0 p-3 rounded-lg"
                        style={{
                          backgroundColor: typeColors.bg,
                          boxShadow: isSelected || isHovered ? `0 0 20px ${typeColors.glow}` : undefined,
                        }}
                      >
                        <IconComponent
                          className="w-8 h-8 sm:w-10 sm:h-10"
                          style={{ color: typeColors.primary }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle
                          className="pixel-text text-pixel-base sm:text-pixel-lg uppercase"
                          style={{ color: isSelected || isHovered ? typeColors.primary : '#e2e8f0' }}
                        >
                          {path.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn(
                            'pixel-text text-pixel-2xs uppercase mt-1',
                            'border-current'
                          )}
                          style={{
                            color: typeColors.primary,
                            borderColor: typeColors.primary,
                          }}
                        >
                          {path.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0" aria-hidden="true">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: typeColors.primary }}
                        >
                          <Icons.Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <CardDescription className="pixel-text text-pixel-xs text-slate-400 mt-3 leading-relaxed">
                    {path.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Ability preview header */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                    <Icons.Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <span className="pixel-text text-pixel-2xs text-slate-300 uppercase">
                      Ability Preview
                    </span>
                  </div>

                  {/* Preview abilities list */}
                  <div className="space-y-2">
                    {previewAbilities.map((ability) => {
                      const AbilityIcon = (Icons as any)[ability.icon] || Icons.Circle;

                      return (
                        <div
                          key={ability.id}
                          className="flex items-start gap-2 p-2 rounded bg-slate-900/50 border border-slate-700/30"
                        >
                          <AbilityIcon
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            style={{ color: typeColors.secondary }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="pixel-text text-pixel-2xs text-slate-200 font-semibold">
                              {ability.name}
                            </div>
                            <div className="pixel-text text-pixel-2xs text-slate-400 leading-relaxed mt-0.5">
                              {ability.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show total abilities count */}
                  {path.abilities.length > previewAbilities.length && (
                    <div className="text-center">
                      <span className="pixel-text text-pixel-2xs text-slate-500">
                        +{path.abilities.length - previewAbilities.length} more abilities
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPath(path.id);
                    }}
                    className={cn(
                      'w-full pixel-button text-pixel-xs uppercase font-bold',
                      'transition-all duration-150',
                      isSelected
                        ? 'border-b-4 active:border-b-2 active:translate-y-[2px]'
                        : 'border-b-4'
                    )}
                    style={{
                      backgroundColor: isSelected ? typeColors.primary : '#475569',
                      borderBottomColor: isSelected ? typeColors.secondary : '#334155',
                      color: '#ffffff',
                    }}
                    variant={isSelected ? 'default' : 'secondary'}
                  >
                    {isSelected ? 'Selected' : 'Select Path'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Confirm button */}
        <div className="text-center pt-2 sm:pt-4">
          <Button
            onClick={handleSelect}
            disabled={!selectedPath}
            size="lg"
            className={cn(
              'pixel-button-main text-pixel-sm px-6 sm:px-10 py-3 sm:py-4',
              'transition-all duration-150 uppercase font-bold',
              selectedPath
                ? 'bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 hover:border-orange-700 active:border-b-2 active:translate-y-[2px]'
                : 'bg-slate-700 border-b-4 border-slate-800 cursor-not-allowed opacity-50'
            )}
          >
            {selectedPath
              ? `Confirm ${paths.find(p => p.id === selectedPath)?.name} Path`
              : 'Select a Path'}
          </Button>
        </div>
      </div>

      {/* CSS for pixel art effects - reusing ClassSelect patterns */}
      <style>{`
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

        /* Pixel diamond shape */
        .pixel-diamond {
          width: 8px;
          height: 8px;
          transform: rotate(45deg);
        }

        /* Pixel card styling */
        .pixel-card {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        /* Only apply hover transform on devices with hover capability */
        @media (hover: hover) and (pointer: fine) {
          .pixel-card:hover {
            transform: translateY(-2px);
          }
        }

        .pixel-card-hover {
          box-shadow:
            0 0 20px var(--card-glow, rgba(255, 255, 255, 0.2)),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.1);
        }

        .pixel-card-selected {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
          box-shadow:
            0 0 30px var(--card-glow, rgba(255, 255, 255, 0.3)),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.15);
          ring-color: var(--ring-color, #ffffff);
        }

        /* Focus indicator for keyboard navigation */
        .pixel-card:focus-visible {
          outline: 3px solid var(--ring-color, #ffffff);
          outline-offset: 2px;
          box-shadow:
            0 0 20px var(--card-glow, rgba(255, 255, 255, 0.2)),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.1);
        }

        /* Button pixel style */
        .pixel-button,
        .pixel-button-main {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.3),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        /* Text sizes */
        .text-pixel-2xs { font-size: 0.5rem; line-height: 1.2; }
        .text-pixel-xs { font-size: 0.625rem; line-height: 1.3; }
        .text-pixel-sm { font-size: 0.75rem; line-height: 1.4; }
        .text-pixel-base { font-size: 0.875rem; line-height: 1.5; }
        .text-pixel-lg { font-size: 1rem; line-height: 1.5; }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .pixel-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
