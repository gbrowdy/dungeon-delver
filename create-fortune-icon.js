const fs = require('fs');
const { PNG } = require('pngjs');

// Color palette
const colors = {
  sparkle: [255, 251, 235, 255],    // #FFFBEB - Bright sparkle
  highlight: [253, 224, 71, 255],   // #FDE047 - Bright gold
  base: [250, 204, 21, 255],        // #FACC15 - Main gold
  shadow: [202, 138, 4, 255],       // #CA8A04 - Dark gold
  deepShadow: [161, 98, 7, 255],    // #A16207 - Darkest
  outline: [133, 77, 14, 255],      // #854D0E - Outline
  stem: [34, 197, 94, 255],         // #22C55E - Green stem
  transparent: [0, 0, 0, 0]
};

const size = 32;
const png = new PNG({ width: size, height: size });

// Helper function to set pixel
function setPixel(x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (size * y + x) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

// Initialize with transparency
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    setPixel(x, y, colors.transparent);
  }
}

// Four-leaf clover design at 32x32
// Each leaf is ~8-9 pixels, center is 16,16

// Define the clover shape with detailed leaves
// Top leaf (pointing up)
const topLeaf = [
  // Outline
  [15,4],[16,4],
  [14,5],[15,5],[16,5],[17,5],
  [13,6],[14,6],[15,6],[16,6],[17,6],[18,6],
  [13,7],[14,7],[15,7],[16,7],[17,7],[18,7],
  [14,8],[15,8],[16,8],[17,8],
  [14,9],[15,9],[16,9],[17,9],
  [15,10],[16,10],
  [15,11],[16,11],
];

// Right leaf (pointing right)
const rightLeaf = [
  [20,15],[20,16],
  [21,14],[21,15],[21,16],[21,17],
  [22,13],[22,14],[22,15],[22,16],[22,17],[22,18],
  [23,13],[23,14],[23,15],[23,16],[23,17],[23,18],
  [24,14],[24,15],[24,16],[24,17],
  [25,14],[25,15],[25,16],[25,17],
  [26,15],[26,16],
  [27,15],[27,16],
];

// Bottom leaf (pointing down)
const bottomLeaf = [
  [15,20],[16,20],
  [15,21],[16,21],
  [14,22],[15,22],[16,22],[17,22],
  [14,23],[15,23],[16,23],[17,23],
  [13,24],[14,24],[15,24],[16,24],[17,24],[18,24],
  [13,25],[14,25],[15,25],[16,25],[17,25],[18,25],
  [14,26],[15,26],[16,26],[17,26],
  [15,27],[16,27],
];

// Left leaf (pointing left)
const leftLeaf = [
  [11,15],[11,16],
  [10,14],[10,15],[10,16],[10,17],
  [9,13],[9,14],[9,15],[9,16],[9,17],[9,18],
  [8,13],[8,14],[8,15],[8,16],[8,17],[8,18],
  [7,14],[7,15],[7,16],[7,17],
  [6,14],[6,15],[6,16],[6,17],
  [5,15],[5,16],
  [4,15],[4,16],
];

// Center circle connecting all leaves
const center = [
  [14,14],[15,14],[16,14],[17,14],
  [14,15],[15,15],[16,15],[17,15],
  [14,16],[15,16],[16,16],[17,16],
  [14,17],[15,17],[16,17],[17,17],
];

// Stem at bottom
const stem = [
  [15,28],[16,28],
  [15,29],[16,29],
];

// Draw function that handles outline and fill
function drawShape(pixels, fillColor, outlineColor) {
  // First pass: mark all pixels
  const pixelSet = new Set(pixels.map(p => `${p[0]},${p[1]}`));
  
  // Second pass: draw outline and fill
  pixels.forEach(([x, y]) => {
    // Check if this pixel is on the edge (has a neighbor that's not in the shape)
    const isEdge = 
      !pixelSet.has(`${x-1},${y}`) ||
      !pixelSet.has(`${x+1},${y}`) ||
      !pixelSet.has(`${x},${y-1}`) ||
      !pixelSet.has(`${x},${y+1}`);
    
    if (isEdge) {
      setPixel(x, y, outlineColor);
    } else {
      setPixel(x, y, fillColor);
    }
  });
}

