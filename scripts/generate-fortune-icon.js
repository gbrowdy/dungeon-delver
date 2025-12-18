import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Color palette - Gold with green accent
const COLORS = {
  highlight: { r: 253, g: 224, b: 71 },   // #FDE047 - Bright gold
  base: { r: 250, g: 204, b: 21 },        // #FACC15 - Main gold
  shadow: { r: 202, g: 138, b: 4 },       // #CA8A04 - Dark gold
  outline: { r: 133, g: 77, b: 14 },      // #854D0E - Brown outline
  green: { r: 34, g: 197, b: 94 },        // #22C55E - Green accent
  transparent: { r: 0, g: 0, b: 0, a: 0 }
};

// Helper to set pixel color
function setPixel(png, x, y, color) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color.r;
  png.data[idx + 1] = color.g;
  png.data[idx + 2] = color.b;
  png.data[idx + 3] = color.a !== undefined ? color.a : 255;
}

// Create 16x16 PNG
const png = new PNG({ width: 16, height: 16 });

// Initialize with transparent background
for (let y = 0; y < 16; y++) {
  for (let x = 0; x < 16; x++) {
    setPixel(png, x, y, COLORS.transparent);
  }
}

// Four-leaf clover design - Each leaf is roughly 4x4 pixels
// Center stem at (7,8) and (8,8) going down to (7,13) and (8,13)
// Four heart-shaped leaves arranged in cardinal directions

// STEM (vertical, bottom center)
const stem = [
  [7, 10], [8, 10],  // Top of stem
  [7, 11], [8, 11],  // Mid stem
  [7, 12], [8, 12],  // Lower stem
];

stem.forEach(([x, y]) => setPixel(png, x, y, COLORS.green));

// LEFT LEAF (heart shape pointing left, centered around x=4, y=8)
const leftLeaf = [
  // Outline
  [3, 6], [4, 6], [5, 6],           // Top edge outline
  [2, 7], [6, 7],                   // Side outlines
  [2, 8], [6, 8],                   // Middle sides
  [3, 9], [4, 9], [5, 9],           // Bottom edge outline

  // Fill (base gold)
  [3, 7], [4, 7], [5, 7],           // Top fill
  [3, 8], [4, 8], [5, 8],           // Middle fill
];

// RIGHT LEAF (heart shape pointing right, centered around x=11, y=8)
const rightLeaf = [
  // Outline
  [10, 6], [11, 6], [12, 6],        // Top edge outline
  [9, 7], [13, 7],                  // Side outlines
  [9, 8], [13, 8],                  // Middle sides
  [10, 9], [11, 9], [12, 9],        // Bottom edge outline

  // Fill (base gold)
  [10, 7], [11, 7], [12, 7],        // Top fill
  [10, 8], [11, 8], [12, 8],        // Middle fill
];

// TOP LEAF (heart shape pointing up, centered around x=8, y=4)
const topLeaf = [
  // Outline
  [6, 3], [7, 3], [8, 3], [9, 3],   // Top edge
  [6, 4], [9, 4],                   // Side outlines
  [6, 5], [9, 5],                   // Middle sides
  [7, 6], [8, 6],                   // Bottom point

  // Fill (base gold)
  [7, 4], [8, 4],                   // Top fill
  [7, 5], [8, 5],                   // Middle fill
];

// BOTTOM LEAF (heart shape pointing down, centered around x=8, y=12)
const bottomLeaf = [
  // Outline
  [7, 9], [8, 9],                   // Top point
  [6, 10], [9, 10],                 // Upper sides
  [6, 11], [9, 11],                 // Middle sides
  [6, 12], [7, 12], [8, 12], [9, 12], // Bottom edge

  // Fill (base gold)
  [7, 10], [8, 10],                 // Upper fill
  [7, 11], [8, 11],                 // Middle fill
];

// Draw outlines first
[...leftLeaf, ...rightLeaf, ...topLeaf, ...bottomLeaf]
  .filter(([x, y]) => {
    // Only outline edges - check if pixel is on the border
    const isEdge = (x <= 2 || x >= 13 || y <= 3 || y >= 12) ||
                   (x === 6 || x === 9) ||
                   (y === 6 || y === 9);
    return isEdge;
  })
  .forEach(([x, y]) => {
    // Skip if it's a fill pixel
    if ((x === 3 || x === 4 || x === 5 || x === 10 || x === 11 || x === 12) &&
        (y === 7 || y === 8)) return;
    if ((x === 7 || x === 8) && (y === 4 || y === 5 || y === 10 || y === 11)) return;

    setPixel(png, x, y, COLORS.outline);
  });

