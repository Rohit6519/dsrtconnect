// ═══════════════════════════════════════════════════
// GENERIC FALLBACK — for metrics not yet in registry
// Provides universal analytics only
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, stdDev, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, forecastNext, extremePeriods,
  formatPct, sortByDate,
} from './mathUtils'

export function analyzeGeneric(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  if (n === 0) {
    return { graphExplanation: 'Values tracked over time. Add data to see analytics.', groups: [] }
  }

  const current = vals[n - 1]
  const previous = n > 1 ? vals[n - 2] : null
  const first = vals[0]
  const change = previous !== null ? pctChange(current, previous) : null
  const overallCagr = cagr(first, current, n - 1)
  const avg = mean(vals)
  const med = median(vals)
  const highest = Math.max(...vals)
  const lowest = Math.min(...vals)
  const vol = volatility(vals)
  const trend = trendClassify(vals)
  const accel = growthAcceleration(vals)
  const forecast = forecastNext(vals)
  const { best, worst } = extremePeriods(vals, sortByDate(entries))

  return {
    graphExplanation: 'Values tracked over time. Hover for details.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current', value: f.val(current), highlight: true, info: 'Latest recorded value.' },
          { label: 'Previous', value: previous !== null ? f.val(previous) : '—', info: 'Value from the prior period.' },
          { label: 'Change', value: change !== null ? formatPct(change).display : '—', positive: (change || 0) >= 0, info: 'Period-over-period percentage change.', formula: '(Current - Previous) / Previous × 100' },
          { label: 'Overall Growth', value: overallCagr !== null ? formatPct(overallCagr).display : '—', positive: (overallCagr || 0) >= 0, info: 'Compound growth rate per period across all data.', formula: '((Last / First)^(1/periods)) - 1' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Peak', value: f.val(highest), tint: 'text-emerald-300', info: 'Highest value recorded.' },
          { label: 'Low', value: f.val(lowest), tint: 'text-yellow-300', info: 'Lowest value recorded.' },
          { label: 'Average', value: f.val(avg), info: 'Arithmetic mean of all values.' },
          { label: 'Median', value: f.val(med), info: 'Middle value — half your data is above, half below.' },
          { label: 'Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 50 ? 'text-yellow-300' : 'text-red-400', info: 'Coefficient of variation: how much values fluctuate.', formula: '(Std Dev / Mean) × 100' },
          { label: 'Data Points', value: n.toString(), info: 'Total number of entries recorded.' },
        ],
      },
      ...(best || worst || trend || forecast !== null ? [{
        title: 'Trend & Forecast',
        items: [
          ...(trend ? [{ label: 'Trend', value: trend, tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction of recent growth: accelerating, stable, or decelerating (compares recent 3 vs prior 3 periods).' }] : []),
          ...(accel !== null ? [{ label: 'Acceleration', value: formatPct(accel).display, positive: accel >= 0, info: 'Recent avg growth rate minus prior avg growth rate.' }] : []),
          ...(best ? [{ label: 'Best Period', value: formatPct(best.change).display, sub: best.date, tint: 'text-emerald-300', info: 'Single period with the largest positive change.' }] : []),
          ...(worst && worst.change < 0 ? [{ label: 'Worst Period', value: formatPct(worst.change).display, sub: worst.date, tint: 'text-red-400', info: 'Single period with the largest negative change.' }] : []),
          ...(forecast !== null ? [{ label: 'Projected Next', value: f.val(Math.round(forecast)), tint: 'text-cyan-300', info: 'Simple forecast based on the average growth of the last 3 periods.' }] : []),
        ],
      }] : []),
    ],
  }
}