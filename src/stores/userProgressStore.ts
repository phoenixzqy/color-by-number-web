import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProgress, CellState } from '../types'

interface UserProgressStore {
  progress: Record<string, UserProgress>

  // Actions
  getProgress: (puzzleId: string) => UserProgress | undefined
  startPuzzle: (puzzleId: string, width: number, height: number) => void
  fillCell: (puzzleId: string, row: number, col: number, colorId: number) => void
  unfillCell: (puzzleId: string, row: number, col: number) => void
  completePuzzle: (puzzleId: string) => void
  getCompletionPercentage: (puzzleId: string, totalCells: number, puzzleCells: number[][]) => number
  getInProgressPuzzles: () => UserProgress[]
  getCompletedPuzzles: () => UserProgress[]
  deletePuzzleProgress: (puzzleId: string) => void
}

export const useUserProgressStore = create<UserProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      getProgress: (puzzleId) => {
        return get().progress[puzzleId]
      },

      startPuzzle: (puzzleId, width, height) => {
        const existing = get().progress[puzzleId]
        if (existing) {
          // Migrate old boolean format to new number format if needed
          const needsMigration = existing.filledCells.some(row =>
            row.some(cell => typeof cell === 'boolean')
          )

          if (needsMigration) {
            // Convert old boolean[][] to new CellState[][] (0 for unfilled)
            const migratedCells: CellState[][] = existing.filledCells.map(row =>
              row.map(cell => (cell === true ? -1 : 0)) // -1 indicates old data, will show as filled
            )
            set((state) => ({
              progress: {
                ...state.progress,
                [puzzleId]: {
                  ...existing,
                  filledCells: migratedCells,
                  lastPlayedAt: new Date().toISOString(),
                },
              },
            }))
          } else {
            // Update last played time
            set((state) => ({
              progress: {
                ...state.progress,
                [puzzleId]: {
                  ...existing,
                  lastPlayedAt: new Date().toISOString(),
                },
              },
            }))
          }
          return
        }

        // Create new progress with CellState (0 = unfilled)
        const filledCells: CellState[][] = Array(height)
          .fill(null)
          .map(() => Array(width).fill(0))

        const newProgress: UserProgress = {
          puzzleId,
          filledCells,
          startedAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
        }

        set((state) => ({
          progress: {
            ...state.progress,
            [puzzleId]: newProgress,
          },
        }))
      },

      fillCell: (puzzleId, row, col, colorId) => {
        set((state) => {
          const existing = state.progress[puzzleId]
          if (!existing) return state

          const newFilledCells = existing.filledCells.map((r, ri) =>
            ri === row ? r.map((c, ci) => (ci === col ? colorId : c)) : r
          )

          return {
            progress: {
              ...state.progress,
              [puzzleId]: {
                ...existing,
                filledCells: newFilledCells,
                lastPlayedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      unfillCell: (puzzleId, row, col) => {
        set((state) => {
          const existing = state.progress[puzzleId]
          if (!existing) return state

          const newFilledCells = existing.filledCells.map((r, ri) =>
            ri === row ? r.map((c, ci) => (ci === col ? 0 : c)) : r
          )

          return {
            progress: {
              ...state.progress,
              [puzzleId]: {
                ...existing,
                filledCells: newFilledCells,
                lastPlayedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      completePuzzle: (puzzleId) => {
        set((state) => {
          const existing = state.progress[puzzleId]
          if (!existing) return state

          return {
            progress: {
              ...state.progress,
              [puzzleId]: {
                ...existing,
                completedAt: new Date().toISOString(),
                lastPlayedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      getCompletionPercentage: (puzzleId, totalCells, puzzleCells) => {
        const progress = get().progress[puzzleId]
        if (!progress || totalCells === 0 || !puzzleCells) return 0

        // Count correctly filled cells
        let correctCount = 0
        for (let row = 0; row < puzzleCells.length; row++) {
          if (!puzzleCells[row]) continue
          for (let col = 0; col < puzzleCells[row].length; col++) {
            const expectedColor = puzzleCells[row][col]
            const filledColor = progress.filledCells[row]?.[col] || 0

            // Cell is correctly filled if it matches the expected color
            // Or if it's a migrated cell (-1) and the expected is non-zero
            if (expectedColor !== 0 && (filledColor === expectedColor || filledColor === -1)) {
              correctCount++
            }
          }
        }

        return Math.round((correctCount / totalCells) * 100)
      },

      getInProgressPuzzles: () => {
        const progress = get().progress
        return Object.values(progress)
          .filter((p) => !p.completedAt)
          .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime())
      },

      getCompletedPuzzles: () => {
        const progress = get().progress
        return Object.values(progress)
          .filter((p) => p.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      },

      deletePuzzleProgress: (puzzleId) => {
        set((state) => {
          const { [puzzleId]: _, ...rest } = state.progress
          return { progress: rest }
        })
      },
    }),
    {
      name: 'color-by-number-progress',
    }
  )
)
