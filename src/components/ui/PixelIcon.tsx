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

export function PixelIcon({ type, size = 16, className, animated }: PixelIconProps) {
  const [category, ...rest] = type.split('-');
  const name = rest.join('-');
  const src = `/assets/icons/${category}/${name}.png`;

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
