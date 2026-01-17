import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { usePuzzleStore } from '../../stores/puzzleStore'
import { useUserProgressStore } from '../../stores/userProgressStore'
import { CATEGORIES, DIFFICULTY_CONFIG } from '../../types'
import type { Puzzle } from '../../types'

// Calculate how many items fit in the viewport
function useVisibleItemCount() {
  const [count, setCount] = useState(20) // Default initial count

  useEffect(() => {
    const calculateCount = () => {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Estimate card dimensions based on grid layout
      // Cards are roughly 180px tall (aspect-square thumbnail + info section)
      const cardHeight = 220
      // Gap between cards is 16px (gap-4)
      const gap = 16
      // Header + search + category tabs take roughly 180px
      const headerHeight = 180

      // Calculate columns based on breakpoints (matches grid-cols-2 sm:3 md:4 lg:5)
      let columns = 2
      if (viewportWidth >= 1024) columns = 5
      else if (viewportWidth >= 768) columns = 4
      else if (viewportWidth >= 640) columns = 3

      // Calculate rows that fit in viewport
      const availableHeight = viewportHeight - headerHeight
      const rows = Math.ceil(availableHeight / (cardHeight + gap)) + 1 // +1 for buffer

      // Return total visible items with some buffer
      setCount(columns * rows + columns) // Extra row for smooth scrolling
    }

    calculateCount()
    window.addEventListener('resize', calculateCount)
    return () => window.removeEventListener('resize', calculateCount)
  }, [])

  return count
}

export default function Gallery() {
  const navigate = useNavigate()
  const {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    getFilteredPuzzles
  } = usePuzzleStore()
  const { getProgress, getCompletionPercentage } = useUserProgressStore()

  const filteredPuzzles = getFilteredPuzzles()

  // Windowing: track how many items to render
  const visibleItemCount = useVisibleItemCount()
  const [renderedCount, setRenderedCount] = useState(visibleItemCount)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Reset rendered count when filters change
  useEffect(() => {
    setRenderedCount(visibleItemCount)
  }, [selectedCategory, searchQuery, visibleItemCount])

  // Intersection observer to load more items when scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderedCount < filteredPuzzles.length) {
          setRenderedCount(prev => Math.min(prev + visibleItemCount, filteredPuzzles.length))
        }
      },
      { rootMargin: '200px' }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [renderedCount, filteredPuzzles.length, visibleItemCount])

  // Get only the puzzles to render (windowing)
  const visiblePuzzles = useMemo(
    () => filteredPuzzles.slice(0, renderedCount),
    [filteredPuzzles, renderedCount]
  )

  const handleStartPuzzle = (puzzle: Puzzle) => {
    navigate(`/paint/${puzzle.id}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search puzzles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 rounded-xl border border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-primary-50'
              }`}
            >
              <span>{cat.emoji}</span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Puzzle grid */}
      {filteredPuzzles.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🎨</span>
          <p className="text-gray-500">No puzzles found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-primary-500 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visiblePuzzles.map((puzzle) => (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                progress={getProgress(puzzle.id)}
                completionPercentage={getCompletionPercentage(
                  puzzle.id,
                  puzzle.cells.flat().filter(id => id !== 0).length,
                  puzzle.cells
                )}
                onStart={() => handleStartPuzzle(puzzle)}
              />
            ))}
          </div>
          {/* Sentinel for loading more items */}
          {renderedCount < filteredPuzzles.length && (
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-4">
              <div className="text-gray-400 text-sm">Loading more...</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface PuzzleCardProps {
  puzzle: Puzzle
  progress?: ReturnType<typeof useUserProgressStore.getState>['getProgress'] extends (id: string) => infer R ? R : never
  completionPercentage: number
  onStart: () => void
}

function PuzzleCard({ puzzle, progress, completionPercentage, onStart }: PuzzleCardProps) {
  const difficultyConfig = DIFFICULTY_CONFIG[puzzle.difficulty]
  const isStarted = !!progress
  const isCompleted = progress?.completedAt

  return (
    <div
      onClick={onStart}
      className="bg-white rounded-2xl shadow-sm border border-primary-100 overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-gradient-to-br from-primary-50 to-primary-100 relative">
        {puzzle.thumbnail ? (
          <img
            src={puzzle.thumbnail}
            alt={puzzle.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <PuzzlePreview puzzle={puzzle} />
        )}

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <span>✓</span>
          </div>
        )}

        {/* Progress indicator */}
        {isStarted && !isCompleted && completionPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm truncate">{puzzle.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyConfig.color}`}>
            {'⭐'.repeat(difficultyConfig.stars)}
          </span>
          <span className="text-xs text-gray-400">{puzzle.colors.length} colors</span>
        </div>
      </div>
    </div>
  )
}

// Simple preview renderer using canvas-like display
function PuzzlePreview({ puzzle }: { puzzle: Puzzle }) {
  // Calculate cell size to fit the entire puzzle within the container
  // Use smaller of width/height constraint to ensure it fits
  const maxSize = 140 // Max pixel size for the preview
  const cellSize = Math.max(2, Math.floor(maxSize / Math.max(puzzle.width, puzzle.height)))

  // Calculate actual grid dimensions
  const gridWidth = puzzle.width * cellSize
  const gridHeight = puzzle.height * cellSize

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{ padding: '8%' }}
    >
      <div
        className="bg-white rounded shadow-inner overflow-hidden flex-shrink-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${puzzle.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${puzzle.height}, ${cellSize}px)`,
          width: gridWidth,
          height: gridHeight,
        }}
      >
        {puzzle.cells.flat().map((colorId, index) => {
          const color = puzzle.colors.find((c) => c.id === colorId)
          return (
            <div
              key={index}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: color ? color.hex : '#f3f4f6',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
