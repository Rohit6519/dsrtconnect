'use client'

import { useState } from 'react'
import { X, MagnifyingGlass, ChartLineUp } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  slug: string
  venture: any
  onClose: () => void
  onAdded: (metric: any) => void
}

interface LibraryItem {
  name: string
  slug: string
  type: 'currency' | 'percentage' | 'number'
  unit?: string
  frequency: string
  isCustom?: boolean
}

const METRIC_LIBRARY: { category: string; items: LibraryItem[] }[] = [
  {
    category: 'Revenue & Financial',
    items: [
      { name: 'Monthly Recurring Revenue (MRR)', slug: 'mrr', type: 'currency', frequency: 'monthly' },
      { name: 'Annual Recurring Revenue (ARR)', slug: 'arr', type: 'currency', frequency: 'yearly' },
      { name: 'Total Revenue', slug: 'total-revenue', type: 'currency', frequency: 'monthly' },
      { name: 'Average Revenue Per User (ARPU)', slug: 'arpu', type: 'currency', frequency: 'monthly' },
      { name: 'Gross Margin', slug: 'gross-margin', type: 'percentage', frequency: 'quarterly' },
      { name: 'Net Profit Margin', slug: 'net-margin', type: 'percentage', frequency: 'quarterly' },
      { name: 'Burn Rate', slug: 'burn-rate', type: 'currency', frequency: 'monthly' },
      { name: 'Customer Lifetime Value (LTV)', slug: 'ltv', type: 'currency', frequency: 'quarterly' },
      { name: 'Customer Acquisition Cost (CAC)', slug: 'cac', type: 'currency', frequency: 'monthly' },
      { name: 'LTV to CAC Ratio', slug: 'ltv-cac', type: 'number', unit: 'x', frequency: 'quarterly' },
      { name: 'Gross Merchandise Value (GMV)', slug: 'gmv', type: 'currency', frequency: 'monthly' },
      { name: 'Transaction Volume', slug: 'transaction-volume', type: 'number', unit: 'txns', frequency: 'monthly' },
      { name: 'Take Rate', slug: 'take-rate', type: 'percentage', frequency: 'monthly' },
    ],
  },
  {
    category: 'Users & Growth',
    items: [
      { name: 'Total Users', slug: 'total-users', type: 'number', frequency: 'monthly' },
      { name: 'Monthly Active Users (MAU)', slug: 'mau', type: 'number', frequency: 'monthly' },
      { name: 'Daily Active Users (DAU)', slug: 'dau', type: 'number', frequency: 'weekly' },
      { name: 'Weekly Active Users (WAU)', slug: 'wau', type: 'number', frequency: 'weekly' },
      { name: 'New User Signups', slug: 'new-signups', type: 'number', frequency: 'weekly' },
      { name: 'User Growth Rate', slug: 'user-growth-rate', type: 'percentage', frequency: 'monthly' },
      { name: 'Paying Customers', slug: 'paying-customers', type: 'number', frequency: 'monthly' },
      { name: 'Conversion Rate', slug: 'conversion-rate', type: 'percentage', frequency: 'monthly' },
      { name: 'Activation Rate', slug: 'activation-rate', type: 'percentage', frequency: 'monthly' },
      { name: 'Referral Rate', slug: 'referral-rate', type: 'percentage', frequency: 'monthly' },
    ],
  },
  {
    category: 'Retention & Engagement',
    items: [
      { name: 'Churn Rate', slug: 'churn-rate', type: 'percentage', frequency: 'monthly' },
      { name: 'Net Revenue Retention (NRR)', slug: 'nrr', type: 'percentage', frequency: 'monthly' },
      { name: 'Gross Revenue Retention (GRR)', slug: 'grr', type: 'percentage', frequency: 'monthly' },
      { name: 'Customer Retention Rate', slug: 'customer-retention', type: 'percentage', frequency: 'monthly' },
      { name: 'DAU / MAU Ratio', slug: 'dau-mau-ratio', type: 'percentage', frequency: 'monthly' },
      { name: 'Session Duration', slug: 'session-duration', type: 'number', unit: 'min', frequency: 'weekly' },
      { name: 'Sessions Per User', slug: 'sessions-per-user', type: 'number', frequency: 'weekly' },
      { name: 'Net Promoter Score (NPS)', slug: 'nps', type: 'number', frequency: 'quarterly' },
    ],
  },
  {
    category: 'Sales & Pipeline',
    items: [
      { name: 'Deals Closed', slug: 'deals-closed', type: 'number', frequency: 'monthly' },
      { name: 'Pipeline Value', slug: 'pipeline-value', type: 'currency', frequency: 'monthly' },
      { name: 'Average Deal Size', slug: 'avg-deal-size', type: 'currency', frequency: 'quarterly' },
      { name: 'Sales Cycle Length', slug: 'sales-cycle', type: 'number', unit: 'days', frequency: 'quarterly' },
      { name: 'Win Rate', slug: 'win-rate', type: 'percentage', frequency: 'monthly' },
      { name: 'Contract Backlog', slug: 'contract-backlog', type: 'currency', frequency: 'quarterly' },
      { name: 'Annual Contract Value (ACV)', slug: 'acv', type: 'currency', frequency: 'quarterly' },
    ],
  },
  {
    category: 'Marketplace & Platform',
    items: [
      { name: 'Listings', slug: 'listings', type: 'number', frequency: 'monthly' },
      { name: 'Orders', slug: 'orders', type: 'number', frequency: 'monthly' },
      { name: 'Supply-Side Users', slug: 'supply-users', type: 'number', frequency: 'monthly' },
      { name: 'Demand-Side Users', slug: 'demand-users', type: 'number', frequency: 'monthly' },
      { name: 'Fill Rate', slug: 'fill-rate', type: 'percentage', frequency: 'monthly' },
      { name: 'Repeat Purchase Rate', slug: 'repeat-rate', type: 'percentage', frequency: 'monthly' },
    ],
  },
  {
    category: 'Product & Engineering',
    items: [
      { name: 'Feature Releases', slug: 'feature-releases', type: 'number', frequency: 'monthly' },
      { name: 'Bug Resolution Time', slug: 'bug-time', type: 'number', unit: 'hours', frequency: 'weekly' },
      { name: 'API Calls', slug: 'api-calls', type: 'number', frequency: 'monthly' },
      { name: 'Uptime', slug: 'uptime', type: 'percentage', frequency: 'monthly' },
      { name: 'Page Load Time', slug: 'load-time', type: 'number', unit: 'ms', frequency: 'weekly' },
      { name: 'Deployment Frequency', slug: 'deploy-freq', type: 'number', unit: '/week', frequency: 'weekly' },
    ],
  },
  {
    category: 'Impact & Physical',
    items: [
      { name: 'Units Produced', slug: 'units-produced', type: 'number', frequency: 'monthly' },
      { name: 'Payload Delivered', slug: 'payload', type: 'number', unit: 'T', frequency: 'quarterly' },
      { name: 'Flight Success Rate', slug: 'flight-success', type: 'percentage', frequency: 'quarterly' },
      { name: 'Production Rate', slug: 'production-rate', type: 'number', unit: '/month', frequency: 'monthly' },
      { name: 'Deployments', slug: 'deployments', type: 'number', frequency: 'monthly' },
      { name: 'Countries Served', slug: 'countries', type: 'number', frequency: 'quarterly' },
      { name: 'Institutions Served', slug: 'institutions', type: 'number', frequency: 'quarterly' },
      { name: 'CO₂ Reduced', slug: 'co2-reduced', type: 'number', unit: 'tonnes', frequency: 'quarterly' },
      { name: 'Lives Impacted', slug: 'lives-impacted', type: 'number', frequency: 'quarterly' },
    ],
  },
  {
    category: 'Custom',
    items: [
      { name: 'Custom Metric', slug: 'custom', type: 'number', frequency: 'monthly', isCustom: true },
    ],
  },
]

