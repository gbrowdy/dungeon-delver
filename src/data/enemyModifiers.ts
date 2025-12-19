/**
 * Enemy Modifier System
 *
 * Modifiers are special attributes that make Rare and Elite enemies more challenging.
 * - Rare enemies: 1 modifier
 * - Elite enemies: 1-2 modifiers
 */

export interface EnemyModifier {
  id: string;
  name: string;
  description: string;
  icon: string;
  // Effect values - specific to each modifier type
  healPercent?: number;      // Vampiric: % of damage dealt healed
  reflectPercent?: number;   // Thorned: % of damage reflected
  speedBonus?: number;       // Swift: % attack speed increase
  armorBonus?: number;       // Armored: % armor increase
  enrageThreshold?: number;  // Berserking: HP % threshold for enrage
  regenPercent?: number;     // Regenerating: % HP regen per tick
}

/**
 * Active modifier effect tracking on an enemy
 * Extends the base modifier with runtime state
 */
export interface ModifierEffect extends EnemyModifier {
  isActive: boolean; // For conditional modifiers like berserking
}

/**
 * All available enemy modifiers
 */
export const ENEMY_MODIFIERS: Record<string, EnemyModifier> = {
  vampiric: {
    id: 'vampiric',
    name: 'Vampiric',
    description: 'Heals for 20% of damage dealt',
    icon: 'status-bleed',
    healPercent: 0.2,
  },
  thorned: {
    id: 'thorned',
    name: 'Thorned',
    description: 'Reflects 10% of damage taken back to attacker',
    icon: 'ability-shield',
    reflectPercent: 0.1,
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    description: 'Attacks 30% faster',
    icon: 'stat-speed',
    speedBonus: 0.3,
  },
  armored: {
    id: 'armored',
    name: 'Armored',
    description: 'Has 50% more armor',
    icon: 'stat-armor',
    armorBonus: 0.5,
  },
  berserking: {
    id: 'berserking',
    name: 'Berserking',
    description: 'Enrages when below 50% health, boosting attack',
    icon: 'ability-enrage',
    enrageThreshold: 0.5,
  },
  regenerating: {
    id: 'regenerating',
    name: 'Regenerating',
    description: 'Regenerates 2% health per tick',
    icon: 'status-regeneration',
    regenPercent: 0.02,
  },
} as const;

/**
 * Get a modifier by its ID
 */
export function getModifierById(id: string): EnemyModifier | null {
  return ENEMY_MODIFIERS[id] || null;
}

/**
 * Get random modifiers for an enemy
 * @param count Number of modifiers to select
 * @param exclude Optional array of modifier IDs to exclude
 * @returns Array of randomly selected modifiers
 */
export function getRandomModifiers(count: number, exclude: string[] = []): EnemyModifier[] {
  // Get all available modifier IDs
  const allModifierIds = Object.keys(ENEMY_MODIFIERS);

  // Filter out excluded modifiers
  const availableIds = allModifierIds.filter(id => !exclude.includes(id));

  // Clamp count to available modifiers
  const actualCount = Math.min(count, availableIds.length);

  if (actualCount === 0) {
    return [];
  }

  // Shuffle and take the first N
  const shuffled = [...availableIds].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, actualCount);

  // Map IDs to modifier objects
  return selectedIds.map(id => ENEMY_MODIFIERS[id]).filter((m): m is EnemyModifier => m !== undefined);
}

/**
 * Get all modifier IDs
 */
export function getAllModifierIds(): string[] {
  return Object.keys(ENEMY_MODIFIERS);
}

/**
 * Check if a modifier ID is valid
 */
export function isValidModifierId(id: string): boolean {
  return id in ENEMY_MODIFIERS;
}

/**
 * Convert a modifier to a ModifierEffect with initial state
 */
export function toModifierEffect(modifier: EnemyModifier): ModifierEffect {
  return {
    ...modifier,
    isActive: false, // Will be updated based on conditions (e.g., berserking threshold)
  };
}
