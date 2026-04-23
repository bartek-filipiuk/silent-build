import { useCallback, useEffect, useState } from 'react'
import { tokens } from '@silent-build/theme'
import { Logo, Wordmark } from '@silent-build/ui'
import { postTrigger } from '../lib/api.js'
import { useConnected, useTimeline } from '../lib/store.js'

type Scene = 'intro' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'outro' | 'clear'

const hotkeys: Record<string, Scene> = {
  'i': 'intro',
  '1': 'phase1',
  '2': 'phase2',
  '3': 'phase3',
  '4': 'phase4',
  'o': 'outro',
  'Escape': 'clear'
}

const fire = async (scene: Scene): Promise<void> => {
  if (scene.startsWith('phase')) {
    const n = scene.slice(5)
    await postTrigger('phase', { n })
    return
  }
  await postTrigger(scene as 'intro' | 'outro' | 'clear')
}

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '16px 24px',
  background: tokens.colors.panel,
  color,
  border: `1px solid ${color}`,
  fontFamily: tokens.typography.fontMono,
  fontSize: 14,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.15s'
})

export const ControlPanel = () => {
  const connected = useConnected()
  const timeline = useTimeline()
  const [flash, setFlash] = useState<string | null>(null)

  const dispatch = useCallback(async (scene: Scene) => {
    try {
      await fire(scene)
      setFlash(scene)
      window.setTimeout(() => setFlash(null), 500)
    } catch (err) {
      console.error(err)
      setFlash(`error: ${(err as Error).message}`)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const s = hotkeys[e.key]
      if (s) { e.preventDefault(); void dispatch(s) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Logo size={40} variant="amber" />
        <Wordmark size={24} />
        <span style={{
          marginLeft: 'auto',
          color: connected ? tokens.colors.greenOk : tokens.colors.redAlert,
          fontFamily: tokens.typography.fontMono, fontSize: 12,
          letterSpacing: '0.18em', textTransform: 'uppercase'
        }}>
          {connected ? '● live-server connected' : '○ disconnected'}
        </span>
      </header>

      {timeline && (
        <div style={{
          marginBottom: 24, padding: 16,
          border: tokens.borders.hairline,
          fontFamily: tokens.typography.fontMono, fontSize: 13,
          color: tokens.colors.textDim
        }}>
          Project: <span style={{ color: tokens.colors.amber }}>{timeline.project.name}</span>
          {' · '}
          Events: <span style={{ color: tokens.colors.textPrimary }}>{timeline.events.length}</span>
          {' · '}
          Tokens: <span style={{ color: tokens.colors.textPrimary }}>{timeline.metrics.totalTokens.toLocaleString('en-US')}</span>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <button style={btnStyle(tokens.colors.amber)} onClick={() => dispatch('intro')}>[I]ntro</button>
        <button style={btnStyle(tokens.colors.amber)} onClick={() => dispatch('outro')}>[O]utro</button>
        <button style={btnStyle(tokens.colors.amberDim)} onClick={() => dispatch('phase1')}>Phase [1] Architecture</button>
        <button style={btnStyle(tokens.colors.amberDim)} onClick={() => dispatch('phase2')}>Phase [2] Backend</button>
        <button style={btnStyle(tokens.colors.amberDim)} onClick={() => dispatch('phase3')}>Phase [3] Frontend</button>
        <button style={btnStyle(tokens.colors.amberDim)} onClick={() => dispatch('phase4')}>Phase [4] Security</button>
        <button style={{ ...btnStyle(tokens.colors.redAlert), gridColumn: 'span 2' }} onClick={() => dispatch('clear')}>[Esc] Clear overlay</button>
      </div>

      {flash && (
        <div style={{
          marginTop: 16, padding: 12,
          color: tokens.colors.amberBright,
          fontFamily: tokens.typography.fontMono, fontSize: 12,
          letterSpacing: '0.12em', textTransform: 'uppercase'
        }}>
          → {flash}
        </div>
      )}

      <footer style={{
        marginTop: 48, color: tokens.colors.textMuted,
        fontFamily: tokens.typography.fontMono, fontSize: 11,
        letterSpacing: '0.2em', textTransform: 'uppercase'
      }}>
        Hotkeys: I · 1 · 2 · 3 · 4 · O · Esc
      </footer>
    </div>
  )
}