// Actually, let me redesign this more simply - clearer four-leaf clover
// I'll create a simpler, more readable design

// Clear and start over
for (let y = 0; y < 16; y++) {
  for (let x = 0; x < 16; x++) {
    setPixel(png, x, y, COLORS.transparent);
  }
}

// Simpler four-leaf clover design
// Each leaf is a rounded shape, center is at (7.5, 7.5)

// STEM (green, at bottom center)
const stemPixels = [
  [7, 11, COLORS.green], [8, 11, COLORS.green],
  [7, 12, COLORS.green], [8, 12, COLORS.green],
  [7, 13, COLORS.green], [8, 13, COLORS.green],
];

// LEFT LEAF (gold, rounded heart)
const leftLeafPixels = [
  // Row 7 (top of leaf)
  [3, 7, COLORS.outline], [4, 7, COLORS.highlight], [5, 7, COLORS.highlight], [6, 7, COLORS.outline],
  // Row 8 (upper middle)
  [2, 8, COLORS.outline], [3, 8, COLORS.highlight], [4, 8, COLORS.base], [5, 8, COLORS.base], [6, 8, COLORS.outline],
  // Row 9 (middle)
  [3, 9, COLORS.outline], [4, 9, COLORS.base], [5, 9, COLORS.shadow], [6, 9, COLORS.outline],
  // Row 10 (bottom point)
  [4, 10, COLORS.outline], [5, 10, COLORS.outline],
];

// RIGHT LEAF (gold, rounded heart)
const rightLeafPixels = [
  // Row 7 (top of leaf)
  [9, 7, COLORS.outline], [10, 7, COLORS.highlight], [11, 7, COLORS.highlight], [12, 7, COLORS.outline],
  // Row 8 (upper middle)
  [9, 8, COLORS.outline], [10, 8, COLORS.base], [11, 8, COLORS.base], [12, 8, COLORS.shadow], [13, 8, COLORS.outline],
  // Row 9 (middle)
  [9, 9, COLORS.outline], [10, 9, COLORS.base], [11, 9, COLORS.shadow], [12, 9, COLORS.outline],
  // Row 10 (bottom point)
  [10, 10, COLORS.outline], [11, 10, COLORS.outline],
];

// TOP LEAF (gold, rounded heart)
const topLeafPixels = [
  // Row 3 (top edge)
  [7, 3, COLORS.outline], [8, 3, COLORS.outline],
  // Row 4 (upper part)
  [6, 4, COLORS.outline], [7, 4, COLORS.highlight], [8, 4, COLORS.highlight], [9, 4, COLORS.outline],
  // Row 5 (middle)
  [6, 5, COLORS.outline], [7, 5, COLORS.base], [8, 5, COLORS.base], [9, 5, COLORS.outline],
  // Row 6 (bottom)
  [6, 6, COLORS.outline], [7, 6, COLORS.shadow], [8, 6, COLORS.shadow], [9, 6, COLORS.outline],
];

// BOTTOM LEAF (gold, rounded heart)
const bottomLeafPixels = [
  // Row 9 (top)
  [6, 9, COLORS.outline], [7, 9, COLORS.highlight], [8, 9, COLORS.highlight], [9, 9, COLORS.outline],
  // Row 10 (middle)
  [6, 10, COLORS.outline], [7, 10, COLORS.base], [8, 10, COLORS.base], [9, 10, COLORS.outline],
  // Row 11 (lower)
  [6, 11, COLORS.outline], [7, 11, COLORS.shadow], [8, 11, COLORS.shadow], [9, 11, COLORS.outline],
  // Row 12 (bottom point)
  [7, 12, COLORS.outline], [8, 12, COLORS.outline],
];

// CENTER DOT (small golden center where all leaves meet)
const centerPixels = [
  [7, 7, COLORS.base], [8, 7, COLORS.base],
  [7, 8, COLORS.base], [8, 8, COLORS.base],
];

// Draw all pixels
[
  ...stemPixels,
  ...leftLeafPixels,
  ...rightLeafPixels,
  ...topLeafPixels,
  ...bottomLeafPixels,
  ...centerPixels
].forEach(([x, y, color]) => {
  setPixel(png, x, y, color);
});

// Ensure output directory exists
const outputPath = '/Users/gilbrowdy/rogue/public/assets/icons/stats/fortune.png';
mkdirSync(dirname(outputPath), { recursive: true });

// Write PNG file
const buffer = PNG.sync.write(png);
writeFileSync(outputPath, buffer);

console.log('Fortune icon created successfully at:', outputPath);
console.log('Design: Golden four-leaf clover with green stem');
console.log('Size: 16x16 pixels');
console.log('Style: 16-bit SNES/GBA aesthetic');
