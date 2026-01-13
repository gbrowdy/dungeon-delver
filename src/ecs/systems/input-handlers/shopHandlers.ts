// src/ecs/systems/input-handlers/shopHandlers.ts
/**
 * Handlers for shop commands: purchase and enhance items.
 */

import type { Command } from '../../commands';
import type { CommandHandler } from './types';
import { recomputeDerivedStats } from '@/utils/statUtils';

type PurchaseItemCommand = Extract<Command, { type: 'PURCHASE_ITEM' }>;
type EnhanceItemCommand = Extract<Command, { type: 'ENHANCE_ITEM' }>;

export const handlePurchaseItem: CommandHandler<PurchaseItemCommand> = (cmd, ctx) => {
  const { player } = ctx;
  if (!player?.inventory) return;
  if (player.inventory.gold < cmd.cost) return;

  // Deduct gold
  player.inventory.gold -= cmd.cost;

  // Initialize equipment if needed
  if (!player.equipment) {
    player.equipment = { weapon: null, armor: null, accessory: null };
  }

  // Add item to appropriate equipment slot (replacing existing)
  const item = cmd.item;
  if (item.type === 'weapon') {
    player.equipment.weapon = item;
  } else if (item.type === 'armor') {
    player.equipment.armor = item;
  } else if (item.type === 'accessory') {
    player.equipment.accessory = item;
  }

  // Apply item stat bonuses to player stats
  if (item.statBonus) {
    if (player.health && item.statBonus.maxHealth) {
      player.health.max += item.statBonus.maxHealth;
      player.health.current += item.statBonus.maxHealth;
    }
    if (player.attack && item.statBonus.power) {
      player.attack.baseDamage += item.statBonus.power;
    }
    if (player.defense && item.statBonus.armor) {
      player.defense.value += item.statBonus.armor;
    }
    if (player.speed && item.statBonus.speed) {
      player.speed.value += item.statBonus.speed;
      // Recalculate attack interval
      player.speed.attackInterval = Math.floor(2500 * (10 / player.speed.value));
    }
    if (item.statBonus.fortune) {
      // Apply fortune bonus and recompute derived stats
      player.fortune = (player.fortune ?? 0) + item.statBonus.fortune;
      recomputeDerivedStats(player);
    }
  }
};

export const handleEnhanceItem: CommandHandler<EnhanceItemCommand> = (cmd, ctx) => {
  const { player } = ctx;
  if (!player?.equipment || !player.inventory) return;

  // Get the item in the specified slot
  const equippedItem = player.equipment[cmd.slot];
  if (!equippedItem) return;

  // Check if can enhance (not at max level)
  if (equippedItem.enhancementLevel >= (equippedItem.maxEnhancement ?? 3)) return;

  // Calculate enhancement cost
  // Import logic from enhancementUtils - use tier-based pricing
  const tier = equippedItem.tier || 'starter';
  const SHOP_PRICE_RANGES: Record<string, { min: number; max: number }> = {
    starter: { min: 30, max: 60 },
    class: { min: 100, max: 150 },
    specialty: { min: 180, max: 280 },
    legendary: { min: 350, max: 500 },
  };
  const ENHANCEMENT_COST_PERCENT = 0.2;
  const priceRange = SHOP_PRICE_RANGES[tier] ?? SHOP_PRICE_RANGES.starter;
  const basePrice = Math.floor((priceRange.min + priceRange.max) / 2);
  const rawCost = Math.floor(basePrice * ENHANCEMENT_COST_PERCENT);
  const enhancementCost = Math.max(5, Math.round(rawCost / 5) * 5);

  // Check if player can afford
  if (player.inventory.gold < enhancementCost) return;

  // Deduct gold
  player.inventory.gold -= enhancementCost;

  // Get the stat bonus per enhancement (tier-based)
  const ENHANCEMENT_BONUSES: Record<string, { perStatPerLevel: number }> = {
    starter: { perStatPerLevel: 1 },
    class: { perStatPerLevel: 2 },
    specialty: { perStatPerLevel: 3 },
    legendary: { perStatPerLevel: 4 },
  };
  const enhancementConfig = ENHANCEMENT_BONUSES[tier] ?? ENHANCEMENT_BONUSES.starter;
  const bonusPerStat = enhancementConfig.perStatPerLevel;

  // Apply stat bonuses to player (one level's worth)
  let fortuneChanged = false;
  if (equippedItem.statBonus) {
    if (player.health && equippedItem.statBonus.maxHealth) {
      player.health.max += bonusPerStat;
      player.health.current += bonusPerStat;
    }
    if (player.attack && equippedItem.statBonus.power) {
      player.attack.baseDamage += bonusPerStat;
    }
    if (player.defense && equippedItem.statBonus.armor) {
      player.defense.value += bonusPerStat;
    }
    if (player.speed && equippedItem.statBonus.speed) {
      player.speed.value += bonusPerStat;
      // Recalculate attack interval
      player.speed.attackInterval = Math.floor(2500 * (10 / player.speed.value));
    }
    if (equippedItem.statBonus.fortune) {
      player.fortune = (player.fortune ?? 0) + bonusPerStat;
      fortuneChanged = true;
    }
  }

  // Recompute derived stats if fortune changed
  if (fortuneChanged) {
    recomputeDerivedStats(player);
  }

  // Upgrade the item's enhancement level
  equippedItem.enhancementLevel = (equippedItem.enhancementLevel ?? 0) + 1;
};
