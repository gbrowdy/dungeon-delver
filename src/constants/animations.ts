/**
 * Animation duration constants for consistent timing across the application.
 * These provide a standardized scale for all animations and transitions.
 */

/**
 * Standard duration scale in milliseconds.
 * Use these values for consistent animation timing.
 */
export const DURATIONS = {
  /** Instant feedback (100ms) - for button clicks, micro-interactions */
  instant: 100,
  /** Fast animations (200ms) - for hover states, small transitions */
  fast: 200,
  /** Normal animations (300ms) - for most UI transitions */
  normal: 300,
  /** Slow animations (500ms) - for larger transitions, modals */
  slow: 500,
  /** Slower animations (700ms) - for complex sequences */
  slower: 700,
  /** Slowest animations (1000ms) - for dramatic effects */
  slowest: 1000,
} as const;

/**
 * Tailwind-compatible duration classes.
 */
export const DURATION_CLASSES = {
  instant: 'duration-100',
  fast: 'duration-200',
  normal: 'duration-300',
  slow: 'duration-500',
  slower: 'duration-700',
  slowest: 'duration-1000',
} as const;

/**
 * Easing functions for different animation types.
 */
export const EASINGS = {
  /** Standard easing for most animations */
  default: 'ease-out',
  /** For entering elements */
  enter: 'ease-out',
  /** For exiting elements */
  exit: 'ease-in',
  /** For bouncy/playful animations */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  /** For smooth continuous animations */
  smooth: 'ease-in-out',
} as const;

/**
 * Common transition presets combining duration and easing.
 */
export const TRANSITIONS = {
  /** Quick feedback transition */
  fast: `${DURATIONS.fast}ms ${EASINGS.default}`,
  /** Standard UI transition */
  normal: `${DURATIONS.normal}ms ${EASINGS.default}`,
  /** Smooth transition for larger elements */
  slow: `${DURATIONS.slow}ms ${EASINGS.smooth}`,
  /** Enter animation */
  enter: `${DURATIONS.normal}ms ${EASINGS.enter}`,
  /** Exit animation */
  exit: `${DURATIONS.fast}ms ${EASINGS.exit}`,
} as const;

/**
 * Tailwind-compatible transition classes.
 */
export const TRANSITION_CLASSES = {
  fast: 'transition-all duration-200 ease-out',
  normal: 'transition-all duration-300 ease-out',
  slow: 'transition-all duration-500 ease-in-out',
  colors: 'transition-colors duration-200 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
} as const;

export type DurationKey = keyof typeof DURATIONS;
export type EasingKey = keyof typeof EASINGS;
