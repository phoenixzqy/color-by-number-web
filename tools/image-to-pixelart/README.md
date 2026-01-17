# Image to Pixel Art Converter

A CLI tool to convert images into pixel art puzzles for the Color by Number game.

## Installation

```bash
cd tools/image-to-pixelart
npm install
```

## Usage

### Single Image Conversion

```bash
# Auto-detect optimal settings
node convert.js -i ./image.png -o ../../src/data/puzzles/

# With custom settings
node convert.js -i ./image.png -o ../../src/data/puzzles/ \
  --size 48 \
  --colors 12 \
  --name "My Puzzle" \
  --category "animals" \
  --id "my-puzzle-001"
```

### Bulk Conversion

```bash
# Convert all images in a folder
node convert-bulk.js -i ./images/ -o ../../src/data/puzzles/ \
  --category "nature"
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input image path (required) | - |
| `--output` | `-o` | Output directory (required) | - |
| `--size` | `-s` | Target grid width | 48 |
| `--colors` | `-c` | Number of colors (0=auto) | 0 (auto) |
| `--name` | `-n` | Puzzle display name | From filename |
| `--category` | - | Puzzle category | "animals" |
| `--id` | - | Puzzle ID | From filename |

## Supported Image Formats

- PNG
- JPEG/JPG
- WebP
- GIF
- BMP

## Auto-Detection

When `--colors 0` (default), the tool automatically determines the optimal number of colors based on the image complexity:
- Uses k-means clustering to quantize colors
- Typically produces 6-20 colors depending on the image

## Output Format

The tool generates a JSON file with this structure:

```json
{
  "id": "puzzle-id",
  "name": "Puzzle Name",
  "category": "animals",
  "difficulty": "medium",
  "width": 48,
  "height": 52,
  "colors": [
    { "id": 1, "hex": "#FF5733", "name": "Orange" },
    { "id": 2, "hex": "#3498DB", "name": "Blue" }
  ],
  "cells": [
    [1, 1, 2, 2, 1, ...],
    [2, 2, 1, 1, 2, ...],
    ...
  ]
}
```

## Difficulty Levels

Automatically calculated based on:
- **Easy**: ≤1024 cells AND ≤8 colors
- **Medium**: ≤2500 cells AND ≤15 colors
- **Hard**: Everything else
