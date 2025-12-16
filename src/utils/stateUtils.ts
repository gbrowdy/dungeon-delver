import type {
  Player,
  Enemy,
  Stats,
  StatusEffect,
  ActiveBuff,
  Power,
  Item,
  UpgradePurchases,
  EnemyAbility,
  EnemyIntent,
} from '@/types/game';

/**
 * Deep clone a Stats object
 */
function cloneStats(stats: Stats): Stats {
  return {
    health: stats.health,
    maxHealth: stats.maxHealth,
    power: stats.power,
    armor: stats.armor,
    speed: stats.speed,
    mana: stats.mana,
    maxMana: stats.maxMana,
    fortune: stats.fortune,
  };
}

/**
 * Deep clone an array of StatusEffect objects
 */
function cloneStatusEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects.map((effect) => ({
    id: effect.id,
    type: effect.type,
    damage: effect.damage,
    remainingTurns: effect.remainingTurns,
    icon: effect.icon,
  }));
}

/**
 * Deep clone an array of ActiveBuff objects
 */
function cloneActiveBuffs(buffs: ActiveBuff[]): ActiveBuff[] {
  return buffs.map((buff) => ({
    id: buff.id,
    name: buff.name,
    stat: buff.stat,
    multiplier: buff.multiplier,
    remainingTurns: buff.remainingTurns,
    icon: buff.icon,
  }));
}

/**
 * Deep clone an array of Power objects
 */
function clonePowers(powers: Power[]): Power[] {
  return powers.map((power) => ({
    id: power.id,
    name: power.name,
    description: power.description,
    manaCost: power.manaCost,
    cooldown: power.cooldown,
    currentCooldown: power.currentCooldown,
    effect: power.effect,
    value: power.value,
    icon: power.icon,
    upgradeLevel: power.upgradeLevel,
  }));
}

/**
 * Deep clone an array of Item objects
 */
function cloneItems(items: Item[]): Item[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    statBonus: { ...item.statBonus },
    description: item.description,
    icon: item.icon,
    effect: item.effect ? {
      trigger: item.effect.trigger,
      type: item.effect.type,
      value: item.effect.value,
      chance: item.effect.chance,
      description: item.effect.description,
    } : undefined,
    enhancementLevel: item.enhancementLevel,
    maxEnhancement: item.maxEnhancement,
    tier: item.tier,
  }));
}

// DEPRECATED: UpgradePurchases clone function removed - old upgrade system deprecated

/**
 * Deep clone an array of EnemyAbility objects
 */
function cloneEnemyAbilities(abilities: EnemyAbility[]): EnemyAbility[] {
  return abilities.map((ability) => ({
    id: ability.id,
    name: ability.name,
    type: ability.type,
    value: ability.value,
    cooldown: ability.cooldown,
    currentCooldown: ability.currentCooldown,
    chance: ability.chance,
    icon: ability.icon,
    description: ability.description,
  }));
}

/**
 * Deep clone an EnemyIntent object (or null)
 */
function cloneEnemyIntent(intent: EnemyIntent | null): EnemyIntent | null {
  if (!intent) return null;

  return {
    type: intent.type,
    damage: intent.damage,
    ability: intent.ability ? {
      id: intent.ability.id,
      name: intent.ability.name,
      type: intent.ability.type,
      value: intent.ability.value,
      cooldown: intent.ability.cooldown,
      currentCooldown: intent.ability.currentCooldown,
      chance: intent.ability.chance,
      icon: intent.ability.icon,
      description: intent.ability.description,
    } : undefined,
    icon: intent.icon,
  };
}

/**
 * Deep clone a Player object with all nested properties
 *
 * This ensures that no references are shared between the original and cloned objects,
 * preventing unintended mutations when modifying player state.
 *
 * @param player - The player object to clone
 * @returns A deep clone of the player object
 */
export function deepClonePlayer(player: Player): Player {
  return {
    name: player.name,
    class: player.class,
    level: player.level,
    experience: player.experience,
    experienceToNext: player.experienceToNext,
    gold: player.gold,
    baseStats: cloneStats(player.baseStats),
    currentStats: cloneStats(player.currentStats),
    powers: clonePowers(player.powers),
    inventory: cloneItems(player.inventory),
    equippedItems: cloneItems(player.equippedItems),
    activeBuffs: cloneActiveBuffs(player.activeBuffs),
    statusEffects: cloneStatusEffects(player.statusEffects),
    isBlocking: player.isBlocking,
    comboCount: player.comboCount,
    lastPowerUsed: player.lastPowerUsed,
    // upgradePurchases removed - old upgrade system deprecated
    isDying: player.isDying,
    path: player.path,
    pendingAbilityChoice: player.pendingAbilityChoice,
    // Path ability tracking fields
    enemyAttackCounter: player.enemyAttackCounter,
    usedCombatAbilities: player.usedCombatAbilities ? [...player.usedCombatAbilities] : [],
    usedFloorAbilities: player.usedFloorAbilities ? [...player.usedFloorAbilities] : [],
    shield: player.shield,
    shieldMaxDuration: player.shieldMaxDuration,
    shieldRemainingDuration: player.shieldRemainingDuration,
    abilityCounters: player.abilityCounters ? { ...player.abilityCounters } : undefined,
    attackModifiers: player.attackModifiers ? [...player.attackModifiers] : undefined,
    // Class-based HP regen (e.g., Paladin has 0.5)
    hpRegen: player.hpRegen,
  };
}

/**
 * Deep clone an Enemy object with all nested properties
 *
 * This ensures that no references are shared between the original and cloned objects,
 * preventing unintended mutations when modifying enemy state.
 *
 * @param enemy - The enemy object to clone
 * @returns A deep clone of the enemy object
 */
export function deepCloneEnemy(enemy: Enemy): Enemy {
  return {
    id: enemy.id,
    name: enemy.name,
    health: enemy.health,
    maxHealth: enemy.maxHealth,
    power: enemy.power,
    armor: enemy.armor,
    speed: enemy.speed,
    experienceReward: enemy.experienceReward,
    goldReward: enemy.goldReward,
    isBoss: enemy.isBoss,
    abilities: cloneEnemyAbilities(enemy.abilities),
    intent: cloneEnemyIntent(enemy.intent),
    statusEffects: cloneStatusEffects(enemy.statusEffects),
    isShielded: enemy.isShielded,
    shieldTurnsRemaining: enemy.shieldTurnsRemaining,
    isEnraged: enemy.isEnraged,
    enrageTurnsRemaining: enemy.enrageTurnsRemaining,
    basePower: enemy.basePower,
    isDying: enemy.isDying,
  };
}
