// ═══════════════════════════════════════════════════
// REVENUE & FINANCIAL METRICS (1-13)
// ═══════════════════════════════════════════════════

import { AnalyticsGroup, Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, percentile, stdDev, volatility, pctChange,
  cagr, periodChanges, growthAcceleration, trendClassify, forecastNext,
  extremePeriods, formatPct, yoyComparison, sortByDate
} from './mathUtils'

// ─── 1. MRR — Monthly Recurring Revenue ────────────
export function analyzeMRR(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const first = n > 0 ? vals[0] : 0
  const mom = previous !== null ? pctChange(current, previous) : null
  const netGrowth = previous !== null ? current - previous : 0
  const mrrCAGR = cagr(first, current, n - 1)
  const vol = volatility(vals)
  const accel = growthAcceleration(vals)
  const { best, worst } = extremePeriods(vals, sortByDate(entries))

  return {
    graphExplanation: 'Recurring subscription revenue billed monthly. The most important metric for SaaS.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current MRR', value: f.currency(current), highlight: true, info: 'The latest recorded MRR value from your most recent data point.' },
          { label: 'Previous MRR', value: previous !== null ? f.currency(previous) : '—', info: 'MRR from the period immediately before the current one.' },
          { label: 'MoM Growth', value: mom !== null ? formatPct(mom).display : '—', positive: (mom || 0) >= 0, info: 'Month-over-month percentage change in MRR.', formula: '(Current - Previous) / Previous × 100' },
          { label: 'Net MRR Growth', value: (netGrowth >= 0 ? '+' : '') + f.currency(Math.abs(netGrowth)), positive: netGrowth >= 0, info: 'Absolute change in MRR from the previous period, in currency units.', formula: 'Current MRR - Previous MRR' },
        ],
      },
      {
        title: 'MRR Composition (aggregate)',
        items: [
          { label: 'New MRR', value: netGrowth > 0 ? f.currency(netGrowth) : f.currency(0), sub: 'Net new added', info: 'Approximates New + Expansion MRR based on net movement. For exact segmentation, log New/Expansion/Contraction/Churned separately per period.' },
          { label: 'Contraction/Churn', value: netGrowth < 0 ? f.currency(Math.abs(netGrowth)) : f.currency(0), sub: 'Net lost', tint: netGrowth < 0 ? 'text-red-400' : 'text-white/60', info: 'Approximates Contraction + Churned MRR based on net negative movement.' },
        ],
      },
      {
        title: 'Growth & Health',
        items: [
          { label: 'MRR CAGR', value: mrrCAGR !== null ? formatPct(mrrCAGR).display : '—', positive: (mrrCAGR || 0) >= 0, info: 'Compound growth rate per period across all data.', formula: '((Last / First)^(1/periods)) - 1' },
          { label: 'Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Difference between the recent 3-period avg growth and the prior 3-period avg growth.', formula: 'avg(last 3 growth rates) - avg(prior 3 growth rates)' },
          { label: 'MRR Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 50 ? 'text-yellow-300' : 'text-red-400', info: 'Coefficient of variation: how much MRR fluctuates around its average. Lower is more predictable.', formula: '(Standard Deviation / Mean) × 100' },
          { label: 'Highest MRR', value: n > 0 ? f.currency(Math.max(...vals)) : '—', info: 'The peak MRR recorded in your data.' },
          { label: 'Lowest MRR', value: n > 0 ? f.currency(Math.min(...vals)) : '—', info: 'The lowest MRR recorded in your data.' },
        ],
      },
      ...(best || worst ? [{
        title: 'Notable Periods',
        items: [
          ...(best ? [{ label: 'Best Period', value: formatPct(best.change).display, sub: best.date, tint: 'text-emerald-300', info: 'The single period with the largest MRR growth.' }] : []),
          ...(worst && worst.change < 0 ? [{ label: 'Worst Period', value: formatPct(worst.change).display, sub: worst.date, tint: 'text-red-400', info: 'The single period with the largest MRR decline.' }] : []),
        ],
      }] : []),
    ],
  }
}

