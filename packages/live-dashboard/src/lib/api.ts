export async function postTrigger(scene: 'intro' | 'outro' | 'phase' | 'clear', params?: Record<string, string>): Promise<void> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`/api/trigger/${scene}${qs}`, { method: 'POST' })
  if (!res.ok) throw new Error(`trigger ${scene} → ${res.status}`)
}
