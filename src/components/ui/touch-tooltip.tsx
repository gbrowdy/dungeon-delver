import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TouchTooltipProps {
  /** The content to show when tapped/clicked */
  content: ReactNode;
  /** The trigger element */
  children: ReactNode;
  /** Additional class for the tooltip popup */
  tooltipClassName?: string;
  /** Side to show tooltip: top, bottom, left, right */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * TouchTooltip - A tooltip that works on touch devices.
 * Tapping the trigger toggles the tooltip visibility.
 * Tapping outside or on the tooltip closes it.
 * On desktop, also shows on hover.
 */
export function TouchTooltip({
  content,
  children,
  tooltipClassName,
  side = 'top',
}: TouchTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 pixel-panel rounded-lg p-2 shadow-lg min-w-[120px] max-w-[200px]',
            positionClasses[side],
            tooltipClassName
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