// ─── 2. ARR — Annual Recurring Revenue ─────────────
export function analyzeARR(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const first = n > 0 ? vals[0] : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const yoy = yoyComparison(entries, 12)
  const arrCAGR = cagr(first, current, n - 1)
  const netNewARR = previous !== null ? current - previous : 0
  const accel = growthAcceleration(vals)

  // Milestone detection
  const milestones = [100000, 250000, 500000, 1000000, 5000000, 10000000, 25000000, 50000000, 100000000]
  const passedMilestones = milestones.filter(m => current >= m)
  const nextMilestone = milestones.find(m => current < m)

  return {
    graphExplanation: 'ARR = MRR × 12. The annualized value of your recurring revenue.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current ARR', value: f.currency(current), highlight: true, info: 'The latest annualized recurring revenue.' },
          { label: 'ARR Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change from the previous period.', formula: '(Current - Previous) / Previous × 100' },
          { label: 'YoY Growth', value: yoy.yoyGrowth !== null ? formatPct(yoy.yoyGrowth).display : '—', positive: (yoy.yoyGrowth || 0) >= 0, info: 'Year-over-year growth, comparing current ARR to ARR approximately 12 months ago.' },
          { label: 'Net New ARR', value: (netNewARR >= 0 ? '+' : '') + f.currency(Math.abs(netNewARR)), positive: netNewARR >= 0, info: 'Absolute change in ARR from the previous period.', formula: 'Current ARR - Previous ARR' },
        ],
      },
      {
        title: 'Growth Trajectory',
        items: [
          { label: 'ARR CAGR', value: arrCAGR !== null ? formatPct(arrCAGR).display : '—', positive: (arrCAGR || 0) >= 0, info: 'Compound growth rate per period.' },
          { label: 'ARR Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Difference between recent and prior 3-period average growth.' },
          { label: 'Highest ARR', value: n > 0 ? f.currency(Math.max(...vals)) : '—', info: 'Peak ARR recorded.' },
          { label: 'Lowest ARR', value: n > 0 ? f.currency(Math.min(...vals)) : '—', info: 'Lowest ARR recorded.' },
        ],
      },
      {
        title: 'Milestones',
        items: [
          { label: 'Milestones Passed', value: passedMilestones.length + ' of ' + milestones.length, info: 'Number of ARR milestones crossed ($100K, $250K, $500K, $1M, $5M, $10M, $25M, $50M, $100M).' },
          { label: 'Last Milestone', value: passedMilestones.length > 0 ? f.currency(passedMilestones[passedMilestones.length - 1]) : 'None yet', tint: 'text-emerald-300', info: 'The most recent ARR milestone your venture has crossed.' },
          { label: 'Next Milestone', value: nextMilestone ? f.currency(nextMilestone) : 'Beyond $100M', tint: 'text-cyan-300', info: 'The next ARR milestone to aim for.' },
          { label: 'Distance to Next', value: nextMilestone ? f.currency(nextMilestone - current) : '—', info: 'How much more ARR needed to hit the next milestone.', formula: 'Next Milestone - Current ARR' },
        ],
      },
    ],
  }
}

