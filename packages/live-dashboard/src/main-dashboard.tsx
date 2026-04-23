import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Dashboard } from '@silent-build/ui'
import { connectSse } from './lib/sse.js'
import { LiveAnimationProvider } from './lib/animation.js'
import { useTimeline, useConnected, useViewerEpoch } from './lib/store.js'

const App = () => {
  const timeline = useTimeline()
  const connected = useConnected()
  const viewerEpoch = useViewerEpoch()

  useEffect(() => connectSse(), [])

  if (!timeline) {
    return (
      <div style={{
        width: 576, height: 1080,
        background: '#05070a', color: connected ? '#7a8699' : '#ff5a5a',
        display: 'grid', placeItems: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase'
      }}>
        {connected ? 'Awaiting first event…' : 'Connecting to live-server…'}
      </div>
    )
  }

  // Use viewer epoch (time this tab first saw data) as session start — keeps
  // the on-screen timer rising from 00:00:00 regardless of whether the jsonl
  // holds fresh live events or historical ones (replay demo).
  return (
    <LiveAnimationProvider sessionStartTs={viewerEpoch ?? timeline.project.startTs} pulseFps={30}>
      <Dashboard timeline={timeline} />
    </LiveAnimationProvider>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><App /></StrictMode>)
