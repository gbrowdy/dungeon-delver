#!/usr/bin/env node

/**
 * Generate placeholder pixel art icons for path abilities
 *
 * This script creates 32x32 PNG icons for all path abilities across all classes.
 * Icons are thematically colored per class and use simple geometric shapes.
 *
 * Usage: node scripts/generate-path-ability-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a simple PNG file manually (without dependencies)
 */
function createPNG(width, height, pixelData) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = createChunk('IHDR', Buffer.concat([
    uInt32(width),
    uInt32(height),
    Buffer.from([8]), // bit depth
    Buffer.from([6]), // color type (RGBA)
    Buffer.from([0]), // compression
    Buffer.from([0]), // filter
    Buffer.from([0])  // interlace
  ]));

  // Convert pixel data to PNG scanlines
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const scanline = [0]; // filter type: none
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      scanline.push(
        pixelData[idx],     // R
        pixelData[idx + 1], // G
        pixelData[idx + 2], // B
        pixelData[idx + 3]  // A
      );
    }
    scanlines.push(Buffer.from(scanline));
  }

  const imageData = Buffer.concat(scanlines);
  const compressed = deflateSync(imageData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function uInt32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value, 0);
  return buf;
}

function createChunk(type, data) {
  const length = uInt32(data.length);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = uInt32(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Color palette (RGBA) - expanded for path abilities
const COLORS = {
  // Warrior colors (Red/Orange)
  red: [239, 68, 68, 255],
  redDark: [220, 38, 38, 255],
  orange: [249, 115, 22, 255],
  orangeDark: [194, 65, 12, 255],
  darkRed: [127, 29, 29, 255],

  // Mage colors (Blue/Purple)
  blue: [59, 130, 246, 255],
  blueDark: [30, 58, 138, 255],
  purple: [139, 69, 246, 255],
  purpleDark: [109, 40, 217, 255],
  cyan: [6, 182, 212, 255],

  // Rogue colors (Green/Dark)
  green: [34, 197, 94, 255],
  greenDark: [22, 163, 74, 255],
  darkGray: [31, 41, 55, 255],
  gray: [107, 114, 128, 255],

  // Paladin colors (Gold/White)
  gold: [251, 191, 36, 255],
  goldDark: [217, 119, 6, 255],
  white: [254, 243, 199, 255],
  yellow: [250, 204, 21, 255],

  // Common colors
  silver: [192, 192, 192, 255],
  poison: [132, 204, 22, 255],
  transparent: [0, 0, 0, 0]
};

// Path ability icon definitions
const PATH_ABILITY_ICONS = {
  // ============================================================================
  // WARRIOR ABILITIES (28 total)
  // ============================================================================

  // Berserker path (14 abilities)
  'warrior/blood_rage': { pattern: 'rage', colors: ['red', 'darkRed'] },
  'warrior/pain_fueled': { pattern: 'spikes', colors: ['red', 'orange'] },
  'warrior/adrenaline_rush': { pattern: 'lightning', colors: ['orange', 'red'] },
  'warrior/bloodbath': { pattern: 'splash', colors: ['darkRed', 'red'] },
  'warrior/reckless_fury': { pattern: 'flame', colors: ['red', 'orange'] },
  'warrior/battle_trance': { pattern: 'spiral', colors: ['orange', 'red'] },

  // Warlord subpath
  'warrior/intimidating_presence': { pattern: 'aura', colors: ['orange', 'darkRed'] },
  'warrior/warlord_command': { pattern: 'crown', colors: ['orange', 'red'] },
  'warrior/crushing_blows': { pattern: 'hammer', colors: ['orange', 'orangeDark'] },

  // Executioner subpath
  'warrior/executioners_strike': { pattern: 'axe', colors: ['red', 'darkRed'] },
  'warrior/killing_spree': { pattern: 'multislash', colors: ['red', 'orange'] },
  'warrior/mortal_wounds': { pattern: 'wound', colors: ['darkRed', 'red'] },

  // Berserker capstone
  'warrior/undying_fury': { pattern: 'phoenix', colors: ['orange', 'red'] },

  // Guardian path (14 abilities)
  'warrior/iron_skin': { pattern: 'armor', colors: ['silver', 'gray'] },
  'warrior/regeneration': { pattern: 'heartbeat', colors: ['red', 'orange'] },
  'warrior/damage_reduction': { pattern: 'shield', colors: ['orange', 'orangeDark'] },
  'warrior/auto_block': { pattern: 'barrier', colors: ['orange', 'red'] },
  'warrior/last_stand': { pattern: 'anchor', colors: ['red', 'darkRed'] },
  'warrior/endurance': { pattern: 'mountain', colors: ['orange', 'orangeDark'] },

  // Fortress subpath
  'warrior/fortress_stance': { pattern: 'wall', colors: ['orange', 'red'] },
  'warrior/immovable_object': { pattern: 'rock', colors: ['orangeDark', 'darkRed'] },
  'warrior/healing_aura': { pattern: 'cross', colors: ['orange', 'red'] },

  // Avenger subpath
  'warrior/thorns': { pattern: 'thorns', colors: ['orange', 'red'] },
  'warrior/vengeful_strike': { pattern: 'counter', colors: ['red', 'orange'] },
  'warrior/retribution': { pattern: 'reflect', colors: ['orange', 'red'] },

  // Guardian capstone
  'warrior/immortal_guardian': { pattern: 'fortress', colors: ['orange', 'red'] },

  // ============================================================================
  // MAGE ABILITIES (24 total)
  // ============================================================================

  // Archmage path (12 abilities)
  'mage/archmage_spell_power': { pattern: 'power', colors: ['purple', 'purpleDark'] },
  'mage/archmage_mana_efficiency': { pattern: 'diamond', colors: ['blue', 'purple'] },
  'mage/archmage_cooldown_mastery': { pattern: 'clock', colors: ['purple', 'blue'] },
  'mage/archmage_spell_crit': { pattern: 'starburst', colors: ['purple', 'purpleDark'] },

  // Elementalist subpath
  'mage/elementalist_fire_mastery': { pattern: 'flame', colors: ['orange', 'red'] },
  'mage/elementalist_ice_mastery': { pattern: 'snowflake', colors: ['cyan', 'blue'] },
  'mage/elementalist_lightning_mastery': { pattern: 'lightning', colors: ['yellow', 'purple'] },
  'mage/elementalist_elemental_convergence': { pattern: 'triforce', colors: ['purple', 'blue'] },

  // Destroyer subpath
  'mage/destroyer_overwhelming_power': { pattern: 'explosion', colors: ['purple', 'purpleDark'] },
  'mage/destroyer_spell_surge': { pattern: 'wave', colors: ['purple', 'blue'] },
  'mage/destroyer_glass_cannon': { pattern: 'crystal', colors: ['purple', 'cyan'] },
  'mage/destroyer_apocalypse': { pattern: 'meteor', colors: ['purple', 'red'] },

  // Enchanter path (12 abilities)
  'mage/enchanter_passive_power': { pattern: 'circle', colors: ['blue', 'purple'] },
  'mage/enchanter_mana_regen': { pattern: 'flow', colors: ['blue', 'cyan'] },
  'mage/enchanter_damage_aura': { pattern: 'aura', colors: ['purple', 'blue'] },
  'mage/enchanter_dot_amplify': { pattern: 'poison', colors: ['purple', 'green'] },

  // Spellweaver subpath
  'mage/spellweaver_auto_cast': { pattern: 'auto', colors: ['blue', 'purple'] },
  'mage/spellweaver_chain_cast': { pattern: 'chain', colors: ['blue', 'cyan'] },
  'mage/spellweaver_efficient_automation': { pattern: 'gears', colors: ['blue', 'purple'] },
  'mage/spellweaver_arcane_assembly': { pattern: 'matrix', colors: ['purple', 'blue'] },

  // Sage subpath
  'mage/sage_wisdom_aura': { pattern: 'book', colors: ['purple', 'blue'] },
  'mage/sage_toxic_field': { pattern: 'cloud', colors: ['poison', 'purple'] },
  'mage/sage_arcane_field': { pattern: 'field', colors: ['purple', 'blue'] },
  'mage/sage_overwhelming_presence': { pattern: 'radiance', colors: ['purple', 'purpleDark'] },

  // ============================================================================
  // ROGUE ABILITIES (16 total)
  // ============================================================================

  // Assassin path (8 abilities)
  'rogue/rogue_assassin_vital_strike': { pattern: 'dagger', colors: ['green', 'darkGray'] },
  'rogue/rogue_assassin_ambush': { pattern: 'shadow', colors: ['darkGray', 'green'] },
  'rogue/rogue_assassin_precision': { pattern: 'crosshair', colors: ['green', 'greenDark'] },
  'rogue/rogue_assassin_ruthless_efficiency': { pattern: 'multistab', colors: ['green', 'darkGray'] },
  'rogue/rogue_assassin_killing_spree': { pattern: 'daggers', colors: ['green', 'greenDark'] },
  'rogue/rogue_assassin_execute': { pattern: 'skull', colors: ['darkGray', 'green'] },
  'rogue/rogue_assassin_shadow_dance': { pattern: 'dance', colors: ['green', 'darkGray'] },
  'rogue/rogue_assassin_death_mark': { pattern: 'mark', colors: ['darkGray', 'green'] },

  // Duelist path (8 abilities)
  'rogue/rogue_duelist_riposte': { pattern: 'parry', colors: ['green', 'silver'] },
  'rogue/rogue_duelist_en_garde': { pattern: 'stance', colors: ['green', 'greenDark'] },
  'rogue/rogue_duelist_blade_dancer': { pattern: 'spin', colors: ['green', 'darkGray'] },
  'rogue/rogue_duelist_evasion': { pattern: 'dodge', colors: ['green', 'greenDark'] },
  'rogue/rogue_duelist_uncanny_dodge': { pattern: 'reflex', colors: ['green', 'darkGray'] },
  'rogue/rogue_duelist_blur': { pattern: 'blur', colors: ['greenDark', 'darkGray'] },
  'rogue/rogue_duelist_perfect_form': { pattern: 'perfection', colors: ['green', 'silver'] },
  'rogue/rogue_duelist_shadowstep': { pattern: 'teleport', colors: ['darkGray', 'green'] },

  // ============================================================================
  // PALADIN ABILITIES (16 total)
  // ============================================================================

  // Crusader path (8 abilities)
  'paladin/holy_strike': { pattern: 'smite', colors: ['gold', 'white'] },
  'paladin/righteous_fury': { pattern: 'halo', colors: ['gold', 'yellow'] },
  'paladin/smite_the_wicked': { pattern: 'holyflame', colors: ['gold', 'white'] },
  'paladin/mark_of_judgment': { pattern: 'judgment', colors: ['gold', 'goldDark'] },
  'paladin/weakening_light': { pattern: 'beam', colors: ['white', 'gold'] },
  'paladin/divine_condemnation': { pattern: 'condemn', colors: ['gold', 'yellow'] },
  'paladin/crusader_holy_avenger': { pattern: 'wings', colors: ['gold', 'white'] },
  'paladin/crusader_divine_wrath': { pattern: 'wrath', colors: ['gold', 'yellow'] },

  // Protector path (8 abilities)
  'paladin/blessed_recovery': { pattern: 'blessing', colors: ['gold', 'white'] },
  'paladin/healing_ward': { pattern: 'ward', colors: ['gold', 'yellow'] },
  'paladin/shield_of_renewal': { pattern: 'holyshield', colors: ['gold', 'white'] },
  'paladin/enduring_faith': { pattern: 'faith', colors: ['gold', 'goldDark'] },
  'paladin/armor_of_sacrifice': { pattern: 'sacrifice', colors: ['gold', 'white'] },
  'paladin/last_stand': { pattern: 'stand', colors: ['gold', 'goldDark'] },
  'paladin/protector_eternal_guardian': { pattern: 'guardian', colors: ['gold', 'white'] },
  'paladin/protector_unbreakable_will': { pattern: 'unbreakable', colors: ['gold', 'yellow'] },
};

/**
 * Create pixel pattern for 32x32 icons
 */
function createPixelPattern(pattern, colorNames) {
  const size = 32;
  const pixels = new Array(size * size * 4).fill(0);

  const [primaryName, secondaryName] = colorNames;
  const primary = COLORS[primaryName];
  const secondary = COLORS[secondaryName];

  const setPixel = (x, y, color) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      const idx = (y * size + x) * 4;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3];
    }
  };

  const fillRect = (x, y, w, h, color) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(x + dx, y + dy, color);
      }
    }
  };

  const fillCircle = (cx, cy, radius, color) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < radius) {
          setPixel(x, y, color);
        }
      }
    }
  };

  const center = 16;

  // Create pattern based on ability theme
  switch (pattern) {
    // === WARRIOR PATTERNS ===
    case 'rage':
      // Angry face/rage symbol
      fillCircle(center, center, 12, primary);
      fillRect(10, 12, 3, 4, secondary); // Left eye
      fillRect(19, 12, 3, 4, secondary); // Right eye
      fillRect(12, 20, 8, 2, secondary); // Angry mouth
      break;

    case 'spikes':
      // Spiky pattern
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = center + Math.cos(angle) * 6;
        const y1 = center + Math.sin(angle) * 6;
        const x2 = center + Math.cos(angle) * 14;
        const y2 = center + Math.sin(angle) * 14;
        for (let j = 0; j < 8; j++) {
          const t = j / 7;
          const x = Math.floor(x1 + (x2 - x1) * t);
          const y = Math.floor(y1 + (y2 - y1) * t);
          fillRect(x - 1, y - 1, 2, 2, j < 4 ? primary : secondary);
        }
      }
      break;

    case 'lightning':
      // Lightning bolt
      fillRect(14, 4, 4, 8, primary);
      fillRect(10, 12, 8, 4, primary);
      fillRect(14, 16, 4, 8, secondary);
      fillRect(18, 20, 4, 8, secondary);
      break;

    case 'splash':
      // Blood splash
      fillCircle(center, center, 10, primary);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = center + Math.cos(angle) * 12;
        const y = center + Math.sin(angle) * 12;
        fillCircle(Math.floor(x), Math.floor(y), 2, secondary);
      }
      break;

    case 'flame':
      // Flame shape
      fillRect(14, 24, 4, 4, secondary);
      fillRect(12, 20, 8, 4, secondary);
      fillRect(10, 16, 12, 4, primary);
      fillRect(12, 12, 8, 4, primary);
      fillRect(14, 8, 4, 4, primary);
      break;

    case 'spiral':
      // Spiral pattern
      for (let i = 0; i < 360; i += 10) {
        const angle = (i / 180) * Math.PI;
        const radius = (i / 360) * 12;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 2, i < 180 ? primary : secondary);
      }
      break;

    case 'aura':
      // Radiating aura
      fillCircle(center, center, 8, primary);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = center + Math.cos(angle) * 12;
        const y = center + Math.sin(angle) * 12;
        fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3, secondary);
      }
      break;

    case 'crown':
      // Crown shape
      fillRect(8, 16, 16, 6, primary);
      fillRect(8, 12, 2, 4, secondary);
      fillRect(15, 10, 2, 6, secondary);
      fillRect(22, 12, 2, 4, secondary);
      break;

    case 'hammer':
      // Hammer
      fillRect(14, 20, 4, 8, secondary);
      fillRect(8, 10, 16, 8, primary);
      fillRect(10, 12, 12, 4, secondary);
      break;

    case 'axe':
      // Axe blade
      fillRect(14, 20, 4, 8, secondary);
      fillRect(6, 8, 20, 10, primary);
      fillRect(8, 10, 16, 6, secondary);
      break;

    case 'multislash':
      // Multiple slash marks
      for (let i = 0; i < 3; i++) {
        fillRect(8 + i * 6, 6, 2, 20, i % 2 === 0 ? primary : secondary);
      }
      break;

    case 'wound':
      // Wound/gash
      fillRect(8, 14, 16, 4, primary);
      fillRect(10, 12, 12, 8, secondary);
      fillRect(6, 15, 20, 2, secondary);
      break;

    case 'phoenix':
      // Phoenix/bird
      fillRect(14, 16, 4, 8, secondary);
      fillRect(8, 12, 16, 6, primary);
      fillRect(6, 8, 4, 6, primary);
      fillRect(22, 8, 4, 6, primary);
      break;

    case 'armor':
      // Armor plates
      fillRect(10, 8, 12, 16, primary);
      fillRect(12, 10, 8, 12, secondary);
      fillRect(8, 12, 16, 2, primary);
      fillRect(8, 18, 16, 2, primary);
      break;

    case 'heartbeat':
      // Heart with pulse
      fillRect(10, 10, 4, 4, primary);
      fillRect(18, 10, 4, 4, primary);
      fillRect(8, 14, 16, 6, primary);
      fillRect(10, 20, 12, 4, secondary);
      fillRect(12, 24, 8, 2, secondary);
      break;

    case 'shield':
      // Shield
      fillRect(10, 6, 12, 18, primary);
      fillRect(12, 8, 8, 14, secondary);
      fillRect(14, 10, 4, 10, primary);
      break;

    case 'barrier':
      // Energy barrier
      for (let i = 0; i < 4; i++) {
        fillRect(8 + i * 6, 6, 3, 20, i % 2 === 0 ? primary : secondary);
      }
      break;

    case 'anchor':
      // Anchor
      fillRect(14, 8, 4, 16, primary);
      fillRect(10, 8, 12, 4, primary);
      fillRect(8, 20, 7, 4, secondary);
      fillRect(17, 20, 7, 4, secondary);
      break;

    case 'mountain':
      // Mountain
      fillRect(14, 20, 4, 8, secondary);
      fillRect(12, 16, 8, 4, secondary);
      fillRect(10, 12, 12, 4, primary);
      fillRect(8, 8, 16, 4, primary);
      break;

    case 'wall':
      // Wall pattern
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 3; x++) {
          fillRect(6 + x * 8 + (y % 2) * 4, 8 + y * 6, 6, 4, y % 2 === 0 ? primary : secondary);
        }
      }
      break;

    case 'rock':
      // Rock/boulder
      fillCircle(center, center, 10, primary);
      fillRect(10, 12, 12, 8, secondary);
      fillRect(12, 10, 8, 12, secondary);
      break;

    case 'cross':
      // Cross/plus
      fillRect(14, 6, 4, 20, primary);
      fillRect(6, 14, 20, 4, primary);
      fillRect(12, 8, 8, 16, secondary);
      fillRect(8, 12, 16, 8, secondary);
      break;

    case 'thorns':
      // Thorny pattern
      fillCircle(center, center, 8, primary);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = center + Math.cos(angle) * 10;
        const y = center + Math.sin(angle) * 10;
        fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 4, secondary);
      }
      break;

    case 'counter':
      // Counter-attack
      fillRect(8, 14, 12, 4, primary);
      fillRect(20, 10, 4, 12, secondary);
      fillRect(16, 12, 8, 8, secondary);
      break;

    case 'reflect':
      // Reflect arrows
      fillRect(6, 14, 10, 4, primary);
      fillRect(16, 14, 10, 4, secondary);
      fillRect(6, 10, 4, 4, primary);
      fillRect(22, 18, 4, 4, secondary);
      break;

    case 'fortress':
      // Fortress/castle
      fillRect(8, 12, 16, 14, primary);
      fillRect(10, 14, 12, 10, secondary);
      fillRect(8, 8, 4, 4, primary);
      fillRect(20, 8, 4, 4, primary);
      fillRect(14, 8, 4, 4, primary);
      break;

    // === MAGE PATTERNS ===
    case 'power':
      // Power symbol
      fillCircle(center, center, 10, primary);
      fillRect(14, 6, 4, 20, secondary);
      fillRect(6, 14, 20, 4, secondary);
      break;

    case 'diamond':
      // Diamond/mana crystal
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const dx = Math.abs(x - center);
          const dy = Math.abs(y - center);
          if (dx + dy < 12) {
            setPixel(x, y, dy < 6 ? primary : secondary);
          }
        }
      }
      break;

    case 'clock':
      // Clock face
      fillCircle(center, center, 10, primary);
      fillCircle(center, center, 7, secondary);
      fillRect(15, 8, 2, 8, primary); // Hour hand
      fillRect(15, 16, 6, 2, secondary); // Minute hand
      break;

    case 'starburst':
      // Starburst
      fillRect(15, 0, 2, 32, primary);
      fillRect(0, 15, 32, 2, primary);
      for (let i = 0; i < 32; i++) {
        if (i > 2 && i < 29) {
          setPixel(i, i, secondary);
          setPixel(i, 31 - i, secondary);
        }
      }
      break;

    case 'snowflake':
      // Snowflake
      fillRect(15, 6, 2, 20, primary);
      fillRect(6, 15, 20, 2, primary);
      for (let i = 8; i < 24; i++) {
        setPixel(i, i, secondary);
        setPixel(i, 31 - i, secondary);
      }
      fillCircle(center, center, 4, secondary);
      break;

    case 'triforce':
      // Three triangles
      fillRect(14, 8, 4, 8, primary);
      fillRect(8, 18, 8, 6, secondary);
      fillRect(16, 18, 8, 6, secondary);
      break;

    case 'explosion':
      // Explosion
      fillCircle(center, center, 8, primary);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const x = center + Math.cos(angle) * 12;
        const y = center + Math.sin(angle) * 12;
        fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3, secondary);
      }
      break;

    case 'wave':
      // Wave pattern
      for (let x = 0; x < 32; x++) {
        const y = 16 + Math.sin((x / 32) * Math.PI * 4) * 6;
        fillRect(x, Math.floor(y) - 1, 1, 3, x % 4 < 2 ? primary : secondary);
      }
      break;

    case 'crystal':
      // Crystal
      fillRect(14, 8, 4, 16, primary);
      fillRect(12, 12, 8, 8, secondary);
      fillRect(10, 16, 12, 4, primary);
      break;

    case 'meteor':
      // Meteor
      fillCircle(20, 12, 6, primary);
      for (let i = 0; i < 5; i++) {
        fillRect(4 + i * 2, 16 + i * 2, 6 - i, 2, secondary);
      }
      break;

    case 'circle':
      // Simple circle
      fillCircle(center, center, 10, primary);
      fillCircle(center, center, 6, secondary);
      break;

    case 'flow':
      // Flowing pattern
      for (let i = 0; i < 8; i++) {
        const y = 4 + i * 3;
        const offset = (i % 2) * 4;
        fillRect(8 + offset, y, 12, 2, i % 2 === 0 ? primary : secondary);
      }
      break;

    case 'poison':
      // Poison droplet
      fillCircle(center, 18, 8, primary);
      fillRect(14, 10, 4, 8, primary);
      fillRect(12, 14, 8, 2, secondary);
      break;

    case 'auto':
      // Automation gears
      fillCircle(12, 12, 6, primary);
      fillCircle(20, 20, 6, secondary);
      fillRect(14, 14, 4, 4, primary);
      break;

    case 'chain':
      // Chain links
      for (let i = 0; i < 4; i++) {
        fillCircle(10 + i * 4, 16, 3, i % 2 === 0 ? primary : secondary);
      }
      break;

    case 'gears':
      // Multiple gears
      fillCircle(12, 12, 5, primary);
      fillCircle(20, 20, 5, secondary);
      fillRect(10, 10, 4, 4, primary);
      fillRect(18, 18, 4, 4, secondary);
      break;

    case 'matrix':
      // Grid pattern
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          fillRect(6 + x * 6, 6 + y * 6, 4, 4, (x + y) % 2 === 0 ? primary : secondary);
        }
      }
      break;

    case 'book':
      // Book
      fillRect(10, 8, 12, 16, primary);
      fillRect(12, 10, 8, 12, secondary);
      fillRect(10, 14, 12, 2, primary);
      fillRect(10, 18, 12, 2, primary);
      break;

    case 'cloud':
      // Cloud
      fillCircle(12, 16, 4, primary);
      fillCircle(20, 16, 4, primary);
      fillCircle(16, 14, 5, primary);
      fillRect(10, 16, 12, 6, secondary);
      break;

    case 'field':
      // Energy field
      for (let i = 0; i < 32; i += 4) {
        fillRect(i, 6, 2, 20, i % 8 === 0 ? primary : secondary);
      }
      break;

    case 'radiance':
      // Radiance
      fillCircle(center, center, 6, primary);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        for (let r = 8; r < 14; r++) {
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          setPixel(Math.floor(x), Math.floor(y), secondary);
        }
      }
      break;

    // === ROGUE PATTERNS ===
    case 'dagger':
      // Dagger
      fillRect(15, 4, 2, 14, primary);
      fillRect(12, 18, 8, 3, secondary);
      fillRect(15, 21, 2, 6, secondary);
      break;

    case 'shadow':
      // Shadow silhouette
      fillCircle(center, 12, 4, primary);
      fillRect(12, 16, 8, 10, primary);
      fillRect(8, 18, 4, 6, secondary);
      fillRect(20, 18, 4, 6, secondary);
      break;

    case 'crosshair':
      // Crosshair
      fillCircle(center, center, 10, primary);
      fillRect(15, 6, 2, 20, secondary);
      fillRect(6, 15, 20, 2, secondary);
      fillCircle(center, center, 3, secondary);
      break;

    case 'multistab':
      // Multiple stabs
      for (let i = 0; i < 5; i++) {
        fillRect(6 + i * 5, 8 + i, 2, 16 - i * 2, i % 2 === 0 ? primary : secondary);
      }
      break;

    case 'daggers':
      // Crossed daggers
      fillRect(10, 10, 2, 12, primary);
      fillRect(20, 10, 2, 12, primary);
      fillRect(8, 22, 6, 2, secondary);
      fillRect(18, 22, 6, 2, secondary);
      break;

    case 'skull':
      // Skull
      fillCircle(center, 14, 8, primary);
      fillRect(10, 10, 4, 4, secondary);
      fillRect(18, 10, 4, 4, secondary);
      fillRect(14, 16, 4, 6, secondary);
      break;

    case 'dance':
      // Dancing motion
      fillCircle(center, 10, 4, primary);
      fillRect(14, 14, 4, 8, primary);
      fillRect(10, 16, 4, 6, secondary);
      fillRect(18, 16, 4, 6, secondary);
      break;

    case 'mark':
      // Target mark
      fillCircle(center, center, 10, primary);
      fillCircle(center, center, 6, secondary);
      fillCircle(center, center, 3, primary);
      break;

    case 'parry':
      // Parry motion
      fillRect(8, 12, 10, 3, primary);
      fillRect(14, 8, 10, 3, secondary);
      fillRect(18, 16, 8, 3, secondary);
      break;

    case 'stance':
      // Ready stance
      fillCircle(center, 10, 4, primary);
      fillRect(14, 14, 4, 8, primary);
      fillRect(10, 18, 4, 6, secondary);
      fillRect(18, 18, 4, 6, secondary);
      fillRect(12, 16, 8, 2, secondary);
      break;

    case 'spin':
      // Spinning motion
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = center + Math.cos(angle) * 10;
        const y = center + Math.sin(angle) * 10;
        fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 2, i % 3 === 0 ? primary : secondary);
      }
      break;

    case 'dodge':
      // Dodge motion
      fillCircle(10, 16, 4, primary);
      fillCircle(22, 16, 4, secondary);
      for (let i = 0; i < 3; i++) {
        fillRect(12 + i * 3, 14, 2, 4, primary);
      }
      break;

    case 'reflex':
      // Quick reflex
      fillRect(8, 14, 6, 4, primary);
      fillRect(18, 14, 6, 4, secondary);
      fillRect(14, 10, 4, 12, secondary);
      break;

    case 'blur':
      // Motion blur
      for (let i = 0; i < 5; i++) {
        fillCircle(8 + i * 4, 16, 3, i % 2 === 0 ? primary : secondary);
      }
      break;

    case 'perfection':
      // Perfect form
      fillCircle(center, center, 10, primary);
      fillCircle(center, center, 7, secondary);
      fillRect(14, 6, 4, 20, primary);
      break;

    case 'teleport':
      // Teleport effect
      fillCircle(10, 16, 4, primary);
      fillCircle(22, 16, 4, secondary);
      for (let i = 0; i < 4; i++) {
        fillRect(12 + i * 2, 14 + i, 2, 4 - i, primary);
      }
      break;

    // === PALADIN PATTERNS ===
    case 'smite':
      // Holy smite
      fillRect(15, 4, 2, 12, primary);
      fillRect(10, 16, 12, 4, primary);
      fillRect(12, 20, 8, 6, secondary);
      break;

    case 'halo':
      // Halo
      fillCircle(center, 10, 8, primary);
      fillCircle(center, 10, 5, secondary);
      fillRect(14, 18, 4, 8, secondary);
      break;

    case 'holyflame':
      // Holy flame
      fillRect(14, 20, 4, 6, secondary);
      fillRect(12, 16, 8, 4, primary);
      fillRect(10, 12, 12, 4, primary);
      fillRect(12, 8, 8, 4, primary);
      fillRect(14, 4, 4, 4, secondary);
      break;

    case 'judgment':
      // Judgment mark
      fillCircle(center, center, 10, primary);
      fillRect(15, 6, 2, 20, secondary);
      fillRect(12, 14, 8, 4, secondary);
      break;

    case 'beam':
      // Light beam
      fillRect(14, 0, 4, 12, primary);
      fillRect(12, 12, 8, 4, primary);
      fillRect(10, 16, 12, 4, secondary);
      fillRect(8, 20, 16, 6, secondary);
      break;

    case 'condemn':
      // Condemnation
      fillCircle(center, center, 10, primary);
      fillRect(10, 10, 4, 4, secondary);
      fillRect(18, 10, 4, 4, secondary);
      fillRect(12, 18, 8, 3, secondary);
      break;

    case 'wings':
      // Angel wings
      fillRect(14, 12, 4, 10, primary);
      fillRect(6, 12, 6, 6, primary);
      fillRect(20, 12, 6, 6, primary);
      fillRect(4, 14, 4, 4, secondary);
      fillRect(24, 14, 4, 4, secondary);
      break;

    case 'wrath':
      // Divine wrath
      fillCircle(center, 12, 6, primary);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = center + Math.cos(angle) * 10;
        const y = 12 + Math.sin(angle) * 10;
        fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 8, secondary);
      }
      break;

    case 'blessing':
      // Blessing
      fillCircle(center, 12, 6, primary);
      fillRect(14, 6, 4, 12, secondary);
      fillRect(10, 10, 12, 4, secondary);
      break;

    case 'ward':
      // Protective ward
      fillCircle(center, center, 10, primary);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = center + Math.cos(angle) * 8;
        const y = center + Math.sin(angle) * 8;
        fillCircle(Math.floor(x), Math.floor(y), 2, secondary);
      }
      break;

    case 'holyshield':
      // Holy shield
      fillRect(10, 6, 12, 18, primary);
      fillRect(12, 8, 8, 14, secondary);
      fillRect(15, 6, 2, 20, primary);
      fillRect(10, 15, 12, 2, primary);
      break;

    case 'faith':
      // Faith symbol
      fillRect(15, 8, 2, 16, primary);
      fillRect(11, 8, 10, 2, primary);
      fillCircle(center, 8, 4, secondary);
      break;

    case 'sacrifice':
      // Sacrifice
      fillCircle(center, 14, 8, primary);
      fillRect(15, 6, 2, 16, secondary);
      fillRect(10, 14, 12, 2, secondary);
      break;

    case 'stand':
      // Last stand
      fillRect(14, 8, 4, 16, primary);
      fillRect(10, 20, 12, 4, primary);
      fillRect(8, 16, 16, 2, secondary);
      break;

    case 'guardian':
      // Guardian
      fillRect(10, 8, 12, 16, primary);
      fillRect(12, 10, 8, 12, secondary);
      fillCircle(center, 10, 3, primary);
      fillRect(14, 18, 4, 4, primary);
      break;

    case 'unbreakable':
      // Unbreakable
      fillCircle(center, center, 10, primary);
      fillRect(6, 15, 20, 2, secondary);
      fillRect(15, 6, 2, 20, secondary);
      fillCircle(center, center, 4, secondary);
      break;

    default:
      // Default pattern - simple square
      fillRect(8, 8, 16, 16, primary);
      fillRect(10, 10, 12, 12, secondary);
      break;
  }

  return Buffer.from(pixels);
}