// ─── 3. Total Revenue ──────────────────────────────
export function analyzeTotalRevenue(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const first = n > 0 ? vals[0] : 0
  const mom = previous !== null ? pctChange(current, previous) : null
  const yoy = yoyComparison(entries, 12)
  const revCAGR = cagr(first, current, n - 1)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const avg = mean(vals)
  const vol = volatility(vals)
  const accel = growthAcceleration(vals)

  return {
    graphExplanation: 'Total revenue booked in each period. Includes recurring and one-time revenue.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Period', value: f.currency(current), highlight: true, info: 'Revenue for the most recent period.' },
          { label: 'Previous Period', value: previous !== null ? f.currency(previous) : '—', info: 'Revenue for the prior period.' },
          { label: frequency === 'yearly' ? 'YoY Growth' : 'MoM Growth', value: mom !== null ? formatPct(mom).display : '—', positive: (mom || 0) >= 0, info: 'Period-over-period revenue growth.' },
          { label: 'Revenue CAGR', value: revCAGR !== null ? formatPct(revCAGR).display : '—', positive: (revCAGR || 0) >= 0, info: 'Compound growth rate per period.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: frequency === 'monthly' ? 'Highest Month' : 'Highest Period', value: f.currency(highest), tint: 'text-emerald-300', info: 'Best revenue period recorded.' },
          { label: frequency === 'monthly' ? 'Lowest Month' : 'Lowest Period', value: f.currency(lowest), tint: 'text-red-400', info: 'Weakest revenue period recorded.' },
          { label: frequency === 'monthly' ? 'Avg Monthly Revenue' : 'Average Revenue', value: f.currency(avg), info: 'Average revenue across all recorded periods.' },
          { label: 'Revenue Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 50 ? 'text-yellow-300' : 'text-red-400', info: 'How much revenue fluctuates around its average.', formula: '(Std Dev / Mean) × 100' },
        ],
      },
      {
        title: 'Trend',
        items: [
          { label: 'Revenue Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth minus prior avg growth. Positive = accelerating.' },
          { label: 'YoY Growth', value: yoy.yoyGrowth !== null ? formatPct(yoy.yoyGrowth).display : '—', positive: (yoy.yoyGrowth || 0) >= 0, info: 'Year-over-year comparison.' },
        ],
      },
    ],
  }
}

// ─── 4. ARPU ───────────────────────────────────────
export function analyzeARPU(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const med = median(vals)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const vol = volatility(vals)

  return {
    graphExplanation: 'Average revenue per user. Rising ARPU signals stronger monetization.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current ARPU', value: f.currency(current), highlight: true, info: 'Average revenue per user in the most recent period.', formula: 'Total Revenue / Total Users' },
          { label: 'Previous ARPU', value: previous !== null ? f.currency(previous) : '—', info: 'ARPU in the prior period.' },
          { label: 'ARPU Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Period-over-period ARPU change.' },
        ],
      },
      {
        title: 'Distribution',
        items: [
          { label: 'Median ARPU', value: f.currency(med), info: 'The middle value — half your periods are above, half below.' },
          { label: 'Average ARPU', value: f.currency(avg), info: 'Arithmetic mean across all periods.' },
          { label: 'Highest ARPU', value: f.currency(highest), tint: 'text-emerald-300', info: 'Peak ARPU recorded.' },
          { label: 'Lowest ARPU', value: f.currency(lowest), tint: 'text-yellow-300', info: 'Lowest ARPU recorded.' },
          { label: 'ARPU Volatility', value: vol.toFixed(1) + '%', tint: vol < 15 ? 'text-emerald-300' : vol < 30 ? 'text-yellow-300' : 'text-red-400', info: 'Fluctuation of ARPU around its mean.' },
        ],
      },
    ],
  }
}

// ─── 5. Gross Margin ───────────────────────────────
export function analyzeGrossMargin(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const vol = volatility(vals)

  const health = current >= 80 ? { label: 'World-class SaaS', tint: 'text-emerald-300' }
              : current >= 70 ? { label: 'Strong', tint: 'text-cyan-300' }
              : current >= 40 ? { label: 'Healthy', tint: 'text-green-300' }
              : current >= 20 ? { label: 'Low-margin business', tint: 'text-yellow-300' }
              : { label: 'Below sustainable', tint: 'text-red-400' }

  return {
    graphExplanation: 'Gross margin = (Revenue - COGS) / Revenue. Higher = better unit economics.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Margin', value: current.toFixed(2) + '%', highlight: true, info: 'Latest gross margin percentage.', formula: '(Revenue - COGS) / Revenue × 100' },
          { label: 'Previous Margin', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Prior period margin.' },
          { label: 'Margin Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Change in percentage points (not %).', formula: 'Current - Previous (in pp)' },
          { label: 'Health Assessment', value: health.label, tint: health.tint, info: 'World-class SaaS: 80%+ · Strong: 70%+ · Healthy: 40%+ · Low-margin: 20%+' },
        ],
      },
      {
        title: 'Range & Stability',
        items: [
          { label: 'Best Margin', value: highest.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Peak margin recorded.' },
          { label: 'Worst Margin', value: lowest.toFixed(2) + '%', tint: 'text-red-400', info: 'Lowest margin recorded.' },
          { label: 'Margin Volatility', value: vol.toFixed(1) + '%', tint: vol < 5 ? 'text-emerald-300' : vol < 15 ? 'text-yellow-300' : 'text-red-400', info: 'Fluctuation of margin. Stable margins signal a mature cost structure.' },
        ],
      },
    ],
  }
}

