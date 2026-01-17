# Color by Number Web App

## Project Overview
A kid-friendly Color by Number Progressive Web App (PWA) for coloring pixel art puzzles.

## Critical Configuration
- **Base URL Path**: `/colorbynumberweb` - ALL routes and assets must use this base path
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist middleware
- **PWA**: vite-plugin-pwa for offline support

## Project Structure
```
/colorbynumberweb/
├── src/
│   ├── components/
│   │   ├── Gallery/        # Main puzzle gallery (home page)
│   │   ├── UserGallery/    # User's WIP and completed puzzles
│   │   ├── PaintBoard/     # Main coloring canvas
│   │   ├── ColorPalette/   # Color selection panel
│   │   └── common/         # Shared components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   │   ├── puzzleStore.ts  # Available puzzles
│   │   └── userProgressStore.ts # User progress (persisted)
│   ├── types.ts            # TypeScript types
│   ├── data/puzzles/       # Puzzle JSON files
│   └── assets/             # Static assets
├── tools/
│   └── image-to-pixelart/  # CLI tool for converting images
└── public/                  # Static files, PWA icons
```

## Key Technical Details

### Routing
- `/` - Gallery page (browse puzzles)
- `/my-gallery` - User's artwork (in progress & completed)
- `/paint/:puzzleId` - Coloring canvas

### Puzzle Data Format
```typescript
interface Puzzle {
  id: string
  name: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  width: number
  height: number
  colors: { id: number; hex: string; name: string }[]
  cells: number[][] // 2D array, 0 = empty
}
```

### User Progress (Persisted to localStorage)
```typescript
interface UserProgress {
  puzzleId: string
  filledCells: boolean[][]
  startedAt: string
  completedAt?: string
  lastPlayedAt: string
}
```

## Important Guidelines

1. **Always use base path** - All imports, routes, and assets must respect `/colorbynumberweb` base
2. **Touch-first** - Design for touch screens, use 44px minimum tap targets
3. **Kid-friendly** - Simple UI, large buttons, bright colors
4. **Offline support** - PWA caches puzzles for offline play
5. **Performance** - Canvas rendering at 60fps, efficient re-renders

## Image Conversion Tool
Located in `/tools/image-to-pixelart/`. Converts images to puzzle JSON:
```bash
npm run convert -- --input ./image.png --output ./puzzles/
npm run convert:bulk -- --input ./images/ --output ./puzzles/
```

## Development
1. Run `npm run dev` to start dev server
2. Access at `http://localhost:5173/colorbynumberweb/`
3. Test on mobile devices for touch interactions
4. Test PWA install on supported browsers
