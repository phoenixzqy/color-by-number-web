import { Routes, Route, Navigate } from 'react-router-dom'
import Gallery from './components/Gallery/Gallery'
import UserGallery from './components/UserGallery/UserGallery'
import PaintBoard from './components/PaintBoard/PaintBoard'
import Layout from './components/common/Layout'
import PWAUpdatePrompt from './components/common/PWAUpdatePrompt'

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/my-gallery" element={<UserGallery />} />
          <Route path="/paint/:puzzleId" element={<PaintBoard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <PWAUpdatePrompt />
    </>
  )
}

export default App
