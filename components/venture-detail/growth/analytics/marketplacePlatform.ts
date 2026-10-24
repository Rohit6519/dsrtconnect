// ═══════════════════════════════════════════════════
// MARKETPLACE & PLATFORM METRICS (39-44)
// ═══════════════════════════════════════════════════

import { Formatter, MetricAnalyticsResult } from './types'
import {
  Entry, values, mean, median, volatility, pctChange, cagr,
  growthAcceleration, trendClassify, formatPct, sortByDate,
} from './mathUtils'

// ─── 39. Listings ──────────────────────────────────
export function analyzeListings(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netChange = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const peak = n > 0 ? Math.max(...vals) : 0
  const first = n > 0 ? vals[0] : 0
  const totalAdded = current - first

  // Listing velocity = avg additions per period
  const additions: number[] = []
  for (let i = 1; i < vals.length; i++) additions.push(vals[i] - vals[i - 1])
  const avgVelocity = additions.length > 0 ? mean(additions) : 0

  return {
    graphExplanation: 'Active listings on the marketplace. Supply-side inventory health.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Active Listings', value: f.int(current), highlight: true, info: 'Total active listings on the platform as of the most recent period.' },
          { label: 'Net Change', value: (netChange >= 0 ? '+' : '') + f.int(Math.abs(netChange)), positive: netChange >= 0, info: 'Absolute change in active listings vs previous period.' },
          { label: 'Listing Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in listings vs previous period.' },
          { label: 'Peak Listings', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest listing count ever recorded.' },
        ],
      },
      {
        title: 'Velocity',
        items: [
          { label: 'Listing Velocity (avg)', value: (avgVelocity >= 0 ? '+' : '') + f.int(Math.round(Math.abs(avgVelocity))) + ' / period', positive: avgVelocity >= 0, info: 'Average net listings added per period. Positive = supply growing.', formula: 'Sum of period-over-period changes / periods' },
          { label: 'Total Added Since Start', value: (totalAdded >= 0 ? '+' : '') + f.int(Math.abs(totalAdded)), positive: totalAdded >= 0, info: 'Net listings added from the first data point to now.' },
        ],
      },
      {
        title: 'Flow (log separately)',
        items: [
          { label: 'New Listings (this period)', value: netChange > 0 ? f.int(netChange) : '0 (est.)', info: 'Estimated as net positive movement. For accurate figures, track "New Listings" as a separate metric.' },
          { label: 'Removed Listings', value: netChange < 0 ? f.int(Math.abs(netChange)) : '0 (est.)', tint: netChange < 0 ? 'text-red-400' : 'text-white/60', info: 'Estimated from net negative movement. Track "Removed Listings" separately for accurate churn.' },
          { label: 'Listings per Seller', value: 'Log Sellers separately', info: 'Track "Active Sellers" as a separate metric to compute average listings per seller.' },
        ],
      },
    ],
  }
}

// ─── 40. Orders ────────────────────────────────────
export function analyzeOrders(entries: Entry[], f: Formatter, frequency: string): MetricAnalyticsResult {
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
  const avgPerDay = avg / daysPerPeriod

  return {
    graphExplanation: 'Orders placed on the platform. Direct demand-side activity measure.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Orders (this period)', value: f.int(current), highlight: true, info: 'Total orders placed in the most recent period.' },
          { label: 'Order Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in orders vs previous period.' },
          { label: 'Total Orders', value: f.int(total), info: 'Cumulative orders across all recorded periods.' },
          { label: 'Order Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = order pace is increasing.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Average per Period', value: f.int(Math.round(avg)), info: 'Mean orders per period across all data.' },
          { label: 'Estimated per Day', value: f.int(Math.round(avgPerDay)) + '/day', sub: 'Derived from frequency', info: 'Estimated daily order rate. Actual daily figures may vary if data is aggregated.' },
          { label: 'Peak Period', value: f.int(peak), sub: peakDate, tint: 'text-emerald-300', info: 'The period with the most orders ever placed.' },
        ],
      },
      {
        title: 'Per-customer Analysis (log separately)',
        items: [
          { label: 'Orders / Customer', value: 'Log Customers separately', info: 'Track "Active Customers" as a separate metric to compute average orders per customer.' },
          { label: 'Order Frequency', value: 'Log frequency separately', info: 'Track "Repeat Purchase Rate" or "Orders per Customer per Month" for retention insight.' },
          { label: 'Repeat Orders', value: 'Log separately', info: 'Track "Repeat Orders" (2nd+ orders from a customer) separately for loyalty analysis.' },
        ],
      },
    ],
  }
}

