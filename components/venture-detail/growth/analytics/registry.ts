// ═══════════════════════════════════════════════════
// CENTRAL METRIC ANALYTICS REGISTRY — COMPLETE
// 59 metrics across 7 categories + custom fallback
// ═══════════════════════════════════════════════════

import { Entry } from './mathUtils'
import { Formatter, MetricAnalyticsResult, createFormatter } from './types'

// Revenue & Financial (13)
import {
  analyzeMRR, analyzeARR, analyzeTotalRevenue, analyzeARPU,
  analyzeGrossMargin, analyzeNetMargin, analyzeBurn, analyzeLTV,
  analyzeCAC, analyzeLtvCac, analyzeGMV, analyzeTransactionVolume, analyzeTakeRate,
} from './revenueFinancial'

// Users & Growth (10)
import {
  analyzeTotalUsers, analyzeMAU, analyzeDAU, analyzeWAU, analyzeNewSignups,
  analyzeUserGrowthRate, analyzePayingCustomers, analyzeConversion,
  analyzeActivation, analyzeReferral,
} from './usersGrowth'

// Retention & Engagement (8)
import {
  analyzeChurn, analyzeNRR, analyzeGRR, analyzeCustomerRetention,
  analyzeDauMau, analyzeSessionDuration, analyzeSessionsPerUser, analyzeNPS,
} from './retentionEngagement'

// Sales & Pipeline (7)
import {
  analyzeDealsClosed, analyzePipelineValue, analyzeAvgDealSize, analyzeSalesCycle,
  analyzeWinRate, analyzeBacklog, analyzeACV,
} from './salesPipeline'

// Marketplace & Platform (6)
import {
  analyzeListings, analyzeOrders, analyzeSupplyUsers, analyzeDemandUsers,
  analyzeFillRate, analyzeRepeatRate,
} from './marketplacePlatform'

// Product & Engineering (6)
import {
  analyzeFeatureReleases, analyzeBugResolution, analyzeAPICalls, analyzeUptime,
  analyzeLoadTime, analyzeDeployFreq,
} from './productEngineering'

// Impact & Physical (9)
import {
  analyzeUnitsProduced, analyzePayload, analyzeFlightSuccess, analyzeProductionRate,
  analyzeDeployments, analyzeCountriesServed, analyzeInstitutionsServed,
  analyzeCO2Reduced, analyzeLivesImpacted,
} from './impactPhysical'

// Custom
import { analyzeCustom } from './customMetric'

// Generic fallback
import { analyzeGeneric } from './generic'

type Analyzer = (entries: Entry[], f: Formatter, freq: string) => MetricAnalyticsResult

