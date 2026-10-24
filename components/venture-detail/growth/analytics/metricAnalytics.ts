// ═══════════════════════════════════════════════════
// METRIC-SPECIFIC ANALYTICS REGISTRY
// Every metric slug maps to its own analytics profile
// ═══════════════════════════════════════════════════

export interface AnalyticItem {
  label: string
  value: string
  sub?: string
  tint?: string
  positive?: boolean
  highlight?: boolean
}

export interface AnalyticsGroup {
  title: string
  items: AnalyticItem[]
  chartType?: 'waterfall' | 'funnel' | 'cohort' | 'distribution' | 'stacked' | 'scatter' | 'timeline' | 'none'
  chartData?: any
  explanation?: string
}

export interface MetricAnalyticsResult {
  universal: AnalyticItem[]          // Always shown
  specific: AnalyticsGroup[]         // Metric-specific groups
  graphExplanation: string           // Short line under main chart
  additionalChart?: {
    type: string
    data: any
    title: string
  }
}

// ═══════════════════════════════════════════════════
// SHARED COMPUTATION HELPERS
// ═══════════════════════════════════════════════════

interface Stats {
  values: number[]
  latest: number
  prev: number | null
  first: number
  n: number
  sum: number
  avg: number
  median: number
  max: number
  min: number
  stdDev: number
  volatility: number
  periodChange: number | null
  cagr: number | null
  totalMultiplier: number | null
  bestPeriod: { idx: number; change: number } | null
  worstPeriod: { idx: number; change: number } | null
  forecast: number | null
  trend: 'accelerating' | 'stable' | 'decelerating' | null
  acceleration: number | null
}

