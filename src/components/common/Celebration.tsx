import { useEffect, useState } from 'react'

interface CelebrationProps {
  onClose: () => void
  onContinue?: () => void
}

export default function Celebration({ onClose, onContinue }: CelebrationProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([])

  useEffect(() => {
    // Generate confetti pieces
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
    }))
    setConfetti(pieces)

    // Auto close after animation
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            width: `${8 + Math.random() * 8}px`,
            height: `${8 + Math.random() * 8}px`,
          }}
        />
      ))}

      {/* Message */}
      <div className="bg-white rounded-3xl p-8 mx-4 text-center shadow-2xl animate-bounce-slow">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Amazing!</h2>
        <p className="text-gray-600 mb-6">You completed the artwork!</p>
        <button
          onClick={onContinue || onClose}
          className="bg-primary-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