const REGISTRY: Record<string, Analyzer> = {
  // ─── Revenue & Financial (13) ───
  'mrr': (e, f) => analyzeMRR(e, f),
  'arr': (e, f) => analyzeARR(e, f),
  'total-revenue': (e, f, freq) => analyzeTotalRevenue(e, f, freq),
  'arpu': (e, f) => analyzeARPU(e, f),
  'gross-margin': (e, f) => analyzeGrossMargin(e, f),
  'net-margin': (e, f) => analyzeNetMargin(e, f),
  'burn-rate': (e, f) => analyzeBurn(e, f),
  'ltv': (e, f) => analyzeLTV(e, f),
  'cac': (e, f) => analyzeCAC(e, f),
  'ltv-cac': (e, f) => analyzeLtvCac(e, f),
  'gmv': (e, f) => analyzeGMV(e, f),
  'transaction-volume': (e, f, freq) => analyzeTransactionVolume(e, f, freq),
  'take-rate': (e, f) => analyzeTakeRate(e, f),

  // ─── Users & Growth (10) ───
  'total-users': (e, f) => analyzeTotalUsers(e, f),
  'mau': (e, f) => analyzeMAU(e, f),
  'dau': (e, f) => analyzeDAU(e, f),
  'wau': (e, f) => analyzeWAU(e, f),
  'new-signups': (e, f, freq) => analyzeNewSignups(e, f, freq),
  'user-growth-rate': (e, f) => analyzeUserGrowthRate(e, f),
  'paying-customers': (e, f) => analyzePayingCustomers(e, f),
  'conversion-rate': (e, f) => analyzeConversion(e, f),
  'activation-rate': (e, f) => analyzeActivation(e, f),
  'referral-rate': (e, f) => analyzeReferral(e, f),

  // ─── Retention & Engagement (8) ───
  'churn-rate': (e, f) => analyzeChurn(e, f),
  'nrr': (e, f) => analyzeNRR(e, f),
  'grr': (e, f) => analyzeGRR(e, f),
  'customer-retention': (e, f) => analyzeCustomerRetention(e, f),
  'dau-mau-ratio': (e, f) => analyzeDauMau(e, f),
  'session-duration': (e, f) => analyzeSessionDuration(e, f),
  'sessions-per-user': (e, f) => analyzeSessionsPerUser(e, f),
  'nps': (e, f) => analyzeNPS(e, f),

  // ─── Sales & Pipeline (7) ───
  'deals-closed': (e, f) => analyzeDealsClosed(e, f),
  'pipeline-value': (e, f) => analyzePipelineValue(e, f),
  'avg-deal-size': (e, f) => analyzeAvgDealSize(e, f),
  'sales-cycle': (e, f) => analyzeSalesCycle(e, f),
  'win-rate': (e, f) => analyzeWinRate(e, f),
  'contract-backlog': (e, f) => analyzeBacklog(e, f),
  'acv': (e, f) => analyzeACV(e, f),

  // ─── Marketplace & Platform (6) ───
  'listings': (e, f) => analyzeListings(e, f),
  'orders': (e, f, freq) => analyzeOrders(e, f, freq),
  'supply-users': (e, f) => analyzeSupplyUsers(e, f),
  'demand-users': (e, f) => analyzeDemandUsers(e, f),
  'fill-rate': (e, f) => analyzeFillRate(e, f),
  'repeat-rate': (e, f) => analyzeRepeatRate(e, f),

  // ─── Product & Engineering (6) ───
  'feature-releases': (e, f, freq) => analyzeFeatureReleases(e, f, freq),
  'bug-time': (e, f) => analyzeBugResolution(e, f),
  'api-calls': (e, f, freq) => analyzeAPICalls(e, f, freq),
  'uptime': (e, f, freq) => analyzeUptime(e, f, freq),
  'load-time': (e, f) => analyzeLoadTime(e, f),
  'deploy-freq': (e, f) => analyzeDeployFreq(e, f),

  // ─── Impact & Physical (9) ───
  'units-produced': (e, f, freq) => analyzeUnitsProduced(e, f, freq),
  'payload': (e, f) => analyzePayload(e, f),
  'flight-success': (e, f) => analyzeFlightSuccess(e, f),
  'production-rate': (e, f) => analyzeProductionRate(e, f),
  'deployments': (e, f) => analyzeDeployments(e, f),
  'countries': (e, f) => analyzeCountriesServed(e, f),
  'institutions': (e, f) => analyzeInstitutionsServed(e, f),
  'co2-reduced': (e, f) => analyzeCO2Reduced(e, f),
  'lives-impacted': (e, f) => analyzeLivesImpacted(e, f),
}

export function getMetricAnalytics(metric: any, entries: Entry[]): MetricAnalyticsResult {
  const formatter = createFormatter(metric)
  const analyzer = REGISTRY[metric.slug]
  if (analyzer) {
    return analyzer(entries, formatter, metric.frequency || 'monthly')
  }
  // Custom metric OR marked custom — use custom analyzer (handles target variance)
  if (metric.slug === 'custom' || metric.is_custom === true) {
    return analyzeCustom(entries, formatter, metric)
  }
  return analyzeGeneric(entries, formatter)
}