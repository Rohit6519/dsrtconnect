// ═══════════════════════════════════════════════════
// USERS & GROWTH METRICS (14-23)
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, stdDev, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, forecastNext, extremePeriods,
  formatPct, sortByDate, yoyComparison,
} from './mathUtils'

// ─── 14. Total Users ───────────────────────────────
export function analyzeTotalUsers(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const first = n > 0 ? vals[0] : 0
  const netGrowth = previous !== null ? current - previous : 0
  const growthRate = previous !== null ? pctChange(current, previous) : null
  const historicalHigh = n > 0 ? Math.max(...vals) : 0
  const accel = growthAcceleration(vals)
  const trend = trendClassify(vals)

  // Average net additions per period
  const additions: number[] = []
  for (let i = 1; i < vals.length; i++) additions.push(vals[i] - vals[i - 1])
  const avgAdditions = additions.length > 0 ? mean(additions) : 0
  const totalAdded = current - first

  return {
    graphExplanation: 'Total cumulative registered users on the platform. Should trend upward over time.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Users', value: f.int(current), highlight: true, info: 'Total registered users as of the most recent period.' },
          { label: 'Net User Growth', value: (netGrowth >= 0 ? '+' : '') + f.int(Math.abs(netGrowth)), positive: netGrowth >= 0, info: 'Change in total users from the previous period to now.', formula: 'Current Users - Previous Users' },
          { label: 'New Users (this period)', value: netGrowth >= 0 ? f.int(netGrowth) : '0', info: 'Approximates new users added this period. For accurate figures, log New Signups as a separate metric.' },
          { label: 'Growth Rate', value: growthRate !== null ? formatPct(growthRate).display : '—', positive: (growthRate || 0) >= 0, info: 'Period-over-period percentage growth in users.', formula: '(Current - Previous) / Previous × 100' },
        ],
      },
      {
        title: 'Historical & Averages',
        items: [
          { label: 'Historical High', value: f.int(historicalHigh), tint: 'text-emerald-300', info: 'Peak total users ever recorded.' },
          { label: 'Avg Monthly Additions', value: (avgAdditions >= 0 ? '+' : '') + f.int(Math.round(Math.abs(avgAdditions))), positive: avgAdditions >= 0, info: 'Average number of users added per period across all data.', formula: 'Sum of period-over-period additions / Number of periods' },
          { label: 'Total Added', value: (totalAdded >= 0 ? '+' : '') + f.int(Math.abs(totalAdded)), positive: totalAdded >= 0, info: 'Total net users added since the first data point.', formula: 'Current Users - First Recorded Users' },
        ],
      },
      {
        title: 'Trend',
        items: [
          { label: 'User Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent 3-period avg growth vs prior 3-period avg growth. Positive = accelerating.', formula: 'avg(last 3 growth rates) - avg(prior 3 growth rates)' },
          { label: 'Trend Direction', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Classified as accelerating (>10% recent boost), stable, or decelerating (>10% recent decline).' },
        ],
      },
    ],
  }
}

// ─── 15. MAU — Monthly Active Users ────────────────
export function analyzeMAU(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const first = n > 0 ? vals[0] : 0
  const mom = previous !== null ? pctChange(current, previous) : null
  const yoy = yoyComparison(entries, 12)
  const peak = n > 0 ? Math.max(...vals) : 0
  const avg = mean(vals)
  const netGrowth = previous !== null ? current - previous : 0

  return {
    graphExplanation: 'Users who performed at least one action in the last 30 days. The core engagement metric.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current MAU', value: f.int(current), highlight: true, info: 'Number of unique active users in the most recent 30-day window.' },
          { label: 'MoM Growth', value: mom !== null ? formatPct(mom).display : '—', positive: (mom || 0) >= 0, info: 'Month-over-month percentage change in MAU.' },
          { label: 'YoY Growth', value: yoy.yoyGrowth !== null ? formatPct(yoy.yoyGrowth).display : '—', positive: (yoy.yoyGrowth || 0) >= 0, info: 'Year-over-year growth, comparing current MAU to MAU ~12 months ago.' },
          { label: 'Net Change', value: (netGrowth >= 0 ? '+' : '') + f.int(Math.abs(netGrowth)), positive: netGrowth >= 0, info: 'Absolute change in MAU vs the previous period.' },
        ],
      },
      {
        title: 'Composition',
        items: [
          { label: 'New Active Users', value: netGrowth > 0 ? f.int(netGrowth) + ' (est.)' : '0', info: 'Estimated as net positive movement. For accurate segmentation, track New vs Returning as separate metrics.' },
          { label: 'Returning Users', value: previous !== null ? f.int(Math.min(current, previous)) + ' (est.)' : '—', info: 'Estimated as the minimum of current and previous MAU. Accurate cohort analysis requires user-level tracking.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'MAU Peak', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest MAU ever recorded.' },
          { label: 'MAU Average', value: f.int(Math.round(avg)), info: 'Mean MAU across all periods.' },
        ],
      },
    ],
  }
}

