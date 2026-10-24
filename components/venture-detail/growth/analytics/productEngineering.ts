// ═══════════════════════════════════════════════════
// PRODUCT & ENGINEERING METRICS (45-50)
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, percentile, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, formatPct, sortByDate,
} from './mathUtils'

// ─── 45. Feature Releases ──────────────────────────
export function analyzeFeatureReleases(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
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
  const trend = trendClassify(vals)
  const accel = growthAcceleration(vals)

  const daysPerPeriod = frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : frequency === 'yearly' ? 365 : 30
  const releasesPerWeek = (avg / daysPerPeriod) * 7

  return {
    graphExplanation: 'New features shipped each period. Direct measure of product velocity.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Releases (this period)', value: f.int(current), highlight: true, info: 'New features shipped in the most recent period.' },
          { label: 'Release Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in release count vs previous period.' },
          { label: 'Total Releases', value: f.int(total), info: 'Cumulative releases across all recorded periods.' },
          { label: 'Release Velocity', value: releasesPerWeek.toFixed(1) + ' / week', sub: 'Estimated', info: 'Average releases per week based on your recorded frequency. Actual daily distribution may vary.', formula: 'Total Releases / Total Weeks Covered' },
        ],
      },
      {
        title: 'Peaks & Trends',
        items: [
          { label: 'Average per Period', value: avg.toFixed(1), info: 'Mean number of releases per period across all data.' },
          { label: 'Peak Period', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'The period with the most releases ever shipped.' },
          { label: 'Release Frequency', value: frequency, sub: 'How you track', info: 'The reporting cadence you selected when creating this metric.' },
          { label: 'Release Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction based on recent 3-period average vs prior 3-period average.' },
          { label: 'Velocity Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Change in release pace. Positive = shipping faster than before.' },
        ],
      },
      {
        title: 'Segmentation',
        items: [
          { label: 'Major vs Minor Releases', value: 'Log separately', info: 'For major/minor breakdown, track "Major Releases" and "Minor Releases" as separate metrics.' },
        ],
      },
    ],
  }
}

// ─── 46. Bug Resolution Time ───────────────────────
export function analyzeBugResolution(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const med = median(vals)
  const p50 = median(vals) // Same as median
  const p75 = percentile(vals, 75)
  const p95 = percentile(vals, 95)
  const fastest = n > 0 ? Math.min(...vals) : 0
  const slowest = n > 0 ? Math.max(...vals) : 0
  const trend = trendClassify(vals)

  const health = avg < 4 ? { label: 'Excellent (< 4 hrs)', tint: 'text-emerald-300' }
              : avg < 24 ? { label: 'Strong (< 1 day)', tint: 'text-cyan-300' }
              : avg < 72 ? { label: 'Healthy (< 3 days)', tint: 'text-green-300' }
              : avg < 168 ? { label: 'Needs work (< 1 week)', tint: 'text-yellow-300' }
              : { label: 'Critical (> 1 week)', tint: 'text-red-400' }

  return {
    graphExplanation: 'Average time to resolve reported bugs. Lower = better engineering responsiveness.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Avg Resolution', value: current.toFixed(1) + ' hrs', highlight: true, info: 'Latest average bug resolution time in hours.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(1) + ' hrs' : '—', positive: (change || 0) < 0, info: 'Absolute change vs previous period. Lower is better.' },
          { label: 'Health Assessment', value: health.label, tint: health.tint, info: 'Excellent: <4h · Strong: <24h · Healthy: <72h · Needs work: <168h · Critical: >168h' },
          { label: 'Resolution Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-yellow-300' : trend === 'decelerating' ? 'text-emerald-300' : 'text-white/70', info: '"Decelerating" resolution time is good (faster fixes). "Accelerating" is bad.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'Average', value: avg.toFixed(1) + ' hrs', info: 'Arithmetic mean across all periods.' },
          { label: 'Median (P50)', value: med.toFixed(1) + ' hrs', info: 'Middle value — half your bugs resolve faster, half slower.' },
          { label: 'P75 (Slower 25%)', value: p75.toFixed(1) + ' hrs', tint: 'text-yellow-300', info: '75% of bugs resolved in this time or less. The remaining 25% take longer.' },
          { label: 'P95 (Worst 5%)', value: p95.toFixed(1) + ' hrs', tint: 'text-red-400', info: '95% of bugs resolved in this time or less. Represents your worst-case fix times.' },
          { label: 'Fastest', value: fastest.toFixed(1) + ' hrs', tint: 'text-emerald-300', info: 'The fastest average resolution period recorded.' },
          { label: 'Slowest', value: slowest.toFixed(1) + ' hrs', tint: 'text-red-400', info: 'The slowest average resolution period recorded.' },
        ],
      },
      {
        title: 'Deeper Analysis',
        items: [
          { label: 'Critical Bug Resolution', value: 'Log separately', info: 'Track "Critical Bug Resolution Time" as a separate metric for severity-1 bugs.' },
          { label: 'Open Bug Backlog', value: 'Log separately', info: 'Track "Open Bug Count" as a separate metric to see if bugs are piling up.' },
        ],
      },
    ],
  }
}

