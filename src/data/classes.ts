import { CharacterClass, ClassData } from '@/types/game';

// Player stats significantly nerfed to make early game challenging
export const CLASS_DATA: Record<CharacterClass, ClassData> = {
  warrior: {
    name: 'Warrior',
    description: 'A mighty fighter with high health and strong attacks. Excels in prolonged combat.',
    icon: '⚔️',
    baseStats: {
      health: 55,      // Reduced from 120
      maxHealth: 55,
      attack: 8,       // Reduced from 15
      defense: 4,      // Reduced from 10
      speed: 8,
      critChance: 5,   // Reduced from 10
      dodgeChance: 2,  // Reduced from 5
      mana: 30,        // Reduced from 50
      maxMana: 30,
      hpRegen: 0,
      mpRegen: 1,      // Reduced from 2
      cooldownSpeed: 1.0,
      critDamage: 2.0,
      goldFind: 0,
    },
    startingPower: {
      id: 'berserker-rage',
      name: 'Berserker Rage',
      description: 'Enter a fury, dealing 180% damage on next hit',
      manaCost: 30,    // Increased from 25
      cooldown: 4,     // Increased from 3
      currentCooldown: 0,
      effect: 'damage',
      value: 1.8,      // Reduced from 2.0
      icon: '💢',
    },
  },
  mage: {
    name: 'Mage',
    description: 'A powerful spellcaster with devastating magical abilities but fragile defenses.',
    icon: '🔮',
    baseStats: {
      health: 38,      // Reduced from 70
      maxHealth: 38,
      attack: 10,      // Reduced from 20
      defense: 2,      // Reduced from 5
      speed: 10,
      critChance: 8,   // Reduced from 15
      dodgeChance: 4,  // Reduced from 8
      mana: 50,        // Reduced from 100
      maxMana: 50,
      hpRegen: 0,
      mpRegen: 2,      // Reduced from 3
      cooldownSpeed: 1.2,
      critDamage: 2.0,
      goldFind: 0,
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
      health: 42,      // Reduced from 80
      maxHealth: 42,
      attack: 9,       // Reduced from 18
      defense: 3,      // Reduced from 6
      speed: 12,       // Reduced from 15 to balance with sqrt scaling
      critChance: 12,  // Reduced from 25
      dodgeChance: 10, // Reduced from 20
      mana: 35,        // Reduced from 60
      maxMana: 35,
      hpRegen: 0,
      mpRegen: 1,      // Reduced from 2
      cooldownSpeed: 1.0,
      critDamage: 2.2,
      goldFind: 0.1,
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
      health: 50,      // Reduced from 100
      maxHealth: 50,
      attack: 9,       // Buffed from 7 to improve DPS
      defense: 5,      // Reduced from 12
      speed: 9,        // Buffed from 7 to reduce attack interval gap
      critChance: 4,   // Reduced from 8
      dodgeChance: 2,  // Reduced from 5
      mana: 50,        // Buffed from 40 for healing cushion
      maxMana: 50,
      hpRegen: 1.0,    // Buffed from 0.5 for better sustain
      mpRegen: 1,      // Reduced from 2
      cooldownSpeed: 1.0,
      critDamage: 2.0,
      goldFind: 0,
    },
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
