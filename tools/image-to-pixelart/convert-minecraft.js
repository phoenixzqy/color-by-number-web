#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Map folder names to app categories
const CATEGORY_MAP = {
  // Direct mappings
  'blocks': 'objects',
  'tools': 'objects',
  'weapons': 'objects',
  'armor': 'objects',
  'materials': 'objects',
  'food': 'food',
  'special': 'fantasy',

  // Mobs subfolder mappings
  'passive': 'animals',
  'hostile': 'fantasy',
  'neutral': 'animals',
  'bosses': 'fantasy',
  'villagers': 'characters',
};

// Color name database
const COLOR_NAMES = {
  '#FF0000': 'Red', '#00FF00': 'Green', '#0000FF': 'Blue',
  '#FFFF00': 'Yellow', '#FF00FF': 'Magenta', '#00FFFF': 'Cyan',
  '#FFA500': 'Orange', '#800080': 'Purple', '#FFC0CB': 'Pink',
  '#A52A2A': 'Brown', '#808080': 'Gray', '#000000': 'Black',
  '#FFFFFF': 'White', '#FFD700': 'Gold', '#C0C0C0': 'Silver',
  '#8B4513': 'Brown', '#228B22': 'Forest Green', '#4169E1': 'Royal Blue',
};

function getColorName(hex) {
  const upper = hex.toUpperCase();
  if (COLOR_NAMES[upper]) return COLOR_NAMES[upper];

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

function quantizeColors(pixels, numColors) {
  const colorCounts = new Map();
  for (const pixel of pixels) {
    if (pixel.a < 128) continue;
    const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }

  const uniqueColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  if (uniqueColors.length <= numColors) {
    return uniqueColors;
  }

  let centroids = uniqueColors.slice(0, numColors).map(hexToRgb);

  for (let iter = 0; iter < 20; iter++) {
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
  if (pixel.a < 128) return 0;

  const pixelRgb = { r: pixel.r, g: pixel.g, b: pixel.b };
  let minDist = Infinity;
  let nearest = 1;

  for (let i = 0; i < palette.length; i++) {
    const paletteRgb = hexToRgb(palette[i]);
    const dist = colorDistance(pixelRgb, paletteRgb);
    if (dist < minDist) {
      minDist = dist;
      nearest = i + 1;
    }
  }

  return nearest;
}

function determineDifficulty(width, height, colorCount) {
  const cellCount = width * height;
  if (cellCount <= 900 && colorCount <= 8) return 'easy';
  if (cellCount <= 1600 && colorCount <= 12) return 'medium';
  return 'hard';
}

async function convertImage(inputPath, outputDir, category) {
  const baseName = path.basename(inputPath, path.extname(inputPath));

  // Clean up name: remove "minecraft-" prefix if present
  let cleanName = baseName.replace(/^minecraft-/, '');
  const puzzleId = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const puzzleName = cleanName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  console.log(`Converting: ${baseName} -> ${category}`);

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // Target size: 24-32 for smaller, simpler pixel art
  const targetWidth = 32;
  const aspectRatio = metadata.height / metadata.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  const resized = await image
    .resize(targetWidth, targetHeight, {
      fit: 'fill',
      kernel: 'nearest',
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

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

  // Auto-detect colors: 8-15 colors
  const uniqueCount = new Set(
    pixels.filter(p => p.a >= 128).map(p => rgbToHex(p.r, p.g, p.b))
  ).size;
  const numColors = Math.min(15, Math.max(6, Math.round(Math.sqrt(uniqueCount) * 1.2)));

  const palette = quantizeColors(pixels, numColors);

  const cells = [];
  for (let y = 0; y < targetHeight; y++) {
    const row = [];
    for (let x = 0; x < targetWidth; x++) {
      const idx = y * targetWidth + x;
      row.push(findNearestColor(pixels[idx], palette));
    }
    cells.push(row);
  }

  const puzzle = {
    id: puzzleId,
    name: puzzleName,
    category,
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

  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${puzzleId}.json`);
  await fs.writeFile(outputPath, JSON.stringify(puzzle, null, 2));

  console.log(`  -> ${outputPath} (${puzzle.difficulty}, ${palette.length} colors)`);
  return puzzle;
}

async function findImages(dir, results = [], folderPath = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await findImages(fullPath, results, [...folderPath, entry.name]);
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
      results.push({
        path: fullPath,
        folders: folderPath,
        name: entry.name,
      });
    }
  }

  return results;
}

async function main() {
  const inputDir = process.argv[2] || '../minecraft-renders';
  const outputDir = process.argv[3] || '../../src/data/puzzles';

  const resolvedInput = path.resolve(path.dirname(new URL(import.meta.url).pathname), inputDir);
  const resolvedOutput = path.resolve(path.dirname(new URL(import.meta.url).pathname), outputDir);

  console.log(`Input directory: ${resolvedInput}`);
  console.log(`Output directory: ${resolvedOutput}\n`);

  const images = await findImages(resolvedInput);
  console.log(`Found ${images.length} images to convert\n`);

  let success = 0;
  let failed = 0;

  for (const img of images) {
    // Determine category from folder path
    let category = 'objects'; // default
    for (const folder of img.folders.reverse()) {
      if (CATEGORY_MAP[folder]) {
        category = CATEGORY_MAP[folder];
        break;
      }
    }

    try {
      await convertImage(img.path, resolvedOutput, category);
      success++;
    } catch (error) {
      console.error(`  FAILED: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Conversion complete!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`========================================\n`);

  // Generate index file for puzzleStore
  console.log(`Generating puzzle index...`);
  const puzzleFiles = await fs.readdir(resolvedOutput);
  const jsonFiles = puzzleFiles.filter(f => f.endsWith('.json'));

  const imports = jsonFiles.map((f, i) =>
    `import puzzle${i} from './${f}'`
  ).join('\n');

  const exports = `\nexport const puzzles = [\n  ${jsonFiles.map((_, i) => `puzzle${i}`).join(',\n  ')}\n] as Puzzle[]\n`;

  const indexContent = `import type { Puzzle } from '../../types'\n\n${imports}\n${exports}`;

  await fs.writeFile(path.join(resolvedOutput, 'index.ts'), indexContent);
  console.log(`Generated: ${path.join(resolvedOutput, 'index.ts')}`);
  console.log(`Total puzzles: ${jsonFiles.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
