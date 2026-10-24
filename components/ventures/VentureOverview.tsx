'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { 
  Target, 
  Compass,
  Lightbulb,
  Warning,
  PuzzlePiece,
  ChartLineUp,
  Users,
  FilePdf,
  Plus,
  PencilSimple,
  Sparkle,
  ArrowRight,
  TrendUp,
  Rocket,
  Buildings,
  Coin,
  Path,
  Calendar,
  Handshake,
} from '@phosphor-icons/react'
import { EditTextModal } from './modals/EditTextModal'
import { BusinessModelModal } from './modals/BusinessModelModal'
import { TeamMemberModal } from './modals/TeamMemberModal'
import { MetricModal } from './modals/MetricModal'
import { MetricDataModal } from './modals/MetricDataModal'
import { PitchDeckModal } from './modals/PitchDeckModal'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import Link from 'next/link'

interface VentureOverviewProps {
  venture: any
  teamMembers: any[]
  metrics: any[]
  documents: any[]
  isOwner: boolean
  onUpdate: (venture: any) => void
  onTeamUpdate: (team: any[]) => void
  onMetricsUpdate: (metrics: any[]) => void
  onDocumentsUpdate: (docs: any[]) => void
}

export function VentureOverview({
  venture,
  teamMembers,
  metrics,
  documents,
  isOwner,
  onUpdate,
  onTeamUpdate,
  onMetricsUpdate,
}: VentureOverviewProps) {
  const supabase = createClient()
  const [metricEntries, setMetricEntries] = useState<any[]>([])

  // Modals
  const [editModal, setEditModal] = useState<any>(null)
  const [businessModelModalOpen, setBusinessModelModalOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<any>(null)
  const [metricDataModalOpen, setMetricDataModalOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<any>(null)
  const [pitchDeckModalOpen, setPitchDeckModalOpen] = useState(false)

  // Load metric entries
  useEffect(() => {
    const load = async () => {
      if (metrics.length === 0) return
      const { data } = await supabase
        .from('venture_metric_entries')
        .select('*')
        .in('metric_id', metrics.map(m => m.id))
        .order('date', { ascending: true })
      setMetricEntries(data || [])
    }
    load()
  }, [metrics])

  const openEditor = (field: string, label: string, value: string, multiline = true, maxLength = 2000) => {
    setEditModal({ open: true, field, label, value: value || '', multiline, maxLength })
  }

  // Prepare growth chart data
  const chartData = prepareChartData(metricEntries)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
      {/* ==================== LEFT COLUMN ==================== */}
      <div className="space-y-4">
        {/* About Section */}
        <CompactCard
          title={`About ${venture.name}`}
          isOwner={isOwner}
          onEdit={() => openEditor('description', `About ${venture.name}`, venture.description, true, 2000)}
        >
          {venture.description ? (
            <p className="text-sm leading-relaxed text-foreground/80">
              {venture.description}
            </p>
          ) : (
            <EmptyPrompt
              text="Tell your story"
              subtext="What you do, who you serve, why it matters"
              onClick={() => openEditor('description', `About ${venture.name}`, '', true, 2000)}
              isOwner={isOwner}
            />
          )}
        </CompactCard>

        {/* CHANGE 1 — Mission | Vision | Why Now | Target Market | Business Model | Headquarters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniInfoCard
            title="Vision"
            content={venture.vision}
            emptyText="Where you're going"
            isOwner={isOwner}
            onAdd={() => openEditor('vision', 'Vision', venture.vision, true, 400)}
          />
          <MiniInfoCard
            title="Mission"
            content={venture.mission}
            emptyText="Why you exist"
            isOwner={isOwner}
            onAdd={() => openEditor('mission', 'Mission', venture.mission, true, 400)}
          />
          <MiniInfoCard
            title="Why Now?"
            content={venture.why_now}
            emptyText="Why the timing is right"
            isOwner={isOwner}
            onAdd={() => openEditor('why_now', 'Why Now?', venture.why_now, true, 400)}
          />
          <MiniInfoCard
            title="Target Market"
            content={venture.target_market}
            emptyText="Who your customers are"
            isOwner={isOwner}
            onAdd={() => openEditor('target_market', 'Target Market', venture.target_market, true, 400)}
          />
          <MiniInfoCard
            title="Business Model"
            content={venture.business_model 
              ? venture.business_model.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) +
                (venture.business_model_details ? ' — ' + venture.business_model_details : '')
              : null
            }
            emptyText="How you make money"
            isOwner={isOwner}
            onAdd={() => setBusinessModelModalOpen(true)}
          />
          <MiniInfoCard
            title="Headquarters"
            content={venture.headquarters}
            emptyText="Where you're based"
            isOwner={isOwner}
            onAdd={() => openEditor('headquarters', 'Headquarters', venture.headquarters, false, 100)}
          />
        </div>

        {/* CHANGE 2 — Stage Strip with more spacing */}
        <div className="bg-card border rounded-2xl p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <StripItem 
              icon={Rocket}
              label="Stage" 
              value={venture.stage?.replace(/-/g, ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not set'}
            />
            <StripItem 
              icon={Buildings}
              label="Registration" 
              value={venture.registration_type === 'not-registered' ? 'Not Registered' : venture.registration_type?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '—'}
            />
            <StripItem 
              icon={Coin}
              label="Funding" 
              value={venture.funding_amount || venture.funding_stage?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '—'}
              onClick={() => isOwner && openEditor('funding_amount', 'Funding Amount', venture.funding_amount || '', false, 50)}
              editable={isOwner}
            />
            <StripItem 
              icon={Path}
              label="Use of Funds" 
              value={venture.target_market || '—'}
              onClick={() => isOwner && openEditor('target_market', 'Use of Funds', venture.target_market || '', false, 100)}
              editable={isOwner}
            />
            <StripItem 
              icon={Calendar}
              label="Runway" 
              value={venture.runway || '—'}
              onClick={() => isOwner && openEditor('runway', 'Runway', venture.runway || '', false, 30)}
              editable={isOwner}
            />
          </div>
        </div>

        {/* Problem & Solution - Compact side by side */}
        <div className="grid grid-cols-2 gap-3">
          <CompactCard
            icon={Warning}
            iconColor="text-red-500"
            iconBg="bg-red-500/10"
            title="The Problem"
            isOwner={isOwner}
            onEdit={() => openEditor('problem', 'The Problem', venture.problem, true, 800)}
          >
            {venture.problem ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {venture.problem}
              </p>
            ) : (
              <EmptyPrompt
                text="What are you solving?"
                onClick={() => openEditor('problem', 'The Problem', '', true, 800)}
                isOwner={isOwner}
                compact
              />
            )}
          </CompactCard>

          <CompactCard
            icon={PuzzlePiece}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
            title="Our Solution"
            isOwner={isOwner}
            onEdit={() => openEditor('solution', 'Our Solution', venture.solution, true, 800)}
          >
            {venture.solution ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {venture.solution}
              </p>
            ) : (
              <EmptyPrompt
                text="How you solve it"
                onClick={() => openEditor('solution', 'Our Solution', '', true, 800)}
                isOwner={isOwner}
                compact
              />
            )}
          </CompactCard>
        </div>

        {/* Pitch Deck - Compact horizontal card */}
        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-sm">Pitch Deck Preview</h3>
            {venture.pitch_deck_url && (
              <a 
                href={venture.pitch_deck_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90"
              >
                View Full Deck
              </a>
            )}
          </div>
          
          {venture.pitch_deck_url ? (
            <div className="flex gap-3">
              {/* Deck thumbnail */}
              <div 
                onClick={() => isOwner && setPitchDeckModalOpen(true)}
                className="w-40 aspect-video bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20 rounded-lg flex flex-col items-center justify-center flex-shrink-0 cursor-pointer relative group"
              >
                <p className="text-xs font-bold text-center px-2">
                  {venture.name}
                </p>
                <p className="text-[9px] text-muted-foreground text-center mt-0.5">
                  Pitch Deck
                </p>
                {isOwner && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-[10px] text-white font-semibold">Replace</span>
                  </div>
                )}
              </div>

              {/* Slide checklist */}
              <div className="flex-1 space-y-1">
                {['Problem', 'Solution', 'Market', 'Product', 'Business Model', 'Team', 'Roadmap', 'Financial Plan'].map((slide) => (
                  <div key={slide} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-muted-foreground">{slide}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyPrompt
              text="Upload your pitch deck"
              subtext="PDF up to 20MB"
              onClick={() => setPitchDeckModalOpen(true)}
              isOwner={isOwner}
              compact
            />
          )}
        </div>
      </div>

      {/* ==================== MIDDLE COLUMN ==================== */}
      <div className="space-y-4">
        {/* Traction Snapshot - Metric grid */}
        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Traction Snapshot</h3>
            {isOwner && (
              <button
                onClick={() => {
                  setEditingMetric(null)
                  setMetricModalOpen(true)
                }}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" weight="bold" />
                Add Metric
              </button>
            )}
          </div>

          {metrics.length === 0 ? (
            <EmptyPrompt
              text="Track key metrics"
              subtext="Add MRR, users, retention & more"
              onClick={() => {
                setEditingMetric(null)
                setMetricModalOpen(true)
              }}
              isOwner={isOwner}
              compact
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {metrics.filter((m: any) => m.show_on_overview).slice(0, 4).map((m: any) => {
                const entries = metricEntries.filter(e => e.metric_id === m.id)
                const latest = entries[entries.length - 1]
                const previous = entries[entries.length - 2]
                const change = latest && previous 
                  ? ((latest.value - previous.value) / previous.value * 100)
                  : 0

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isOwner) {
                        setSelectedMetric(m)
                        setMetricDataModalOpen(true)
                      }
                    }}
                    className={cn(
                      'p-3 rounded-lg text-left transition-all',
                      isOwner && 'hover:bg-muted/50 cursor-pointer'
                    )}
                  >
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                      {m.name}
                    </p>
                    <p className="text-xl font-bold mt-1 tabular-nums">
                      {latest ? formatMetricValue(latest.value, m) : '—'}
                    </p>
                    {change !== 0 && latest && (
                      <div className={cn(
                        'flex items-center gap-0.5 text-[10px] font-semibold mt-1',
                        change > 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        <TrendUp className={cn('w-2.5 h-2.5', change < 0 && 'rotate-180')} weight="bold" />
                        {Math.abs(change).toFixed(0)}%
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Growth Over Time chart */}
        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Growth Over Time</h3>
            <select className="text-[10px] bg-muted/40 border rounded px-2 py-0.5 focus:outline-none">
              <option>Last 6 Months</option>
              <option>Last 3 Months</option>
              <option>Last Year</option>
            </select>
          </div>

          {chartData.length > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                      padding: '6px 10px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(280, 91%, 60%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(280, 91%, 60%)', r: 3, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-muted-foreground italic">
                Add metric data to see growth chart
              </p>
            </div>
          )}
        </div>

        {/* Team - Compact horizontal */}
        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">Team</h3>
              <a href="#team" className="text-[10px] text-blue-500 hover:underline">
                View All ({teamMembers.length})
              </a>
            </div>
            {isOwner && (
              <button
                onClick={() => {
                  setEditingMember(null)
                  setTeamModalOpen(true)
                }}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            )}
          </div>

          {teamMembers.length === 0 ? (
            <EmptyPrompt
              text="Add team members"
              onClick={() => {
                setEditingMember(null)
                setTeamModalOpen(true)
              }}
              isOwner={isOwner}
              compact
            />
          ) : (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {teamMembers.slice(0, 4).map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (isOwner) {
                      setEditingMember(m)
                      setTeamModalOpen(true)
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                >
                  {m.avatar_url ? (
                    <img 
                      src={m.avatar_url} 
                      alt={m.name} 
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-base font-bold ring-2 ring-transparent group-hover:ring-primary transition-all">
                      {m.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="text-center min-w-0">
                    <p className="text-[10px] font-semibold truncate max-w-[70px]">{m.name?.split(' ')[0]}</p>
                    <p className="text-[9px] text-muted-foreground truncate max-w-[70px]">{m.role}</p>
                  </div>
                </button>
              ))}
              
              {teamMembers.length > 4 && (
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-bold text-muted-foreground">+{teamMembers.length - 4}</span>
                  </div>
                </div>
              )}

              {isOwner && (
                <button
                  onClick={() => {
                    setEditingMember(null)
                    setTeamModalOpen(true)
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all">
                    <Plus className="w-4 h-4 text-muted-foreground" weight="bold" />
                  </div>
                  <p className="text-[9px] text-muted-foreground">Add</p>
                </button>
              )}
            </div>
          )}
        </div>

        {/* CHANGE 3 — Roadmap & Investors sections removed */}
      </div>

      {/* ==================== ALL MODALS ==================== */}
      {editModal && (
        <EditTextModal
          open={editModal.open}
          onOpenChange={(open: boolean) => !open && setEditModal(null)}
          venture={venture}
          field={editModal.field}
          label={editModal.label}
          value={editModal.value}
          multiline={editModal.multiline}
          maxLength={editModal.maxLength}
          onSaved={(updated) => {
            onUpdate(updated)
            setEditModal(null)
          }}
        />
      )}

      {businessModelModalOpen && (
        <BusinessModelModal
          open={businessModelModalOpen}
          onOpenChange={setBusinessModelModalOpen}
          venture={venture}
          onSaved={(updated) => {
            onUpdate(updated)
            setBusinessModelModalOpen(false)
          }}
        />
      )}

      {teamModalOpen && (
        <TeamMemberModal
          open={teamModalOpen}
          onOpenChange={setTeamModalOpen}
          ventureId={venture.id}
          member={editingMember}
          onSaved={(m, isEdit) => {
            if (isEdit) {
              onTeamUpdate(teamMembers.map((tm) => tm.id === m.id ? m : tm))
            } else {
              onTeamUpdate([...teamMembers, m])
            }
            setTeamModalOpen(false)
            setEditingMember(null)
          }}
        />
      )}

      {metricModalOpen && (
        <MetricModal
          open={metricModalOpen}
          onOpenChange={setMetricModalOpen}
          ventureId={venture.id}
          metric={editingMetric}
          onSaved={(m, isEdit) => {
            if (isEdit) {
              onMetricsUpdate(metrics.map((met) => met.id === m.id ? m : met))
            } else {
              onMetricsUpdate([...metrics, m])
            }
            setMetricModalOpen(false)
            setEditingMetric(null)
          }}
        />
      )}

      {metricDataModalOpen && selectedMetric && (
        <MetricDataModal
          open={metricDataModalOpen}
          onOpenChange={setMetricDataModalOpen}
          metric={selectedMetric}
        />
      )}

      {pitchDeckModalOpen && (
        <PitchDeckModal
          open={pitchDeckModalOpen}
          onOpenChange={setPitchDeckModalOpen}
          venture={venture}
          onSaved={(updated) => {
            onUpdate(updated)
            setPitchDeckModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ==================== SUB COMPONENTS ====================

function CompactCard({ icon: Icon, iconColor, iconBg, title, isOwner, onEdit, children }: any) {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && iconBg && (
            <div className={cn('w-6 h-6 rounded flex items-center justify-center', iconBg)}>
              <Icon className={cn('w-3.5 h-3.5', iconColor)} weight="fill" />
            </div>
          )}
          <h3 className="font-bold text-sm">{title}</h3>
        </div>
        {isOwner && onEdit && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded opacity-60 hover:opacity-100"
          >
            <PencilSimple className="w-3 h-3" weight="duotone" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function MiniInfoCard({ title, content, emptyText, isOwner, onAdd }: any) {
  return (
    <div className="bg-card border rounded-2xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
        {title}
      </p>
      {content ? (
        <p className="text-[11px] leading-relaxed text-foreground/80 line-clamp-4">
          {content}
        </p>
      ) : (
        <div>
          <p className="text-[10px] text-muted-foreground/60 italic">
            {emptyText}
          </p>
          {isOwner && (
            <button
              onClick={onAdd}
              className="text-[10px] text-blue-500 hover:underline font-medium mt-1.5 flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" weight="bold" />
              Add
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StripItem({ icon: Icon, label, value, onClick, editable }: any) {
  const content = (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" weight="duotone" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold truncate">
          {label}
        </p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  )

  if (editable && onClick) {
    return (
      <button onClick={onClick} className="text-left hover:bg-muted/30 -m-1 p-1 rounded transition-colors">
        {content}
      </button>
    )
  }
  return content
}

function EmptyPrompt({ text, subtext, onClick, isOwner, compact }: any) {
  if (!isOwner) {
    return (
      <div className={cn('text-center', compact ? 'py-3' : 'py-6')}>
        <p className="text-xs text-muted-foreground italic">{text}</p>
      </div>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      onClick={onClick}
      className={cn(
        'w-full border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col items-center justify-center',
        compact ? 'py-4' : 'py-6'
      )}
    >
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" weight="bold" />
      </div>
      <p className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground mt-1.5">
        {text}
      </p>
      {subtext && (
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">
          {subtext}
        </p>
      )}
    </motion.button>
  )
}

// Helpers
function formatMetricValue(val: number, metric: any) {
  if (metric.type === 'currency') {
    if (val >= 1000000) return `${metric.unit || '$'}${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${metric.unit || '$'}${(val / 1000).toFixed(1)}K`
    return `${metric.unit || '$'}${val}`
  }
  if (metric.type === 'percentage') return `${val}%`
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
  return val.toLocaleString()
}

function prepareChartData(entries: any[]) {
  if (entries.length === 0) return []

  const grouped: Record<string, { total: number; count: number }> = {}

  entries.forEach(entry => {
    const date = new Date(entry.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 }
    grouped[key].total += entry.value
    grouped[key].count += 1
  })

  return Object.keys(grouped).sort().slice(-6).map(key => {
    const [year, month] = key.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return {
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: Math.round(grouped[key].total / grouped[key].count),
    }
  })
}