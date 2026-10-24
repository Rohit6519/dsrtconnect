// ═══════════════════════════════════════════════════
// TYPES for metric analytics registry
// ═══════════════════════════════════════════════════

export interface AnalyticItem {
  label: string
  value: string
  sub?: string                          // Small text below value
  tint?: string                         // Custom color class
  positive?: boolean                    // For auto green/red
  highlight?: boolean                   // For prominent display
  info: string                          // Tooltip content
  formula?: string                      // Optional formula display
}

export interface AnalyticsGroup {
  title: string
  items: AnalyticItem[]
}

export interface MetricAnalyticsResult {
  groups: AnalyticsGroup[]
  graphExplanation: string
}

export interface Formatter {
  val: (v: number, opts?: { compact?: boolean }) => string
  currency: (v: number, opts?: { compact?: boolean }) => string
  int: (v: number) => string
}

export function createFormatter(metric: any): Formatter {
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9', JPY: '\u00A5',
    CNY: '\u00A5', AUD: 'A$', CAD: 'C$', CHF: 'CHF', SGD: 'S$',
    AED: 'AED', BRL: 'R$', KRW: '\u20A9',
  }
  const currSymbol = metric.currency ? (CURRENCY_SYMBOLS[metric.currency] || metric.currency + ' ') : '$'

  const compactNum = (v: number): string => {
    const abs = Math.abs(v)
    if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B'
    if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M'
    if (abs >= 1e3) return (v / 1e3).toFixed(1) + 'K'
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  return {
    val: (v, opts) => {
      const compact = opts?.compact !== false
      if (metric.type === 'percentage') return v.toFixed(2) + '%'
      if (metric.type === 'currency') {
        return currSymbol + (compact ? compactNum(v) : v.toLocaleString())
      }
      return compact ? compactNum(v) : v.toLocaleString()
    },
    currency: (v, opts) => {
      const compact = opts?.compact !== false
      return currSymbol + (compact ? compactNum(v) : v.toLocaleString())
    },
    int: (v) => Math.round(v).toLocaleString(),
  }
}