import type { Color, Puzzle, UserProgress } from '../../types'

interface ColorPaletteProps {
  colors: Color[]
  selectedColor: Color | null
  onSelectColor: (color: Color) => void
  progress: UserProgress | undefined
  puzzle: Puzzle
  remainingCells: number
}

export default function ColorPalette({
  colors,
  selectedColor,
  onSelectColor,
  progress,
  puzzle,
  remainingCells,
}: ColorPaletteProps) {
  // Calculate remaining cells for each color (cells that need this color but aren't correctly filled)
  const getColorRemaining = (colorId: number): number => {
    if (!progress) return 0

    return puzzle.cells.flat().filter((id, i) => {
      const row = Math.floor(i / puzzle.width)
      const col = i % puzzle.width
      const filledColorId = progress.filledCells[row]?.[col] || 0
      // Cell is remaining if it expects this color AND is not correctly filled
      return id === colorId && filledColorId !== colorId
    }).length
  }

  // Sort colors by color number (id)
  const sortedColors = [...colors].sort((a, b) => a.id - b.id)

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 safe-area-bottom">
      {/* Selected color info */}
      {selectedColor && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: selectedColor.hex }}
            />
            <span className="text-sm font-medium text-gray-700">
              Color #{selectedColor.id}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {remainingCells > 0 ? (
              <>{remainingCells} cell{remainingCells !== 1 ? 's' : ''} left</>
            ) : (
              <span className="text-green-600">✓ Complete!</span>
            )}
          </span>
        </div>
      )}

      {/* Color buttons */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {sortedColors.map((color) => {
            const remaining = getColorRemaining(color.id)
            const isSelected = selectedColor?.id === color.id
            const isComplete = remaining === 0

            return (
              <button
                key={color.id}
                onClick={() => onSelectColor(color)}
                disabled={isComplete}
                className={`
                  color-btn relative flex-shrink-0 w-14 h-14 rounded-xl
                  flex flex-col items-center justify-center
                  border-2 transition-all
                  ${isSelected ? 'selected border-primary-500 scale-110' : 'border-transparent'}
                  ${isComplete ? 'opacity-40' : ''}
                `}
                style={{ backgroundColor: color.hex }}
              >
                {/* Number badge */}
                <span
                  className={`
                    text-xs font-bold px-1.5 py-0.5 rounded-full
                    ${isLightColor(color.hex) ? 'bg-black/20 text-black' : 'bg-white/30 text-white'}
                  `}
                >
                  {color.id}
                </span>

                {/* Remaining count */}
                {!isComplete && (
                  <span
                    className={`
                      text-[10px] font-medium mt-0.5
                      ${isLightColor(color.hex) ? 'text-black/60' : 'text-white/80'}
                    `}
                  >
                    {remaining}
                  </span>
                )}

                {/* Complete checkmark */}
                {isComplete && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <span className="text-white text-lg">✓</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Helper to determine if a color is light or dark
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5
}
