#!/usr/bin/env node

const fs = require('fs');
const { createCanvas } = require('canvas');

// Read SVG and parse pixel data
const svgContent = fs.readFileSync(process.argv[2], 'utf8');
const outputPath = process.argv[3];

// Create 16x16 canvas
const canvas = createCanvas(16, 16);
const ctx = canvas.getContext('2d');

// Parse SVG rect elements
const rectRegex = /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"/g;
let match;

while ((match = rectRegex.exec(svgContent)) !== null) {
  const [, x, y, width, height, fill] = match;
  ctx.fillStyle = fill;
  ctx.fillRect(parseInt(x), parseInt(y), parseInt(width), parseInt(height));
}

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);
console.log(`Created ${outputPath}`);
