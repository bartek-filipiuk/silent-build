export interface PunchlineInput {
  projectName: string
  techStack: string[]
  startTs: string
  endTs: string
}

export const derivePunchline = (input: PunchlineInput): string => {
  const { projectName, techStack, startTs, endTs } = input
  const days = Math.max(
    1,
    Math.ceil((Date.parse(endTs) - Date.parse(startTs)) / (24 * 3600 * 1000))
  )
  const stack = techStack[0] ?? 'TypeScript'
  const raw = `${days} days · ${projectName} · ${stack}`
  return raw.length <= 120 ? raw : raw.slice(0, 119) + '…'
}