// ─── 16. DAU — Daily Active Users ──────────────────
export function analyzeDAU(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const wow = previous !== null ? pctChange(current, previous) : null
  const growth = previous !== null ? current - previous : 0
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const vol = volatility(vals)

  return {
    graphExplanation: 'Unique users active on a single day. Watch for consistency and week-over-week trends.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current DAU', value: f.int(current), highlight: true, info: 'Unique active users on the most recent day recorded.' },
          { label: 'DAU Growth', value: (growth >= 0 ? '+' : '') + f.int(Math.abs(growth)), positive: growth >= 0, info: 'Change in DAU vs the previous data point.' },
          { label: 'Week-over-Week Change', value: wow !== null ? formatPct(wow).display : '—', positive: (wow || 0) >= 0, info: 'Percentage change vs the previous data point. If tracked weekly, this is your WoW.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'DAU Average', value: f.int(Math.round(avg)), info: 'Mean DAU across all data points recorded.' },
          { label: 'DAU Peak', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest DAU ever recorded — often correlates with a launch or campaign.' },
          { label: 'DAU Volatility', value: vol.toFixed(1) + '%', tint: vol < 15 ? 'text-emerald-300' : vol < 30 ? 'text-yellow-300' : 'text-red-400', info: 'How much DAU fluctuates day-to-day. Very high volatility may signal weekend dips or bot traffic.', formula: '(Std Dev / Mean) × 100' },
        ],
      },
    ],
  }
}

// ─── 17. WAU — Weekly Active Users ─────────────────
export function analyzeWAU(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const wow = previous !== null ? pctChange(current, previous) : null
  const growth = previous !== null ? current - previous : 0
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const vol = volatility(vals)

  return {
    graphExplanation: 'Unique users active in a 7-day window. Better than DAU for products used non-daily.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current WAU', value: f.int(current), highlight: true, info: 'Unique active users in the most recent 7-day window.' },
          { label: 'WAU Growth', value: (growth >= 0 ? '+' : '') + f.int(Math.abs(growth)), positive: growth >= 0, info: 'Change in WAU vs the previous week.' },
          { label: 'Week-over-Week Change', value: wow !== null ? formatPct(wow).display : '—', positive: (wow || 0) >= 0, info: 'Percentage change vs previous WAU value.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Average WAU', value: f.int(Math.round(avg)), info: 'Mean WAU across all periods.' },
          { label: 'Peak WAU', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest WAU ever recorded.' },
          { label: 'WAU Volatility', value: vol.toFixed(1) + '%', tint: vol < 15 ? 'text-emerald-300' : vol < 30 ? 'text-yellow-300' : 'text-red-400', info: 'How much WAU fluctuates week-to-week. Lower = more predictable usage.' },
        ],
      },
    ],
  }
}

// ─── 18. New User Signups ──────────────────────────
export function analyzeNewSignups(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const peakIdx = vals.indexOf(peak)
  const peakDate = peakIdx >= 0 ? sortByDate(entries)[peakIdx]?.date : ''
  const total = vals.reduce((s, v) => s + v, 0)
  const accel = growthAcceleration(vals)

  const daysPerPeriod = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : frequency === 'yearly' ? 365 : 30
  const avgPerDay = avg / daysPerPeriod

  return {
    graphExplanation: 'New user registrations per period. Signals top-of-funnel acquisition performance.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'New Signups (this period)', value: f.int(current), highlight: true, info: 'New user signups recorded in the most recent period.' },
          { label: 'Signup Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in signups vs previous period.' },
          { label: 'Total Signups', value: f.int(total), info: 'Cumulative signups across all recorded periods.' },
        ],
      },
      {
        title: 'Velocity & Peaks',
        items: [
          { label: 'Signup Velocity (avg)', value: f.int(Math.round(avg)) + '/' + frequency.slice(0, -2) + '.', info: 'Average signups per period across all data.' },
          { label: 'Average / Day', value: f.int(Math.round(avgPerDay)) + '/day', sub: 'Derived from frequency', info: 'Estimated daily signup rate. Actual daily figures may vary if data is aggregated.' },
          { label: 'Peak Signup Period', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'The period with the most signups ever recorded.' },
          { label: 'Signup Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = signups picking up pace.' },
        ],
      },
      {
        title: 'Acquisition Source',
        items: [
          { label: 'Signup Source Tracking', value: 'Log per source separately', info: 'For source-level analytics (organic, paid, referral), create separate metrics per channel.' },
        ],
      },
    ],
  }
}

