// ═══════════════════════════════════════════════════
// SALES & PIPELINE METRICS (32-38)
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, percentile, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, extremePeriods, formatPct, sortByDate,
} from './mathUtils'

// ─── 32. Deals Closed ──────────────────────────────
export function analyzeDealsClosed(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const total = vals.reduce((s, v) => s + v, 0)
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const peakIdx = vals.indexOf(peak)
  const peakDate = peakIdx >= 0 ? sortByDate(entries)[peakIdx]?.date : ''
  const accel = growthAcceleration(vals)

  return {
    graphExplanation: 'Number of sales deals successfully closed each period. Direct measure of sales output.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Deals Won (this period)', value: f.int(current), highlight: true, info: 'Sales deals successfully closed in the most recent period.' },
          { label: 'Previous Period', value: previous !== null ? f.int(previous) : '—', info: 'Deals closed in the prior period.' },
          { label: 'Deal Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in closed deals vs previous period.' },
          { label: 'Total Deals Won', value: f.int(total), info: 'Cumulative deals closed across all recorded periods.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Average per Period', value: f.int(Math.round(avg)), info: 'Mean deals closed per period across all data.' },
          { label: 'Peak Period', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'The period with the most deals ever closed.' },
          { label: 'Deal Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent 3-period avg growth vs prior 3-period avg growth. Positive = sales team ramping up.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: 'Win Value ($)', value: 'Log revenue separately', info: 'To compute total revenue from won deals, track "Won Deal Value" as a separate metric or use "Total Revenue".' },
          { label: 'Avg Deal Size', value: 'Log separately', info: 'Track "Average Deal Size" as its own metric for size-based analysis.' },
          { label: 'New vs Expansion Deals', value: 'Log per type', info: 'Segment by new customer deals vs expansion/upsell for growth quality analysis.' },
          { label: 'Deals by Segment', value: 'Log per segment', info: 'Track deals separately for Enterprise, Mid-Market, SMB to understand your sales mix.' },
        ],
      },
    ],
  }
}

// ─── 33. Pipeline Value ────────────────────────────
export function analyzePipelineValue(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const netAdded = previous !== null ? current - previous : 0
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  // Standard pipeline coverage benchmark = 3-4x quota
  const weightedEst = current * 0.35 // Industry avg weighted probability

  return {
    graphExplanation: 'Total value of open sales opportunities. Should be 3-4x your quota for healthy conversion.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Total Pipeline', value: f.currency(current), highlight: true, info: 'Sum of all open sales opportunities as of the most recent period.' },
          { label: 'Pipeline Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in pipeline value vs previous period.' },
          { label: 'Net Pipeline Added', value: (netAdded >= 0 ? '+' : '') + f.currency(Math.abs(netAdded)), positive: netAdded >= 0, info: 'Absolute change in pipeline value.', formula: 'Current Pipeline - Previous Pipeline' },
          { label: 'Weighted Pipeline (est.)', value: f.currency(Math.round(weightedEst)), sub: 'At 35% avg probability', info: 'Estimated realistic pipeline value applying industry-average close probability. For accurate figures, log stage-weighted values separately.', formula: 'Pipeline × Weighted Probability' },
        ],
      },
      {
        title: 'Averages & Peaks',
        items: [
          { label: 'Average Pipeline', value: f.currency(avg), info: 'Mean pipeline value across all periods.' },
          { label: 'Peak Pipeline', value: f.currency(peak), tint: 'text-emerald-300', info: 'Largest pipeline ever recorded.' },
        ],
      },
      {
        title: 'Health Indicators (log separately)',
        items: [
          { label: 'Pipeline Coverage', value: 'Log Quota separately', info: 'Pipeline Coverage = Pipeline / Quota. Healthy: 3-4x. Track Sales Quota as a separate metric.' },
          { label: 'Pipeline Velocity', value: 'Log Win Rate + Cycle', info: 'Velocity = (Opportunities × Deal Size × Win Rate) / Cycle Length. Log Win Rate and Sales Cycle separately.' },
          { label: 'Stage Distribution', value: 'Log per stage', info: 'Track pipeline value per stage (Discovery, Proposal, Negotiation, etc.) as separate metrics for funnel visibility.' },
          { label: 'New Pipeline This Period', value: netAdded > 0 ? f.currency(netAdded) : f.currency(0), info: 'Approximation based on net movement. For accurate new pipeline, track separately from closed/lost deals.' },
        ],
      },
    ],
  }
}

