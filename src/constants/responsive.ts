/**
 * Responsive design utilities and constants.
 *
 * Provides consistent responsive patterns, touch targets, and layout utilities
 * to ensure a mobile-first, accessible UI across all screen sizes.
 */

/**
 * Standard Tailwind breakpoints for reference.
 * These values are used in the responsive layout patterns below.
 */
export const BREAKPOINTS = {
  sm: '640px',  // Mobile landscape
  md: '768px',  // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large
} as const;

/**
 * Mobile-first responsive layout patterns.
 * Use these for consistent responsive behavior across components.
 */
export const RESPONSIVE = {
  // Stack patterns - vertical on mobile, horizontal on larger screens
  stack: 'flex flex-col md:flex-row',
  stackReverse: 'flex flex-col-reverse md:flex-row',
  stackGap: 'flex flex-col md:flex-row gap-4',

  // Grid patterns - progressive column expansion
  grid2: 'grid grid-cols-1 sm:grid-cols-2',
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  grid4: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  grid6: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',

  // Container max widths with horizontal padding
  containerSm: 'max-w-screen-sm mx-auto px-4',
  containerMd: 'max-w-screen-md mx-auto px-4',
  containerLg: 'max-w-screen-lg mx-auto px-4',
  containerXl: 'max-w-screen-xl mx-auto px-4 md:px-6',
} as const;

/**
 * Responsive text size patterns.
 * Use these for consistent typography that scales across devices.
 */
export const TEXT = {
  // Display text - very large headings
  display: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
  // Hero text - main titles
  hero: 'text-3xl sm:text-4xl md:text-5xl',
  // Standard headings
  h1: 'text-2xl sm:text-3xl md:text-4xl',
  h2: 'text-xl sm:text-2xl md:text-3xl',
  h3: 'text-lg sm:text-xl md:text-2xl',
  // Body text
  body: 'text-base',
  small: 'text-sm',
  xs: 'text-xs',
  // Tiny text (use sparingly, may be hard to read on mobile)
  xxs: 'text-xxs',
} as const;

/**
 * Touch target sizes for accessibility.
 * WCAG 2.5 requires minimum 44x44px for touch targets.
 */
export const TOUCH_TARGETS = {
  // Minimum touch target (44px)
  min: 'min-h-[44px] min-w-[44px]',
  // Comfortable touch target (48px)
  comfortable: 'min-h-[48px] min-w-[48px]',
  // Icon button that meets touch requirements
  iconButton: 'h-11 w-11 md:h-10 md:w-10',
  // Button padding that expands hit area on mobile
  buttonPadding: 'p-3 md:p-2',
} as const;

/**
 * Spacing scale for consistent vertical rhythm.
 * Use these instead of arbitrary space-y values.
 */
export const SPACING = {
  xs: 'space-y-2',    // 8px
  sm: 'space-y-3',    // 12px
  md: 'space-y-4',    // 16px
  lg: 'space-y-6',    // 24px
  xl: 'space-y-8',    // 32px
} as const;

/**
 * Gap scale for consistent spacing in flex/grid layouts.
 */
export const GAP = {
  xs: 'gap-1.5', // 6px
  sm: 'gap-2',   // 8px
  md: 'gap-3',   // 12px
  lg: 'gap-4',   // 16px
  xl: 'gap-6',   // 24px
} as const;

/**
 * Battle arena heights for different screen sizes.
 * Progressively larger on bigger screens.
 */
export const BATTLE_ARENA = {
  // Mobile-first heights: h-48 (192px) -> h-56 (224px) -> h-64 (256px) -> h-80 (320px)
  height: 'h-48 sm:h-56 md:h-64 lg:h-80',
  // Landscape mode (detected via media query in CSS)
  landscapeHeight: 'h-40',
} as const;

/**
 * Stat grid responsive patterns for combat/upgrade screens.
 */
export const STAT_GRIDS = {
  // Combat stats (6 items): 2 cols mobile -> 3 cols tablet -> 6 cols desktop
  combat: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2',
  // Regen/utility stats (4 items): 2 cols mobile -> 4 cols tablet+
  regen: 'grid grid-cols-2 md:grid-cols-4 gap-2',
  // Player stats panel (10 items): 5 cols mobile (2 rows) -> 10 cols larger (1 row)
  playerStats: 'grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2',
  // Upgrade buttons (12 items): 2 cols mobile -> 3 cols tablet -> 4 cols desktop -> 6 cols large
  upgrades: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2',
  // Floor complete main content: 1 col mobile -> 1 col tablet -> 3 cols desktop
  floorComplete: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6',
} as const;

/**
 * Modal/popup responsive sizing.
 */
export const MODAL = {
  // Standard modal - responsive max-width
  standard: 'w-full max-w-sm sm:max-w-md mx-4',
  // Small modal for simple confirmations
  small: 'w-full max-w-xs sm:max-w-sm mx-4',
  // Large modal for detailed content
  large: 'w-full max-w-md sm:max-w-lg md:max-w-xl mx-4',
  // Padding that adjusts for screen size
  padding: 'p-4 sm:p-5 md:p-6',
} as const;

/**
 * Equipment slot sizing for touch accessibility.
 */
export const EQUIPMENT = {
  // Equipment slot button size (meets 44px touch target)
  slotSize: 'w-11 h-11 md:w-10 md:h-10',
  // Equipment list item (clickable row)
  listItem: 'min-h-[44px] px-3 py-2',
} as const;
