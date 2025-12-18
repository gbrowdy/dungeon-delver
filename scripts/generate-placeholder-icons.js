#!/usr/bin/env node

/**
 * Generate placeholder pixel art icons as PNG files
 *
 * This script creates simple PNG icons without external dependencies
 * by manually constructing PNG data using the PNG specification.
 *
 * Usage: node scripts/generate-placeholder-icons.js
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

// Color palette (RGBA)
const COLORS = {
  skin: [224, 172, 105, 255],
  skinDark: [198, 134, 66, 255],
  gold: [255, 215, 0, 255],
  goldDark: [184, 134, 11, 255],
  silver: [192, 192, 192, 255],
  silverDark: [128, 128, 128, 255],
  blue: [65, 105, 225, 255],
  blueDark: [30, 58, 138, 255],
  purple: [139, 92, 246, 255],
  purpleDark: [109, 40, 217, 255],
  green: [34, 197, 94, 255],
  greenDark: [22, 163, 74, 255],
  red: [239, 68, 68, 255],
  redDark: [220, 38, 38, 255],
  poison: [132, 204, 22, 255],
  poisonDark: [77, 124, 15, 255],
  orange: [249, 115, 22, 255],
  orangeDark: [194, 65, 12, 255],
  bone: [245, 245, 220, 255],
  yellow: [251, 191, 36, 255],
  cyan: [6, 182, 212, 255],
  darkRed: [127, 29, 29, 255],
  brown: [146, 64, 14, 255],
  transparent: [0, 0, 0, 0]
};

// Icon definitions
const ICON_DEFINITIONS = {
  // Stats (16x16)
  'stats/health': { size: 16, pattern: 'heart', colors: ['red', 'redDark'] },
  'stats/mana': { size: 16, pattern: 'diamond', colors: ['blue', 'blueDark'] },
  'stats/power': { size: 16, pattern: 'lightning', colors: ['orange', 'orangeDark'] },
  'stats/armor': { size: 16, pattern: 'shield', colors: ['silver', 'silverDark'] },
  'stats/speed': { size: 16, pattern: 'bolt', colors: ['green', 'greenDark'] },
  'stats/fortune': { size: 16, pattern: 'star', colors: ['gold', 'goldDark'] },
  'stats/gold': { size: 16, pattern: 'coin', colors: ['gold', 'goldDark'] },

  // Status Effects (16x16)
  'status/poison': { size: 16, pattern: 'droplet', colors: ['poison', 'poisonDark'] },
  'status/stun': { size: 16, pattern: 'starburst', colors: ['yellow', 'orange'] },
  'status/slow': { size: 16, pattern: 'spiral', colors: ['blue', 'cyan'] },
  'status/bleed': { size: 16, pattern: 'droplet', colors: ['red', 'redDark'] },
  'status/regeneration': { size: 16, pattern: 'heartplus', colors: ['green', 'greenDark'] },

  // Powers (32x32)
  'powers/crushing_blow': { size: 32, pattern: 'hammer', colors: ['orange', 'orangeDark'] },
  'powers/power_strike': { size: 32, pattern: 'lightning', colors: ['yellow', 'orange'] },
  'powers/fan_of_knives': { size: 32, pattern: 'daggers', colors: ['silver', 'silverDark'] },
  'powers/flurry': { size: 32, pattern: 'wind', colors: ['blue', 'cyan'] },
  'powers/ambush': { size: 32, pattern: 'crosshair', colors: ['purple', 'purpleDark'] },
  'powers/coup_de_grace': { size: 32, pattern: 'skull', colors: ['red', 'darkRed'] },
  'powers/frost_nova': { size: 32, pattern: 'snowflake', colors: ['cyan', 'blue'] },
  'powers/stunning_blow': { size: 32, pattern: 'starburst', colors: ['yellow', 'orange'] },
  'powers/battle_cry': { size: 32, pattern: 'horn', colors: ['orange', 'orangeDark'] },
  'powers/inner_focus': { size: 32, pattern: 'sparkle', colors: ['purple', 'purpleDark'] },
  'powers/reckless_swing': { size: 32, pattern: 'sword', colors: ['red', 'redDark'] },
  'powers/blood_pact': { size: 32, pattern: 'droplet', colors: ['darkRed', 'red'] },
  'powers/divine_heal': { size: 32, pattern: 'cross', colors: ['gold', 'goldDark'] },
  'powers/regeneration': { size: 32, pattern: 'heartplus', colors: ['green', 'greenDark'] },
  'powers/earthquake': { size: 32, pattern: 'crack', colors: ['brown', 'orange'] },
  'powers/vampiric_touch': { size: 32, pattern: 'bat', colors: ['purple', 'purpleDark'] },

  // Items (24x24)
  'items/weapon': { size: 24, pattern: 'sword', colors: ['silver', 'silverDark'] },
  'items/armor': { size: 24, pattern: 'chestplate', colors: ['silver', 'silverDark'] },
  'items/accessory': { size: 24, pattern: 'ring', colors: ['gold', 'goldDark'] },
  'items/potion': { size: 24, pattern: 'flask', colors: ['red', 'redDark'] },

  // Enemy Abilities (16x16)
  'abilities/attack': { size: 16, pattern: 'sword', colors: ['red', 'redDark'] },
  'abilities/multi_hit': { size: 16, pattern: 'tripleslash', colors: ['orange', 'orangeDark'] },
  'abilities/poison': { size: 16, pattern: 'poisonskull', colors: ['poison', 'poisonDark'] },
  'abilities/stun': { size: 16, pattern: 'starburst', colors: ['yellow', 'orange'] },
  'abilities/heal': { size: 16, pattern: 'heart', colors: ['green', 'greenDark'] },
  'abilities/enrage': { size: 16, pattern: 'flame', colors: ['red', 'orange'] },
  'abilities/shield': { size: 16, pattern: 'shield', colors: ['blue', 'blueDark'] },
  'abilities/triple_strike': { size: 16, pattern: 'tripleslash', colors: ['red', 'redDark'] },

  // UI Controls (24x24)
  'ui/pause': { size: 24, pattern: 'pause', colors: ['silver', 'silverDark'] },
  'ui/play': { size: 24, pattern: 'play', colors: ['green', 'greenDark'] },
  'ui/speed_1x': { size: 24, pattern: 'arrow1', colors: ['blue', 'blueDark'] },
  'ui/speed_2x': { size: 24, pattern: 'arrow2', colors: ['orange', 'orangeDark'] },
  'ui/speed_3x': { size: 24, pattern: 'arrow3', colors: ['red', 'redDark'] },
  'ui/trophy': { size: 24, pattern: 'trophy', colors: ['gold', 'goldDark'] },
  'ui/star': { size: 24, pattern: 'star', colors: ['gold', 'goldDark'] },
  'ui/skull': { size: 24, pattern: 'skull', colors: ['bone', 'silverDark'] },
  'ui/hammer': { size: 24, pattern: 'hammer', colors: ['silver', 'silverDark'] },
  'ui/question': { size: 24, pattern: 'question', colors: ['blue', 'blueDark'] },
  'ui/sparkle': { size: 24, pattern: 'sparkle', colors: ['yellow', 'orange'] },

  // Class Icons (48x48)
  'class/warrior': { size: 48, pattern: 'sword', colors: ['red', 'redDark'] },
  'class/mage': { size: 48, pattern: 'staff', colors: ['purple', 'purpleDark'] },
  'class/rogue': { size: 48, pattern: 'daggers', colors: ['green', 'greenDark'] },
  'class/paladin': { size: 48, pattern: 'cross', colors: ['gold', 'goldDark'] },
};

/**
 * Create pixel pattern (simplified for placeholder)
 */