export function computeStats(entries: any[]): Stats | null {
  if (entries.length === 0) return null
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const values = sorted.map(e => parseFloat(e.value))
  const n = values.length
  const latest = values[n - 1]
  const prev = n > 1 ? values[n - 2] : null
  const first = values[0]
  const sum = values.reduce((s, v) => s + v, 0)
  const avg = sum / n
  const sortedNum = [...values].sort((a, b) => a - b)
  const median = n % 2 === 0
    ? (sortedNum[n / 2 - 1] + sortedNum[n / 2]) / 2
    : sortedNum[Math.floor(n / 2)]
  const max = Math.max(...values)
  const min = Math.min(...values)

  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
  const stdDev = Math.sqrt(variance)
  const volatility = avg !== 0 ? (stdDev / Math.abs(avg)) * 100 : 0

  const periodChange = prev !== null && prev !== 0
    ? ((latest - prev) / Math.abs(prev)) * 100
    : null

  let cagr: number | null = null
  let totalMultiplier: number | null = null
  if (first > 0 && latest > 0 && n > 1) {
    cagr = (Math.pow(latest / first, 1 / (n - 1)) - 1) * 100
    totalMultiplier = latest / first
  }

  let bestPeriod: { idx: number; change: number } | null = null
  let worstPeriod: { idx: number; change: number } | null = null
  for (let i = 1; i < n; i++) {
    if (values[i - 1] === 0) continue
    const ch = ((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100
    if (!bestPeriod || ch > bestPeriod.change) bestPeriod = { idx: i, change: ch }
    if (!worstPeriod || ch < worstPeriod.change) worstPeriod = { idx: i, change: ch }
  }

  let forecast: number | null = null
  if (n >= 3) {
    const rates: number[] = []
    for (let i = Math.max(1, n - 3); i < n; i++) {
      if (values[i - 1] !== 0) rates.push((values[i] - values[i - 1]) / values[i - 1])
    }
    if (rates.length > 0) {
      const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length
      forecast = latest * (1 + avgRate)
    }
  }

  let trend: Stats['trend'] = null
  let acceleration: number | null = null
  if (n >= 6) {
    const recent = values.slice(-3).reduce((s, v) => s + v, 0) / 3
    const prior = values.slice(-6, -3).reduce((s, v) => s + v, 0) / 3
    const diff = prior !== 0 ? ((recent - prior) / Math.abs(prior)) * 100 : 0
    acceleration = diff
    if (diff > 10) trend = 'accelerating'
    else if (diff < -10) trend = 'decelerating'
    else trend = 'stable'
  }

  return { values, latest, prev, first, n, sum, avg, median, max, min, stdDev, volatility, periodChange, cagr, totalMultiplier, bestPeriod, worstPeriod, forecast, trend, acceleration }
}

function pct(n: number | null): { display: string; positive: boolean } {
  if (n === null) return { display: '—', positive: true }
  const positive = n >= 0
  const abs = Math.abs(n)
  if (abs >= 1000000) return { display: (positive ? '+' : '-') + '>10,000x', positive }
  if (abs >= 100000) return { display: (positive ? '+' : '-') + '>1,000x', positive }
  if (abs >= 10000) return { display: (positive ? '+' : '-') + '>100x', positive }
  if (abs >= 1000) return { display: (positive ? '+' : '-') + (abs / 100).toFixed(1) + 'x', positive }
  return { display: (positive ? '+' : '') + n.toFixed(1) + '%', positive }
}

// ═══════════════════════════════════════════════════
// GRAPH EXPLANATIONS (short one-liners under chart)
// ═══════════════════════════════════════════════════

const GRAPH_EXPLANATIONS: Record<string, string> = {
  mrr: 'Recurring subscription revenue billed monthly. Higher = better.',
  arr: 'Annualized recurring revenue. Higher = better.',
  'total-revenue': 'All revenue booked in the period. Higher = better.',
  arpu: 'Average revenue per user. Rising ARPU signals better monetization.',
  'gross-margin': 'Percentage of revenue after direct costs. Higher = healthier unit economics.',
  'net-margin': 'Bottom-line profit after all expenses. Positive = profitable.',
  'burn-rate': 'Monthly cash outflow. Lower = longer runway.',
  ltv: 'Total value of a customer over their lifetime. Higher = more valuable.',
  cac: 'Cost to acquire one paying customer. Lower = better.',
  'ltv-cac': 'Ratio of LTV to CAC. Target: 3x or higher.',
  gmv: 'Total value of transactions on the platform. Higher = growing marketplace.',
  'transaction-volume': 'Number of transactions in the period. Higher = more activity.',
  'take-rate': 'Percentage of GMV captured as revenue. Higher = better monetization.',
  'total-users': 'Total registered users on the platform.',
  mau: 'Users active at least once in the month.',
  dau: 'Users active on a given day. Watch for consistency.',
  wau: 'Users active at least once in the week.',
  'new-signups': 'New user registrations in the period.',
  'user-growth-rate': 'Percentage growth in total users.',
  'paying-customers': 'Customers currently paying for the product.',
  'conversion-rate': 'Percentage of visitors converting to signups or paid.',
  'activation-rate': 'Percentage of new users reaching the aha moment.',
  'referral-rate': 'Percentage of users acquired via referrals.',
  'churn-rate': 'Percentage of customers lost in the period. Lower = better.',
  nrr: 'Revenue retained + expanded from existing customers. >100% = growth without new sales.',
  grr: 'Revenue retained excluding expansion. Ceiling is 100%.',
  'customer-retention': 'Percentage of customers retained period-over-period.',
  'dau-mau-ratio': 'Stickiness ratio. Higher = more engaged users.',
  'session-duration': 'Average time spent per session.',
  'sessions-per-user': 'Average sessions per user in the period.',
  nps: 'Net Promoter Score. Range -100 to +100.',
  'deals-closed': 'Sales deals won in the period.',
  'pipeline-value': 'Total value of open sales opportunities.',
  'avg-deal-size': 'Average value of a closed deal.',
  'sales-cycle': 'Average days from first touch to close.',
  'win-rate': 'Percentage of qualified deals won.',
  'contract-backlog': 'Signed contracts pending revenue recognition.',
  acv: 'Annualized value of a contract.',
  listings: 'Active listings on the marketplace.',
  orders: 'Orders placed in the period.',
  'supply-users': 'Active users on the supply side of the marketplace.',
  'demand-users': 'Active users on the demand side of the marketplace.',
  'fill-rate': 'Percentage of demand matched to supply.',
  'repeat-rate': 'Percentage of customers making a second purchase.',
  'feature-releases': 'New features shipped in the period.',
  'bug-time': 'Average time to resolve reported bugs.',
  'api-calls': 'API requests handled in the period.',
  uptime: 'Percentage of time the service was available.',
  'load-time': 'Average page or app load time.',
  'deploy-freq': 'How often new code is deployed to production.',
  'units-produced': 'Physical units manufactured in the period.',
  payload: 'Total payload delivered across missions.',
  'flight-success': 'Percentage of missions completed successfully.',
  'production-rate': 'Units produced per time period.',
  deployments: 'Total installations or rollouts.',
  countries: 'Countries where the product operates.',
  institutions: 'Institutions using the product.',
  'co2-reduced': 'Cumulative CO2 emissions avoided.',
  'lives-impacted': 'People whose lives have been directly affected.',
}

// ═══════════════════════════════════════════════════
// MAIN ANALYTICS FUNCTION
// ═══════════════════════════════════════════════════

export function analyzeMetric(
  metric: any,
  entries: any[],
  formatVal: (v: number, opts?: any) => string
): MetricAnalyticsResult {
  const stats = computeStats(entries)
  const graphExplanation = GRAPH_EXPLANATIONS[metric.slug] || 'Values tracked over time. Hover for details.'

  if (!stats) {
    return {
      universal: [],
      specific: [],
      graphExplanation,
    }
  }

  // ─────────────────────────────────────────────
  // UNIVERSAL ANALYTICS (every metric)
  // ─────────────────────────────────────────────
  const universal: AnalyticItem[] = [
    { label: 'CURRENT', value: formatVal(stats.latest), highlight: true },
    { label: 'PREVIOUS', value: stats.prev !== null ? formatVal(stats.prev) : '—' },
  ]

  if (stats.periodChange !== null) {
    const p = pct(stats.periodChange)
    universal.push({ label: 'CHANGE', value: p.display, positive: p.positive })
  }

  if (stats.cagr !== null) {
    const p = pct(stats.cagr)
    universal.push({
      label: metric.frequency === 'yearly' ? 'CAGR' : 'AVG GROWTH',
      value: p.display, positive: p.positive
    })
  }

  if (stats.totalMultiplier !== null && stats.n > 2) {
    universal.push({
      label: 'OVERALL',
      value: stats.totalMultiplier >= 2 ? stats.totalMultiplier.toFixed(1) + 'x' : pct((stats.totalMultiplier - 1) * 100).display,
      positive: stats.totalMultiplier >= 1,
      sub: 'From ' + formatVal(stats.first),
    })
  }

  universal.push({ label: 'PEAK', value: formatVal(stats.max) })
  universal.push({ label: 'LOW', value: formatVal(stats.min) })
  universal.push({ label: 'AVERAGE', value: formatVal(Math.round(stats.avg * 100) / 100) })
  universal.push({ label: 'DATA POINTS', value: stats.n.toString() })

  // ─────────────────────────────────────────────
  // METRIC-SPECIFIC ANALYTICS
  // ─────────────────────────────────────────────
  const specific: AnalyticsGroup[] = []

  // === REVENUE METRICS ===
  if (['mrr', 'arr'].includes(metric.slug)) {
    const netGrowth = stats.prev !== null ? stats.latest - stats.prev : 0
    specific.push({
      title: 'Revenue Movement',
      items: [
        { label: 'Net Growth', value: (netGrowth >= 0 ? '+' : '') + formatVal(netGrowth), positive: netGrowth >= 0 },
        { label: 'Growth Acceleration', value: stats.acceleration !== null ? pct(stats.acceleration).display : '—', positive: (stats.acceleration || 0) >= 0 },
        { label: 'Revenue Volatility', value: stats.volatility.toFixed(1) + '%', tint: stats.volatility < 20 ? 'text-emerald-300' : stats.volatility < 50 ? 'text-yellow-300' : 'text-red-400' },
        { label: 'Forecast Next', value: stats.forecast !== null ? formatVal(Math.round(stats.forecast)) : '—', tint: 'text-cyan-300' },
      ],
    })
  }

  if (metric.slug === 'burn-rate') {
    specific.push({
      title: 'Runway Analysis',
      items: [
        { label: 'Current Burn', value: formatVal(stats.latest) + '/mo' },
        { label: 'Avg Monthly Burn', value: formatVal(Math.round(stats.avg)) },
        { label: 'Peak Burn', value: formatVal(stats.max), tint: 'text-red-400' },
        { label: 'Volatility', value: stats.volatility.toFixed(1) + '%' },
      ],
    })
  }

  if (metric.slug === 'ltv-cac') {
    const health = stats.latest >= 3 ? { label: 'Healthy', tint: 'text-emerald-300' }
                : stats.latest >= 1 ? { label: 'Break-even', tint: 'text-yellow-300' }
                : { label: 'Unhealthy', tint: 'text-red-400' }
    specific.push({
      title: 'Unit Economics',
      items: [
        { label: 'Current Ratio', value: stats.latest.toFixed(2) + 'x' },
        { label: 'Health Status', value: health.label, tint: health.tint },
        { label: 'Target', value: '3.0x or higher', sub: 'Industry benchmark' },
        { label: 'Trend', value: stats.periodChange !== null ? pct(stats.periodChange).display : '—', positive: (stats.periodChange || 0) >= 0 },
      ],
    })
  }

  // === USER METRICS ===
  if (['total-users', 'mau', 'dau', 'wau', 'paying-customers'].includes(metric.slug)) {
    const newUsers = stats.prev !== null ? stats.latest - stats.prev : 0
    specific.push({
      title: 'Growth Dynamics',
      items: [
        { label: 'Net New Users', value: (newUsers >= 0 ? '+' : '') + formatVal(Math.abs(newUsers)), positive: newUsers >= 0 },
        { label: 'Avg Monthly Growth', value: stats.cagr !== null ? pct(stats.cagr).display : '—', positive: (stats.cagr || 0) >= 0 },
        { label: 'Peak Users', value: formatVal(stats.max), tint: 'text-cyan-300' },
        { label: 'Trend Direction', value: stats.trend || 'insufficient data', tint: stats.trend === 'accelerating' ? 'text-emerald-300' : stats.trend === 'decelerating' ? 'text-yellow-300' : 'text-white/70' },
      ],
    })
  }

  if (metric.slug === 'dau-mau-ratio') {
    const stickiness = stats.latest >= 50 ? { label: 'Exceptional', tint: 'text-emerald-300' }
                    : stats.latest >= 20 ? { label: 'Strong', tint: 'text-cyan-300' }
                    : stats.latest >= 10 ? { label: 'Moderate', tint: 'text-yellow-300' }
                    : { label: 'Low', tint: 'text-red-400' }
    specific.push({
      title: 'Engagement Depth',
      items: [
        { label: 'Stickiness', value: stickiness.label, tint: stickiness.tint },
        { label: 'Interpretation', value: stats.latest.toFixed(1) + '% of monthly users are daily' },
        { label: 'Target', value: '20%+ (strong)', sub: 'Benchmark for consumer apps' },
      ],
    })
  }

  // === RETENTION METRICS ===
  if (metric.slug === 'churn-rate') {
    const churnHealth = stats.latest < 5 ? { label: 'Excellent', tint: 'text-emerald-300' }
                      : stats.latest < 10 ? { label: 'Healthy', tint: 'text-cyan-300' }
                      : stats.latest < 20 ? { label: 'Concerning', tint: 'text-yellow-300' }
                      : { label: 'Critical', tint: 'text-red-400' }
    const impliedRetention = 100 - stats.latest
    specific.push({
      title: 'Churn Health',
      items: [
        { label: 'Current Churn', value: stats.latest.toFixed(2) + '%' },
        { label: 'Health Status', value: churnHealth.label, tint: churnHealth.tint },
        { label: 'Implied Retention', value: impliedRetention.toFixed(1) + '%' },
        { label: 'Trend', value: stats.periodChange !== null ? pct(stats.periodChange).display : '—', positive: (stats.periodChange || 0) < 0 },
      ],
    })
  }

  if (metric.slug === 'nrr') {
    const nrrHealth = stats.latest >= 120 ? { label: 'World-class', tint: 'text-emerald-300' }
                    : stats.latest >= 110 ? { label: 'Excellent', tint: 'text-cyan-300' }
                    : stats.latest >= 100 ? { label: 'Healthy', tint: 'text-green-300' }
                    : { label: 'Below Break-even', tint: 'text-red-400' }
    specific.push({
      title: 'Revenue Retention',
      items: [
        { label: 'Current NRR', value: stats.latest.toFixed(1) + '%' },
        { label: 'Assessment', value: nrrHealth.label, tint: nrrHealth.tint },
        { label: 'Above 100%?', value: stats.latest >= 100 ? 'Yes — net expansion' : 'No — net contraction', tint: stats.latest >= 100 ? 'text-emerald-300' : 'text-red-400' },
        { label: 'Target', value: '110%+ for SaaS' },
      ],
    })
  }

  if (metric.slug === 'nps') {
    const npsHealth = stats.latest >= 70 ? { label: 'World-class', tint: 'text-emerald-300' }
                    : stats.latest >= 50 ? { label: 'Excellent', tint: 'text-cyan-300' }
                    : stats.latest >= 30 ? { label: 'Great', tint: 'text-green-300' }
                    : stats.latest >= 0 ? { label: 'Needs Improvement', tint: 'text-yellow-300' }
                    : { label: 'Critical', tint: 'text-red-400' }
    specific.push({
      title: 'Customer Sentiment',
      items: [
        { label: 'NPS Score', value: stats.latest.toFixed(0) },
        { label: 'Assessment', value: npsHealth.label, tint: npsHealth.tint },
        { label: 'Change', value: stats.periodChange !== null ? (stats.periodChange >= 0 ? '+' : '') + stats.periodChange.toFixed(1) : '—', positive: (stats.periodChange || 0) >= 0 },
        { label: 'Range', value: '-100 to +100' },
      ],
    })
  }

  // === SALES METRICS ===
  if (metric.slug === 'win-rate') {
    const winHealth = stats.latest >= 30 ? { label: 'Strong', tint: 'text-emerald-300' }
                    : stats.latest >= 20 ? { label: 'Healthy', tint: 'text-cyan-300' }
                    : { label: 'Needs Work', tint: 'text-yellow-300' }
    specific.push({
      title: 'Sales Performance',
      items: [
        { label: 'Current Win Rate', value: stats.latest.toFixed(1) + '%' },
        { label: 'Assessment', value: winHealth.label, tint: winHealth.tint },
        { label: 'Best Period', value: stats.max.toFixed(1) + '%' },
        { label: 'Consistency', value: stats.volatility < 20 ? 'Stable' : 'Variable', tint: stats.volatility < 20 ? 'text-emerald-300' : 'text-yellow-300' },
      ],
    })
  }

  if (metric.slug === 'sales-cycle') {
    specific.push({
      title: 'Sales Velocity',
      items: [
        { label: 'Median Days', value: stats.median.toFixed(0) + ' days' },
        { label: 'Shortest', value: stats.min.toFixed(0) + ' days', tint: 'text-emerald-300' },
        { label: 'Longest', value: stats.max.toFixed(0) + ' days', tint: 'text-red-400' },
        { label: 'Trend', value: stats.periodChange !== null ? pct(stats.periodChange).display : '—', positive: (stats.periodChange || 0) < 0, sub: 'Lower = faster' },
      ],
    })
  }

  // === PRODUCT METRICS ===
  if (metric.slug === 'uptime') {
    const uptimeHealth = stats.latest >= 99.95 ? { label: 'Four 9s', tint: 'text-emerald-300' }
                       : stats.latest >= 99.9 ? { label: 'Three 9s', tint: 'text-cyan-300' }
                       : stats.latest >= 99 ? { label: 'Two 9s', tint: 'text-yellow-300' }
                       : { label: 'Below SLA', tint: 'text-red-400' }
    const downtimeMin = (100 - stats.latest) * 43200 / 100 // approx per month
    specific.push({
      title: 'Reliability',
      items: [
        { label: 'Current Uptime', value: stats.latest.toFixed(3) + '%' },
        { label: 'Tier', value: uptimeHealth.label, tint: uptimeHealth.tint },
        { label: 'Monthly Downtime', value: '~' + downtimeMin.toFixed(0) + ' min' },
        { label: 'Worst Period', value: stats.min.toFixed(3) + '%', tint: 'text-red-400' },
      ],
    })
  }

  // === PHYSICAL METRICS ===
  if (metric.slug === 'flight-success') {
    const flights = stats.n
    const successRate = stats.latest
    const successCount = Math.round((successRate / 100) * flights)
    const failCount = flights - successCount
    specific.push({
      title: 'Mission Reliability',
      items: [
        { label: 'Success Rate', value: successRate.toFixed(1) + '%', tint: successRate >= 90 ? 'text-emerald-300' : successRate >= 70 ? 'text-yellow-300' : 'text-red-400' },
        { label: 'Recorded Missions', value: flights.toString() },
        { label: 'Best Period', value: stats.max.toFixed(1) + '%', tint: 'text-emerald-300' },
        { label: 'Trend', value: stats.trend || '—', tint: stats.trend === 'accelerating' ? 'text-emerald-300' : 'text-white/70' },
      ],
    })
  }

  if (metric.slug === 'production-rate') {
    specific.push({
      title: 'Production Analysis',
      items: [
        { label: 'Current Rate', value: formatVal(stats.latest) + (metric.unit ? ' ' + metric.unit : '') },
        { label: 'Peak Capacity', value: formatVal(stats.max) },
        { label: 'Utilization', value: ((stats.latest / stats.max) * 100).toFixed(1) + '%' },
        { label: 'Trend', value: stats.trend || '—', tint: stats.trend === 'accelerating' ? 'text-emerald-300' : 'text-white/70' },
      ],
    })
  }

  // === UNIVERSAL: Best/Worst period + Volatility for ALL metrics ===
  const advancedItems: AnalyticItem[] = []

  if (stats.bestPeriod && entries[stats.bestPeriod.idx]) {
    advancedItems.push({
      label: 'Best Period',
      value: pct(stats.bestPeriod.change).display,
      sub: entries[stats.bestPeriod.idx].date,
      tint: 'text-emerald-300',
    })
  }

  if (stats.worstPeriod && entries[stats.worstPeriod.idx] && stats.worstPeriod.change < 0) {
    advancedItems.push({
      label: 'Worst Period',
      value: pct(stats.worstPeriod.change).display,
      sub: entries[stats.worstPeriod.idx].date,
      tint: 'text-red-400',
    })
  }

  advancedItems.push({
    label: 'Volatility',
    value: stats.volatility.toFixed(1) + '%',
    sub: stats.volatility < 20 ? 'Very stable' : stats.volatility < 50 ? 'Moderate' : 'High variance',
    tint: stats.volatility < 20 ? 'text-emerald-300' : stats.volatility < 50 ? 'text-yellow-300' : 'text-red-400',
  })

  advancedItems.push({
    label: 'Median',
    value: formatVal(stats.median),
    sub: 'Middle value',
  })

  advancedItems.push({
    label: 'Std Deviation',
    value: formatVal(Math.round(stats.stdDev * 100) / 100),
    sub: 'Spread from average',
  })

  if (advancedItems.length > 0) {
    specific.push({
      title: 'Advanced Statistics',
      items: advancedItems,
    })
  }

  return {
    universal,
    specific,
    graphExplanation,
  }
}