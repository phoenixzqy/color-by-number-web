// Puzzle data structure
export interface Color {
  id: number
  hex: string
  name: string
}

export interface Puzzle {
  id: string
  name: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  width: number
  height: number
  colors: Color[]
  cells: number[][] // 2D array of color IDs (0 = transparent/empty)
  thumbnail?: string // Base64 or URL
  preview?: string // Completed preview image
}

// Cell state: 0 = unfilled, positive number = filled with that color ID
// This allows tracking both correct fills and mistakes
export type CellState = number

// User progress structure
export interface UserProgress {
  puzzleId: string
  filledCells: CellState[][] // 0 = unfilled, >0 = filled with color ID
  startedAt: string
  completedAt?: string
  lastPlayedAt: string
}

// Category type
export type Category =
  | 'all'
  | 'animals'
  | 'nature'
  | 'vehicles'
  | 'food'
  | 'fantasy'
  | 'characters'
  | 'places'
  | 'objects'
  | 'family'

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '🎨' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { value: 'animals', label: 'Animals', emoji: '🐾' },
  { value: 'nature', label: 'Nature', emoji: '🌸' },
  { value: 'vehicles', label: 'Vehicles', emoji: '🚗' },
  { value: 'food', label: 'Food', emoji: '🍕' },
  { value: 'fantasy', label: 'Fantasy', emoji: '🦄' },
  { value: 'characters', label: 'Characters', emoji: '👾' },
  { value: 'places', label: 'Places', emoji: '🏰' },
  { value: 'objects', label: 'Objects', emoji: '⭐' },
]

// Difficulty colors for UI
export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700', stars: 1 },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', stars: 2 },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700', stars: 3 },
}
