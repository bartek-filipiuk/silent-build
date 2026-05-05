import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { connectSse } from './lib/sse.js'
import { ControlPanel } from './components/ControlPanel.js'

const App = () => {
  useEffect(() => connectSse(), [])
  return <ControlPanel />
}

const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><App /></StrictMode>)