// ─── 47. API Calls ─────────────────────────────────
export function analyzeAPICalls(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
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

  const daysPerPeriod = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : frequency === 'yearly' ? 365 : 30
  const perDay = current / daysPerPeriod

  return {
    graphExplanation: 'API requests handled per period. Signals platform usage and infrastructure scale.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Total Calls (this period)', value: f.int(current), highlight: true, info: 'API requests handled in the most recent period.' },
          { label: 'Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in API calls vs previous period.' },
          { label: 'Cumulative Calls', value: f.int(total), info: 'Total API requests across all recorded periods.' },
          { label: 'Calls / Day (est.)', value: f.int(Math.round(perDay)), sub: 'Derived from frequency', info: 'Estimated daily API call rate based on the reporting frequency.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Average per Period', value: f.int(Math.round(avg)), info: 'Mean API calls per period across all data.' },
          { label: 'Peak Period', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'The period with the most API calls ever recorded. Useful for capacity planning.' },
        ],
      },
      {
        title: 'Deeper Metrics (log separately)',
        items: [
          { label: 'Calls / User', value: 'Log Active Users separately', info: 'Track "Active Users" as a separate metric to compute calls per user, an indicator of API usage intensity.' },
          { label: 'Error Rate', value: 'Log separately', info: 'Track "API Error Rate %" as a separate metric to monitor API reliability.' },
        ],
      },
    ],
  }
}

// ─── 48. Uptime ────────────────────────────────────
export function analyzeUptime(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0

  const health = current >= 99.999 ? { label: 'Five 9s (Elite)', tint: 'text-emerald-300' }
              : current >= 99.99 ? { label: 'Four 9s', tint: 'text-emerald-300' }
              : current >= 99.9 ? { label: 'Three 9s (Industry standard)', tint: 'text-cyan-300' }
              : current >= 99 ? { label: 'Two 9s', tint: 'text-yellow-300' }
              : { label: 'Below SLA', tint: 'text-red-400' }

  // Downtime calculations (in minutes per period)
  const minutesPerPeriod = frequency === 'daily' ? 1440 : frequency === 'weekly' ? 10080 : frequency === 'monthly' ? 43200 : frequency === 'quarterly' ? 129600 : frequency === 'yearly' ? 525600 : 43200
  const downtimeMinutes = ((100 - current) / 100) * minutesPerPeriod
  const downtimeAnnualMin = ((100 - current) / 100) * 525600

  // Format downtime nicely
  const fmtDowntime = (m: number): string => {
    if (m < 1) return (m * 60).toFixed(1) + ' sec'
    if (m < 60) return m.toFixed(1) + ' min'
    if (m < 1440) return (m / 60).toFixed(1) + ' hrs'
    return (m / 1440).toFixed(1) + ' days'
  }

  return {
    graphExplanation: 'Percentage of time the service is available. Even 0.1% differences translate to hours of downtime.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Uptime', value: current.toFixed(4) + '%', highlight: true, tint: health.tint, info: 'Latest recorded uptime percentage.' },
          { label: 'Previous Uptime', value: previous !== null ? previous.toFixed(4) + '%' : '—', info: 'Uptime in the prior period.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(4) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Reliability Tier', value: health.label, tint: health.tint, info: 'Five 9s (99.999%): 5.3 min/year downtime · Four 9s: 52.6 min · Three 9s: 8.8 hrs · Two 9s: 87.6 hrs' },
        ],
      },
      {
        title: 'Downtime Impact',
        items: [
          { label: 'Downtime This Period', value: '~' + fmtDowntime(downtimeMinutes), tint: 'text-red-400', info: 'Estimated total downtime during the current reporting period.', formula: '(100 - Uptime%) / 100 × Total Minutes' },
          { label: 'Annual Downtime (est.)', value: '~' + fmtDowntime(downtimeAnnualMin), tint: 'text-red-400', info: 'If current uptime rate holds for a year, this is the estimated total annual downtime.' },
        ],
      },
      {
        title: 'Historical',
        items: [
          { label: 'Average Uptime', value: avg.toFixed(4) + '%', info: 'Mean uptime across all periods.' },
          { label: 'Best Period', value: highest.toFixed(4) + '%', tint: 'text-emerald-300', info: 'Highest uptime ever recorded.' },
          { label: 'Worst Period', value: lowest.toFixed(4) + '%', tint: 'text-red-400', info: 'Lowest uptime recorded — represents worst outage period.' },
        ],
      },
      {
        title: 'Deeper Metrics (log separately)',
        items: [
          { label: 'Number of Incidents', value: 'Log separately', info: 'Track "Incidents per Period" as a separate metric for incident frequency.' },
          { label: 'MTTR (Mean Time to Recovery)', value: 'Log separately', info: 'Track "MTTR" in minutes as a separate metric — average time to restore service after an incident.' },
          { label: 'MTBF (Mean Time Between Failures)', value: 'Log separately', info: 'Track "MTBF" in hours as a separate metric — average time between incidents. Higher = more reliable.' },
        ],
      },
    ],
  }
}

