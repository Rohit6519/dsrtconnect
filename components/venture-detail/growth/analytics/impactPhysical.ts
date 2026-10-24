// ═══════════════════════════════════════════════════
// IMPACT & PHYSICAL METRICS (51-59)
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, formatPct, sortByDate,
} from './mathUtils'

// ─── 51. Units Produced ────────────────────────────
export function analyzeUnitsProduced(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
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

  const daysPerPeriod = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : frequency === 'yearly' ? 365 : 30
  const perDay = current / daysPerPeriod
  const capacityUtilization = peak > 0 ? (current / peak) * 100 : 0

  return {
    graphExplanation: 'Physical units manufactured per period. Direct output measure for hardware and manufacturing.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Units Produced (this period)', value: f.int(current), highlight: true, info: 'Total units manufactured in the most recent period.' },
          { label: 'Production Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in production vs previous period.' },
          { label: 'Total Units Produced', value: f.int(total), info: 'Cumulative units manufactured across all recorded periods.' },
          { label: 'Units / Day (est.)', value: f.int(Math.round(perDay)), sub: 'Derived from frequency', info: 'Estimated daily production rate based on the reporting frequency.' },
        ],
      },
      {
        title: 'Capacity & Utilization',
        items: [
          { label: 'Peak Production', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'Highest production period ever recorded — used as proxy for max capacity.' },
          { label: 'Capacity Utilization', value: capacityUtilization.toFixed(1) + '%', tint: capacityUtilization >= 80 ? 'text-emerald-300' : capacityUtilization >= 60 ? 'text-yellow-300' : 'text-red-400', info: 'Current production as % of peak. Higher = using capacity well.', formula: 'Current / Peak × 100' },
          { label: 'Average per Period', value: f.int(Math.round(avg)), info: 'Mean units produced per period across all data.' },
          { label: 'Production Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent 3-period avg growth vs prior 3-period avg growth. Positive = ramping up.' },
        ],
      },
      {
        title: 'Quality Metrics (log separately)',
        items: [
          { label: 'Yield %', value: 'Log separately', info: 'Track "Production Yield %" as a separate metric — % of produced units that pass QA.' },
          { label: 'Defect Rate', value: 'Log separately', info: 'Track "Defect Rate %" as a separate metric — % of units failing quality standards.' },
          { label: 'Production Capacity', value: 'Log max as separate', info: 'Track "Max Production Capacity" as a separate metric for accurate utilization analysis.' },
        ],
      },
    ],
  }
}

// ─── 52. Payload Delivered ─────────────────────────
export function analyzePayload(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const total = vals.reduce((s, v) => s + v, 0)
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  return {
    graphExplanation: 'Total payload delivered across missions. Core operational metric for launch and delivery companies.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Payload (this period)', value: f.int(current) + (' T'), highlight: true, info: 'Payload delivered in the most recent period.' },
          { label: 'Payload Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in payload vs previous period.' },
          { label: 'Total Delivered', value: f.int(total) + ' T', info: 'Cumulative payload delivered across all recorded periods.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Average per Period', value: f.int(Math.round(avg)) + ' T', info: 'Mean payload per period across all data.' },
          { label: 'Peak Payload Period', value: f.int(peak) + ' T', tint: 'text-emerald-300', info: 'The period with the largest payload ever delivered.' },
        ],
      },
      {
        title: 'Per-mission Analysis (log separately)',
        items: [
          { label: 'Average Payload / Mission', value: 'Log Missions separately', info: 'Track "Missions Completed" as a separate metric to compute avg payload per mission.' },
          { label: 'Maximum Payload / Mission', value: 'Log per mission', info: 'Track "Max Payload Per Mission" as a separate metric to see mission scale.' },
          { label: 'Payload Capacity Utilization', value: 'Log capacity separately', info: 'Track "Vehicle Payload Capacity" — enables capacity utilization = Payload / Capacity × 100' },
          { label: 'Payload by Customer', value: 'Log per customer', info: 'Track payload per major customer as separate metrics for concentration analysis.' },
        ],
      },
    ],
  }
}

