import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePuzzleStore } from '../../stores/puzzleStore'
import { useUserProgressStore } from '../../stores/userProgressStore'
import ColorPalette from '../ColorPalette/ColorPalette'
import Celebration from '../common/Celebration'
import type { Color } from '../../types'

interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

interface UndoAction {
  row: number
  col: number
  previousColorId: number // 0 = was unfilled, >0 = was filled with that color
}

// Helper to lighten a color for mistake indication
function lightenColor(hex: string, amount: number = 0.6): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const newR = Math.round(r + (255 - r) * amount)
  const newG = Math.round(g + (255 - g) * amount)
  const newB = Math.round(b + (255 - b) * amount)

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

export default function PaintBoard() {
  const { puzzleId } = useParams<{ puzzleId: string }>()
  const navigate = useNavigate()
  const { getPuzzleById } = usePuzzleStore()
  const {
    startPuzzle,
    getProgress,
    fillCell,
    unfillCell,
    completePuzzle,
    getCompletionPercentage
  } = useUserProgressStore()

  const puzzle = getPuzzleById(puzzleId || '')
  const progress = getProgress(puzzleId || '')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [selectedColor, setSelectedColor] = useState<Color | null>(null)
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // Check if puzzle was already completed when loaded
  useEffect(() => {
    if (progress?.completedAt) {
      setIsCompleted(true)
    }
  }, [progress?.completedAt])

  // Interaction state refs (not reactive to avoid re-renders during drag)
  const isPaintingRef = useRef(false)
  const isPanningRef = useRef(false)
  const lastPaintedCellRef = useRef<{ row: number; col: number } | null>(null)
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null)
  const touchModeRef = useRef<'none' | 'paint' | 'pan-zoom'>('none')
  const initialPinchDistRef = useRef<number>(0)
  const initialPinchScaleRef = useRef<number>(1)
  const pinchCenterRef = useRef<{ x: number; y: number } | null>(null)

  const CELL_SIZE = 30

  // Initialize puzzle progress
  useEffect(() => {
    if (puzzle && puzzleId) {
      startPuzzle(puzzleId, puzzle.width, puzzle.height)
    }
  }, [puzzle, puzzleId, startPuzzle])

  // Check for completion
  useEffect(() => {
    if (!puzzle || !progress) return

    const totalColoredCells = puzzle.cells.flat().filter(id => id !== 0).length

    // Count correctly filled cells
    let correctCount = 0
    for (let row = 0; row < puzzle.height; row++) {
      for (let col = 0; col < puzzle.width; col++) {
        const expectedColor = puzzle.cells[row][col]
        const filledColor = progress.filledCells[row]?.[col] || 0
        if (expectedColor !== 0 && filledColor === expectedColor) {
          correctCount++
        }
      }
    }

    if (correctCount >= totalColoredCells && !progress.completedAt) {
      completePuzzle(puzzleId!)
      setShowCelebration(true)
      setIsCompleted(true)
    }
  }, [progress, puzzle, puzzleId, completePuzzle])

  // Select first color by default
  useEffect(() => {
    if (puzzle && !selectedColor) {
      setSelectedColor(puzzle.colors[0])
    }
  }, [puzzle, selectedColor])

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !puzzle || !progress) return

    const { scale, offsetX, offsetY } = viewState
    const dpr = window.devicePixelRatio || 1

    // Clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transforms
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY)

    // Draw cells
    for (let row = 0; row < puzzle.height; row++) {
      for (let col = 0; col < puzzle.width; col++) {
        const expectedColorId = puzzle.cells[row][col]
        const filledColorId = progress.filledCells[row]?.[col] || 0
        const expectedColor = puzzle.colors.find(c => c.id === expectedColorId)
        const filledColor = puzzle.colors.find(c => c.id === filledColorId)
        const isSelected = selectedColor?.id === expectedColorId

        const x = col * CELL_SIZE
        const y = row * CELL_SIZE

        if (isCompleted) {
          // Completed artwork - show final colors without grid
          ctx.fillStyle = expectedColor?.hex || '#f8fafc'
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        } else if (expectedColorId === 0) {
          // Empty/transparent cell
          ctx.fillStyle = '#f8fafc'
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        } else if (filledColorId !== 0) {
          // Cell is filled
          if (filledColorId === expectedColorId) {
            // Correctly filled - show full color
            ctx.fillStyle = expectedColor?.hex || '#ccc'
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          } else {
            // Wrong color (mistake) - show lighter version with number
            ctx.fillStyle = lightenColor(filledColor?.hex || '#ccc', 0.6)
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)

            // Draw the expected number on top
            ctx.fillStyle = '#6b7280'
            ctx.font = `bold ${Math.max(10, CELL_SIZE * 0.45)}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(expectedColorId), x + CELL_SIZE / 2, y + CELL_SIZE / 2)
          }
        } else {
          // Unfilled cell - show number
          ctx.fillStyle = isSelected ? '#e0e7ff' : '#ffffff'
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)

          // Draw number
          ctx.fillStyle = isSelected ? '#4338ca' : '#6b7280'
          ctx.font = `bold ${Math.max(10, CELL_SIZE * 0.45)}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(expectedColorId), x + CELL_SIZE / 2, y + CELL_SIZE / 2)
        }

        // Cell border (hide for completed artwork)
        if (!isCompleted) {
          ctx.strokeStyle = '#e5e7eb'
          ctx.lineWidth = 0.5
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
        }
      }
    }
  }, [puzzle, progress, viewState, selectedColor, CELL_SIZE, isCompleted])

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !puzzle) return

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      // Center the puzzle
      const puzzleWidth = puzzle.width * CELL_SIZE
      const puzzleHeight = puzzle.height * CELL_SIZE
      const initialScale = Math.min(
        (rect.width * 0.9) / puzzleWidth,
        (rect.height * 0.9) / puzzleHeight,
        2
      )

      setViewState({
        scale: initialScale,
        offsetX: (rect.width - puzzleWidth * initialScale) / 2,
        offsetY: (rect.height - puzzleHeight * initialScale) / 2,
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [puzzle, CELL_SIZE])

  // Redraw on state changes
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // Get cell coordinates from screen position
  const getCellFromPosition = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    const canvas = canvasRef.current
    if (!canvas || !puzzle) return null

    const rect = canvas.getBoundingClientRect()
    const { scale, offsetX, offsetY } = viewState

    const canvasX = (clientX - rect.left - offsetX) / scale
    const canvasY = (clientY - rect.top - offsetY) / scale

    const col = Math.floor(canvasX / CELL_SIZE)
    const row = Math.floor(canvasY / CELL_SIZE)

    if (row < 0 || row >= puzzle.height || col < 0 || col >= puzzle.width) return null

    return { row, col }
  }, [puzzle, viewState, CELL_SIZE])

  // Paint a cell with the selected color
  const paintCell = useCallback((row: number, col: number) => {
    if (!puzzle || !progress || !selectedColor || isCompleted || !puzzleId) return

    const expectedColorId = puzzle.cells[row][col]
    const currentFilledId = progress.filledCells[row]?.[col] || 0

    // Skip if cell is empty (no color expected)
    if (expectedColorId === 0) return
    // Skip if already filled with the same color we're trying to paint
    if (currentFilledId === selectedColor.id) return
    // Skip if cell is already CORRECTLY filled (can't override correct fills)
    if (currentFilledId === expectedColorId) return

    // Record undo action
    setUndoStack(prev => [...prev.slice(-50), { row, col, previousColorId: currentFilledId }])

    // Fill with the selected color (whether correct or not)
    fillCell(puzzleId, row, col, selectedColor.id)
  }, [puzzle, progress, selectedColor, isCompleted, puzzleId, fillCell])

  // Handle continuous painting
  const handlePaint = useCallback((clientX: number, clientY: number) => {
    const cell = getCellFromPosition(clientX, clientY)
    if (!cell) return

    // Avoid repainting the same cell
    if (lastPaintedCellRef.current?.row === cell.row && lastPaintedCellRef.current?.col === cell.col) {
      return
    }

    lastPaintedCellRef.current = cell
    paintCell(cell.row, cell.col)
  }, [getCellFromPosition, paintCell])

  // ===== MOUSE HANDLERS (PC) =====

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()

    if (e.button === 0) {
      // Left click - start painting
      isPaintingRef.current = true
      lastPaintedCellRef.current = null
      handlePaint(e.clientX, e.clientY)
    } else if (e.button === 1) {
      // Middle click - start panning
      isPanningRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [handlePaint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPaintingRef.current) {
      // Continue painting
      handlePaint(e.clientX, e.clientY)
    } else if (isPanningRef.current && lastMousePosRef.current) {
      // Continue panning
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y

      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }))

      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [handlePaint])

  const handleMouseUp = useCallback(() => {
    isPaintingRef.current = false
    isPanningRef.current = false
    lastPaintedCellRef.current = null
    lastMousePosRef.current = null
  }, [])

  const handleMouseLeave = useCallback(() => {
    isPaintingRef.current = false
    isPanningRef.current = false
    lastPaintedCellRef.current = null
    lastMousePosRef.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const pivotX = e.clientX - rect.left
    const pivotY = e.clientY - rect.top

    const delta = -e.deltaY * 0.001
    const newScale = Math.min(Math.max(viewState.scale * (1 + delta), 0.5), 5)

    setViewState(prev => {
      const scaleChange = newScale / prev.scale
      return {
        scale: newScale,
        offsetX: pivotX - (pivotX - prev.offsetX) * scaleChange,
        offsetY: pivotY - (pivotY - prev.offsetY) * scaleChange,
      }
    })
  }, [viewState.scale])

  // Prevent context menu on middle click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
    }
  }, [])

  // ===== TOUCH HANDLERS (Mobile/Tablet) =====

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger - paint mode
      touchModeRef.current = 'paint'
      lastPaintedCellRef.current = null
      const touch = e.touches[0]
      handlePaint(touch.clientX, touch.clientY)
    } else if (e.touches.length === 2) {
      // Two fingers - pan/zoom mode
      e.preventDefault()
      touchModeRef.current = 'pan-zoom'
      lastPaintedCellRef.current = null

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      // Calculate initial pinch distance
      initialPinchDistRef.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      initialPinchScaleRef.current = viewState.scale

      // Calculate center point
      pinchCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      }

      lastMousePosRef.current = pinchCenterRef.current
    }
  }, [handlePaint, viewState.scale])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchModeRef.current === 'paint' && e.touches.length === 1) {
      // Continue painting with single finger
      const touch = e.touches[0]
      handlePaint(touch.clientX, touch.clientY)
    } else if (touchModeRef.current === 'pan-zoom' && e.touches.length === 2) {
      // Pan and zoom with two fingers
      e.preventDefault()

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      // Current center
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      }

      // Calculate zoom
      const currentDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      const scaleFactor = currentDist / initialPinchDistRef.current
      const newScale = Math.min(Math.max(initialPinchScaleRef.current * scaleFactor, 0.5), 5)

      // Calculate pan
      const container = containerRef.current
      if (container && lastMousePosRef.current && pinchCenterRef.current) {
        const rect = container.getBoundingClientRect()
        const pivotX = pinchCenterRef.current.x - rect.left
        const pivotY = pinchCenterRef.current.y - rect.top

        const dx = currentCenter.x - lastMousePosRef.current.x
        const dy = currentCenter.y - lastMousePosRef.current.y

        setViewState(prev => {
          const scaleChange = newScale / prev.scale
          return {
            scale: newScale,
            offsetX: pivotX - (pivotX - prev.offsetX) * scaleChange + dx,
            offsetY: pivotY - (pivotY - prev.offsetY) * scaleChange + dy,
          }
        })
      }

      lastMousePosRef.current = currentCenter
    } else if (e.touches.length === 2 && touchModeRef.current === 'paint') {
      // User added a second finger while painting - switch to pan/zoom
      e.preventDefault()
      touchModeRef.current = 'pan-zoom'
      lastPaintedCellRef.current = null

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      initialPinchDistRef.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      initialPinchScaleRef.current = viewState.scale

      pinchCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      }

      lastMousePosRef.current = pinchCenterRef.current
    }
  }, [handlePaint, viewState.scale])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All fingers lifted
      touchModeRef.current = 'none'
      lastPaintedCellRef.current = null
      lastMousePosRef.current = null
      pinchCenterRef.current = null
    } else if (e.touches.length === 1 && touchModeRef.current === 'pan-zoom') {
      // One finger lifted, but still one touching - switch to paint
      touchModeRef.current = 'paint'
      const touch = e.touches[0]
      lastPaintedCellRef.current = null
      handlePaint(touch.clientX, touch.clientY)
    }
  }, [handlePaint])

  // Undo action
  const handleUndo = useCallback(() => {
    const lastAction = undoStack[undoStack.length - 1]
    if (!lastAction || !puzzleId) return

    if (lastAction.previousColorId === 0) {
      // Was unfilled before - unfill it
      unfillCell(puzzleId, lastAction.row, lastAction.col)
    } else {
      // Was filled with a different color - restore it
      fillCell(puzzleId, lastAction.row, lastAction.col, lastAction.previousColorId)
    }
    setUndoStack(prev => prev.slice(0, -1))
  }, [undoStack, unfillCell, fillCell, puzzleId])

  // Calculate completion percentage (only correct cells count)
  const percentage = puzzle && progress
    ? getCompletionPercentage(puzzleId!, puzzle.cells.flat().filter(id => id !== 0).length, puzzle.cells)
    : 0

  // Remaining cells for selected color (correct ones only)
  const remainingCells = puzzle && progress && selectedColor
    ? puzzle.cells.flat().filter((id, i) => {
        const row = Math.floor(i / puzzle.width)
        const col = i % puzzle.width
        const filledColorId = progress.filledCells[row]?.[col] || 0
        return id === selectedColor.id && filledColorId !== selectedColor.id
      }).length
    : 0

  if (!puzzle) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-500">Loading puzzle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white shadow-sm px-4 py-3 flex items-center justify-between z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 mx-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 truncate">{puzzle.name}</span>
            <span className="text-xs text-gray-400">{percentage}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      </header>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 canvas-container overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="block touch-none" />
      </div>

      {/* Color Palette - hide when completed */}
      {!isCompleted ? (
        <ColorPalette
          colors={puzzle.colors}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          progress={progress}
          puzzle={puzzle}
          remainingCells={remainingCells}
        />
      ) : (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 safe-area-bottom px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <span className="text-xl">🎉</span>
            <span className="font-semibold">Completed!</span>
            <span className="text-xl">🎉</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">This artwork is finished</p>
        </div>
      )}

      {/* Celebration */}
      {showCelebration && (
        <Celebration
          onClose={() => setShowCelebration(false)}
          onContinue={() => navigate('/')}
        />
      )}
    </div>
  )
}
