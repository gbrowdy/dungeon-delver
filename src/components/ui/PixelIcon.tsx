import { cn } from '@/lib/utils';

export type IconType =
  | `stat-${string}`
  | `status-${string}`
  | `power-${string}`
  | `item-${string}`
  | `ability-${string}`
  | `ui-${string}`
  | `class-${string}`;

interface PixelIconProps {
  type: IconType;
  size?: 16 | 24 | 32 | 48;
  className?: string;
  animated?: boolean;
}

// Map icon type categories to directory names (some are plural)
const CATEGORY_TO_DIR: Record<string, string> = {
  stat: 'stats',
  status: 'status',
  power: 'powers',
  item: 'items',
  ability: 'abilities',
  ui: 'ui',
  class: 'class',
};

export function PixelIcon({ type, size = 16, className, animated }: PixelIconProps) {
  const [category, ...rest] = type.split('-');
  const name = rest.join('-');
  // Map category to directory (e.g., 'power' -> 'powers', 'stat' -> 'stats')
  const dir = CATEGORY_TO_DIR[category] || category;
  // Use import.meta.env.BASE_URL to handle deployed base paths (e.g., /dungeon-delver/)
  const src = `${import.meta.env.BASE_URL}assets/icons/${dir}/${name}.png`;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn(
        'inline-block',
        animated && 'animate-pulse',
        className
      )}
      style={{ imageRendering: 'pixelated' }}
      onError={(e) => {
        const target = e.currentTarget;
        target.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.className = target.className;
        fallback.style.cssText = `width:${size}px;height:${size}px;background:#888;display:inline-block`;
        target.parentNode?.insertBefore(fallback, target);
      }}
    />
  );
}
