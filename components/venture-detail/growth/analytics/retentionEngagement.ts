// ═══════════════════════════════════════════════════
// RETENTION & ENGAGEMENT METRICS (24-31)
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, percentile, stdDev, volatility, pctChange,
  cagr, growthAcceleration, trendClassify, extremePeriods, formatPct, sortByDate,
} from './mathUtils'

// ─── 24. Churn Rate ────────────────────────────────
export function analyzeChurn(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const accel = growthAcceleration(vals)
  const impliedRetention = 100 - current

  const health = current < 2 ? { label: 'Excellent', tint: 'text-emerald-300' }
              : current < 5 ? { label: 'Healthy', tint: 'text-cyan-300' }
              : current < 10 ? { label: 'Acceptable', tint: 'text-green-300' }
              : current < 20 ? { label: 'Concerning', tint: 'text-yellow-300' }
              : { label: 'Critical', tint: 'text-red-400' }

  // Annualized churn from monthly rate
  const annualizedChurn = 100 - Math.pow(1 - current / 100, 12) * 100

  return {
    graphExplanation: 'Percentage of customers lost each period. Lower is better. Small changes have huge long-term impact.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Churn', value: current.toFixed(2) + '%', highlight: true, tint: 'text-red-400', info: 'Percentage of customers lost in the most recent period.', formula: 'Churned Customers / Customers at Start × 100' },
          { label: 'Previous Churn', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Churn rate in the prior period.' },
          { label: 'Churn Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) < 0, info: 'Percentage-point change vs previous period. Lower churn is better.' },
          { label: 'Health Status', value: health.label, tint: health.tint, info: 'Excellent: <2% · Healthy: <5% · Acceptable: <10% · Concerning: <20% · Critical: 20%+. Benchmarks assume monthly churn for SaaS.' },
        ],
      },
      {
        title: 'Impact',
        items: [
          { label: 'Implied Retention', value: impliedRetention.toFixed(2) + '%', tint: impliedRetention >= 95 ? 'text-emerald-300' : impliedRetention >= 90 ? 'text-cyan-300' : impliedRetention >= 80 ? 'text-yellow-300' : 'text-red-400', info: 'Percentage of customers retained.', formula: '100 - Churn Rate' },
          { label: 'Annualized Churn (est.)', value: annualizedChurn.toFixed(2) + '%', tint: annualizedChurn < 30 ? 'text-emerald-300' : annualizedChurn < 60 ? 'text-yellow-300' : 'text-red-400', info: 'Estimated yearly churn compounded from the current monthly rate. Useful for LTV calculations.', formula: '1 - (1 - monthly churn)^12' },
        ],
      },
      {
        title: 'Range & Trend',
        items: [
          { label: 'Highest Churn', value: highest.toFixed(2) + '%', tint: 'text-red-400', info: 'Worst churn rate recorded.' },
          { label: 'Lowest Churn', value: lowest.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best (lowest) churn rate recorded.' },
          { label: 'Average Churn', value: avg.toFixed(2) + '%', info: 'Mean churn rate across all periods.' },
          { label: 'Churn Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) < 0, info: 'Change in the direction of churn. Negative = churn is decreasing (good).' },
        ],
      },
      {
        title: 'Segmentation',
        items: [
          { label: 'Gross vs Logo Churn', value: 'Log both separately', info: 'Gross Churn = revenue lost. Logo Churn = customer count lost. Track separately for full picture.' },
          { label: 'Revenue Churn', value: 'Log MRR movement separately', info: 'Revenue churn tracks $ lost, not customer count. Track Contraction MRR + Churned MRR separately.' },
          { label: 'Churn by Cohort', value: 'Track per signup cohort', info: 'True churn analysis requires cohort tracking — track churn for each monthly cohort of customers.' },
        ],
      },
    ],
  }
}

