import fs from 'fs';
import { PNG } from 'pngjs';

// Color palette
const colors = {
  transparent: [0, 0, 0, 0],
  outline: [22, 101, 52, 255],      // #166534 - Dark green outline
  deepShadow: [21, 128, 61, 255],   // #15803D - Darkest areas
  shadow: [22, 163, 74, 255],       // #16A34A - Dark green shadow
  base: [34, 197, 94, 255],         // #22C55E - Main green body
  light: [74, 222, 128, 255],       // #4ADE80 - Light green
  highlight: [134, 239, 172, 255],  // #86EFAC - Bright green highlight
  // Boot colors (brown/tan for contrast)
  bootOutline: [78, 46, 28, 255],   // Dark brown
  bootShadow: [92, 64, 51, 255],    // Brown shadow
  bootBase: [120, 81, 59, 255],     // Medium brown
  bootLight: [156, 105, 79, 255],   // Light brown
};

// Create 32x32 PNG
const png = new PNG({ width: 32, height: 32 });

// Helper function to set pixel
function setPixel(x, y, color) {
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

// Initialize with transparency
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    setPixel(x, y, colors.transparent);
  }
}

// Design: Winged boot in profile, facing right
// Boot positioned at bottom-right, wing extending left and up
// 2px margin from edges

// BOOT (positioned lower right, facing right)
// Boot outline and base shape (rows 20-29, simplified boot shape)
const bootPixels = [
  // Row 20 (boot top edge)
  [18, 20, 'bootOutline'], [19, 20, 'bootOutline'], [20, 20, 'bootOutline'],
  [21, 20, 'bootOutline'], [22, 20, 'bootOutline'],

  // Row 21 (boot upper)
  [17, 21, 'bootOutline'], [18, 21, 'bootLight'], [19, 21, 'bootBase'],
  [20, 21, 'bootBase'], [21, 21, 'bootShadow'], [22, 21, 'bootOutline'],

  // Row 22
  [17, 22, 'bootOutline'], [18, 22, 'bootLight'], [19, 22, 'bootBase'],
  [20, 22, 'bootShadow'], [21, 22, 'bootShadow'], [22, 22, 'bootOutline'],

  // Row 23 (boot curves out to ankle)
  [16, 23, 'bootOutline'], [17, 23, 'bootLight'], [18, 23, 'bootBase'],
  [19, 23, 'bootBase'], [20, 23, 'bootShadow'], [21, 23, 'bootOutline'],

  // Row 24
  [16, 24, 'bootOutline'], [17, 24, 'bootLight'], [18, 24, 'bootBase'],
  [19, 24, 'bootShadow'], [20, 24, 'bootShadow'], [21, 24, 'bootOutline'],

  // Row 25 (foot starts)
  [16, 25, 'bootOutline'], [17, 25, 'bootLight'], [18, 25, 'bootBase'],
  [19, 25, 'bootBase'], [20, 25, 'bootShadow'], [21, 25, 'bootOutline'],
  [22, 25, 'bootOutline'], [23, 25, 'bootOutline'], [24, 25, 'bootOutline'],

  // Row 26 (foot extends right)
  [17, 26, 'bootOutline'], [18, 26, 'bootLight'], [19, 26, 'bootBase'],
  [20, 26, 'bootBase'], [21, 26, 'bootShadow'], [22, 26, 'bootShadow'],
  [23, 26, 'bootShadow'], [24, 26, 'bootOutline'],

  // Row 27 (toe area)
  [17, 27, 'bootOutline'], [18, 27, 'bootLight'], [19, 27, 'bootBase'],
  [20, 27, 'bootBase'], [21, 27, 'bootShadow'], [22, 27, 'bootShadow'],
  [23, 27, 'bootOutline'],

  // Row 28 (sole outline)
  [17, 28, 'bootOutline'], [18, 28, 'bootOutline'], [19, 28, 'bootOutline'],
  [20, 28, 'bootOutline'], [21, 28, 'bootOutline'], [22, 28, 'bootOutline'],
  [23, 28, 'bootOutline'],
];

bootPixels.forEach(([x, y, colorName]) => setPixel(x, y, colors[colorName]));

// WING (extending from boot upward and left)
// Wing attachment at boot top (around row 20-21)
// Wing extends from x=5 to x=18, y=6 to y=22
// Wing has 3 main feathers with detailed tips