// ─── 19. User Growth Rate ──────────────────────────
export function analyzeUserGrowthRate(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const accel = growthAcceleration(vals)
  const vol = volatility(vals)

  return {
    graphExplanation: 'Percentage user growth per period. Tracks how fast your user base is expanding.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Growth', value: current.toFixed(2) + '%', highlight: true, tint: current >= 0 ? 'text-emerald-300' : 'text-red-400', info: 'Latest user growth rate percentage.' },
          { label: 'Previous Growth', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Growth rate from the prior period.' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Average Growth', value: avg.toFixed(2) + '%', info: 'Mean user growth rate across all periods.' },
          { label: 'Peak Growth', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Highest growth rate ever recorded.' },
          { label: 'Lowest Growth', value: lowest.toFixed(2) + '%', tint: lowest < 0 ? 'text-red-400' : 'text-yellow-300', info: 'Weakest growth rate — negative means users declined.' },
          { label: 'Growth Volatility', value: vol.toFixed(1) + '%', tint: vol < 20 ? 'text-emerald-300' : vol < 50 ? 'text-yellow-300' : 'text-red-400', info: 'How much growth rate fluctuates. Stable growth = predictable business.' },
          { label: 'Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent 3-period avg vs prior 3-period avg. Positive = accelerating.' },
        ],
      },
    ],
  }
}

// ─── 20. Paying Customers ──────────────────────────
export function analyzePayingCustomers(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netAdditions = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const peak = n > 0 ? Math.max(...vals) : 0
  const first = n > 0 ? vals[0] : 0
  const totalAdded = current - first

  return {
    graphExplanation: 'Customers currently paying for the product. The most important user metric for SaaS.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Customers', value: f.int(current), highlight: true, info: 'Total paying customers as of the most recent period.' },
          { label: 'Net Additions', value: (netAdditions >= 0 ? '+' : '') + f.int(Math.abs(netAdditions)), positive: netAdditions >= 0, info: 'Net change in customer count vs previous period.', formula: 'Current Customers - Previous Customers' },
          { label: 'Customer Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage growth in paying customers.' },
        ],
      },
      {
        title: 'Composition (aggregate)',
        items: [
          { label: 'New Customers (est.)', value: netAdditions > 0 ? f.int(netAdditions) : '0', info: 'Approximates new customers this period. For accurate figures, track New Customers as a separate metric.' },
          { label: 'Churned Customers (est.)', value: netAdditions < 0 ? f.int(Math.abs(netAdditions)) : '0', tint: netAdditions < 0 ? 'text-red-400' : 'text-white/60', info: 'Estimated churned customers based on net negative movement.' },
        ],
      },
      {
        title: 'Historical',
        items: [
          { label: 'Peak Customers', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest customer count ever recorded.' },
          { label: 'Total Added Since Start', value: (totalAdded >= 0 ? '+' : '') + f.int(Math.abs(totalAdded)), positive: totalAdded >= 0, info: 'Net customers added since the first recorded data point.' },
        ],
      },
      {
        title: 'Paying Conversion',
        items: [
          { label: 'Paying Conversion Rate', value: 'Log Total Users separately', info: 'Paying Conversion = Paying Customers / Total Users. Track Total Users as a separate metric to compute this.' },
        ],
      },
    ],
  }
}

// ─── 21. Conversion Rate ───────────────────────────
export function analyzeConversion(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const vol = volatility(vals)

  const health = current >= 10 ? { label: 'Exceptional', tint: 'text-emerald-300' }
              : current >= 5 ? { label: 'Strong', tint: 'text-cyan-300' }
              : current >= 2 ? { label: 'Average', tint: 'text-white' }
              : current >= 1 ? { label: 'Below average', tint: 'text-yellow-300' }
              : { label: 'Weak', tint: 'text-red-400' }

  return {
    graphExplanation: 'Percentage of visitors or leads who convert to the next stage (signup, trial, or paid).',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Conversion', value: current.toFixed(2) + '%', highlight: true, info: 'Latest conversion rate percentage.', formula: 'Converted / Total × 100' },
          { label: 'Previous Conversion', value: previous !== null ? previous.toFixed(2) + '%' : '—', info: 'Prior period conversion.' },
          { label: 'Conversion Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Health Assessment', value: health.label, tint: health.tint, info: 'Exceptional: 10%+ · Strong: 5%+ · Average: 2%+ · Below average: 1%+ · Weak: <1%. Benchmarks vary widely by industry.' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Average Conversion', value: avg.toFixed(2) + '%', info: 'Mean conversion rate across all periods.' },
          { label: 'Best Conversion', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Peak conversion rate ever recorded.' },
          { label: 'Worst Conversion', value: lowest.toFixed(2) + '%', tint: 'text-red-400', info: 'Lowest conversion rate recorded.' },
          { label: 'Volatility', value: vol.toFixed(1) + '%', tint: vol < 15 ? 'text-emerald-300' : vol < 30 ? 'text-yellow-300' : 'text-red-400', info: 'Consistency of conversion. Stable = optimized funnel; high volatility = still testing.' },
        ],
      },
      {
        title: 'Funnel Stages',
        items: [
          { label: 'Per-stage Conversion', value: 'Log each stage separately', info: 'For funnel analysis (Visitor → Signup → Activated → Trial → Paid), create separate metrics per stage.' },
        ],
      },
    ],
  }
}

