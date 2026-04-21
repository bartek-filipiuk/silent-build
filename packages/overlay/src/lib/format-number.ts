export function formatNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const k = n / 1000
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
  }
  const m = n / 1_000_000
  return m >= 100 ? `${Math.round(m)}M` : `${m.toFixed(1)}M`
}
