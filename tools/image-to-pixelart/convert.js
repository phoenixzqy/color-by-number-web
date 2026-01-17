#!/usr/bin/env node

import sharp from 'sharp';
import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

program
  .name('convert')
  .description('Convert an image to a pixel art puzzle')
  .requiredOption('-i, --input <path>', 'Input image path')
  .requiredOption('-o, --output <path>', 'Output directory for puzzle JSON')
  .option('-s, --size <number>', 'Target grid size (width)', '48')
  .option('-c, --colors <number>', 'Number of colors (0 = auto)', '0')
  .option('-n, --name <string>', 'Puzzle name')
  .option('--category <string>', 'Puzzle category', 'animals')
  .option('--id <string>', 'Puzzle ID (auto-generated if not provided)')
  .parse();

const options = program.opts();

// Color name database (simplified)
const COLOR_NAMES = {
  '#FF0000': 'Red', '#00FF00': 'Green', '#0000FF': 'Blue',
  '#FFFF00': 'Yellow', '#FF00FF': 'Magenta', '#00FFFF': 'Cyan',
  '#FFA500': 'Orange', '#800080': 'Purple', '#FFC0CB': 'Pink',
  '#A52A2A': 'Brown', '#808080': 'Gray', '#000000': 'Black',
  '#FFFFFF': 'White', '#FFD700': 'Gold', '#C0C0C0': 'Silver',
};

function getColorName(hex) {
  // Try exact match
  const upper = hex.toUpperCase();
  if (COLOR_NAMES[upper]) return COLOR_NAMES[upper];

  // Find closest color
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let closestName = 'Color';
  let minDistance = Infinity;

  for (const [colorHex, name] of Object.entries(COLOR_NAMES)) {
    const cr = parseInt(colorHex.slice(1, 3), 16);
    const cg = parseInt(colorHex.slice(3, 5), 16);
    const cb = parseInt(colorHex.slice(5, 7), 16);

    const distance = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }

  return closestName;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function colorDistance(c1, c2) {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
}

// Simple k-means clustering for color quantization
function quantizeColors(pixels, numColors) {
  // Get unique colors from pixels
  const colorCounts = new Map();
  for (const pixel of pixels) {
    if (pixel.a < 128) continue; // Skip transparent pixels
    const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }

  // If fewer unique colors than requested, use all of them
  const uniqueColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  if (uniqueColors.length <= numColors) {
    return uniqueColors;
  }

  // Initialize centroids with most common colors
  let centroids = uniqueColors.slice(0, numColors).map(hexToRgb);

  // K-means iterations
  for (let iter = 0; iter < 20; iter++) {
    // Assign colors to nearest centroid
    const clusters = centroids.map(() => []);

    for (const hex of uniqueColors) {
      const color = hexToRgb(hex);
      let minDist = Infinity;
      let nearest = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistance(color, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }

      clusters[nearest].push({ hex, weight: colorCounts.get(hex) });
    }

    // Update centroids (weighted average)
    const newCentroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];

      let totalWeight = 0;
      let r = 0, g = 0, b = 0;

      for (const { hex, weight } of cluster) {
        const color = hexToRgb(hex);
        r += color.r * weight;
        g += color.g * weight;
        b += color.b * weight;
        totalWeight += weight;
      }

      return {
        r: Math.round(r / totalWeight),
        g: Math.round(g / totalWeight),
        b: Math.round(b / totalWeight),
      };
    });

    centroids = newCentroids;
  }

  return centroids.map(c => rgbToHex(c.r, c.g, c.b));
}

function findNearestColor(pixel, palette) {
  if (pixel.a < 128) return 0; // Transparent

  const pixelRgb = { r: pixel.r, g: pixel.g, b: pixel.b };
  let minDist = Infinity;
  let nearest = 1;

  for (let i = 0; i < palette.length; i++) {
    const paletteRgb = hexToRgb(palette[i]);
    const dist = colorDistance(pixelRgb, paletteRgb);
    if (dist < minDist) {
      minDist = dist;
      nearest = i + 1; // Color IDs start at 1
    }
  }

  return nearest;
}

function determineDifficulty(width, height, colorCount) {
  const cellCount = width * height;

  if (cellCount <= 1024 && colorCount <= 8) return 'easy';
  if (cellCount <= 2500 && colorCount <= 15) return 'medium';
  return 'hard';
}

async function convertImage(inputPath, outputDir, opts) {
  console.log(`Converting: ${inputPath}`);

  // Read and process image
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // Calculate target size maintaining aspect ratio
  const targetWidth = parseInt(opts.size);
  const aspectRatio = metadata.height / metadata.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  console.log(`  Original: ${metadata.width}x${metadata.height}`);
  console.log(`  Target: ${targetWidth}x${targetHeight}`);

  // Resize image
  const resized = await image
    .resize(targetWidth, targetHeight, {
      fit: 'fill',
      kernel: 'nearest',
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Extract pixels
  const pixels = [];
  const { data, info } = resized;
  const channels = info.channels;

  for (let i = 0; i < data.length; i += channels) {
    pixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
      a: channels === 4 ? data[i + 3] : 255,
    });
  }

  // Determine number of colors
  let numColors = parseInt(opts.colors);
  if (numColors === 0) {
    // Auto-detect: use sqrt of unique colors, capped between 6-20
    const uniqueCount = new Set(
      pixels
        .filter(p => p.a >= 128)
        .map(p => rgbToHex(p.r, p.g, p.b))
    ).size;
    numColors = Math.min(20, Math.max(6, Math.round(Math.sqrt(uniqueCount))));
    console.log(`  Auto-detected colors: ${numColors} (from ${uniqueCount} unique)`);
  }

  // Quantize colors
  const palette = quantizeColors(pixels, numColors);
  console.log(`  Palette: ${palette.length} colors`);

  // Map pixels to palette
  const cells = [];
  for (let y = 0; y < targetHeight; y++) {
    const row = [];
    for (let x = 0; x < targetWidth; x++) {
      const idx = y * targetWidth + x;
      row.push(findNearestColor(pixels[idx], palette));
    }
    cells.push(row);
  }

  // Generate puzzle ID and name
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const puzzleId = opts.id || baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const puzzleName = opts.name || baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Create puzzle object
  const puzzle = {
    id: puzzleId,
    name: puzzleName,
    category: opts.category,
    difficulty: determineDifficulty(targetWidth, targetHeight, palette.length),
    width: targetWidth,
    height: targetHeight,
    colors: palette.map((hex, i) => ({
      id: i + 1,
      hex,
      name: getColorName(hex),
    })),
    cells,
  };

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Write puzzle JSON
  const outputPath = path.join(outputDir, `${puzzleId}.json`);
  await fs.writeFile(outputPath, JSON.stringify(puzzle, null, 2));

  console.log(`  Output: ${outputPath}`);
  console.log(`  Difficulty: ${puzzle.difficulty}`);
  console.log('  Done!\n');

  return puzzle;
}

// Main execution
try {
  await convertImage(options.input, options.output, options);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
