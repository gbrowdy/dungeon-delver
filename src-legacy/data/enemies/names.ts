/**
 * Enemy names and ability combo prefixes
 */

export const ENEMY_NAMES = {
  common: ['Goblin', 'Skeleton', 'Slime', 'Rat', 'Spider', 'Imp', 'Zombie'],
  uncommon: ['Orc', 'Dark Elf', 'Werewolf', 'Ghost', 'Harpy', 'Minotaur'],
  rare: ['Vampire', 'Demon', 'Golem', 'Lich', 'Hydra Head'],
  boss: ['Dragon', 'Archdemon', 'Death Knight', 'Elder Lich', 'Titan'],
} as const;

// Bespoke prefixes for every ability combination
// Key format: sorted ability IDs joined by '+'
export const ABILITY_COMBO_PREFIXES: Record<string, string> = {
  // Single abilities
  'double_strike': 'Swift',
  'triple_strike': 'Furious',
  'poison_bite': 'Venomous',
  'stunning_blow': 'Crushing',
  'regenerate': 'Undying',
  'enrage': 'Raging',
  'shield_bash': 'Armored',

  // Two-ability combinations
  'double_strike+enrage': 'Berserker',
  'double_strike+poison_bite': 'Viper',
  'double_strike+stunning_blow': 'Hammering',
  'enrage+triple_strike': 'Savage',
  'regenerate+stunning_blow': 'Eternal',
  'enrage+stunning_blow': 'Brutal',
  'enrage+regenerate': 'Unkillable',
  'poison_bite+regenerate': 'Plague',
  'poison_bite+stunning_blow': 'Paralyzing',
  'enrage+poison_bite': 'Feral',
  'poison_bite+triple_strike': 'Virulent',
  'enrage+shield_bash': 'Juggernaut',
  'shield_bash+stunning_blow': 'Sentinel',
  'regenerate+triple_strike': 'Relentless',

  // Three-ability combinations (rare/boss)
  'poison_bite+regenerate+stunning_blow': 'Pestilent',
  'enrage+poison_bite+triple_strike': 'Apocalypse',
  'enrage+shield_bash+triple_strike': 'Destroyer',
  'poison_bite+regenerate+triple_strike': 'Noxious',
  'enrage+regenerate+stunning_blow': 'Immortal',
  'enrage+shield_bash+stunning_blow': 'Invincible',
  'enrage+poison_bite+regenerate': 'Blighted',
  'double_strike+enrage+shield_bash': 'Champion',
  'double_strike+enrage+stunning_blow': 'Dominator',

  // Four-ability combinations (bosses)
  'enrage+poison_bite+regenerate+triple_strike': 'Cataclysmic',
  'double_strike+enrage+shield_bash+stunning_blow': 'Legendary',
  'enrage+poison_bite+regenerate+stunning_blow': 'Dread',
  'enrage+shield_bash+stunning_blow+triple_strike': 'Titanic',
};
