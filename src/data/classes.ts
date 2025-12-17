import { CharacterClass, ClassData } from '@/types/game';

// Player stats significantly nerfed to make early game challenging
export const CLASS_DATA: Record<CharacterClass, ClassData> = {
  warrior: {
    name: 'Warrior',
    description: 'A mighty fighter with high health and strong attacks. Excels in prolonged combat.',
    icon: '⚔️',
    baseStats: {
      health: 60,
      maxHealth: 60,
      power: 9,
      armor: 4,
      speed: 8,
      mana: 40,
      maxMana: 40,
      fortune: 5,
    },
    startingPower: {
      id: 'berserker-rage',
      name: 'Berserker Rage',
      description: 'Enter a fury, dealing 200% damage on next hit',
      manaCost: 20,    // Reduced for better early game viability
      cooldown: 4,     // Increased from 3
      currentCooldown: 0,
      effect: 'damage',
      value: 2.0,      // Buffed for competitive early game damage
      icon: '💢',
    },
  },
  mage: {
    name: 'Mage',
    description: 'A powerful spellcaster with devastating magical abilities but fragile defenses.',
    icon: '🔮',
    baseStats: {
      health: 40,
      maxHealth: 40,
      power: 10,
      armor: 2,
      speed: 10,
      mana: 80,
      maxMana: 80,
      fortune: 5,
    },
    startingPower: {
      id: 'fireball',
      name: 'Fireball',
      description: 'Launch a devastating fireball dealing 220% damage',
      manaCost: 40,    // Increased from 30
      cooldown: 3,     // Increased from 2
      currentCooldown: 0,
      effect: 'damage',
      value: 2.2,      // Reduced from 2.5
      icon: '🔥',
    },
  },
  rogue: {
    name: 'Rogue',
    description: 'A swift assassin with high critical and dodge chance. Strikes fast and deadly.',
    icon: '🗡️',
    baseStats: {
      health: 45,
      maxHealth: 45,
      power: 9,
      armor: 2,
      speed: 14,
      mana: 50,
      maxMana: 50,
      fortune: 10,
    },
    startingPower: {
      id: 'shadow-strike',
      name: 'Shadow Strike',
      description: 'Strike from shadows with guaranteed critical hit',
      manaCost: 25,    // Increased from 20
      cooldown: 3,     // Increased from 2
      currentCooldown: 0,
      effect: 'damage',
      value: 1.4,      // Reduced from 1.5
      icon: '🌑',
    },
  },
  paladin: {
    name: 'Paladin',
    description: 'A holy knight balancing offense and defense with healing abilities.',
    icon: '🛡️',
    baseStats: {
      health: 55,
      maxHealth: 55,
      power: 7,
      armor: 5,
      speed: 7,
      mana: 60,
      maxMana: 60,
      fortune: 5,
    },
    hpRegen: 0.5, // Paladin's innate HP regeneration
    startingPower: {
      id: 'divine-heal',
      name: 'Divine Heal',
      description: 'Restore 40% of maximum health',
      manaCost: 30,    // Reduced from 45 to be usable at start
      cooldown: 5,     // Increased from 4
      currentCooldown: 0,
      effect: 'heal',
      value: 0.4,      // Buffed from 0.3 for more impactful healing
      icon: '✨',
    },
  },
};
