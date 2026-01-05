/**
 * Resource Bar Component (Phase 6: Active Path Resources)
 *
 * Displays the player's path resource (Fury, Arcane Charges, Momentum, Zeal)
 * or mana for passive paths/pre-level-2 players.
 *
 * Features:
 * - Color-coded fill based on resource type
 * - Threshold markers showing bonus activation points
 * - Active threshold glow effects
 * - Responsive sizing
 */

import { cn } from '@/lib/utils';
import type { PathResource } from '@/types/game';
import { getResourceDisplayName } from '@/data/pathResources';

interface ResourceBarProps {
  resource: PathResource;
  thresholdMarkers?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function ResourceBar({
  resource,
  thresholdMarkers = true,
  className,
  showLabel = true,
}: ResourceBarProps) {
  const percentage = (resource.current / resource.max) * 100;
  const resourceName = getResourceDisplayName(resource.type);

  // For gain-type resources (Arcane Charges), don't animate - instant updates
  // The decay rate (5/sec) is gradual enough to look smooth without CSS transition
  const shouldAnimate = resource.resourceBehavior !== 'gain';

  // Check which thresholds are currently active
  const activeThresholds = resource.thresholds?.filter(
    t => resource.current >= t.value
  ) ?? [];
  const hasActiveThresholds = activeThresholds.length > 0;

  // Get glow color for active thresholds (slightly lighter version of bar color)
  const glowStyle = hasActiveThresholds ? {
    boxShadow: `0 0 8px 2px ${resource.color}66, inset 0 0 4px ${resource.color}33`,
  } : {};

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">{resourceName}</span>
          <span style={{ color: resource.color }}>
            {Math.floor(resource.current)} / {resource.max}
          </span>
        </div>
      )}

      <div
        className={cn(
          'resource-bar relative h-4 bg-gray-800 rounded overflow-hidden transition-shadow duration-200',
          hasActiveThresholds && 'ring-1 ring-white/20'
        )}
        style={glowStyle}
        role="progressbar"
        aria-valuenow={resource.current}
        aria-valuemin={0}
        aria-valuemax={resource.max}
        aria-label={`${resourceName}: ${Math.floor(resource.current)} of ${resource.max}`}
        data-testid={`resource-bar-${resource.type}`}
        data-resource-current={Math.floor(resource.current)}
      >
        {/* Fill bar - only animate decreases for gain-type resources */}
        <div
          className={cn(
            'absolute inset-y-0 left-0',
            shouldAnimate && 'transition-all duration-200'
          )}
          style={{
            width: `${percentage}%`,
            backgroundColor: resource.color,
          }}
        />

        {/* Threshold markers */}
        {thresholdMarkers && resource.thresholds?.map((threshold, i) => {
          const isActive = resource.current >= threshold.value;
          const position = (threshold.value / resource.max) * 100;

          return (
            <div
              key={`${threshold.value}-${i}`}
              className={cn(
                'absolute top-0 bottom-0 w-0.5 transition-all duration-200',
                isActive ? 'bg-white' : 'bg-white/30'
              )}
              style={{ left: `${position}%` }}
              title={threshold.effect.description}
            />
          );
        })}

        {/* Value label (for non-mana resources with integer max) */}
        {resource.type !== 'mana' && resource.max <= 10 && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
            {Math.floor(resource.current)}
          </span>
        )}
      </div>

      {/* Active threshold effects tooltip */}
      {hasActiveThresholds && (
        <div className="flex flex-wrap gap-1">
          {activeThresholds.map((threshold, i) => (
            <span
              key={`effect-${threshold.value}-${i}`}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80"
              style={{ borderColor: `${resource.color}44`, borderWidth: 1 }}
            >
              {threshold.effect.description}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact resource bar for use in combat UI header
 * Shows just the bar without labels or threshold effect descriptions
 * (still shows threshold marker lines for visual reference)
 */
interface CompactResourceBarProps {
  resource: PathResource;
  className?: string;
}

export function CompactResourceBar({ resource, className }: CompactResourceBarProps) {
  const percentage = (resource.current / resource.max) * 100;
  const resourceName = getResourceDisplayName(resource.type);

  return (
    <div
      className={cn(
        'relative h-2 bg-gray-800/60 rounded-full overflow-hidden',
        className
      )}
      role="progressbar"
      aria-valuenow={resource.current}
      aria-valuemin={0}
      aria-valuemax={resource.max}
      aria-label={`${resourceName}: ${Math.floor(resource.current)} of ${resource.max}`}
    >
      <div
        className="absolute inset-y-0 left-0 transition-all duration-150"
        style={{
          width: `${percentage}%`,
          backgroundColor: resource.color,
        }}
      />

      {/* Threshold markers for compact view */}
      {resource.thresholds?.map((threshold, i) => (
        <div
          key={`compact-${threshold.value}-${i}`}
          className="absolute top-0 bottom-0 w-px bg-white/40"
          style={{ left: `${(threshold.value / resource.max) * 100}%` }}
        />
      ))}
    </div>
  );
}