const wingPixels = [
  // Lower feather (largest, points down-left)
  // Feather shaft and base (rows 16-22)
  [16, 22, 'outline'], [15, 22, 'shadow'], [14, 22, 'outline'],

  [15, 21, 'outline'], [14, 21, 'base'], [13, 21, 'shadow'], [12, 21, 'outline'],

  [14, 20, 'outline'], [13, 20, 'light'], [12, 20, 'base'], [11, 20, 'shadow'],
  [10, 20, 'outline'],

  [13, 19, 'outline'], [12, 19, 'highlight'], [11, 19, 'light'], [10, 19, 'base'],
  [9, 19, 'shadow'], [8, 19, 'outline'],

  [12, 18, 'outline'], [11, 18, 'light'], [10, 18, 'base'], [9, 18, 'shadow'],
  [8, 18, 'outline'],

  [11, 17, 'outline'], [10, 17, 'base'], [9, 17, 'shadow'], [8, 17, 'outline'],

  [10, 16, 'outline'], [9, 16, 'shadow'], [8, 16, 'outline'],

  // Middle feather (points left)
  // Rows 12-17
  [16, 17, 'outline'], [15, 17, 'base'], [14, 17, 'shadow'], [13, 17, 'outline'],

  [15, 16, 'outline'], [14, 16, 'light'], [13, 16, 'base'], [12, 16, 'shadow'],
  [11, 16, 'outline'],

  [14, 15, 'outline'], [13, 15, 'highlight'], [12, 15, 'light'], [11, 15, 'base'],
  [10, 15, 'shadow'], [9, 15, 'outline'],

  [13, 14, 'outline'], [12, 14, 'light'], [11, 14, 'base'], [10, 14, 'shadow'],
  [9, 14, 'deepShadow'], [8, 14, 'outline'],

  [12, 13, 'outline'], [11, 13, 'base'], [10, 13, 'shadow'], [9, 13, 'deepShadow'],
  [8, 13, 'outline'],

  [11, 12, 'outline'], [10, 12, 'shadow'], [9, 12, 'deepShadow'], [8, 12, 'outline'],

  // Upper feather (points up-left)
  // Rows 6-13
  [16, 13, 'outline'], [15, 13, 'base'], [14, 13, 'shadow'], [13, 13, 'outline'],

  [15, 12, 'outline'], [14, 12, 'light'], [13, 12, 'base'], [12, 12, 'outline'],

  [14, 11, 'outline'], [13, 11, 'highlight'], [12, 11, 'light'], [11, 11, 'base'],
  [10, 11, 'outline'],

  [13, 10, 'outline'], [12, 10, 'light'], [11, 10, 'base'], [10, 10, 'shadow'],
  [9, 10, 'outline'],

  [12, 9, 'outline'], [11, 9, 'light'], [10, 9, 'base'], [9, 9, 'shadow'],
  [8, 9, 'outline'],

  [11, 8, 'outline'], [10, 8, 'base'], [9, 8, 'shadow'], [8, 8, 'outline'],

  [10, 7, 'outline'], [9, 7, 'base'], [8, 7, 'shadow'], [7, 7, 'outline'],

  [9, 6, 'outline'], [8, 6, 'shadow'], [7, 6, 'outline'],

  // Wing body/connection (fills area between boot and feathers)
  [17, 21, 'outline'], [16, 21, 'light'], [15, 21, 'base'],

  [17, 20, 'outline'], [16, 20, 'highlight'], [15, 20, 'light'], [14, 20, 'base'],

  [17, 19, 'outline'], [16, 19, 'light'], [15, 19, 'base'], [14, 19, 'shadow'],

  [17, 18, 'outline'], [16, 18, 'base'], [15, 18, 'shadow'], [14, 18, 'outline'],

  [16, 18, 'outline'], [15, 18, 'base'], [14, 18, 'shadow'],

  [17, 16, 'outline'], [16, 16, 'light'], [15, 16, 'base'],

  [17, 15, 'outline'], [16, 15, 'base'], [15, 15, 'shadow'],

  [17, 14, 'outline'], [16, 14, 'base'], [15, 14, 'shadow'], [14, 14, 'outline'],
];

wingPixels.forEach(([x, y, colorName]) => setPixel(x, y, colors[colorName]));

// MOTION LINES (2-3 lines suggesting speed/movement to the right)
const motionLines = [
  // Top motion line (thin, 3 pixels)
  [25, 8, 'light'], [26, 8, 'base'], [27, 8, 'shadow'],

  // Middle motion line (thin, 4 pixels)
  [24, 12, 'light'], [25, 12, 'base'], [26, 12, 'base'], [27, 12, 'shadow'],

  // Lower motion line (thin, 3 pixels)
  [25, 16, 'light'], [26, 16, 'base'], [27, 16, 'shadow'],
];

motionLines.forEach(([x, y, colorName]) => setPixel(x, y, colors[colorName]));

// Write PNG file
const outputPath = '/Users/gilbrowdy/rogue/public/assets/icons/stats/speed.png';
const buffer = PNG.sync.write(png);
fs.writeFileSync(outputPath, buffer);

console.log(`Speed icon created: ${outputPath}`);
console.log('Size: 32x32 pixels');
console.log('Design: Winged boot with detailed feathers and motion lines');