// ─── 6. Net Profit Margin ──────────────────────────
export function analyzeNetMargin(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const trend = trendClassify(vals)
  const breakeven = current >= 0

  return {
    graphExplanation: 'Net profit margin = Net Profit / Revenue. Positive means the company is profitable.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Margin', value: current.toFixed(2) + '%', highlight: true, tint: current >= 0 ? 'text-emerald-300' : 'text-red-400', info: 'Bottom-line profit as % of revenue.', formula: 'Net Profit / Revenue × 100' },
          { label: 'Previous Margin', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Prior period.' },
          { label: 'Margin Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change.' },
          { label: 'Break-even Status', value: breakeven ? 'Profitable' : 'Loss-making', tint: breakeven ? 'text-emerald-300' : 'text-red-400', info: 'Positive margin = profitable. Negative = losing money.' },
        ],
      },
      {
        title: 'Range & Trend',
        items: [
          { label: 'Best Margin', value: highest.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Peak profitability recorded.' },
          { label: 'Worst Margin', value: lowest.toFixed(2) + '%', tint: 'text-red-400', info: 'Lowest margin recorded.' },
          { label: 'Margin Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction based on recent vs prior 3-period average.' },
        ],
      },
    ],
  }
}

// ─── 7. Burn Rate ──────────────────────────────────
export function analyzeBurn(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const vol = volatility(vals)

  return {
    graphExplanation: 'Monthly cash outflow. Lower burn = longer runway. Track carefully.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Burn', value: f.currency(current) + '/mo', highlight: true, tint: 'text-red-400', info: 'Cash consumed per month, most recent period.' },
          { label: 'Previous Burn', value: previous !== null ? f.currency(previous) + '/mo' : '—', info: 'Prior period burn.' },
          { label: 'Burn Change', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) < 0, info: 'Change vs previous period. Lower burn is better.' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Net Burn (avg)', value: f.currency(avg) + '/mo', info: 'Average monthly burn across all periods. Used to project runway.' },
          { label: 'Gross Burn (peak)', value: f.currency(highest) + '/mo', tint: 'text-red-400', info: 'Highest burn recorded. Represents worst-case scenario.' },
          { label: 'Lowest Burn', value: f.currency(lowest) + '/mo', tint: 'text-emerald-300', info: 'Best burn month recorded.' },
          { label: 'Burn Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 40 ? 'text-yellow-300' : 'text-red-400', info: 'How much burn fluctuates. Stable burn = predictable runway.' },
        ],
      },
      {
        title: 'Runway (requires cash balance)',
        items: [
          { label: 'Est. Runway at Current Burn', value: 'Enter cash balance separately', sub: 'Cash / Net Monthly Burn', info: 'Runway = Cash Available / Current Burn. Log a Cash Balance metric separately to compute this automatically.' },
        ],
      },
    ],
  }
}

