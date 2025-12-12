import { cn } from '@/lib/utils';

interface PixelDividerProps {
  /**
   * Color scheme for the divider
   * @default 'orange'
   */
  color?: 'orange' | 'amber' | 'slate' | 'purple' | 'emerald';
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

const colorSchemes = {
  orange: {
    outer: 'bg-orange-500',
    center: 'bg-amber-400',
    gradient: 'from-orange-500/80',
  },
  amber: {
    outer: 'bg-amber-500',
    center: 'bg-yellow-400',
    gradient: 'from-amber-500/80',
  },
  slate: {
    outer: 'bg-slate-400',
    center: 'bg-slate-300',
    gradient: 'from-slate-400/80',
  },
  purple: {
    outer: 'bg-purple-500',
    center: 'bg-purple-400',
    gradient: 'from-purple-500/80',
  },
  emerald: {
    outer: 'bg-emerald-500',
    center: 'bg-emerald-400',
    gradient: 'from-emerald-500/80',
  },
} as const;

/**
 * PixelDivider - A decorative pixel-art style divider with diamond shapes and gradients
 *
 * This component provides a consistent divider design used throughout the game UI.
 * The divider consists of three diamond shapes connected by gradient lines.
 *
 * @example
 * ```tsx
 * <PixelDivider color="orange" />
 * <PixelDivider color="amber" />
 * <PixelDivider /> // defaults to orange
 * ```
 */
export function PixelDivider({ color = 'orange', className }: PixelDividerProps) {
  const scheme = colorSchemes[color];

  return (
    <div
      className={cn('flex justify-center items-center gap-2', className)}
      aria-hidden="true"
    >
      <div className={cn('pixel-diamond', scheme.outer)} />
      <div className={cn('w-16 sm:w-24 h-[2px] bg-gradient-to-r to-transparent', scheme.gradient)} />
      <div className={cn('pixel-diamond', scheme.center)} />
      <div className={cn('w-16 sm:w-24 h-[2px] bg-gradient-to-l to-transparent', scheme.gradient)} />
      <div className={cn('pixel-diamond', scheme.outer)} />
    </div>
  );
}

// Default export for convenience
export default PixelDivider;
