import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update()
        }, 60 * 60 * 1000)
      }
      console.log('SW Registered')
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
  }

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-xl">🎨</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">Update Available!</p>
          <p className="text-xs text-gray-500 truncate">New puzzles and features are ready</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={close}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  )
}