// ─── 8. LTV ────────────────────────────────────────
export function analyzeLTV(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const avg = mean(vals)

  return {
    graphExplanation: 'Customer Lifetime Value: total revenue expected from a customer over their lifetime.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current LTV', value: f.currency(current), highlight: true, info: 'Most recent LTV recorded.', formula: 'ARPU × Avg Customer Lifetime (or ARPU / Churn Rate)' },
          { label: 'LTV Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Change in LTV vs previous period.' },
          { label: 'Average LTV', value: f.currency(avg), info: 'Arithmetic mean of LTV across periods.' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Highest LTV', value: f.currency(highest), tint: 'text-emerald-300', info: 'Peak LTV recorded — often a strong cohort period.' },
          { label: 'Lowest LTV', value: f.currency(lowest), tint: 'text-yellow-300', info: 'Weakest LTV recorded.' },
        ],
      },
      {
        title: 'Notes',
        items: [
          { label: 'LTV by Cohort', value: 'Log cohorts separately', sub: 'Track quarterly signup cohorts', info: 'For true LTV analysis, track LTV per acquisition cohort. This basic metric shows aggregate LTV over time.' },
          { label: 'Gross-margin-adjusted', value: current > 0 ? f.currency(current * 0.7) + ' est.' : '—', sub: 'Assumes 70% gross margin', info: 'True LTV should be adjusted by your gross margin: LTV × Gross Margin %. Update this by tracking Margin-Adjusted LTV as a separate metric.' },
        ],
      },
    ],
  }
}

// ─── 9. CAC ────────────────────────────────────────
export function analyzeCAC(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const vol = volatility(vals)

  return {
    graphExplanation: 'Customer Acquisition Cost. Total spend to acquire one paying customer. Lower = better.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current CAC', value: f.currency(current), highlight: true, info: 'Cost to acquire one customer in the latest period.', formula: 'Total S&M Spend / New Customers Acquired' },
          { label: 'Previous CAC', value: previous !== null ? f.currency(previous) : '—', info: 'CAC in the prior period.' },
          { label: 'CAC Change', value: change !== null ? formatPct(change).display : '—', positive: (change || 0) < 0, info: 'Change vs previous period. Lower CAC is better.' },
          { label: 'CAC Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 40 ? 'text-yellow-300' : 'text-red-400', info: 'How much CAC fluctuates. Stable CAC is easier to plan around.' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Lowest CAC', value: f.currency(lowest), tint: 'text-emerald-300', info: 'Best (cheapest) CAC recorded.' },
          { label: 'Highest CAC', value: f.currency(highest), tint: 'text-red-400', info: 'Worst (most expensive) CAC recorded.' },
          { label: 'Average CAC', value: f.currency(avg), info: 'Mean CAC across all periods.' },
        ],
      },
      {
        title: 'Payback (requires ARPU)',
        items: [
          { label: 'CAC Payback Period', value: 'Log ARPU + Gross Margin separately', sub: 'Months to recover CAC', info: 'CAC Payback = CAC / (Monthly ARPU × Gross Margin). Log ARPU and Gross Margin as separate metrics to enable this.' },
        ],
      },
    ],
  }
}

// ─── 10. LTV:CAC ───────────────────────────────────
export function analyzeLtvCac(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0

  const health = current >= 3 ? { label: 'Healthy', tint: 'text-emerald-300' }
              : current >= 1 ? { label: 'Break-even', tint: 'text-yellow-300' }
              : { label: 'Unhealthy — losing money per customer', tint: 'text-red-400' }

  return {
    graphExplanation: 'LTV:CAC ratio. Industry benchmark: 3x or higher. Below 1x means each customer costs more than they generate.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Ratio', value: current.toFixed(2) + 'x', highlight: true, info: 'Latest LTV:CAC ratio.', formula: 'LTV / CAC' },
          { label: 'Previous Ratio', value: previous !== null ? previous.toFixed(2) + 'x' : '—', info: 'Prior period ratio.' },
          { label: 'Ratio Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + 'x' : '—', positive: (change || 0) >= 0, info: 'Absolute change in the ratio.' },
          { label: 'Health', value: health.label, tint: health.tint, info: '≥3x: Healthy · 1-3x: Break-even · <1x: Unhealthy' },
        ],
      },
      {
        title: 'Benchmarks',
        items: [
          { label: 'Target', value: '3.0x or higher', tint: 'text-cyan-300', info: 'Industry benchmark. Below 3x may signal spending too much on acquisition.' },
          { label: 'Best Ratio', value: highest.toFixed(2) + 'x', tint: 'text-emerald-300', info: 'Best LTV:CAC recorded.' },
          { label: 'Worst Ratio', value: lowest.toFixed(2) + 'x', tint: 'text-yellow-300', info: 'Worst LTV:CAC recorded.' },
        ],
      },
    ],
  }
}