// ─── 34. Average Deal Size ─────────────────────────
export function analyzeAvgDealSize(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const med = median(vals)
  const p25 = percentile(vals, 25)
  const p75 = percentile(vals, 75)
  const largest = n > 0 ? Math.max(...vals) : 0
  const smallest = n > 0 ? Math.min(...vals) : 0
  const iqr = p75 - p25

  return {
    graphExplanation: 'Average value of a closed deal. Track segment shifts, e.g., moving upmarket.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Avg Deal Size', value: f.currency(current), highlight: true, info: 'Average value of deals closed in the most recent period.', formula: 'Total Deal Value / Number of Deals' },
          { label: 'Deal Size Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period. Rising ADS often signals moving upmarket.' },
          { label: 'All-time Average', value: f.currency(avg), info: 'Mean deal size across all periods.' },
          { label: 'Median Deal Size', value: f.currency(med), info: 'Middle value — less skewed by outliers than the mean.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'P25 (25th percentile)', value: f.currency(p25), info: '25% of periods had a smaller average deal size.' },
          { label: 'P75 (75th percentile)', value: f.currency(p75), info: '75% of periods had a smaller average deal size.' },
          { label: 'Interquartile Range', value: f.currency(iqr), info: 'Range between P25 and P75. Smaller IQR = more consistent deal sizes.', formula: 'P75 - P25' },
          { label: 'Largest Deal Period', value: f.currency(largest), tint: 'text-emerald-300', info: 'Period with the largest average deal size ever recorded.' },
          { label: 'Smallest Deal Period', value: f.currency(smallest), tint: 'text-yellow-300', info: 'Period with the smallest average deal size recorded.' },
        ],
      },
      {
        title: 'Segmentation',
        items: [
          { label: 'Segment Comparison', value: 'Log per segment', info: 'To compare deal sizes across Enterprise, Mid-Market, SMB, track each segment as a separate metric.' },
        ],
      },
    ],
  }
}

// ─── 35. Sales Cycle Length ────────────────────────
export function analyzeSalesCycle(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const med = median(vals)
  const p25 = percentile(vals, 25)
  const p75 = percentile(vals, 75)
  const p90 = percentile(vals, 90)
  const shortest = n > 0 ? Math.min(...vals) : 0
  const longest = n > 0 ? Math.max(...vals) : 0
  const trend = trendClassify(vals)

  return {
    graphExplanation: 'Average days from first customer touch to closed deal. Shorter = faster sales velocity.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Avg Days', value: current.toFixed(0) + ' days', highlight: true, info: 'Latest average sales cycle length in days.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(0) + ' days' : '—', positive: (change || 0) < 0, info: 'Change vs previous period. Shorter cycle is better.' },
          { label: 'Cycle Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-yellow-300' : trend === 'decelerating' ? 'text-emerald-300' : 'text-white/70', info: 'Direction based on recent 3 vs prior 3 periods. "Decelerating" cycle length is good (faster deals).' },
          { label: 'Average Cycle', value: avg.toFixed(0) + ' days', info: 'Mean sales cycle across all periods.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'Median Cycle', value: med.toFixed(0) + ' days', info: 'Middle value — half your cycles are shorter, half longer.' },
          { label: 'P25 (Fastest 25%)', value: p25.toFixed(0) + ' days', tint: 'text-emerald-300', info: '25% of your deals close in this time or less.' },
          { label: 'P75 (Slowest 25%)', value: p75.toFixed(0) + ' days', info: '75% of your deals close within this time.' },
          { label: 'P90 (Slowest 10%)', value: p90.toFixed(0) + ' days', tint: 'text-yellow-300', info: 'The slowest 10% of deals take at least this long. Identifies stuck deals.' },
          { label: 'Shortest Cycle', value: shortest.toFixed(0) + ' days', tint: 'text-emerald-300', info: 'The fastest deal ever closed.' },
          { label: 'Longest Cycle', value: longest.toFixed(0) + ' days', tint: 'text-red-400', info: 'The slowest deal ever closed.' },
        ],
      },
    ],
  }
}

// ─── 36. Win Rate ──────────────────────────────────
export function analyzeWinRate(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const vol = volatility(vals)

  const health = current >= 35 ? { label: 'Elite', tint: 'text-emerald-300' }
              : current >= 25 ? { label: 'Strong', tint: 'text-cyan-300' }
              : current >= 15 ? { label: 'Healthy', tint: 'text-green-300' }
              : current >= 10 ? { label: 'Needs work', tint: 'text-yellow-300' }
              : { label: 'Weak', tint: 'text-red-400' }

  const consistency = vol < 15 ? { label: 'Stable', tint: 'text-emerald-300' }
                   : vol < 30 ? { label: 'Moderate', tint: 'text-yellow-300' }
                   : { label: 'Variable', tint: 'text-red-400' }

  return {
    graphExplanation: 'Percentage of qualified deals won. Industry benchmark: 20-30% for most B2B.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Win Rate', value: current.toFixed(2) + '%', highlight: true, info: 'Latest percentage of qualified opportunities won.', formula: 'Deals Won / (Deals Won + Deals Lost) × 100' },
          { label: 'Previous Win Rate', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Win rate in the prior period.' },
          { label: 'Win Rate Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Assessment', value: health.label, tint: health.tint, info: 'Elite: 35%+ · Strong: 25%+ · Healthy: 15%+ · Needs work: 10%+ · Weak: <10%. B2B benchmarks.' },
        ],
      },
      {
        title: 'Range & Consistency',
        items: [
          { label: 'Best Win Rate', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best win rate recorded.' },
          { label: 'Worst Win Rate', value: lowest.toFixed(2) + '%', tint: 'text-yellow-300', info: 'Lowest win rate recorded.' },
          { label: 'Average Win Rate', value: avg.toFixed(2) + '%', info: 'Mean win rate across all periods.' },
          { label: 'Consistency', value: consistency.label, tint: consistency.tint, info: 'Stable: <15% volatility · Moderate: <30% · Variable: 30%+. Stable win rates are easier to forecast.', formula: '(Std Dev / Mean) × 100' },
        ],
      },
      {
        title: 'Segmentation (log separately)',
        items: [
          { label: 'Won Count', value: 'Log per period', info: 'Track absolute deals won as a separate metric for detailed reporting.' },
          { label: 'Lost Count', value: 'Log per period', info: 'Track absolute deals lost — combined with won gives you exact win rate.' },
          { label: 'Win Rate by Salesperson', value: 'Log per rep', info: 'Track per-rep win rates as separate metrics to identify top performers.' },
          { label: 'Win Rate by Segment', value: 'Log per segment', info: 'Track win rates for Enterprise, Mid-Market, SMB separately.' },
          { label: 'Win Rate by Deal Size', value: 'Log per size tier', info: 'Track how win rate varies with deal size tiers.' },
        ],
      },
    ],
  }
}