// ─── 53. Flight Success Rate ───────────────────────
export function analyzeFlightSuccess(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const trend = trendClassify(vals)

  // Consecutive successful periods (100% success)
  const sorted = sortByDate(entries)
  let consecutive = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (parseFloat(String(sorted[i].value)) === 100) consecutive++
    else break
  }

  const health = current >= 98 ? { label: 'Elite reliability', tint: 'text-emerald-300' }
              : current >= 90 ? { label: 'Strong', tint: 'text-cyan-300' }
              : current >= 75 ? { label: 'Acceptable — improving needed', tint: 'text-yellow-300' }
              : { label: 'Critical — reliability concern', tint: 'text-red-400' }

  return {
    graphExplanation: 'Percentage of missions completed successfully. Critical reliability metric for launch operations.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Success Rate', value: current.toFixed(2) + '%', highlight: true, tint: health.tint, info: 'Latest mission success rate percentage.', formula: 'Successful Missions / Total Missions × 100' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Failure Rate', value: (100 - current).toFixed(2) + '%', tint: (100 - current) > 5 ? 'text-red-400' : 'text-yellow-300', info: 'Percentage of missions that failed.', formula: '100 - Success Rate' },
          { label: 'Reliability Tier', value: health.label, tint: health.tint, info: 'Elite: 98%+ · Strong: 90%+ · Acceptable: 75%+ · Critical: <75%' },
        ],
      },
      {
        title: 'Trend & Streaks',
        items: [
          { label: 'Consecutive 100% Periods', value: consecutive + ' periods', tint: consecutive > 0 ? 'text-emerald-300' : 'text-white/60', info: 'Number of most recent consecutive periods with 100% success rate.' },
          { label: 'Reliability Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-red-400' : 'text-white/70', info: 'Direction based on recent 3-period vs prior 3-period average.' },
          { label: 'Best Period', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Highest success rate ever recorded.' },
          { label: 'Worst Period', value: lowest.toFixed(2) + '%', tint: 'text-red-400', info: 'Lowest success rate recorded.' },
          { label: 'Average Success Rate', value: avg.toFixed(2) + '%', info: 'Mean success rate across all periods.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: 'First-Attempt Success', value: 'Log separately', info: 'Track "First-Attempt Success %" as a separate metric — success without retries.' },
          { label: 'Success by Vehicle/Version', value: 'Log per version', info: 'Track success rate separately per vehicle model or software version to isolate reliability issues.' },
          { label: 'Total Missions', value: 'Log separately', info: 'Track "Total Missions" as a separate metric for absolute mission count over time.' },
        ],
      },
    ],
  }
}

// ─── 54. Production Rate ───────────────────────────
export function analyzeProductionRate(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const capacityUtilization = peak > 0 ? (current / peak) * 100 : 0
  const accel = growthAcceleration(vals)
  const trend = trendClassify(vals)

  return {
    graphExplanation: 'Production rate per unit time. Direct measure of manufacturing throughput.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Production Rate', value: current.toFixed(2), highlight: true, info: 'Latest production rate recorded.' },
          { label: 'Rate Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in production rate vs previous period.' },
          { label: 'Average Rate', value: avg.toFixed(2), info: 'Mean production rate across all periods.' },
          { label: 'Production Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction based on recent 3-period vs prior 3-period average.' },
        ],
      },
      {
        title: 'Capacity & Acceleration',
        items: [
          { label: 'Peak Rate (Capacity Proxy)', value: peak.toFixed(2), tint: 'text-emerald-300', info: 'Highest production rate ever achieved. Used as proxy for max capacity.' },
          { label: 'Capacity Utilization', value: capacityUtilization.toFixed(1) + '%', tint: capacityUtilization >= 80 ? 'text-emerald-300' : capacityUtilization >= 60 ? 'text-yellow-300' : 'text-red-400', info: 'Current rate as % of peak. Higher = using capacity efficiently.', formula: 'Current Rate / Peak Rate × 100' },
          { label: 'Production Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = ramping up production.' },
        ],
      },
      {
        title: 'Deeper Metrics (log separately)',
        items: [
          { label: 'Target Rate', value: 'Log separately', info: 'Track "Target Production Rate" as a separate metric to compare actual vs target.' },
          { label: 'Max Capacity', value: 'Log separately', info: 'Track "Max Production Capacity" as a separate metric for true capacity utilization.' },
        ],
      },
    ],
  }
}