// ─── 49. Page Load Time ────────────────────────────
export function analyzeLoadTime(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const med = median(vals)
  const p75 = percentile(vals, 75)
  const p95 = percentile(vals, 95)
  const p99 = percentile(vals, 99)
  const fastest = n > 0 ? Math.min(...vals) : 0
  const slowest = n > 0 ? Math.max(...vals) : 0

  // Core Web Vitals reference: LCP good <2500ms, needs improvement 2500-4000ms, poor >4000ms
  const health = current < 1000 ? { label: 'Excellent', tint: 'text-emerald-300' }
              : current < 2500 ? { label: 'Good (Core Web Vitals: Good)', tint: 'text-cyan-300' }
              : current < 4000 ? { label: 'Needs improvement (CWV)', tint: 'text-yellow-300' }
              : { label: 'Poor (CWV: Poor)', tint: 'text-red-400' }

  return {
    graphExplanation: 'Page or app load time in milliseconds. Google recommends under 2500ms (LCP) for good user experience.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Load Time', value: current.toFixed(0) + ' ms', highlight: true, info: 'Latest average page load time in milliseconds.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(0) + ' ms' : '—', positive: (change || 0) < 0, info: 'Absolute change vs previous period. Lower is better.' },
          { label: 'Core Web Vitals', value: health.label, tint: health.tint, info: 'Google\u2019s LCP benchmarks: Good <2500ms · Needs improvement 2500-4000ms · Poor >4000ms' },
        ],
      },
      {
        title: 'Percentile Distribution',
        items: [
          { label: 'Median (P50)', value: med.toFixed(0) + ' ms', info: '50% of periods loaded in this time or less.' },
          { label: 'P75 (Slower 25%)', value: p75.toFixed(0) + ' ms', tint: 'text-yellow-300', info: '75% of periods loaded in this time or less. The remaining 25% were slower.' },
          { label: 'P95 (Slower 5%)', value: p95.toFixed(0) + ' ms', tint: 'text-red-400', info: '95% of periods loaded in this time or less. Represents typical slow-user experience.' },
          { label: 'P99 (Slower 1%)', value: p99.toFixed(0) + ' ms', tint: 'text-red-400', info: '99% of periods loaded in this time or less. Represents worst-case user experience.' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Fastest Period', value: fastest.toFixed(0) + ' ms', tint: 'text-emerald-300', info: 'Best load time ever recorded.' },
          { label: 'Slowest Period', value: slowest.toFixed(0) + ' ms', tint: 'text-red-400', info: 'Worst load time recorded.' },
        ],
      },
    ],
  }
}

// ─── 50. Deployment Frequency ──────────────────────
export function analyzeDeployFreq(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const total = vals.reduce((s, v) => s + v, 0)
  const trend = trendClassify(vals)
  const accel = growthAcceleration(vals)

  // DORA benchmarks: Elite: multiple/day, High: 1/day-1/week, Medium: 1/week-1/month, Low: <1/month
  const perWeek = current
  const elite = perWeek >= 7 ? { label: 'Elite (DORA)', tint: 'text-emerald-300' }
             : perWeek >= 1 ? { label: 'High performer (DORA)', tint: 'text-cyan-300' }
             : perWeek >= 0.25 ? { label: 'Medium performer', tint: 'text-yellow-300' }
             : { label: 'Low performer', tint: 'text-red-400' }

  return {
    graphExplanation: 'Deployments to production per period. DORA metric — one of the four keys to engineering excellence.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Deployments (this period)', value: f.int(current), highlight: true, info: 'Number of production deployments in the most recent period.' },
          { label: 'Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period.' },
          { label: 'Total Deployments', value: f.int(total), info: 'Cumulative deployments across all recorded periods.' },
          { label: 'DORA Performance Tier', value: elite.label, tint: elite.tint, info: 'Elite: 7+/week (multiple/day) · High: 1-7/week · Medium: 0.25-1/week · Low: <0.25/week' },
        ],
      },
      {
        title: 'Velocity & Trend',
        items: [
          { label: 'Average per Period', value: avg.toFixed(1), info: 'Mean deployments per period across all data.' },
          { label: 'Peak Period', value: f.int(peak), tint: 'text-emerald-300', info: 'The period with the most deployments ever recorded.' },
          { label: 'Deployment Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction based on recent 3-period average vs prior 3-period average.' },
          { label: 'Velocity Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Change in deployment pace. Positive = shipping faster than before.' },
        ],
      },
      {
        title: 'Quality Metrics (log separately — DORA 4)',
        items: [
          { label: 'Successful Deployments', value: 'Log separately', info: 'Track "Successful Deploys" as a separate metric to compute success rate.' },
          { label: 'Failed Deployments', value: 'Log separately', info: 'Track "Failed Deploys" — needed to compute change failure rate.' },
          { label: 'Rollbacks', value: 'Log separately', info: 'Track "Deployment Rollbacks" as a separate metric.' },
          { label: 'Change Failure Rate', value: 'Log separately', info: 'DORA metric: % of deployments that fail. Track as "Change Failure Rate %". Elite: 0-15% · Low: 46%+' },
        ],
      },
    ],
  }
}