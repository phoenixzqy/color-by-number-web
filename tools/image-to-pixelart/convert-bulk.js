#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

program
  .name('convert-bulk')
  .description('Convert all images in a folder to pixel art puzzles')
  .requiredOption('-i, --input <path>', 'Input folder with images')
  .requiredOption('-o, --output <path>', 'Output directory for puzzle JSONs')
  .option('-s, --size <number>', 'Target grid size (width)', '48')
  .option('-c, --colors <number>', 'Number of colors (0 = auto)', '0')
  .option('--category <string>', 'Default category for puzzles', 'animals')
  .parse();

const options = program.opts();

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];

async function runConvert(imagePath, outputDir, opts) {
  return new Promise((resolve, reject) => {
    const args = [
      'convert.js',
      '-i', imagePath,
      '-o', outputDir,
      '-s', opts.size,
      '-c', opts.colors,
      '--category', opts.category,
    ];

    const child = spawn('node', args, {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      stdio: 'inherit',
    });

    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Convert failed with code ${code}`));
    });
  });
}

async function main() {
  const inputDir = options.input;
  const outputDir = options.output;

  // Get all image files
  const files = await fs.readdir(inputDir);
  const imageFiles = files.filter(f =>
    IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} images to convert\n`);

  let success = 0;
  let failed = 0;

  for (const file of imageFiles) {
    const imagePath = path.join(inputDir, file);
    try {
      await runConvert(imagePath, outputDir, options);
      success++;
    } catch (error) {
      console.error(`Failed to convert ${file}:`, error.message);
      failed++;
    }
  }

  console.log(`\nBulk conversion complete!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