// ─── 41. Supply-Side Users ─────────────────────────
export function analyzeSupplyUsers(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netAdded = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const peak = n > 0 ? Math.max(...vals) : 0
  const avg = mean(vals)
  const accel = growthAcceleration(vals)

  return {
    graphExplanation: 'Active suppliers on the marketplace (sellers, drivers, hosts, etc.). Supply side of the network.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Active Suppliers', value: f.int(current), highlight: true, info: 'Total active supply-side users as of the most recent period.' },
          { label: 'Net Added', value: (netAdded >= 0 ? '+' : '') + f.int(Math.abs(netAdded)), positive: netAdded >= 0, info: 'Absolute change vs previous period.' },
          { label: 'Supplier Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in supplier count vs previous period.' },
          { label: 'Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent 3-period avg growth vs prior 3-period avg growth.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Peak Suppliers', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest supplier count ever recorded.' },
          { label: 'Average', value: f.int(Math.round(avg)), info: 'Mean supplier count across all periods.' },
        ],
      },
      {
        title: 'Health (log separately)',
        items: [
          { label: 'New Suppliers', value: netAdded > 0 ? f.int(netAdded) : '0 (est.)', info: 'Estimated as net positive movement. Track "New Suppliers" as a separate metric for exact acquisition tracking.' },
          { label: 'Supplier Retention', value: 'Log separately', info: 'Track "Supplier Retention Rate" as a separate metric for cohort analysis.' },
          { label: 'Supplier Activity', value: 'Log per supplier', info: 'Track supplier activity metrics (listings/supplier, transactions/supplier) separately.' },
        ],
      },
    ],
  }
}

// ─── 42. Demand-Side Users ─────────────────────────
export function analyzeDemandUsers(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const netAdded = previous !== null ? current - previous : 0
  const growth = previous !== null ? pctChange(current, previous) : null
  const peak = n > 0 ? Math.max(...vals) : 0
  const avg = mean(vals)
  const accel = growthAcceleration(vals)

  return {
    graphExplanation: 'Active buyers on the marketplace. Demand side of the two-sided network.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Active Buyers', value: f.int(current), highlight: true, info: 'Total active demand-side users as of the most recent period.' },
          { label: 'Net Added', value: (netAdded >= 0 ? '+' : '') + f.int(Math.abs(netAdded)), positive: netAdded >= 0, info: 'Absolute change vs previous period.' },
          { label: 'Buyer Growth', value: growth !== null ? formatPct(growth).display : '—', positive: (growth || 0) >= 0, info: 'Percentage change in buyer count vs previous period.' },
          { label: 'Growth Acceleration', value: accel !== null ? formatPct(accel).display : '—', positive: (accel || 0) >= 0, info: 'Recent avg growth vs prior avg growth. Positive = buyer acquisition accelerating.' },
        ],
      },
      {
        title: 'Peaks & Averages',
        items: [
          { label: 'Peak Buyers', value: f.int(peak), tint: 'text-emerald-300', info: 'Highest buyer count ever recorded.' },
          { label: 'Average', value: f.int(Math.round(avg)), info: 'Mean buyer count across all periods.' },
        ],
      },
      {
        title: 'Health (log separately)',
        items: [
          { label: 'New Buyers', value: netAdded > 0 ? f.int(netAdded) : '0 (est.)', info: 'Estimated as net positive movement. Track "New Buyers" separately for exact figures.' },
          { label: 'Buyer Retention', value: 'Log separately', info: 'Track "Buyer Retention Rate" as a separate metric for cohort analysis.' },
          { label: 'Buyer Activity', value: 'Log per buyer', info: 'Track buyer activity (orders/buyer, spend/buyer) as separate metrics.' },
          { label: 'Supply / Demand Ratio', value: 'Compute externally', info: 'Compare Supply-Side vs Demand-Side users to assess marketplace balance. Log both metrics.' },
        ],
      },
    ],
  }
}

