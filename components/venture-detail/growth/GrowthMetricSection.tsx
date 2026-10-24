'use client'

import { useState, useMemo, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  Plus, Trash, PencilSimple, Check, X, Warning, TrendUp, TrendDown,
  TextB, TextItalic, TextUnderline, Link as LinkIcon, ListBullets, ListNumbers, Quotes,
  Code, TextH, Eye, TextAa, CaretDown,
  Info as InfoIcon, ChartBar, ListDashes, PlusCircle, MagnifyingGlass
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { getMetricAnalytics } from './analytics/registry'
import { AnalyticItem, AnalyticsGroup } from './analytics/types'
import { InfoTooltip } from './analytics/InfoTooltip'

interface Props {
  metric: any
  slug: string
  isOwner: boolean
  onDelete: () => void
  onRefresh: () => void
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9', JPY: '\u00A5',
  CNY: '\u00A5', AUD: 'A$', CAD: 'C$', CHF: 'CHF', SGD: 'S$',
  AED: 'AED', BRL: 'R$', KRW: '\u20A9',
}

const GRADIENT_COLORS = [
  { id: 'grad_green', stroke: '#10b981', fill: '#10b981' },
  { id: 'grad_blue',  stroke: '#3b82f6', fill: '#3b82f6' },
  { id: 'grad_purple',stroke: '#8b5cf6', fill: '#8b5cf6' },
  { id: 'grad_cyan',  stroke: '#06b6d4', fill: '#06b6d4' },
]

const TEXT_SIZES = [
  { key: 'small',  label: 'Small',   md: '`SMALL`',  size: '12px' },
  { key: 'normal', label: 'Normal',  md: '',         size: '14px' },
  { key: 'large',  label: 'Large',   md: '### ',     size: '18px' },
  { key: 'xlarge', label: 'X-Large', md: '## ',      size: '22px' },
  { key: 'title',  label: 'Title',   md: '# ',       size: '28px' },
]

type TabId = 'details' | 'analytics' | 'entries' | 'add'

export function GrowthMetricSection({ metric, slug, isOwner, onDelete }: Props) {
  const [entries, setEntries] = useState<any[]>(metric.venture_metric_entries || [])
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [entrySearch, setEntrySearch] = useState('')

  const gradIdx = useMemo(() => Math.abs((metric.name || '').charCodeAt(0)) % GRADIENT_COLORS.length, [metric.name])
  const grad = GRADIENT_COLORS[gradIdx]
  const currSymbol = metric.currency ? (CURRENCY_SYMBOLS[metric.currency] || metric.currency + ' ') : ''

  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  )

  const chartData = useMemo(() => {
    return sortedEntries.map(e => ({
      date: e.date,
      value: parseFloat(e.value),
      label: formatDate(e.date, metric.frequency),
    }))
  }, [sortedEntries, metric.frequency])

  const formatVal = (v: number, opts?: { compact?: boolean }) => {
    const compact = opts?.compact !== false
    if (metric.type === 'percentage') return v.toFixed(1) + '%'
    if (metric.type === 'currency') {
      if (compact && v >= 1000000000) return currSymbol + (v / 1000000000).toFixed(2) + 'B'
      if (compact && v >= 1000000) return currSymbol + (v / 1000000).toFixed(2) + 'M'
      if (compact && v >= 1000) return currSymbol + (v / 1000).toFixed(1) + 'K'
      return currSymbol + v.toLocaleString()
    }
    if (compact && v >= 1000000000) return (v / 1000000000).toFixed(2) + 'B'
    if (compact && v >= 1000000) return (v / 1000000).toFixed(2) + 'M'
    if (compact && v >= 1000) return (v / 1000).toFixed(1) + 'K'
    return v.toLocaleString()
  }

  const analytics = useMemo(() =>
    getMetricAnalytics(metric, sortedEntries),
    [metric, sortedEntries]
  )

  const avg = sortedEntries.length > 0
    ? sortedEntries.reduce((s, e) => s + parseFloat(e.value), 0) / sortedEntries.length
    : 0
  const max = sortedEntries.length > 0 ? Math.max(...sortedEntries.map(e => parseFloat(e.value))) : 0

  // API operations
  const addEntry = async (payload: { date: string; value: number; note?: string }) => {
    try {
      const res = await fetch('/api/ventures/' + slug + '/growth/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric_id: metric.id, venture_id: metric.venture_id, ...payload }),
      })
      if (!res.ok) throw new Error()
      const j = await res.json()
      setEntries(prev => [...prev, j.entry])
      toast.success('Data point added')
      return true
    } catch { toast.error('Failed to save'); return false }
  }

  const deleteEntry = async (id: string) => {
    try {
      await fetch('/api/ventures/' + slug + '/growth/entries?id=' + id, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Entry removed')
    } catch { toast.error('Failed') }
  }

  const updateEntry = async (id: string, patch: any) => {
    try {
      const res = await fetch('/api/ventures/' + slug + '/growth/entries?id=' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      const j = await res.json()
      setEntries(prev => prev.map(e => e.id === id ? j.entry : e))
      setEditingEntry(null)
      toast.success('Updated')
    } catch { toast.error('Failed to update') }
  }

  const saveDetails = async (description: string) => {
    try {
      await fetch('/api/ventures/' + slug + '/growth?metricId=' + metric.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      metric.description = description
      toast.success('Details saved')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-white">{metric.name}</h3>
          <p className="text-[11.5px] text-white/45 mt-0.5 capitalize">
            {metric.frequency} · {metric.type === 'currency' ? metric.currency : metric.type}
            {metric.unit ? ' · ' + metric.unit : ''}
            {sortedEntries.length > 0 ? ' · ' + sortedEntries.length + ' data point' + (sortedEntries.length !== 1 ? 's' : '') : ''}
          </p>
        </div>
        {isOwner && (
          <button onClick={onDelete}
            className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-300 flex items-center justify-center" title="Remove metric">
            <Trash size={12} />
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">

        {/* LEFT — Chart + short explanation */}
        <div className="lg:w-1/2 p-4 border-r border-white/[0.04] flex flex-col">
          {chartData.length > 1 ? (
            <>
              <div className="w-full min-h-[280px]" style={{ minHeight: 280 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id={grad.id + '_' + metric.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={grad.fill} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={grad.fill} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} interval="preserveStartEnd" padding={{ left: 10, right: 10 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => {
                        if (v >= 1000000000) return (v / 1000000000).toFixed(1) + 'B'
                        if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
                        if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
                        return v.toString()
                      }}
                      domain={['auto', 'auto']} width={45}
                    />
                    <Tooltip
                      contentStyle={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', padding: '8px 12px' }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '10px' }}
                      formatter={(value: number) => [formatVal(value, { compact: false }), metric.name]}
                      labelFormatter={(label) => label}
                    />
                    {avg > 0 && max > avg * 1.5 && (
                      <ReferenceLine y={avg} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: 'Avg', fill: '#71717a', fontSize: 10, position: 'right' }} />
                    )}
                    <Area type="monotone" dataKey="value" stroke={grad.stroke} strokeWidth={2.5} fill={'url(#' + grad.id + '_' + metric.id + ')'} name={metric.name}
                      dot={{ r: 3, fill: grad.stroke, stroke: '#0a0a0f', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: grad.stroke, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Short one-line explanation under graph */}
              <div className="mt-3 flex items-start gap-2 text-[11px] text-white/50 leading-relaxed">
                <InfoIcon size={11} weight="regular" className="text-white/30 flex-shrink-0 mt-0.5" />
                <p>{analytics.graphExplanation}</p>
              </div>
            </>
          ) : chartData.length === 1 ? (
            <div className="flex-1 min-h-[280px] flex items-center justify-center text-center">
              <div>
                <p className="text-[32px] font-black text-white">{formatVal(chartData[0].value)}</p>
                <p className="text-[12px] text-white/50 mt-2">{chartData[0].label}</p>
                <p className="text-[11px] text-white/40 mt-1">Add more data points to see the trend</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[280px] flex items-center justify-center text-center">
              <div>
                <p className="text-[13px] text-white/50">No data yet</p>
                {isOwner && (
                  <button onClick={() => setActiveTab('add')} className="mt-2 text-[12px] font-semibold text-white/70 hover:text-white inline-flex items-center gap-1">
                    <Plus size={11} weight="bold" /> Add first data point
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 4 Tabs */}
        <div className="lg:w-1/2 flex flex-col">
          {/* Tab buttons */}
          <div className="px-3 pt-3 pb-2.5 border-b border-white/[0.04] flex items-center gap-1">
            <TabButton icon={InfoIcon} label="Details" active={activeTab === 'details'} onClick={() => setActiveTab('details')} />
            <TabButton icon={ChartBar} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} disabled={sortedEntries.length === 0} />
            <TabButton icon={ListDashes} label="Entries" badge={sortedEntries.length} active={activeTab === 'entries'} onClick={() => setActiveTab('entries')} />
            {isOwner && <TabButton icon={PlusCircle} label="Add" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '340px' }}>
            {activeTab === 'details' && (
              <DetailsView metric={metric} isOwner={isOwner} onSave={saveDetails} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsView groups={analytics.groups} />
            )}
            {activeTab === 'entries' && (
              <EntriesView entries={sortedEntries} metric={metric} formatVal={formatVal} isOwner={isOwner}
                search={entrySearch} onSearch={setEntrySearch} onEdit={setEditingEntry} onDelete={deleteEntry} />
            )}
            {activeTab === 'add' && isOwner && (
              <AddDataView metric={metric} onSubmit={addEntry} />
            )}
          </div>
        </div>
      </div>

      {editingEntry && isOwner && (
        <EditEntryModal entry={editingEntry} metric={metric} onClose={() => setEditingEntry(null)} onSave={(patch) => updateEntry(editingEntry.id, patch)} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// 3D TAB BUTTON
// ═══════════════════════════════════════════════════
function TabButton({ icon: Icon, label, active, onClick, badge, disabled }: {
  icon: any
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'relative flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11.5px] font-semibold transition-all ' +
        (disabled
          ? 'opacity-40 cursor-not-allowed text-white/40'
          : active
            ? 'text-white bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.12]'
            : 'text-white/60 hover:text-white bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06] hover:border-white/[0.1]')
      }
      style={active ? { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.05)' }
                    : { boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.3)' }}
    >
      <Icon size={12} weight={active ? 'fill' : 'regular'} />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={'text-[9.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none ' + (active ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-white/60')}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════
// DETAILS TAB — Rich text editor (highly advanced)
// ═══════════════════════════════════════════════════
function DetailsView({ metric, isOwner, onSave }: { metric: any; isOwner: boolean; onSave: (d: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(metric.description || '')
  const [preview, setPreview] = useState(false)
  const [showSizeMenu, setShowSizeMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertFormat = (before: string, after: string = before) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const selected = draft.slice(start, end)
    setDraft(draft.slice(0, start) + before + (selected || 'text') + after + draft.slice(end))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length + (selected || 'text').length, start + before.length + (selected || 'text').length) }, 0)
  }
  const insertLine = (prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const ls = draft.slice(0, start).lastIndexOf('\n') + 1
    setDraft(draft.slice(0, ls) + prefix + draft.slice(ls))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, start + prefix.length) }, 0)
  }
  const insertLink = () => { const url = prompt('URL:'); if (url) insertFormat('[', '](' + url + ')') }
  const applyTextSize = (sizeKey: string) => {
    const size = TEXT_SIZES.find(s => s.key === sizeKey)
    if (!size) return
    setShowSizeMenu(false)
    if (size.key === 'normal') return
    if (size.md.endsWith(' ')) insertLine(size.md)
    else if (size.md) insertFormat(size.md)
  }

  const renderMarkdown = (md: string) => {
    if (!md) return ''
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-[16px] font-semibold text-white mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-[18px] font-bold text-white mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-[22px] font-bold text-white mt-4 mb-2">$1</h1>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-white/25 pl-3 py-1 my-2 italic text-white/70">$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/`SMALL`([^`]+)/g, '<span class="text-[12px] text-white/70">$1</span>')
      .replace(/`(.+?)`/g, '<code class="bg-white/[0.06] text-white/90 px-1 rounded text-[12px] font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-white underline hover:opacity-80">$1</a>')
      .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-white/85 my-0.5">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-white/85 my-0.5">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-[13px] leading-relaxed text-white/80 mb-2">')
      .replace(/\n/g, '<br />')
  }

  const save = async () => {
    await onSave(draft)
    setEditing(false)
    setPreview(false)
  }

  if (editing && isOwner) {
    return (
      <div className="p-4 space-y-2">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-0.5">
            {/* Size */}
            <div className="relative">
              <button onClick={() => setShowSizeMenu(!showSizeMenu)}
                className="flex items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded px-2 py-1">
                <TextAa size={11} /> Size <CaretDown size={9} />
              </button>
              {showSizeMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSizeMenu(false)} />
                  <div className="absolute top-full mt-1 left-0 z-50 min-w-[160px] bg-[#12121a] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden">
                    {TEXT_SIZES.map(s => (
                      <button key={s.key} onClick={() => applyTextSize(s.key)}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.05] text-left transition-colors">
                        <span className="text-white font-medium" style={{ fontSize: s.size }}>{s.label}</span>
                        <span className="text-[10px] text-white/30 font-mono">{s.size}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Divider />
            <ToolBtn onClick={() => insertFormat('**')} icon={TextB} title="Bold" />
            <ToolBtn onClick={() => insertFormat('*')} icon={TextItalic} title="Italic" />
            <ToolBtn onClick={() => insertFormat('__')} icon={TextUnderline} title="Underline" />
            <Divider />
            <ToolBtn onClick={insertLink} icon={LinkIcon} title="Link" />
            <ToolBtn onClick={() => insertLine('* ')} icon={ListBullets} title="Bullet" />
            <ToolBtn onClick={() => insertLine('1. ')} icon={ListNumbers} title="Numbered" />
            <ToolBtn onClick={() => insertLine('> ')} icon={Quotes} title="Quote" />
            <ToolBtn onClick={() => insertFormat('`')} icon={Code} title="Code" />
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPreview(false)} className={'px-2 py-1 rounded text-[10.5px] font-semibold ' + (!preview ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white')}>Write</button>
            <button onClick={() => setPreview(true)} className={'px-2 py-1 rounded text-[10.5px] font-semibold ' + (preview ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white')}>Preview</button>
          </div>
        </div>

        {preview ? (
          <div className="min-h-[180px] max-h-[220px] overflow-y-auto p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
            {draft ? <div dangerouslySetInnerHTML={{ __html: '<p class="text-[13px] leading-relaxed text-white/80 mb-2">' + renderMarkdown(draft) + '</p>' }} /> : <p className="text-[12px] text-white/30 italic">Nothing to preview.</p>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={9}
            maxLength={5000}
            placeholder="Explain what this metric measures, methodology, data source, why it matters, and how you compute it. Include context that helps investors trust the numbers."
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] resize-none"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); insertFormat('**') }
              if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); insertFormat('*') }
            }}
          />
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10.5px] text-white/40">{draft.length} / 5,000 · Markdown supported</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { setDraft(metric.description || ''); setEditing(false); setPreview(false) }} className="text-[11.5px] font-semibold text-white/60 hover:text-white px-3 h-7">Cancel</button>
            <button onClick={save} className="text-[11.5px] font-semibold text-black bg-white hover:bg-white/90 px-3 h-7 rounded-md flex items-center gap-1">
              <Check size={11} weight="bold" /> Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider">Metric Details</p>
        {isOwner && (
          <button onClick={() => { setDraft(metric.description || ''); setEditing(true) }}
            className="text-[10.5px] font-semibold text-white/60 hover:text-white flex items-center gap-1">
            <PencilSimple size={10} /> {metric.description ? 'Edit' : 'Add'}
          </button>
        )}
      </div>
      {metric.description ? (
        <div dangerouslySetInnerHTML={{ __html: '<p class="text-[13px] leading-relaxed text-white/80 mb-2">' + renderMarkdown(metric.description) + '</p>' }} />
      ) : isOwner ? (
        <div className="text-center py-6">
          <p className="text-[12px] text-white/40 mb-2">Add rich context for this metric</p>
          <button onClick={() => setEditing(true)} className="text-[11.5px] font-semibold text-white/70 hover:text-white inline-flex items-center gap-1 border border-dashed border-white/[0.1] hover:border-white/[0.2] px-3 py-1.5 rounded-md">
            <PencilSimple size={10} /> Write details
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-white/40 italic">No details provided.</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// ANALYTICS TAB — Universal + metric-specific groups
// ═══════════════════════════════════════════════════
function AnalyticsView({ groups }: { groups: AnalyticsGroup[] }) {
  if (groups.length === 0) {
    return <p className="text-[12px] text-white/40 italic text-center py-6">Add data to see analytics.</p>
  }
  return (
    <div className="p-4 space-y-4">
      {groups.map((group, idx) => (
        <div key={group.title} className={idx > 0 ? 'pt-3 border-t border-white/[0.05]' : ''}>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">{group.title}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {group.items.map(item => (
              <AnalyticTile key={item.label} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticTile({ item }: { item: AnalyticItem }) {
  const tint = item.tint
    || (item.positive === true ? 'text-emerald-300'
        : item.positive === false ? 'text-red-400'
        : item.highlight ? 'text-white' : 'text-white')

  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <p className="text-[9.5px] font-bold text-white/45 uppercase tracking-wider truncate">{item.label}</p>
        {item.info && <InfoTooltip content={item.info} formula={item.formula} />}
      </div>
      <p className={
        'font-bold leading-tight truncate ' +
        (item.highlight ? 'text-[18px] font-black' : 'text-[13.5px]') + ' ' + tint
      }>{item.value}</p>
      {item.sub && <p className="text-[10px] text-white/40 mt-0.5 truncate">{item.sub}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// ENTRIES TAB
// ═══════════════════════════════════════════════════
function EntriesView({ entries, metric, formatVal, isOwner, search, onSearch, onEdit, onDelete }: any) {
  const filtered = search
    ? entries.filter((e: any) =>
        formatDate(e.date, metric.frequency).toLowerCase().includes(search.toLowerCase()) ||
        String(e.value).includes(search) ||
        (e.note || '').toLowerCase().includes(search.toLowerCase())
      )
    : entries
  const reversed = [...filtered].reverse()

  return (
    <div className="p-3">
      <div className="relative mb-2">
        <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder="Search entries..."
          className="w-full pl-8 pr-3 h-7 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
      </div>
      {reversed.length === 0 ? (
        <p className="text-[11.5px] text-white/40 italic text-center py-6">{search ? 'No entries match.' : 'No entries yet.'}</p>
      ) : (
        <div className="space-y-0.5">
          {reversed.map((entry: any) => (
            <EntryRow key={entry.id} entry={entry} metric={metric} formatVal={formatVal} isOwner={isOwner}
              onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry, metric, formatVal, isOwner, onEdit, onDelete }: any) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] group/entry transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-[10.5px] text-white/50 font-mono w-16 flex-shrink-0">{formatDate(entry.date, metric.frequency)}</span>
        <span className="text-[12.5px] text-white font-bold flex-shrink-0 w-16">{formatVal(parseFloat(entry.value))}</span>
        {entry.note && <span className="text-[10.5px] text-white/50 truncate flex-1">{entry.note}</span>}
      </div>
      {isOwner && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity flex-shrink-0">
          {confirmDelete ? (
            <>
              <button onClick={() => { onDelete(); setConfirmDelete(false) }} className="text-[10px] font-bold text-red-300 hover:text-red-200 px-1.5 h-5 rounded bg-red-500/10 hover:bg-red-500/20">Confirm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-white/40 hover:text-white w-5 h-5 flex items-center justify-center"><X size={10} /></button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="w-6 h-6 rounded text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center" title="Edit"><PencilSimple size={10} /></button>
              <button onClick={() => setConfirmDelete(true)} className="w-6 h-6 rounded text-white/40 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center" title="Delete"><Trash size={10} /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// ADD DATA TAB
// ═══════════════════════════════════════════════════
function AddDataView({ metric, onSubmit }: { metric: any; onSubmit: (p: any) => Promise<boolean> }) {
  const [date, setDate] = useState('')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCred, setShowCred] = useState(false)

  const submit = async () => {
    if (!date || !value) { toast.error('Date and value required'); return }
    const num = parseFloat(value)
    if (isNaN(num)) { toast.error('Value must be a number'); return }
    setSaving(true); setShowCred(true)
    const ok = await onSubmit({ date, value: num, note: note || undefined })
    if (ok) { setDate(''); setValue(''); setNote(''); setShowCred(false) }
    setSaving(false)
  }

  return (
    <div className="p-4 space-y-2.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-white/[0.2]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">
            Value {metric.type === 'percentage' ? '(%)' : metric.unit ? '(' + metric.unit + ')' : ''}
          </label>
          <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder={metric.type === 'currency' ? '50000' : metric.type === 'percentage' ? '12.5' : '1000'}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. First enterprise customer signed"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
      </div>
      {showCred && (
        <div className="bg-yellow-500/[0.08] border border-yellow-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <Warning size={13} weight="fill" className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-yellow-200/90 leading-relaxed">
            Data credibility matters. Providing inaccurate or misleading information can result in loss of trust, removal from discovery, and legal consequences. Only submit verifiable data.
          </p>
        </div>
      )}
      <button onClick={submit} disabled={saving || !date || !value}
        className="w-full text-[12px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-40 h-9 rounded-lg flex items-center justify-center gap-1.5">
        <Check size={12} weight="bold" /> {saving ? 'Saving...' : 'Add data point'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// EDIT ENTRY MODAL
// ═══════════════════════════════════════════════════
function EditEntryModal({ entry, metric, onClose, onSave }: any) {
  const [date, setDate] = useState(entry.date)
  const [value, setValue] = useState(String(entry.value))
  const [note, setNote] = useState(entry.note || '')
  const [saving, setSaving] = useState(false)
  const [showCred, setShowCred] = useState(false)

  const submit = async () => {
    if (!date || !value) { toast.error('Date and value required'); return }
    setSaving(true); setShowCred(true)
    try { await onSave({ date, value: parseFloat(value), note: note || null }) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white">Edit Data Point</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-white/[0.2]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Value</label>
              <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-white/[0.2]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]" />
          </div>
          {showCred && (
            <div className="bg-yellow-500/[0.08] border border-yellow-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
              <Warning size={13} weight="fill" className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-yellow-200/90 leading-relaxed">Editing historical data affects credibility. Only correct genuine errors.</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[12px] text-white/60 hover:text-white px-3 h-8">Cancel</button>
          <button onClick={submit} disabled={saving} className="text-[12px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-40 px-4 h-8 rounded-lg">
            {saving ? 'Saving...' : 'Update Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function formatDate(dateStr: string, frequency: string): string {
  const d = new Date(dateStr)
  switch (frequency) {
    case 'daily':
    case 'weekly':
      return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    case 'monthly':
      return d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
    case 'quarterly':
      const q = Math.ceil((d.getMonth() + 1) / 3)
      return 'Q' + q + ' ' + d.getFullYear().toString().slice(2)
    case 'yearly':
      return d.getFullYear().toString()
    default:
      return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })
  }
}

function ToolBtn({ onClick, icon: Icon, title }: { onClick: () => void; icon: any; title: string }) {
  return (
    <button onClick={onClick} type="button" title={title}
      className="w-7 h-7 rounded hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors">
      <Icon size={12} weight="regular" />
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-white/[0.1] mx-0.5" />
}