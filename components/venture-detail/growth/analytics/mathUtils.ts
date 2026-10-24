// ═══════════════════════════════════════════════════
// SHARED MATH UTILITIES — used across all metrics
// High-accuracy statistical computations
// ═══════════════════════════════════════════════════

export interface Entry {
  id?: string
  date: string
  value: number | string
  note?: string | null
}

export function toNum(v: number | string): number {
  return typeof v === 'number' ? v : parseFloat(v)
}

export function sortByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function values(entries: Entry[]): number[] {
  return sortByDate(entries).map(e => toNum(e.value))
}

// ─── Central tendency ───
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)]
}

// ─── Percentile (linear interpolation, standard method) ───
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  if (arr.length === 1) return arr[0]
  const s = [...arr].sort((a, b) => a - b)
  const rank = (p / 100) * (s.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return s[lower]
  const weight = rank - lower
  return s[lower] * (1 - weight) + s[upper] * weight
}

// ─── Spread ───
export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length
  return Math.sqrt(variance)
}

// Coefficient of variation as percentage — used for volatility
export function volatility(arr: number[]): number {
  const m = mean(arr)
  if (m === 0) return 0
  return (stdDev(arr) / Math.abs(m)) * 100
}

// ─── Growth ───
export function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / Math.abs(prev)) * 100
}

// Compound growth rate per period
export function cagr(first: number, last: number, periods: number): number | null {
  if (first <= 0 || last <= 0 || periods < 1) return null
  return (Math.pow(last / first, 1 / periods) - 1) * 100
}

// Series of period-over-period changes
export function periodChanges(arr: number[]): (number | null)[] {
  const changes: (number | null)[] = [null]
  for (let i = 1; i < arr.length; i++) {
    changes.push(pctChange(arr[i], arr[i - 1]))
  }
  return changes
}

// Growth acceleration: recent-avg growth vs prior-avg growth
export function growthAcceleration(arr: number[], window = 3): number | null {
  if (arr.length < window * 2) return null
  const changes = periodChanges(arr).filter((c): c is number => c !== null)
  if (changes.length < window * 2) return null
  const recent = mean(changes.slice(-window))
  const prior = mean(changes.slice(-window * 2, -window))
  return recent - prior
}

// Trend classification based on recent vs prior average
export function trendClassify(arr: number[]): 'accelerating' | 'stable' | 'decelerating' | null {
  if (arr.length < 6) return null
  const recent = mean(arr.slice(-3))
  const prior = mean(arr.slice(-6, -3))
  if (prior === 0) return null
  const diff = ((recent - prior) / Math.abs(prior)) * 100
  if (diff > 10) return 'accelerating'
  if (diff < -10) return 'decelerating'
  return 'stable'
}

// Simple forecast — projects next value using average growth of last N periods
export function forecastNext(arr: number[], lookback = 3): number | null {
  if (arr.length < 2) return null
  const changes = periodChanges(arr).filter((c): c is number => c !== null)
  if (changes.length === 0) return null
  const recentChanges = changes.slice(-lookback)
  const avgRate = mean(recentChanges) / 100
  return arr[arr.length - 1] * (1 + avgRate)
}

// Best / worst single period changes
export function extremePeriods(arr: number[], entries: Entry[]) {
  const changes = periodChanges(arr)
  let best: { idx: number; change: number; date: string } | null = null
  let worst: { idx: number; change: number; date: string } | null = null
  for (let i = 1; i < arr.length; i++) {
    const c = changes[i]
    if (c === null) continue
    if (!best || c > best.change) best = { idx: i, change: c, date: entries[i]?.date || '' }
    if (!worst || c < worst.change) worst = { idx: i, change: c, date: entries[i]?.date || '' }
  }
  return { best, worst }
}

// ─── Value formatting ───
export function formatPct(n: number | null): { display: string; positive: boolean } {
  if (n === null || !isFinite(n)) return { display: '—', positive: true }
  const positive = n >= 0
  const abs = Math.abs(n)
  if (abs >= 1000000) return { display: (positive ? '+' : '-') + '>10,000x', positive }
  if (abs >= 100000) return { display: (positive ? '+' : '-') + '>1,000x', positive }
  if (abs >= 10000) return { display: (positive ? '+' : '-') + '>100x', positive }
  if (abs >= 1000) return { display: (positive ? '+' : '-') + (abs / 100).toFixed(1) + 'x', positive }
  return { display: (positive ? '+' : '') + n.toFixed(1) + '%', positive }
}

// ─── Date utilities ───
export function monthsBetween(start: string, end: string): number {
  const s = new Date(start), e = new Date(end)
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
}

export function yearsBetween(start: string, end: string): number {
  return monthsBetween(start, end) / 12
}

// Split values into current period vs previous period for YoY
export function yoyComparison(entries: Entry[], periodMonths = 12): { current: number | null; previous: number | null; yoyGrowth: number | null } {
  const sorted = sortByDate(entries)
  if (sorted.length === 0) return { current: null, previous: null, yoyGrowth: null }
  const latest = sorted[sorted.length - 1]
  const latestDate = new Date(latest.date)
  const targetPrev = new Date(latestDate)
  targetPrev.setMonth(targetPrev.getMonth() - periodMonths)

  // Find closest entry to target
  let closest: Entry | null = null
  let minDiff = Infinity
  for (const e of sorted) {
    const diff = Math.abs(new Date(e.date).getTime() - targetPrev.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closest = e
    }
  }

  const current = toNum(latest.value)
  const previous = closest ? toNum(closest.value) : null
  const yoyGrowth = previous !== null ? pctChange(current, previous) : null
  return { current, previous, yoyGrowth }
}