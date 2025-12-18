#!/usr/bin/env node

/**
 * Generate ultra-simple placeholder icons as data URIs
 *
 * This creates a simple icon manifest that can be used until proper pixel art is ready.
 * The icons are simple colored squares/shapes as base64 data URIs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal PNG header for solid colored squares
function createSimplePNG(size, r, g, b) {
  // For now, we'll create SVG data URIs which work just as well in <img> tags
  // This is a pragmatic placeholder solution until proper PNG generation is set up

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="rgb(${r},${g},${b})"/>
    <rect x="2" y="2" width="${size-4}" height="${size-4}" fill="rgb(${Math.min(255, r+30)},${Math.min(255, g+30)},${Math.min(255, b+30)})"/>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Color palette (RGB values)
const COLORS = {
  red: [239, 68, 68],
  blue: [65, 105, 225],
  green: [34, 197, 94],
  orange: [249, 115, 22],
  purple: [139, 92, 246],
  gold: [255, 215, 0],
  silver: [192, 192, 192],
  yellow: [251, 191, 36],
  cyan: [6, 182, 212],
  poison: [132, 204, 22],
  bone: [245, 245, 220],
  brown: [146, 64, 14],
};

const iconManifest = {
  // Stats (16x16)
  'stats/health.png': createSimplePNG(16, ...COLORS.red),
  'stats/mana.png': createSimplePNG(16, ...COLORS.blue),
  'stats/power.png': createSimplePNG(16, ...COLORS.orange),
  'stats/armor.png': createSimplePNG(16, ...COLORS.silver),
  'stats/speed.png': createSimplePNG(16, ...COLORS.green),
  'stats/fortune.png': createSimplePNG(16, ...COLORS.gold),
  'stats/gold.png': createSimplePNG(16, ...COLORS.gold),

  // Status (16x16)
  'status/poison.png': createSimplePNG(16, ...COLORS.poison),
  'status/stun.png': createSimplePNG(16, ...COLORS.yellow),
  'status/slow.png': createSimplePNG(16, ...COLORS.blue),
  'status/bleed.png': createSimplePNG(16, ...COLORS.red),
  'status/regeneration.png': createSimplePNG(16, ...COLORS.green),

  // Powers (32x32)
  'powers/crushing_blow.png': createSimplePNG(32, ...COLORS.orange),
  'powers/power_strike.png': createSimplePNG(32, ...COLORS.yellow),
  'powers/fan_of_knives.png': createSimplePNG(32, ...COLORS.silver),
  'powers/flurry.png': createSimplePNG(32, ...COLORS.blue),
  'powers/ambush.png': createSimplePNG(32, ...COLORS.purple),
  'powers/coup_de_grace.png': createSimplePNG(32, ...COLORS.red),
  'powers/frost_nova.png': createSimplePNG(32, ...COLORS.cyan),
  'powers/stunning_blow.png': createSimplePNG(32, ...COLORS.yellow),
  'powers/battle_cry.png': createSimplePNG(32, ...COLORS.orange),
  'powers/inner_focus.png': createSimplePNG(32, ...COLORS.purple),
  'powers/reckless_swing.png': createSimplePNG(32, ...COLORS.red),
  'powers/blood_pact.png': createSimplePNG(32, ...COLORS.red),
  'powers/divine_heal.png': createSimplePNG(32, ...COLORS.gold),
  'powers/regeneration.png': createSimplePNG(32, ...COLORS.green),
  'powers/earthquake.png': createSimplePNG(32, ...COLORS.brown),
  'powers/vampiric_touch.png': createSimplePNG(32, ...COLORS.purple),

  // Items (24x24)
  'items/weapon.png': createSimplePNG(24, ...COLORS.silver),
  'items/armor.png': createSimplePNG(24, ...COLORS.silver),
  'items/accessory.png': createSimplePNG(24, ...COLORS.gold),
  'items/potion.png': createSimplePNG(24, ...COLORS.red),

  // Abilities (16x16)
  'abilities/attack.png': createSimplePNG(16, ...COLORS.red),
  'abilities/multi_hit.png': createSimplePNG(16, ...COLORS.orange),
  'abilities/poison.png': createSimplePNG(16, ...COLORS.poison),
  'abilities/stun.png': createSimplePNG(16, ...COLORS.yellow),
  'abilities/heal.png': createSimplePNG(16, ...COLORS.green),
  'abilities/enrage.png': createSimplePNG(16, ...COLORS.red),
  'abilities/shield.png': createSimplePNG(16, ...COLORS.blue),
  'abilities/triple_strike.png': createSimplePNG(16, ...COLORS.red),

  // UI (24x24)
  'ui/pause.png': createSimplePNG(24, ...COLORS.silver),
  'ui/play.png': createSimplePNG(24, ...COLORS.green),
  'ui/speed_1x.png': createSimplePNG(24, ...COLORS.blue),
  'ui/speed_2x.png': createSimplePNG(24, ...COLORS.orange),
  'ui/speed_3x.png': createSimplePNG(24, ...COLORS.red),
  'ui/trophy.png': createSimplePNG(24, ...COLORS.gold),
  'ui/star.png': createSimplePNG(24, ...COLORS.gold),
  'ui/skull.png': createSimplePNG(24, ...COLORS.bone),
  'ui/hammer.png': createSimplePNG(24, ...COLORS.silver),
  'ui/question.png': createSimplePNG(24, ...COLORS.blue),
  'ui/sparkle.png': createSimplePNG(24, ...COLORS.yellow),
};

console.log('Simple Placeholder Icon Manifest Generated');
console.log(`Total icons: ${Object.keys(iconManifest).length}`);
console.log('\nTo use these icons, import this manifest or reference the data URIs directly.');
console.log('These are temporary placeholders - replace with proper pixel art later.\n');

// Save manifest
const outputPath = path.join(__dirname, 'icon-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(iconManifest, null, 2));
console.log(`Manifest saved to: ${outputPath}`);