// Domain-based sort keys
const CATEGORY_PRIORITY: Record<string, string[]> = {
  'saas':        ['Revenue & Financial', 'Retention & Engagement', 'Users & Growth', 'Sales & Pipeline'],
  'fintech':     ['Revenue & Financial', 'Users & Growth', 'Retention & Engagement'],
  'marketplace': ['Marketplace & Platform', 'Revenue & Financial', 'Users & Growth'],
  'e-commerce':  ['Marketplace & Platform', 'Revenue & Financial', 'Retention & Engagement'],
  'hardware':    ['Impact & Physical', 'Revenue & Financial', 'Users & Growth'],
  'deeptech':    ['Impact & Physical', 'Product & Engineering', 'Revenue & Financial'],
  'health':      ['Impact & Physical', 'Users & Growth', 'Revenue & Financial'],
  'climate':     ['Impact & Physical', 'Revenue & Financial', 'Users & Growth'],
  'consumer':    ['Users & Growth', 'Retention & Engagement', 'Revenue & Financial'],
  'gaming':      ['Retention & Engagement', 'Users & Growth', 'Revenue & Financial'],
  'ai':          ['Product & Engineering', 'Users & Growth', 'Revenue & Financial'],
  'edtech':      ['Users & Growth', 'Retention & Engagement', 'Impact & Physical'],
}