// ─── 37. Contract Backlog ──────────────────────────
export function analyzeBacklog(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netChange = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  return {
    graphExplanation: 'Value of signed contracts not yet recognized as revenue. Represents future revenue visibility.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Backlog', value: f.currency(current), highlight: true, info: 'Value of all signed but unrecognized contracts as of the most recent period.' },
          { label: 'Net Change', value: (netChange >= 0 ? '+' : '') + f.currency(Math.abs(netChange)), positive: netChange >= 0, info: 'Absolute change in backlog vs previous period.', formula: 'Current Backlog - Previous Backlog' },
          { label: 'Backlog Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period.' },
          { label: 'Peak Backlog', value: f.currency(peak), tint: 'text-emerald-300', info: 'Highest backlog ever recorded.' },
        ],
      },
      {
        title: 'Composition (log separately)',
        items: [
          { label: 'New Bookings', value: 'Log separately', info: 'New contracts signed in the period. Track as separate "New Bookings" metric for full flow analysis.' },
          { label: 'Recognized Revenue', value: 'Log separately', info: 'Revenue moved from backlog to income statement. Track as separate metric.' },
          { label: 'Backlog Movement', value: netChange > 0 ? 'Building (+' + f.currency(netChange) + ')' : netChange < 0 ? 'Recognizing (-' + f.currency(Math.abs(netChange)) + ')' : 'Stable', tint: netChange > 0 ? 'text-emerald-300' : netChange < 0 ? 'text-yellow-300' : 'text-white/70', info: 'Direction of backlog: Building = more bookings than recognition. Recognizing = burning through backlog.' },
        ],
      },
      {
        title: 'Coverage & Analysis',
        items: [
          { label: 'Average Backlog', value: f.currency(avg), info: 'Mean backlog value across all periods.' },
          { label: 'Backlog Coverage', value: 'Log Revenue separately', info: 'Backlog Coverage = Backlog / Quarterly Revenue. Higher = more revenue visibility ahead. Log Total Revenue separately.' },
          { label: 'Backlog by Customer', value: 'Log per customer', info: 'For customer-concentration analysis, track backlog per major customer as separate metrics.' },
        ],
      },
    ],
  }
}

// ─── 38. ACV — Annual Contract Value ───────────────
export function analyzeACV(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const med = median(vals)
  const largest = n > 0 ? Math.max(...vals) : 0
  const p25 = percentile(vals, 25)
  const p75 = percentile(vals, 75)

  return {
    graphExplanation: 'Annualized value of a customer contract. Key measure for enterprise SaaS deal quality.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current ACV', value: f.currency(current), highlight: true, info: 'Latest average annual contract value.', formula: 'Total Contract Value / Contract Length (years)' },
          { label: 'ACV Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period. Rising ACV often signals moving upmarket.' },
          { label: 'Average ACV', value: f.currency(avg), info: 'Mean ACV across all periods.' },
          { label: 'Median ACV', value: f.currency(med), info: 'Middle value across periods — less skewed by outliers.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'P25 (Lower quartile)', value: f.currency(p25), info: '25% of periods had a lower ACV.' },
          { label: 'P75 (Upper quartile)', value: f.currency(p75), info: '75% of periods had a lower ACV.' },
          { label: 'Largest Contract Period', value: f.currency(largest), tint: 'text-emerald-300', info: 'Period with the largest average ACV recorded.' },
        ],
      },
      {
        title: 'Segmentation (log separately)',
        items: [
          { label: 'ACV by Segment', value: 'Log per segment', info: 'Track ACV separately for Enterprise, Mid-Market, SMB to understand deal mix.' },
          { label: 'New vs Expansion ACV', value: 'Log per type', info: 'Track ACV separately for new customer deals vs expansion/renewal deals.' },
        ],
      },
    ],
  }
}