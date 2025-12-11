import { useState, useEffect } from 'react';

/**
 * Hook that detects if the user prefers reduced motion.
 *
 * Respects the `prefers-reduced-motion: reduce` media query.
 * Useful for conditionally disabling or simplifying animations.
 *
 * @returns {boolean} true if the user prefers reduced motion
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const reducedMotion = useReducedMotion();
 *
 *   return (
 *     <div className={cn(
 *       "sprite",
 *       !reducedMotion && "animate-sprite-walk"
 *     )}>
 *       {/* content *\/}
 *     </div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Returns appropriate animation class based on reduced motion preference.
 *
 * @param animationClass - The animation class to use when motion is allowed
 * @param fallbackClass - Optional fallback class when motion is reduced (default: no class)
 * @returns The appropriate class based on user preference
 *
 * @example
 * ```tsx
 * const reducedMotion = useReducedMotion();
 * const animClass = getAnimationClass(reducedMotion, 'animate-bounce', 'opacity-100');
 * ```
 */
export function getAnimationClass(
  prefersReducedMotion: boolean,
  animationClass: string,
  fallbackClass: string = ''
): string {
  return prefersReducedMotion ? fallbackClass : animationClass;
}