// Draw all leaves with base color first
drawShape(topLeaf, colors.base, colors.outline);
drawShape(rightLeaf, colors.base, colors.outline);
drawShape(bottomLeaf, colors.base, colors.outline);
drawShape(leftLeaf, colors.base, colors.outline);
drawShape(center, colors.base, colors.outline);

// Add shading and highlights to create 3D effect
// Top leaf - lighter on top
[15,5],[16,5].forEach(([x,y]) => setPixel(x, y, colors.highlight));
[14,6],[15,6],[16,6],[17,6].forEach(([x,y]) => setPixel(x, y, colors.highlight));
[15,7],[16,7].forEach(([x,y]) => setPixel(x, y, colors.base));
[14,9],[17,9].forEach(([x,y]) => setPixel(x, y, colors.shadow));
[15,10],[16,10].forEach(([x,y]) => setPixel(x, y, colors.shadow));

// Right leaf - lighter on left side
[21,15],[21,16].forEach(([x,y]) => setPixel(x, y, colors.base));
[22,14],[22,15],[22,16],[22,17].forEach(([x,y]) => setPixel(x, y, colors.highlight));
[23,15],[23,16].forEach(([x,y]) => setPixel(x, y, colors.base));
[25,14],[25,17].forEach(([x,y]) => setPixel(x, y, colors.shadow));
[26,15],[26,16].forEach(([x,y]) => setPixel(x, y, colors.shadow));

// Bottom leaf - darker on bottom
[15,22],[16,22].forEach(([x,y]) => setPixel(x, y, colors.base));
[14,23],[15,23],[16,23],[17,23].forEach(([x,y]) => setPixel(x, y, colors.base));
[15,24],[16,24].forEach(([x,y]) => setPixel(x, y, colors.shadow));
[14,25],[17,25].forEach(([x,y]) => setPixel(x, y, colors.shadow));
[15,26],[16,26].forEach(([x,y]) => setPixel(x, y, colors.deepShadow));

// Left leaf - darker on right side
[10,15],[10,16].forEach(([x,y]) => setPixel(x, y, colors.shadow));
[9,14],[9,15],[9,16],[9,17].forEach(([x,y]) => setPixel(x, y, colors.base));
[8,15],[8,16].forEach(([x,y]) => setPixel(x, y, colors.highlight));
[6,14],[6,17].forEach(([x,y]) => setPixel(x, y, colors.shadow));
[5,15],[5,16].forEach(([x,y]) => setPixel(x, y, colors.shadow));

// Center highlight
setPixel(15, 15, colors.highlight);
setPixel(16, 15, colors.highlight);
setPixel(15, 16, colors.base);
setPixel(16, 16, colors.base);

// Add leaf veins (subtle detail)
// Top leaf vein
setPixel(15, 8, colors.shadow);
setPixel(16, 9, colors.shadow);

// Right leaf vein
setPixel(24, 15, colors.shadow);
setPixel(25, 16, colors.shadow);

// Bottom leaf vein
setPixel(15, 24, colors.deepShadow);
setPixel(16, 23, colors.shadow);

// Left leaf vein
setPixel(7, 15, colors.shadow);
setPixel(6, 16, colors.shadow);

// Draw stem with green
stem.forEach(([x, y]) => {
  setPixel(x, y, colors.stem);
});
setPixel(15, 28, [41, 161, 90, 255]); // Darker green shadow

// Add sparkle effects (tiny bright points)
// Top-right sparkle
setPixel(19, 7, colors.sparkle);

// Top-left sparkle  
setPixel(12, 7, colors.sparkle);

// Center sparkle
setPixel(16, 14, colors.sparkle);

// Save the PNG
png.pack().pipe(fs.createWriteStream('/Users/gilbrowdy/rogue/public/assets/icons/stats/fortune.png'))
  .on('finish', () => {
    console.log('Fortune icon created successfully at 32x32!');
    console.log('Location: /Users/gilbrowdy/rogue/public/assets/icons/stats/fortune.png');
  });
