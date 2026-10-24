// ═══════════════════════════════════════════════════
// CUSTOM METRIC ANALYTICS
// Enhanced generic with target variance if metric.target set
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, forecastNext, extremePeriods,
  formatPct, sortByDate,
} from './mathUtils'

export function analyzeCustom(entries: Entry[], f: Formatter, metric: any): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length

  if (n === 0) {
    return { graphExplanation: 'Custom metric — add data to see analytics.', groups: [] }
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

  // Optional: target variance if metric.target is set
  const target = metric.target ? parseFloat(metric.target) : null
  const higherIsBetter = metric.higher_is_better !== false // default true
  const targetVariance = target !== null ? current - target : null
  const targetVariancePct = target !== null && target !== 0 ? ((current - target) / Math.abs(target)) * 100 : null
  const targetMet = target !== null ? (higherIsBetter ? current >= target : current <= target) : null

  const groups: any[] = [
    {
      title: 'Core',
      items: [
        { label: 'Current', value: f.val(current), highlight: true, info: 'Latest recorded value for this metric.' },
        { label: 'Previous', value: previous !== null ? f.val(previous) : '—', info: 'Value from the prior period.' },
        { label: 'Change', value: change !== null ? formatPct(change).display : '—', positive: higherIsBetter ? (change || 0) >= 0 : (change || 0) < 0, info: 'Period-over-period percentage change.', formula: '(Current - Previous) / Previous × 100' },
        { label: 'Overall Growth', value: overallCagr !== null ? formatPct(overallCagr).display : '—', positive: higherIsBetter ? (overallCagr || 0) >= 0 : (overallCagr || 0) < 0, info: 'Compound growth rate per period across all data.', formula: '((Last / First)^(1/periods)) - 1' },
      ],
    },
  ]

  if (target !== null) {
    groups.push({
      title: 'Target Performance',
      items: [
        { label: 'Target', value: f.val(target), tint: 'text-cyan-300', info: 'The target value you set for this metric.' },
        { label: 'Target Variance', value: targetVariance !== null ? (targetVariance >= 0 ? '+' : '') + f.val(Math.abs(targetVariance)) : '—', positive: higherIsBetter ? (targetVariance || 0) >= 0 : (targetVariance || 0) <= 0, info: 'Absolute difference between current value and target.', formula: 'Current - Target' },
        { label: 'Variance %', value: targetVariancePct !== null ? formatPct(targetVariancePct).display : '—', positive: higherIsBetter ? (targetVariancePct || 0) >= 0 : (targetVariancePct || 0) <= 0, info: 'Percentage difference from target.', formula: '(Current - Target) / Target × 100' },
        { label: 'Target Status', value: targetMet === true ? 'Met' : targetMet === false ? 'Not met' : '—', tint: targetMet === true ? 'text-emerald-300' : targetMet === false ? 'text-red-400' : 'text-white/60', info: 'Whether the current value meets the target based on your "higher is better" setting.' },
      ],
    })
  }

  groups.push({
    title: 'Statistics',
    items: [
      { label: 'Peak', value: f.val(highest), tint: 'text-emerald-300', info: 'Highest value recorded.' },
      { label: 'Low', value: f.val(lowest), tint: 'text-yellow-300', info: 'Lowest value recorded.' },
      { label: 'Average', value: f.val(avg), info: 'Arithmetic mean of all values.' },
      { label: 'Median', value: f.val(med), info: 'Middle value — half your data is above, half below.' },
      { label: 'Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 50 ? 'text-yellow-300' : 'text-red-400', info: 'Coefficient of variation: how much values fluctuate.', formula: '(Std Dev / Mean) × 100' },
      { label: 'Data Points', value: n.toString(), info: 'Total number of entries recorded.' },
    ],
  })

  if (best || worst || trend || forecast !== null) {
    groups.push({
      title: 'Trend & Forecast',
      items: [
        ...(trend ? [{ label: 'Trend', value: trend, tint: trend === 'accelerating' ? (higherIsBetter ? 'text-emerald-300' : 'text-red-400') : trend === 'decelerating' ? (higherIsBetter ? 'text-yellow-300' : 'text-emerald-300') : 'text-white/70', info: 'Direction of recent movement (compares recent 3 vs prior 3 periods).' }] : []),
        ...(accel !== null ? [{ label: 'Acceleration', value: formatPct(accel).display, positive: higherIsBetter ? accel >= 0 : accel < 0, info: 'Recent avg growth minus prior avg growth.' }] : []),
        ...(best ? [{ label: 'Best Period', value: formatPct(best.change).display, sub: best.date, tint: 'text-emerald-300', info: 'Single period with the largest positive change.' }] : []),
        ...(worst && worst.change < 0 ? [{ label: 'Worst Period', value: formatPct(worst.change).display, sub: worst.date, tint: 'text-red-400', info: 'Single period with the largest negative change.' }] : []),
        ...(forecast !== null ? [{ label: 'Projected Next', value: f.val(Math.round(forecast)), tint: 'text-cyan-300', info: 'Simple forecast based on the average growth of the last 3 periods.' }] : []),
      ],
    })
  }

  return {
    graphExplanation: metric.description ? 'Custom metric tracked over time.' : 'Custom metric. Add a description for context.',
    groups,
  }
}