// ─── 25. NRR — Net Revenue Retention ───────────────
export function analyzeNRR(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0

  const health = current >= 130 ? { label: 'Elite (Snowflake tier)', tint: 'text-emerald-300' }
              : current >= 120 ? { label: 'World-class', tint: 'text-emerald-300' }
              : current >= 110 ? { label: 'Excellent', tint: 'text-cyan-300' }
              : current >= 100 ? { label: 'Healthy — net expansion', tint: 'text-green-300' }
              : current >= 90 ? { label: 'Below benchmark', tint: 'text-yellow-300' }
              : { label: 'Critical — net contraction', tint: 'text-red-400' }

  return {
    graphExplanation: 'Revenue retained from existing customers including expansion. Above 100% means you\u2019re growing even without new customers.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current NRR', value: current.toFixed(2) + '%', highlight: true, tint: current >= 100 ? 'text-emerald-300' : 'text-red-400', info: 'Net revenue retention percentage.', formula: '(Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100' },
          { label: 'Previous NRR', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'NRR in the prior period.' },
          { label: 'NRR Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Assessment', value: health.label, tint: health.tint, info: 'Elite: 130%+ · World-class: 120%+ · Excellent: 110%+ · Healthy: 100%+ · Below benchmark: 90%+ · Critical: <90%' },
        ],
      },
      {
        title: 'Composition (log separately)',
        items: [
          { label: 'Expansion', value: 'Track as separate metric', info: 'Revenue expansion from upgrades, add-ons, seat growth. Track "Expansion MRR" as a separate metric.' },
          { label: 'Contraction', value: 'Track as separate metric', info: 'Revenue lost from downgrades but not full churn. Track "Contraction MRR" as a separate metric.' },
          { label: 'Churn', value: 'Track as separate metric', info: 'Revenue lost from cancelled customers. Track "Churned MRR" as a separate metric.' },
          { label: 'Reactivation', value: 'Track as separate metric', info: 'Revenue from returning cancelled customers. Track "Reactivation MRR" as a separate metric.' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Average NRR', value: avg.toFixed(2) + '%', info: 'Mean NRR across all periods.' },
          { label: 'Peak NRR', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best NRR ever recorded.' },
          { label: 'Lowest NRR', value: lowest.toFixed(2) + '%', tint: 'text-red-400', info: 'Worst NRR recorded.' },
        ],
      },
    ],
  }
}

// ─── 26. GRR — Gross Revenue Retention ─────────────
export function analyzeGRR(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  const health = current >= 95 ? { label: 'World-class', tint: 'text-emerald-300' }
              : current >= 90 ? { label: 'Excellent', tint: 'text-cyan-300' }
              : current >= 85 ? { label: 'Healthy', tint: 'text-green-300' }
              : current >= 75 ? { label: 'Needs work', tint: 'text-yellow-300' }
              : { label: 'Critical', tint: 'text-red-400' }

  return {
    graphExplanation: 'Revenue retained from existing customers excluding expansion. Ceiling is 100%. Higher = less lost revenue.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current GRR', value: current.toFixed(2) + '%', highlight: true, tint: current >= 90 ? 'text-emerald-300' : current >= 75 ? 'text-yellow-300' : 'text-red-400', info: 'Gross revenue retention percentage. Cannot exceed 100%.', formula: '(Starting MRR - Contraction - Churn) / Starting MRR × 100' },
          { label: 'GRR Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Assessment', value: health.label, tint: health.tint, info: 'World-class: 95%+ · Excellent: 90%+ · Healthy: 85%+ · Needs work: 75%+ · Critical: <75%' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Average GRR', value: avg.toFixed(2) + '%', info: 'Mean GRR across periods.' },
          { label: 'Peak GRR', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best GRR recorded.' },
        ],
      },
      {
        title: 'Composition',
        items: [
          { label: 'Contraction (revenue)', value: 'Log separately', info: 'Track "Contraction MRR" as a separate metric to see revenue lost from downgrades.' },
          { label: 'Churn (revenue)', value: 'Log separately', info: 'Track "Churned MRR" as a separate metric to see revenue lost from cancellations.' },
          { label: 'Cohort GRR', value: 'Track per cohort', info: 'True GRR analysis requires cohort tracking — track GRR for each customer cohort.' },
        ],
      },
    ],
  }
}