// ─── 22. Activation Rate ───────────────────────────
export function analyzeActivation(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  const health = current >= 60 ? { label: 'World-class', tint: 'text-emerald-300' }
              : current >= 40 ? { label: 'Strong', tint: 'text-cyan-300' }
              : current >= 25 ? { label: 'Healthy', tint: 'text-green-300' }
              : { label: 'Needs improvement', tint: 'text-yellow-300' }

  return {
    graphExplanation: 'Percentage of new users who reach the aha moment or first meaningful action.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Activation Rate', value: current.toFixed(2) + '%', highlight: true, info: 'Latest activation rate.', formula: 'Activated Users / New Users × 100' },
          { label: 'Activation Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Health', value: health.label, tint: health.tint, info: 'World-class: 60%+ · Strong: 40%+ · Healthy: 25%+ · Needs improvement: <25%. Depends on how "activation" is defined for your product.' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Average Activation', value: avg.toFixed(2) + '%', info: 'Mean activation rate across periods.' },
          { label: 'Peak Activation', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best activation rate recorded.' },
        ],
      },
      {
        title: 'Deeper Analysis',
        items: [
          { label: 'Time-to-Activation', value: 'Log separately', info: 'Track "Time to Activation" as a separate metric to measure how fast new users hit the aha moment.' },
          { label: 'Activation by Channel', value: 'Log per channel', info: 'Segment activation by acquisition source to identify high-quality channels.' },
          { label: 'Activation by Cohort', value: 'Log per cohort', info: 'Track activation for monthly signup cohorts to see if it improves over time.' },
        ],
      },
    ],
  }
}

// ─── 23. Referral Rate ─────────────────────────────
export function analyzeReferral(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const growth = previous !== null ? pctChange(current, previous) : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  // K-factor / viral coefficient estimation
  const kFactor = current / 100

  return {
    graphExplanation: 'Percentage of new users acquired through referrals from existing users. Signals viral potential.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Referral Rate', value: current.toFixed(2) + '%', highlight: true, info: 'Percentage of new users acquired via referrals.', formula: 'Referred Signups / Total Signups × 100' },
          { label: 'Referral Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change vs previous period.' },
          { label: 'Average Referral Rate', value: avg.toFixed(2) + '%', info: 'Mean referral rate across periods.' },
          { label: 'Peak Referral Rate', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best referral rate recorded.' },
        ],
      },
      {
        title: 'Viral Dynamics',
        items: [
          { label: 'Viral Coefficient (K)', value: kFactor.toFixed(2), tint: kFactor >= 1 ? 'text-emerald-300' : 'text-white', info: 'Approximate K-factor. K ≥ 1 = viral growth (each user brings 1+ new user). Requires exact referral count per user for accuracy.', formula: 'Referral Rate / 100' },
          { label: 'Viral Status', value: kFactor >= 1 ? 'Viral loop active' : 'Not yet viral', tint: kFactor >= 1 ? 'text-emerald-300' : 'text-yellow-300', info: 'K ≥ 1 signals compounding growth without paid acquisition.' },
        ],
      },
      {
        title: 'Deeper Tracking',
        items: [
          { label: 'Referred Users Count', value: 'Log separately', info: 'Track absolute Referred Users as a separate metric for accurate viral analysis.' },
          { label: 'Referral Conversion', value: 'Log separately', info: 'Rate at which referred visitors become signups. Track as a separate metric.' },
          { label: 'Referral Revenue Contribution', value: 'Log separately', info: 'Revenue generated by referred users. Track as a separate metric for LTV per source analysis.' },
        ],
      },
    ],
  }
}