// ─── 55. Deployments ───────────────────────────────
export function analyzeDeployments(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netChange = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const peak = n > 0 ? Math.max(...vals) : 0
  const first = n > 0 ? vals[0] : 0
  const totalAdded = current - first
  const accel = growthAcceleration(vals)

  return {
    graphExplanation: 'Total installations, rollouts, or physical deployments in the field.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Total Deployments', value: f.int(current), highlight: true, info: 'Total active deployments as of the most recent period.' },
          { label: 'Net Change', value: (netChange >= 0 ? '+' : '') + f.int(Math.abs(netChange)), positive: netChange >= 0, info: 'Absolute change in deployments vs previous period.' },
          { label: 'Deployment Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in deployments vs previous period.' },
          { label: 'Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent 3-period avg growth vs prior 3-period avg growth.' },
        ],
      },
      {
        title: 'Historical',
        items: [
          { label: 'Peak Deployments', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest deployment count ever recorded.' },
          { label: 'Total Added Since Start', value: (totalAdded >= 0 ? '+' : '') + f.int(Math.abs(totalAdded)), positive: totalAdded >= 0, info: 'Net deployments added from the first data point to now.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: 'Active Deployments', value: 'Log separately', info: 'If total ≠ active (some retired), track "Active Deployments" as a separate metric.' },
          { label: 'Deployment Success Rate', value: 'Log separately', info: 'Track "Deployment Success %" as a separate metric.' },
          { label: 'Deployment Geography', value: 'Log per region', info: 'Track deployments per region/country as separate metrics for geographic distribution analysis.' },
        ],
      },
    ],
  }
}

// ─── 56. Countries Served ──────────────────────────
export function analyzeCountriesServed(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netAdded = previous !== null ? current - previous : 0
  const first = n > 0 ? vals[0] : 0
  const totalExpansion = current - first

  // Market expansion rate = new countries per period
  const additions: number[] = []
  for (let i = 1; i < vals.length; i++) additions.push(vals[i] - vals[i - 1])
  const avgExpansionRate = additions.length > 0 ? mean(additions) : 0

  // Total countries in world for context (~195)
  const worldCoverage = (current / 195) * 100

  return {
    graphExplanation: 'Number of countries where the product operates. International expansion metric.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Total Countries', value: f.int(current), highlight: true, info: 'Total number of countries currently served.' },
          { label: 'New Countries (this period)', value: netAdded > 0 ? '+' + f.int(netAdded) : '0', positive: netAdded > 0, info: 'Countries added in the most recent period.' },
          { label: 'Total Expansion', value: '+' + f.int(Math.abs(totalExpansion)), positive: totalExpansion >= 0, info: 'Net countries added since the first data point.' },
          { label: 'World Coverage', value: worldCoverage.toFixed(1) + '%', tint: worldCoverage >= 25 ? 'text-emerald-300' : worldCoverage >= 10 ? 'text-cyan-300' : 'text-white', info: 'Percentage of the ~195 recognized countries where you operate.', formula: 'Countries / 195 × 100' },
        ],
      },
      {
        title: 'Expansion Analysis',
        items: [
          { label: 'Market Expansion Rate', value: avgExpansionRate >= 0 ? '+' + avgExpansionRate.toFixed(2) + ' / period' : avgExpansionRate.toFixed(2) + ' / period', positive: avgExpansionRate >= 0, info: 'Average countries added per period across all data.' },
          { label: 'Active Countries', value: f.int(current), sub: 'Assumes all active', info: 'If some countries paused/retired, track "Active Countries" separately.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: 'Revenue by Country', value: 'Log per country', info: 'Track revenue per major country as separate metrics for geographic concentration analysis.' },
          { label: 'Customer Concentration', value: 'Log per country', info: 'Track customers per country to identify concentration risk in a few markets.' },
        ],
      },
    ],
  }
}

// ─── 57. Institutions Served ───────────────────────
export function analyzeInstitutionsServed(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netAdded = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const first = n > 0 ? vals[0] : 0
  const totalGrowth = current - first
  const accel = growthAcceleration(vals)

  return {
    graphExplanation: 'Institutions using the product (schools, hospitals, governments, enterprises).',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Total Institutions', value: f.int(current), highlight: true, info: 'Total institutions currently using the product.' },
          { label: 'New Institutions', value: netAdded > 0 ? '+' + f.int(netAdded) : '0', positive: netAdded > 0, info: 'Institutions added in the most recent period.' },
          { label: 'Institution Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage growth in institution count vs previous period.' },
          { label: 'Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = acquisition accelerating.' },
        ],
      },
      {
        title: 'Historical',
        items: [
          { label: 'Total Growth Since Start', value: '+' + f.int(Math.abs(totalGrowth)), positive: totalGrowth >= 0, info: 'Net institutions added from the first data point to now.' },
          { label: 'Active Institutions', value: f.int(current), sub: 'Assumes all active', info: 'If some institutions are inactive, track "Active Institutions" as a separate metric.' },
        ],
      },
      {
        title: 'Segmentation (log separately)',
        items: [
          { label: 'Institution Categories', value: 'Log per category', info: 'Track institutions per category (schools, hospitals, government, enterprises) as separate metrics.' },
        ],
      },
    ],
  }
}