// ─── 27. Customer Retention Rate ───────────────────
export function analyzeCustomerRetention(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  const health = current >= 95 ? { label: 'World-class', tint: 'text-emerald-300' }
              : current >= 90 ? { label: 'Excellent', tint: 'text-cyan-300' }
              : current >= 80 ? { label: 'Healthy', tint: 'text-green-300' }
              : current >= 70 ? { label: 'Below average', tint: 'text-yellow-300' }
              : { label: 'Weak', tint: 'text-red-400' }

  return {
    graphExplanation: 'Percentage of customers retained period-over-period. The counterpart to churn.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Retention', value: current.toFixed(2) + '%', highlight: true, tint: current >= 90 ? 'text-emerald-300' : 'text-yellow-300', info: 'Latest customer retention rate.', formula: '(Customers at End - New Customers) / Customers at Start × 100' },
          { label: 'Previous Retention', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Prior period retention rate.' },
          { label: 'Retention Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Assessment', value: health.label, tint: health.tint, info: 'World-class: 95%+ · Excellent: 90%+ · Healthy: 80%+ · Below average: 70%+ · Weak: <70%' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Average Retention', value: avg.toFixed(2) + '%', info: 'Mean retention rate across periods.' },
          { label: 'Peak Retention', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best retention rate recorded.' },
        ],
      },
      {
        title: 'Cohort Retention',
        items: [
          { label: 'Day 30 Retention', value: 'Log D30 separately', info: 'Percentage of users still active 30 days after signup. Track as a separate metric per cohort.' },
          { label: 'Day 60 Retention', value: 'Log D60 separately', info: 'Percentage of users still active 60 days after signup.' },
          { label: 'Day 90 Retention', value: 'Log D90 separately', info: 'Percentage of users still active 90 days after signup. Standard cohort marker.' },
          { label: 'Retention by Segment', value: 'Log per segment', info: 'Retention often varies dramatically by customer segment. Track segments as separate metrics.' },
        ],
      },
    ],
  }
}

// ─── 28. DAU / MAU Ratio ───────────────────────────
export function analyzeDauMau(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const trend = trendClassify(vals)

  const stickiness = current >= 50 ? { label: 'Exceptional (Facebook tier)', tint: 'text-emerald-300' }
                  : current >= 30 ? { label: 'Very strong', tint: 'text-cyan-300' }
                  : current >= 20 ? { label: 'Strong', tint: 'text-green-300' }
                  : current >= 10 ? { label: 'Moderate', tint: 'text-yellow-300' }
                  : { label: 'Low stickiness', tint: 'text-red-400' }

  return {
    graphExplanation: 'Ratio of daily to monthly active users. Measures how sticky your product is.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Ratio', value: current.toFixed(2) + '%', highlight: true, tint: stickiness.tint, info: 'What percentage of monthly users use the product daily.', formula: '(DAU / MAU) × 100' },
          { label: 'Stickiness Assessment', value: stickiness.label, tint: stickiness.tint, info: 'Exceptional: 50%+ · Very strong: 30%+ · Strong: 20%+ · Moderate: 10%+ · Low: <10%. Benchmark varies by product type.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Average Ratio', value: avg.toFixed(2) + '%', info: 'Mean DAU/MAU across all periods.' },
          { label: 'Peak Ratio', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best stickiness recorded.' },
          { label: 'Monthly Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction based on recent 3 vs prior 3 periods.' },
        ],
      },
      {
        title: 'Engagement Intensity',
        items: [
          { label: 'Interpretation', value: current.toFixed(0) + '% daily usage', info: current >= 20 ? 'Users open your product on ' + Math.round(30 * current / 100) + ' days out of 30 on average.' : 'Users open your product on only ' + Math.round(30 * current / 100) + ' days out of 30. Consider engagement features.' },
        ],
      },
    ],
  }
}

// ─── 29. Session Duration ──────────────────────────
export function analyzeSessionDuration(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const med = median(vals)
  const p25 = percentile(vals, 25)
  const p75 = percentile(vals, 75)
  const p95 = percentile(vals, 95)
  const longest = n > 0 ? Math.max(...vals) : 0
  const trend = trendClassify(vals)

  return {
    graphExplanation: 'Time users spend per session. Longer = deeper engagement (usually).',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Duration', value: current.toFixed(2), highlight: true, sub: 'min (avg)', info: 'Latest average session duration in minutes.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' min' : '—', positive: (change || 0) >= 0, info: 'Absolute change in duration vs previous period.' },
          { label: 'Duration Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction over recent periods.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'Average', value: avg.toFixed(2) + ' min', info: 'Arithmetic mean across all periods.' },
          { label: 'Median', value: med.toFixed(2) + ' min', info: 'Middle value — less affected by outliers than the mean.' },
          { label: 'P25 (25th percentile)', value: p25.toFixed(2) + ' min', info: '25% of periods had sessions shorter than this.' },
          { label: 'P75 (75th percentile)', value: p75.toFixed(2) + ' min', info: '75% of periods had sessions shorter than this.' },
          { label: 'P95 (95th percentile)', value: p95.toFixed(2) + ' min', tint: 'text-cyan-300', info: '95% of periods had sessions shorter than this — captures your highest-engagement periods.' },
          { label: 'Longest Session', value: longest.toFixed(2) + ' min', tint: 'text-emerald-300', info: 'Peak session duration recorded.' },
        ],
      },
    ],
  }
}

