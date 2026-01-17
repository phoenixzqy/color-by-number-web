import { useNavigate } from 'react-router-dom'
import { usePuzzleStore } from '../../stores/puzzleStore'
import { useUserProgressStore } from '../../stores/userProgressStore'
import { DIFFICULTY_CONFIG } from '../../types'
import type { Puzzle, UserProgress } from '../../types'

export default function UserGallery() {
  const navigate = useNavigate()
  const { getPuzzleById } = usePuzzleStore()
  const { getInProgressPuzzles, getCompletedPuzzles, getCompletionPercentage } = useUserProgressStore()

  const inProgressPuzzles = getInProgressPuzzles()
  const completedPuzzles = getCompletedPuzzles()

  const handleResume = (puzzleId: string) => {
    navigate(`/paint/${puzzleId}`)
  }

  const hasAnyProgress = inProgressPuzzles.length > 0 || completedPuzzles.length > 0

  if (!hasAnyProgress) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <span className="text-6xl mb-4 block">📁</span>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No artwork yet</h2>
        <p className="text-gray-500 mb-6">Start coloring to see your masterpieces here!</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition-colors"
        >
          Browse Gallery
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* In Progress Section */}
      {inProgressPuzzles.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🎨</span> In Progress
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {inProgressPuzzles.map((progress) => {
              const puzzle = getPuzzleById(progress.puzzleId)
              if (!puzzle) return null

              const percentage = getCompletionPercentage(
                puzzle.id,
                puzzle.cells.flat().filter(id => id !== 0).length,
                puzzle.cells
              )

              return (
                <div
                  key={progress.puzzleId}
                  onClick={() => handleResume(progress.puzzleId)}
                  className="bg-white rounded-2xl shadow-sm border border-primary-100 overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <div className="aspect-square bg-gradient-to-br from-primary-50 to-primary-100 relative">
                    <ProgressPreview puzzle={puzzle} progress={progress} />
                    {/* Progress circle */}
                    <div className="absolute bottom-2 right-2 w-10 h-10">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          className="text-gray-200"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          r="16"
                          cx="18"
                          cy="18"
                        />
                        <circle
                          className="text-primary-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          r="16"
                          cx="18"
                          cy="18"
                          strokeDasharray={`${percentage} 100`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-600">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">
                      {puzzle.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Last played {formatDate(progress.lastPlayedAt)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Completed Section */}
      {completedPuzzles.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>✨</span> Completed ({completedPuzzles.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {completedPuzzles.map((progress) => {
              const puzzle = getPuzzleById(progress.puzzleId)
              if (!puzzle) return null

              const difficultyConfig = DIFFICULTY_CONFIG[puzzle.difficulty]

              return (
                <div
                  key={progress.puzzleId}
                  onClick={() => handleResume(progress.puzzleId)}
                  className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <div className="aspect-square bg-gradient-to-br from-green-50 to-green-100 relative">
                    <CompletedPreview puzzle={puzzle} />
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✓
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">
                      {puzzle.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyConfig.color}`}>
                        {'⭐'.repeat(difficultyConfig.stars)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(progress.completedAt!)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// Preview showing user's progress (filled cells show color, unfilled show gray)
function ProgressPreview({ puzzle, progress }: { puzzle: Puzzle; progress: UserProgress }) {
  const maxSize = 140
  const cellSize = Math.max(2, Math.floor(maxSize / Math.max(puzzle.width, puzzle.height)))
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
        {puzzle.cells.flat().map((expectedColorId, index) => {
          const row = Math.floor(index / puzzle.width)
          const col = index % puzzle.width
          const filledColorId = progress.filledCells[row]?.[col] || 0

          // Get the color to display
          let backgroundColor = '#f3f4f6' // default gray for unfilled/empty

          if (expectedColorId === 0) {
            // Empty cell
            backgroundColor = '#f8fafc'
          } else if (filledColorId !== 0) {
            // Cell is filled - show the filled color
            const filledColor = puzzle.colors.find(c => c.id === filledColorId)
            backgroundColor = filledColor?.hex || '#f3f4f6'
          } else {
            // Unfilled cell - show light gray
            backgroundColor = '#e5e7eb'
          }

          return (
            <div
              key={index}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// Preview showing the completed artwork (all correct colors)
function CompletedPreview({ puzzle }: { puzzle: Puzzle }) {
  const maxSize = 140
  const cellSize = Math.max(2, Math.floor(maxSize / Math.max(puzzle.width, puzzle.height)))
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
          const color = puzzle.colors.find(c => c.id === colorId)
          return (
            <div
              key={index}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: color ? color.hex : '#f8fafc',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