function priorityFor(industry: string): string[] {
  const key = (industry || '').toLowerCase()
  for (const domain in CATEGORY_PRIORITY) {
    if (key.includes(domain)) return CATEGORY_PRIORITY[domain]
  }
  return ['Revenue & Financial', 'Users & Growth', 'Retention & Engagement']
}

export function AddMetricModal({ slug, venture, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LibraryItem | null>(null)
  const [customName, setCustomName] = useState('')
  const [customUnit, setCustomUnit] = useState('')
  const [customType, setCustomType] = useState<'number' | 'currency' | 'percentage'>('number')
  const [customCategory, setCustomCategory] = useState('')
  const [customTarget, setCustomTarget] = useState('')
  const [customHigherBetter, setCustomHigherBetter] = useState(true)
  const [customSource, setCustomSource] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [currency, setCurrency] = useState('USD')
  const [creating, setCreating] = useState(false)

  // Sort categories by priority for the venture's industry
  const priority = priorityFor(venture.industry || '')
  const orderedLib = [...METRIC_LIBRARY].sort((a, b) => {
    const ap = priority.indexOf(a.category)
    const bp = priority.indexOf(b.category)
    if (ap === -1 && bp === -1) return a.category.localeCompare(b.category)
    if (ap === -1) return 1
    if (bp === -1) return -1
    return ap - bp
  })

  const filteredLib = search.length >= 2
    ? orderedLib.map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      })).filter(cat => cat.items.length > 0)
    : orderedLib

  const create = async () => {
    const name = selected?.isCustom ? customName : selected?.name
    if (!name?.trim()) { toast.error('Select or name a metric'); return }

    setCreating(true)
    try {
      const body: any = {
        name: name.trim(),
        slug: selected?.isCustom ? 'custom' : selected?.slug,
        type: selected?.isCustom ? customType : selected?.type || 'number',
        unit: selected?.isCustom ? (customUnit || null) : (selected?.unit || null),
        frequency: frequency,
        currency: (selected?.isCustom ? customType : selected?.type) === 'currency' ? currency : null,
        is_public: true,
        show_on_overview: true,
        is_custom: !!selected?.isCustom,
      }
      if (selected?.isCustom) {
        if (customCategory) body.category = customCategory
        if (customTarget) body.target = parseFloat(customTarget)
        body.higher_is_better = customHigherBetter
        if (customSource) body.source = customSource
      }

      const res = await fetch('/api/ventures/' + slug + '/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const j = await res.json()
      onAdded(j.metric)
      toast.success('Metric added')
    } catch {
      toast.error('Failed to create metric')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-white">Add Growth Metric</h2>
            <p className="text-[11.5px] text-white/45 mt-0.5">
              {venture.industry ? 'Ordered for ' + venture.industry + ' companies' : 'Choose from the library or create a custom metric'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-white/[0.05] text-white/50 hover:text-white flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="relative mb-4">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search metrics... (MRR, users, churn, uptime...)"
              className="w-full pl-9 pr-3 h-10 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]"
            />
          </div>

          <div className="space-y-4">
            {filteredLib.map(cat => (
              <div key={cat.category}>
                <p className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-2">{cat.category}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {cat.items.map(item => {
                    const isSelected = selected?.slug === item.slug && selected?.name === item.name
                    return (
                      <button
                        key={item.slug + item.name}
                        onClick={() => setSelected(item)}
                        className={
                          'text-left px-3 py-2.5 rounded-lg border transition-all ' +
                          (isSelected
                            ? 'bg-white/[0.06] border-white/[0.2]'
                            : 'bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03] hover:border-white/[0.1]')
                        }
                      >
                        <p className={'text-[13px] font-semibold ' + (isSelected ? 'text-white' : 'text-white/80')}>{item.name}</p>
                        <p className="text-[10.5px] text-white/40 mt-0.5">
                          {item.type === 'currency' ? 'Currency' : item.type === 'percentage' ? 'Percentage' : 'Number'}
                          {item.unit ? ' · ' + item.unit : ''}
                          {' · ' + item.frequency}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {selected?.isCustom && (
            <div className="mt-4 space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <p className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Create Custom Metric</p>
              <div>
                <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Metric Name</label>
                <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Payload Efficiency"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Value Type</label>
                  <select value={customType} onChange={(e) => setCustomType(e.target.value as any)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-[12.5px] rounded-lg px-2.5 py-2 outline-none">
                    <option value="number" className="bg-[#12121a]">Number</option>
                    <option value="currency" className="bg-[#12121a]">Currency</option>
                    <option value="percentage" className="bg-[#12121a]">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Unit (optional)</label>
                  <input value={customUnit} onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="kg, kWh, tons..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Category (optional)</label>
                  <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Operations"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Target (optional)</label>
                  <input type="number" step="any" value={customTarget} onChange={(e) => setCustomTarget(e.target.value)}
                    placeholder="e.g. 82"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Source (optional)</label>
                <input value={customSource} onChange={(e) => setCustomSource(e.target.value)}
                  placeholder="e.g. Internal Operations, Stripe, Google Analytics"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={customHigherBetter} onChange={(e) => setCustomHigherBetter(e.target.checked)}
                  className="rounded border-white/[0.15] bg-white/[0.04]" />
                <span className="text-[12px] text-white/80">Higher values are better (unchecked = lower is better, e.g. defect rate)</span>
              </label>
            </div>
          )}

          {selected && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-[12.5px] rounded-lg px-2.5 py-2 outline-none">
                  <option value="daily" className="bg-[#12121a]">Daily</option>
                  <option value="weekly" className="bg-[#12121a]">Weekly</option>
                  <option value="monthly" className="bg-[#12121a]">Monthly</option>
                  <option value="quarterly" className="bg-[#12121a]">Quarterly</option>
                  <option value="yearly" className="bg-[#12121a]">Yearly</option>
                </select>
              </div>
              {((selected.isCustom ? customType : selected.type) === 'currency') && (
                <div>
                  <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-[12.5px] rounded-lg px-2.5 py-2 outline-none">
                    {['USD','EUR','GBP','INR','JPY','CNY','AUD','CAD','CHF','SGD','AED','BRL','KRW'].map(c =>
                      <option key={c} value={c} className="bg-[#12121a]">{c}</option>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] text-white/40">
            {selected ? '1 metric selected' : 'Select a metric to continue'}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[13px] font-semibold text-white/60 hover:text-white px-4 h-9">Cancel</button>
            <button
              onClick={create}
              disabled={!selected || creating || (selected?.isCustom && !customName.trim())}
              className="text-[13px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-40 px-4 h-9 rounded-lg flex items-center gap-1.5"
            >
              <ChartLineUp size={13} weight="regular" /> {creating ? 'Creating...' : 'Add Metric'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}