// ─── 58. CO₂ Reduced ──────────────────────────────
export function analyzeCO2Reduced(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const total = vals.reduce((s, v) => s + v, 0)
  const avg = mean(vals)
  const accel = growthAcceleration(vals)

  // Equivalent calculations (approximate)
  // 1 tonne CO2 ~= 2,500 km driven, 120 trees planted for 1 year, 1 flight NYC-LA
  const kmEquivalent = total * 2500
  const treesEquivalent = total * 120

  return {
    graphExplanation: 'Cumulative CO2 emissions reduced or avoided. Core impact metric for climate ventures.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'CO₂ Reduced (this period)', value: f.int(current) + ' tonnes', highlight: true, info: 'CO2 emissions reduced in the most recent period.' },
          { label: 'Reduction Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period.' },
          { label: 'Total CO₂ Reduced', value: f.int(total) + ' tonnes', tint: 'text-emerald-300', info: 'Cumulative CO2 reduced across all recorded periods.' },
          { label: 'Impact Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = impact accelerating.' },
        ],
      },
      {
        title: 'Averages',
        items: [
          { label: 'Average per Period', value: f.int(Math.round(avg)) + ' tonnes', info: 'Mean CO2 reduced per period across all data.' },
        ],
      },
      {
        title: 'Real-World Equivalents',
        items: [
          { label: 'Cars Off Road', value: '~' + f.int(Math.round(kmEquivalent / 15000)) + ' cars/year', tint: 'text-emerald-300', info: 'Equivalent to removing this many cars from the road for a year (average car emits 4.6 tonnes CO2/year).' },
          { label: 'Trees Planted', value: '~' + f.int(treesEquivalent) + ' trees/year', tint: 'text-emerald-300', info: 'Equivalent to what this many mature trees absorb in a year (~21 kg CO2/tree/year).' },
          { label: 'NYC-LA Flights', value: '~' + f.int(Math.round(total * 2.5)) + ' flights', tint: 'text-emerald-300', info: 'Equivalent to preventing this many one-way transcontinental flights (each emits ~0.4 tonnes CO2 per passenger).' },
        ],
      },
      {
        title: 'Per-unit Impact (log separately)',
        items: [
          { label: 'CO₂ per User', value: 'Log Users separately', info: 'Track "Active Users" as a separate metric to compute CO2 reduced per user.' },
          { label: 'CO₂ per Unit Sold', value: 'Log Units Sold separately', info: 'Track "Units Sold" as a separate metric to compute CO2 reduced per unit deployed.' },
        ],
      },
    ],
  }
}

// ─── 59. Lives Impacted ────────────────────────────
export function analyzeLivesImpacted(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netAdded = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const first = n > 0 ? vals[0] : 0
  const totalReached = current
  const accel = growthAcceleration(vals)

  // Scale reference (global population 8B)
  const globalReach = (current / 8000000000) * 100

  return {
    graphExplanation: 'People whose lives have been directly affected. Impact scale metric for social ventures.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Total Lives Impacted', value: f.int(current), highlight: true, tint: 'text-emerald-300', info: 'Total people whose lives have been directly affected as of the most recent period.' },
          { label: 'New Lives (this period)', value: netAdded > 0 ? '+' + f.int(netAdded) : '0', positive: netAdded > 0, info: 'New lives impacted in the most recent period.' },
          { label: 'Impact Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage growth in lives impacted vs previous period.' },
          { label: 'Global Reach', value: globalReach < 0.001 ? '< 0.001%' : globalReach.toFixed(4) + '%', info: 'Percentage of the ~8 billion global population reached.', formula: 'Lives Impacted / 8,000,000,000 × 100' },
        ],
      },
      {
        title: 'Growth Analysis',
        items: [
          { label: 'Impact Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = reaching more people, faster.' },
          { label: 'Cumulative Reach', value: f.int(totalReached), tint: 'text-emerald-300', info: 'Total unique lives impacted since inception.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: 'Direct vs Indirect Impact', value: 'Log separately', info: 'Track "Direct Lives Impacted" and "Indirect Lives Impacted" as separate metrics to distinguish primary vs ripple effect.' },
          { label: 'Geographic Distribution', value: 'Log per region', info: 'Track lives impacted per country or region as separate metrics for geographic distribution.' },
        ],
      },
    ],
  }
}