// ─── 43. Fill Rate ─────────────────────────────────
export function analyzeFillRate(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0
  const lowest = n > 0 ? Math.min(...vals) : 0
  const trend = trendClassify(vals)
  const unfilled = 100 - current

  const health = current >= 95 ? { label: 'Excellent supply', tint: 'text-emerald-300' }
              : current >= 85 ? { label: 'Healthy match', tint: 'text-cyan-300' }
              : current >= 70 ? { label: 'Moderate — some gap', tint: 'text-yellow-300' }
              : { label: 'Supply shortage', tint: 'text-red-400' }

  return {
    graphExplanation: 'Percentage of demand successfully matched to supply. Measures marketplace liquidity.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Fill Rate', value: current.toFixed(2) + '%', highlight: true, tint: health.tint, info: 'Percentage of demand successfully fulfilled.', formula: 'Filled Demand / Total Demand × 100' },
          { label: 'Unfilled Demand', value: unfilled.toFixed(2) + '%', tint: unfilled > 15 ? 'text-red-400' : 'text-yellow-300', info: 'Percentage of demand that went unmet. Represents lost opportunity.', formula: '100 - Fill Rate' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Health Assessment', value: health.label, tint: health.tint, info: 'Excellent: 95%+ · Healthy: 85%+ · Moderate: 70%+ · Supply shortage: <70%' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Average Fill Rate', value: avg.toFixed(2) + '%', info: 'Mean fill rate across all periods.' },
          { label: 'Peak Fill Rate', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best fill rate ever recorded.' },
          { label: 'Lowest Fill Rate', value: lowest.toFixed(2) + '%', tint: 'text-red-400', info: 'Worst fill rate recorded — indicates historical supply crunch.' },
          { label: 'Fill Rate Trend', value: trend || 'insufficient data', tint: trend === 'accelerating' ? 'text-emerald-300' : trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70', info: 'Direction based on recent vs prior periods.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: 'Time-to-Fill', value: 'Log separately', info: 'Track "Time to Fill" (hours or minutes) as a separate metric. Lower = better marketplace liquidity.' },
          { label: 'Fill Rate by Category', value: 'Log per category', info: 'Track fill rates per product/service category separately to identify supply gaps.' },
        ],
      },
    ],
  }
}

// ─── 44. Repeat Purchase Rate ──────────────────────
export function analyzeRepeatRate(entries: Entry[], f: Formatter): MetricAnalyticsResult {
  const vals = values(entries)
  const n = vals.length
  const current = n > 0 ? vals[n - 1] : 0
  const previous = n > 1 ? vals[n - 2] : null
  const change = previous !== null ? current - previous : null
  const avg = mean(vals)
  const peak = n > 0 ? Math.max(...vals) : 0

  const health = current >= 60 ? { label: 'Elite loyalty', tint: 'text-emerald-300' }
              : current >= 40 ? { label: 'Strong', tint: 'text-cyan-300' }
              : current >= 25 ? { label: 'Healthy', tint: 'text-green-300' }
              : current >= 15 ? { label: 'Needs work', tint: 'text-yellow-300' }
              : { label: 'Weak — mostly one-time buyers', tint: 'text-red-400' }

  return {
    graphExplanation: 'Percentage of customers making a second (or more) purchase. Signals repeat business quality.',
    groups: [
      {
        title: 'Core',
        items: [
          { label: 'Current Repeat Rate', value: current.toFixed(2) + '%', highlight: true, tint: health.tint, info: 'Percentage of customers who made at least a second purchase.', formula: 'Repeat Customers / Total Customers × 100' },
          { label: 'Change', value: change !== null ? (change >= 0 ? '+' : '') + change.toFixed(2) + ' pp' : '—', positive: (change || 0) >= 0, info: 'Percentage-point change vs previous period.' },
          { label: 'Assessment', value: health.label, tint: health.tint, info: 'Elite: 60%+ · Strong: 40%+ · Healthy: 25%+ · Needs work: 15%+ · Weak: <15%. Benchmarks vary by product category.' },
        ],
      },
      {
        title: 'Statistics',
        items: [
          { label: 'Average Repeat Rate', value: avg.toFixed(2) + '%', info: 'Mean repeat rate across periods.' },
          { label: 'Peak Repeat Rate', value: peak.toFixed(2) + '%', tint: 'text-emerald-300', info: 'Best repeat rate ever recorded.' },
        ],
      },
      {
        title: 'Deeper Analysis (log separately)',
        items: [
          { label: '1st → 2nd Purchase Conversion', value: 'Log separately', info: 'Track "1st to 2nd Purchase %" as a separate metric — the most critical conversion for repeat business.' },
          { label: 'Repeat Purchase Frequency', value: 'Log separately', info: 'Track average orders per repeat customer over time.' },
          { label: 'Cohort Repeat Rate', value: 'Log per cohort', info: 'Track repeat rate for each monthly acquisition cohort separately for retention analysis.' },
          { label: 'Repeat Revenue Contribution', value: 'Log separately', info: 'Track "% Revenue from Repeat Customers" — indicates business dependence on loyalty vs new acquisition.' },
        ],
      },
    ],
  }
}