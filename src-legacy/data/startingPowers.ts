import type { Power } from '@/types/game';
import type { CharacterClass } from '@/types/game';

/**
 * Generic Starting Powers (Level 1)
 *
 * All classes start with mechanically identical powers.
 * Different names/icons for class flavor, same stats.
 * These are replaced when choosing a path at level 2.
 */

const BASE_STARTING_POWER = {
  resourceCost: 15, // Uses stamina at level 1
  cooldown: 3,
  effect: 'damage' as const,
  value: 1.2, // 120% damage
  category: 'strike' as const,
  synergies: [],
  upgradeLevel: 1,
};

export const GENERIC_STARTING_POWERS: Record<CharacterClass, Power> = {
  warrior: {
    ...BASE_STARTING_POWER,
    id: 'basic-strike',
    name: 'Strike',
    description: 'A basic strike dealing 120% damage',
    icon: 'power-basic_strike',
  },
  mage: {
    ...BASE_STARTING_POWER,
    id: 'basic-zap',
    name: 'Zap',
    description: 'A basic zap dealing 120% damage',
    icon: 'power-basic_zap',
  },
  rogue: {
    ...BASE_STARTING_POWER,
    id: 'basic-slash',
    name: 'Slash',
    description: 'A basic slash dealing 120% damage',
    icon: 'power-basic_slash',
  },
  paladin: {
    ...BASE_STARTING_POWER,
    id: 'basic-smite',
    name: 'Smite',
    description: 'A basic smite dealing 120% damage',
    icon: 'power-basic_smite',
  },
};

export function getStartingPower(characterClass: CharacterClass): Power {
  return { ...GENERIC_STARTING_POWERS[characterClass] };
}