function createPixelPattern(size, pattern, colorNames) {
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

  const center = Math.floor(size / 2);

  // Create simple shapes based on pattern
  // For simplicity, most patterns will be simple geometric shapes
  switch (pattern) {
    case 'heart':
      // Simple heart shape
      if (size === 16) {
        fillRect(4, 4, 2, 2, primary);
        fillRect(10, 4, 2, 2, primary);
        fillRect(2, 6, 12, 2, primary);
        fillRect(2, 8, 12, 2, secondary);
        fillRect(4, 10, 8, 2, secondary);
        fillRect(6, 12, 4, 2, secondary);
      }
      break;

    case 'diamond':
      // Diamond shape
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = Math.abs(x - center);
          const dy = Math.abs(y - center);
          if (dx + dy < size / 2) {
            setPixel(x, y, dy < size / 4 ? primary : secondary);
          }
        }
      }
      break;

    case 'shield':
    case 'flask':
    case 'chestplate':
      // Simple rectangular shape
      fillRect(Math.floor(size * 0.2), Math.floor(size * 0.15), Math.floor(size * 0.6), Math.floor(size * 0.7), primary);
      fillRect(Math.floor(size * 0.25), Math.floor(size * 0.2), Math.floor(size * 0.5), Math.floor(size * 0.6), secondary);
      break;

    case 'sword':
    case 'daggers':
      // Vertical blade
      fillRect(center - 1, 2, 2, Math.floor(size * 0.6), primary);
      fillRect(center - 3, Math.floor(size * 0.6), 6, 2, secondary);
      fillRect(center - 1, Math.floor(size * 0.65), 2, Math.floor(size * 0.3), secondary);
      break;

    case 'hammer':
      // Hammer shape
      fillRect(center - 1, Math.floor(size * 0.5), 2, Math.floor(size * 0.45), secondary);
      fillRect(Math.floor(size * 0.2), Math.floor(size * 0.2), Math.floor(size * 0.6), Math.floor(size * 0.25), primary);
      break;

    case 'staff':
      // Staff/wand shape
      fillRect(center - 1, Math.floor(size * 0.15), 2, Math.floor(size * 0.7), secondary);
      fillRect(center - 3, Math.floor(size * 0.1), 6, 3, primary);
      fillRect(center - 2, Math.floor(size * 0.05), 4, 2, primary);
      break;

    case 'star':
    case 'sparkle':
      // Star burst pattern
      fillRect(center - 1, 0, 2, size, primary);
      fillRect(0, center - 1, size, 2, primary);
      for (let i = 0; i < size; i++) {
        if (i > 1 && i < size - 1) {
          setPixel(i, i, secondary);
          setPixel(i, size - 1 - i, secondary);
        }
      }
      break;

    case 'cross':
      // Cross/plus shape
      fillRect(center - 2, Math.floor(size * 0.2), 4, Math.floor(size * 0.6), primary);
      fillRect(Math.floor(size * 0.2), center - 2, Math.floor(size * 0.6), 4, primary);
      break;

    case 'droplet':
    case 'coin':
    case 'ring':
      // Circle
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - center;
          const dy = y - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < size / 2 - 2) {
            setPixel(x, y, dist < size / 3 ? primary : secondary);
          }
        }
      }
      break;

    default:
      // Simple colored square for all other patterns
      fillRect(Math.floor(size * 0.1), Math.floor(size * 0.1), Math.floor(size * 0.8), Math.floor(size * 0.8), primary);
      fillRect(Math.floor(size * 0.2), Math.floor(size * 0.2), Math.floor(size * 0.6), Math.floor(size * 0.6), secondary);
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
 * Generate all icons
 */
function generateAllIcons() {
  const publicDir = path.join(__dirname, '..', 'public', 'assets', 'icons');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Generating Placeholder Pixel Art Icons');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let generated = 0;
  let failed = 0;

  for (const [iconPath, config] of Object.entries(ICON_DEFINITIONS)) {
    try {
      const { size, pattern, colors } = config;

      // Create directory structure
      const parts = iconPath.split('/');
      const filename = parts[parts.length - 1];
      const category = parts.slice(0, -1).join('/');
      const categoryDir = path.join(publicDir, category);
      ensureDirectory(categoryDir);

      // Generate pixel pattern
      const pixelData = createPixelPattern(size, pattern, colors);

      // Create PNG
      const pngBuffer = createPNG(size, size, pixelData);
      const pngPath = path.join(categoryDir, `${filename}.png`);
      fs.writeFileSync(pngPath, pngBuffer);

      console.log(`✓ ${iconPath}.png (${size}x${size})`);
      generated++;

    } catch (error) {
      console.error(`✗ ${iconPath}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Generation Complete!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
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