// ─── 30. Sessions Per User ─────────────────────────
export function analyzeSessionsPerUser(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const med = median(vals)
  const p25 = percentile(vals, 25)
  const p75 = percentile(vals, 75)
  const peak = n > 0 ? Math.max(...vals) : 0

  return {
    graphExplanation: 'Average number of sessions per user per period. Higher = more habitual usage.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Sessions/User', value: current.toFixed(2), highlight: true, info: 'Average sessions per user in the most recent period.', formula: 'Total Sessions / Active Users' },
          { label: 'Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period.' },
          { label: 'Peak', value: peak.toFixed(2), tint: 'text-emerald-300', info: 'Highest sessions/user recorded.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'Average', value: avg.toFixed(2), info: 'Arithmetic mean across all periods.' },
          { label: 'Median', value: med.toFixed(2), info: 'Middle value across periods.' },
          { label: 'P25', value: p25.toFixed(2), info: '25% of periods had lower sessions/user.' },
          { label: 'P75', value: p75.toFixed(2), info: '75% of periods had lower sessions/user.' },
        ],
      },
      {
        title: 'Frequency Distribution',
        items: [
          { label: 'Session Frequency', value: 'Log per-user counts separately', info: 'For distribution analysis (e.g., % of users with 1, 2, 5, 10+ sessions), log each frequency bucket as a separate metric.' },
        ],
      },
    ],
  }
}

// ─── 31. NPS — Net Promoter Score ──────────────────
export function analyzeNPS(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0

  const health = current >= 70 ? { label: 'World-class (Apple, Tesla)', tint: 'text-emerald-300' }
              : current >= 50 ? { label: 'Excellent', tint: 'text-cyan-300' }
              : current >= 30 ? { label: 'Great', tint: 'text-green-300' }
              : current >= 0 ? { label: 'Needs improvement', tint: 'text-yellow-300' }
              : { label: 'Critical — more detractors than promoters', tint: 'text-red-400' }

  return {
    graphExplanation: 'Net Promoter Score. Range: -100 to +100. Measures customer loyalty and word-of-mouth potential.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current NPS', value: current.toFixed(0), highlight: true, tint: health.tint, info: 'Net Promoter Score, range -100 to +100.', formula: '% Promoters - % Detractors' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(0) + ' pts' : '—', positive: (change || 0) >= 0, info: 'Absolute point change vs previous period.' },
          { label: 'Assessment', value: health.label, tint: health.tint, info: 'World-class: 70+ · Excellent: 50+ · Great: 30+ · Needs improvement: 0-30 · Critical: <0' },
        ],
      },
      {
        title: 'Distribution (log separately)',
        items: [
          { label: 'Promoters (score 9-10)', value: 'Track separately', tint: 'text-emerald-300', info: 'Loyal enthusiasts. Log "Promoters %" as a separate metric for detailed segmentation.' },
          { label: 'Passives (score 7-8)', value: 'Track separately', tint: 'text-yellow-300', info: 'Satisfied but unenthusiastic. Log "Passives %" as a separate metric.' },
          { label: 'Detractors (score 0-6)', value: 'Track separately', tint: 'text-red-400', info: 'Unhappy customers who can damage brand. Log "Detractors %" as a separate metric.' },
          { label: 'Response Count', value: 'Track separately', info: 'Total responses in the survey. Log as a separate metric to validate statistical significance.' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Average NPS', value: avg.toFixed(0), info: 'Mean NPS across all periods.' },
          { label: 'Peak NPS', value: peak.toFixed(0), tint: 'text-emerald-300', info: 'Best NPS ever recorded.' },
          { label: 'Lowest NPS', value: lowest.toFixed(0), tint: 'text-red-400', info: 'Worst NPS recorded.' },
          { label: 'NPS by Segment', value: 'Log per segment', info: 'NPS often varies significantly by customer segment. Track separately for enterprise, SMB, individual, etc.' },
        ],
      },
    ],
  }
}