// ─── 11. GMV ───────────────────────────────────────
export function analyzeGMV(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const first = n > 0 ? vals[0] : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const gmvCAGR = cagr(first, current, n - 1)
  const highest = n > 0 ? Math.max(...vals) : 0
  const avg = mean(vals)

  return {
    graphExplanation: 'Gross Merchandise Value: total value of goods sold on the platform.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current GMV', value: f.currency(current), highlight: true, info: 'GMV for the most recent period.' },
          { label: 'GMV Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Period-over-period GMV growth.' },
          { label: 'GMV CAGR', value: gmvCAGR !== null ? formatPct(gmvCAGR).display : '—', positive: (gmvCAGR || 0) >= 0, info: 'Compound growth rate per period.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Highest GMV Period', value: f.currency(highest), tint: 'text-emerald-300', info: 'Best GMV period recorded.' },
          { label: 'Average GMV', value: f.currency(avg), info: 'Mean GMV across all periods.' },
        ],
      },
      {
        title: 'Per-transaction (requires additional data)',
        items: [
          { label: 'GMV per Buyer', value: 'Log Buyer count separately', info: 'Compute by tracking active Buyers as a separate metric. GMV per Buyer = GMV / Active Buyers.' },
          { label: 'GMV per Transaction', value: 'Log Transactions separately', info: 'GMV per Transaction = GMV / Total Transactions.' },
        ],
      },
    ],
  }
}

// ─── 12. Transaction Volume ────────────────────────
export function analyzeTransactionVolume(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
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

  const perDay = frequency === 'monthly' ? current / 30
                : frequency === 'weekly' ? current / 7
                : frequency === 'quarterly' ? current / 90
                : frequency === 'yearly' ? current / 365
                : current

  return {
    graphExplanation: 'Number of transactions processed in each period.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Period Transactions', value: f.int(current), highlight: true, info: 'Transactions in the latest period.' },
          { label: 'Transaction Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Growth vs previous period.' },
          { label: 'Total Transactions', value: f.int(total), info: 'Cumulative transactions across all periods.' },
          { label: 'Transactions / Day', value: f.int(perDay), sub: 'Estimated', info: 'Derived from period frequency. Actual daily figures may vary.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Average per Period', value: f.int(avg), info: 'Mean transactions per recorded period.' },
          { label: 'Peak Period', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'The period with the most transactions.' },
        ],
      },
      {
        title: 'Per-customer (requires additional data)',
        items: [
          { label: 'Transactions / Customer', value: 'Log Active Customers separately', info: 'Track Active Customers as a metric to compute per-customer frequency.' },
        ],
      },
    ],
  }
}

// ─── 13. Take Rate ─────────────────────────────────
export function analyzeTakeRate(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const highest = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0

  return {
    graphExplanation: 'Percentage of GMV captured as revenue. Higher = better monetization of marketplace activity.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Take Rate', value: current.toFixed(2) + '%', highlight: true, info: 'Latest take rate percentage.', formula: 'Revenue / GMV × 100' },
          { label: 'Previous Take Rate', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Prior period take rate.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
        ],
      },
      {
        title: 'Range',
        items: [
          { label: 'Highest', value: highest.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best take rate recorded.' },
          { label: 'Lowest', value: lowest.toFixed(2) + '%', tint: 'text-yellow-300', info: 'Lowest take rate recorded.' },
          { label: 'Average', value: avg.toFixed(2) + '%', info: 'Mean take rate across periods.' },
        ],
      },
      {
        title: 'Derived (requires GMV metric)',
        items: [
          { label: 'Effective Revenue', value: 'Log GMV separately', info: 'Effective Revenue = GMV × Take Rate. Log GMV as a metric to compute this automatically.' },
        ],
      },
    ],
  }
}