/**
 * Create directories if they don't exist
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate all path ability icons
 */
function generateAllIcons() {
  const publicDir = path.join(__dirname, '..', 'public', 'assets', 'icons', 'abilities', 'paths');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Generating Path Ability Placeholder Icons');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let generated = 0;
  let failed = 0;

  // Group icons by class for better output
  const iconsByClass = {
    warrior: [],
    mage: [],
    rogue: [],
    paladin: []
  };

  for (const [iconPath, config] of Object.entries(PATH_ABILITY_ICONS)) {
    const [className] = iconPath.split('/');
    iconsByClass[className].push({ path: iconPath, config });
  }

  // Generate icons class by class
  for (const [className, icons] of Object.entries(iconsByClass)) {
    console.log(`\n${className.toUpperCase()} (${icons.length} abilities):`);
    console.log('─'.repeat(50));

    const classDir = path.join(publicDir, className);
    ensureDirectory(classDir);

    for (const { path: iconPath, config } of icons) {
      try {
        const { pattern, colors } = config;
        const [, abilityName] = iconPath.split('/');

        // Generate pixel pattern
        const pixelData = createPixelPattern(pattern, colors);

        // Create PNG
        const pngBuffer = createPNG(32, 32, pixelData);
        const pngPath = path.join(classDir, `${abilityName}.png`);
        fs.writeFileSync(pngPath, pngBuffer);

        console.log(`  ✓ ${abilityName}.png`);
        generated++;

      } catch (error) {
        console.error(`  ✗ ${iconPath}: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Generation Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ Success: ${generated} icons`);
  if (failed > 0) {
    console.log(`✗ Failed: ${failed} icons`);
  }
  console.log(`\nIcons saved to: ${publicDir}`);
  console.log('\nNote: These are placeholder icons.');
  console.log('Replace with proper pixel art when ready.\n');
}

// Run the generator
generateAllIcons();
