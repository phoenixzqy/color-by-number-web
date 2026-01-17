import { create } from 'zustand'
import type { Puzzle } from '../types'

// Import all puzzle JSON files
const puzzleModules = import.meta.glob('../data/puzzles/*.json', { eager: true })

// Load puzzles from imported modules
const loadPuzzles = (): Puzzle[] => {
  const puzzles: Puzzle[] = []
  for (const path in puzzleModules) {
    const puzzle = puzzleModules[path] as { default: Puzzle }
    puzzles.push(puzzle.default)
  }
  return puzzles
}

interface PuzzleStore {
  puzzles: Puzzle[]
  loading: boolean
  error: string | null
  selectedCategory: string
  searchQuery: string

  // Actions
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  getPuzzleById: (id: string) => Puzzle | undefined
  getFilteredPuzzles: () => Puzzle[]
}

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  puzzles: loadPuzzles(),
  loading: false,
  error: null,
  selectedCategory: 'all',
  searchQuery: '',

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  getPuzzleById: (id) => {
    return get().puzzles.find((p) => p.id === id)
  },

  getFilteredPuzzles: () => {
    const { puzzles, selectedCategory, searchQuery } = get()

    return puzzles.filter((puzzle) => {
      // Category filter
      if (selectedCategory !== 'all' && puzzle.category !== selectedCategory) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          puzzle.name.toLowerCase().includes(query) ||
          puzzle.category.toLowerCase().includes(query)
        )
      }

      return true
    })
  },
}))
