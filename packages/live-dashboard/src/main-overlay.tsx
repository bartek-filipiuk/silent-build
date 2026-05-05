import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { connectSse } from './lib/sse.js'
import { LiveAnimationProvider } from './lib/animation.js'
import { OverlayHost } from './components/OverlayHost.js'
import { useTimeline } from './lib/store.js'

const App = () => {
  const timeline = useTimeline()
  useEffect(() => connectSse(), [])

  return (
    <div style={{ width: 1920, height: 1080, pointerEvents: 'none' }}>
      <LiveAnimationProvider sessionStartTs={timeline?.project.startTs ?? null}>
        <OverlayHost />
      </LiveAnimationProvider>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><App /></StrictMode>)
