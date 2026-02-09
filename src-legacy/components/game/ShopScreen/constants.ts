import type { Item } from '@/types/game';
import type { ShopTier } from '@/types/shop';

// Map tier to rarity (tiers roughly correspond to rarity levels)
export const TIER_TO_RARITY: Record<ShopTier, Item['rarity']> = {
  starter: 'common',
  class: 'uncommon',
  specialty: 'rare',
  legendary: 'legendary',
};

// Tier colors matching the design spec
export const TIER_COLORS = {
  starter: {
    primary: '#94a3b8', // slate-400
    secondary: '#64748b', // slate-500
    glow: 'rgba(148, 163, 184, 0.5)',
    bg: 'rgba(148, 163, 184, 0.1)',
  },
  class: {
    primary: '#3b82f6', // blue-500
    secondary: '#2563eb', // blue-600
    glow: 'rgba(59, 130, 246, 0.5)',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  specialty: {
    primary: '#a855f7', // purple-500
    secondary: '#9333ea', // purple-600
    glow: 'rgba(168, 85, 247, 0.5)',
    bg: 'rgba(168, 85, 247, 0.1)',
  },
  legendary: {
    primary: '#f59e0b', // amber-500
    secondary: '#d97706', // amber-600
    glow: 'rgba(245, 158, 11, 0.5)',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
};
