import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Color palette - Gold with 3-shade system
const COLORS = {
  highlight: { r: 253, g: 224, b: 71 },   // #FDE047 - Bright shine
  base: { r: 250, g: 204, b: 21 },        // #FACC15 - Main gold
  shadow: { r: 202, g: 138, b: 4 },       // #CA8A04 - Dark gold
  outline: { r: 133, g: 77, b: 14 },      // #854D0E - Outline
  transparent: { r: 0, g: 0, b: 0, a: 0 }
};

function createGoldIcon() {
  const size = 16;
  const png = new PNG({ width: size, height: size });

  // Initialize with transparent background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0;
      png.data[idx + 1] = 0;
      png.data[idx + 2] = 0;
      png.data[idx + 3] = 0;
    }
  }

  // Helper function to set pixel
  function setPixel(x, y, color) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (size * y + x) << 2;
    png.data[idx] = color.r;
    png.data[idx + 1] = color.g;
    png.data[idx + 2] = color.b;
    png.data[idx + 3] = color.a !== undefined ? color.a : 255;
  }

  // Design: 3 stacked coins with offset
  // Coin stack positions (centered with 1px margin)
  // Top coin: centered at (8, 4)
  // Middle coin: offset down-right at (9, 6)
  // Bottom coin: offset down-right at (10, 8)

  // Bottom coin (rightmost and lowest) - centered at x=10, y=9
  // Outline
  setPixel(9, 7, COLORS.outline);
  setPixel(10, 7, COLORS.outline);
  setPixel(11, 7, COLORS.outline);
  setPixel(8, 8, COLORS.outline);
  setPixel(12, 8, COLORS.outline);
  setPixel(8, 9, COLORS.outline);
  setPixel(12, 9, COLORS.outline);
  setPixel(8, 10, COLORS.outline);
  setPixel(12, 10, COLORS.outline);
  setPixel(9, 11, COLORS.outline);
  setPixel(10, 11, COLORS.outline);
  setPixel(11, 11, COLORS.outline);

  // Fill - mostly shadow since it's at the back
  setPixel(9, 8, COLORS.shadow);
  setPixel(10, 8, COLORS.shadow);
  setPixel(11, 8, COLORS.shadow);
  setPixel(9, 9, COLORS.shadow);
  setPixel(10, 9, COLORS.base);
  setPixel(11, 9, COLORS.shadow);
  setPixel(9, 10, COLORS.shadow);
  setPixel(10, 10, COLORS.shadow);
  setPixel(11, 10, COLORS.shadow);

  // Middle coin - centered at x=9, y=7
  // Outline (only visible edges)
  setPixel(8, 5, COLORS.outline);
  setPixel(9, 5, COLORS.outline);
  setPixel(10, 5, COLORS.outline);
  setPixel(7, 6, COLORS.outline);
  setPixel(11, 6, COLORS.outline);
  setPixel(7, 7, COLORS.outline);
  setPixel(11, 7, COLORS.outline);
  setPixel(7, 8, COLORS.outline);
  setPixel(11, 8, COLORS.outline);
  setPixel(8, 9, COLORS.outline);
  setPixel(9, 9, COLORS.outline);
  setPixel(10, 9, COLORS.outline);

  // Fill - base and shadow mix
  setPixel(8, 6, COLORS.base);
  setPixel(9, 6, COLORS.base);
  setPixel(10, 6, COLORS.shadow);
  setPixel(8, 7, COLORS.base);
  setPixel(9, 7, COLORS.base);
  setPixel(10, 7, COLORS.shadow);
  setPixel(8, 8, COLORS.shadow);
  setPixel(9, 8, COLORS.shadow);
  setPixel(10, 8, COLORS.shadow);

  // Top coin (front and highest) - centered at x=8, y=5
  // Outline
  setPixel(7, 3, COLORS.outline);
  setPixel(8, 3, COLORS.outline);
  setPixel(9, 3, COLORS.outline);
  setPixel(6, 4, COLORS.outline);
  setPixel(10, 4, COLORS.outline);
  setPixel(6, 5, COLORS.outline);
  setPixel(10, 5, COLORS.outline);
  setPixel(6, 6, COLORS.outline);
  setPixel(10, 6, COLORS.outline);
  setPixel(7, 7, COLORS.outline);
  setPixel(8, 7, COLORS.outline);
  setPixel(9, 7, COLORS.outline);

  // Fill - with highlight on top
  setPixel(7, 4, COLORS.highlight);
  setPixel(8, 4, COLORS.highlight);
  setPixel(9, 4, COLORS.base);
  setPixel(7, 5, COLORS.base);
  setPixel(8, 5, COLORS.base);
  setPixel(9, 5, COLORS.shadow);
  setPixel(7, 6, COLORS.shadow);
  setPixel(8, 6, COLORS.shadow);
  setPixel(9, 6, COLORS.shadow);

  return png;
}

// Create and save the icon
const png = createGoldIcon();
const outputPath = path.join(__dirname, '../public/assets/icons/stats/gold.png');
const buffer = PNG.sync.write(png);
fs.writeFileSync(outputPath, buffer);

console.log('Gold icon created successfully at:', outputPath);
