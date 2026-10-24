'use client'

import { useState, useEffect } from 'react'
import {
  Globe, LinkedinLogo, TwitterLogo, GithubLogo, YoutubeLogo, InstagramLogo,
  FilePdf, PencilSimple, Plus, X, Check, MagnifyingGlass, Envelope,
  UserPlus, Eye, EyeSlash, MapPin
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { AssessmentProgressCard } from '@/components/venture-assessment/AssessmentProgressCard'
import { DsrtPanel, DsrtButton, DsrtInput, DsrtModal, DsrtAvatar, DsrtChip } from '@/components/dsrt'

interface Props {
  venture: any
  founder: any
  team: any[]
  products: any[]
  roles: any[]
  isOwner: boolean
  onUpdate: (patch: any) => Promise<void>
}

const FUNDING_STAGES = [
  { value: '', label: 'Not specified' },
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'pre-seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C' },
  { value: 'growth', label: 'Growth / Late Stage' },
  { value: 'pre-ipo', label: 'Pre-IPO' },
  { value: 'ipo', label: 'Public / IPO' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'grant-funded', label: 'Grant Funded' },
]

const BUSINESS_MODELS = [
  '', 'B2B SaaS', 'B2C SaaS', 'Enterprise SaaS', 'Marketplace', 'E-Commerce', 'D2C',
  'Subscription', 'Freemium', 'Ad-supported', 'FinTech', 'Hardware', 'IoT', 'DeepTech',
  'Consumer App', 'Developer Tools', 'Open Source', 'Web3', 'AI / ML', 'Other',
]

const INDUSTRIES = [
  '', 'AI / Machine Learning', 'Robotics', 'DeepTech', 'BioTech', 'Aerospace', 'Defense',
  'FinTech', 'InsurTech', 'PropTech', 'HealthTech', 'EdTech', 'E-Commerce', 'D2C Brand',
  'ClimateTech', 'AgriTech', 'SaaS', 'Enterprise Software', 'Cybersecurity',
  'Consumer Apps', 'Social Media', 'Gaming', 'Media & Entertainment',
  'Real Estate', 'Manufacturing', 'IoT', 'Travel & Hospitality', 'Automotive', 'Other',
]

export function VentureSidebar({ venture, founder, team, products, roles, isOwner, onUpdate }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="space-y-4">
      {isOwner && <AssessmentProgressCard venture={venture} />}
      <AtAGlance venture={venture} isOwner={isOwner} onUpdate={onUpdate} />
      <FinancialsCard venture={venture} isOwner={isOwner} onUpdate={onUpdate} />
      <SocialLinksCard venture={venture} isOwner={isOwner} onUpdate={onUpdate} />
      <TeamCard team={team} isOwner={isOwner} onInvite={() => setInviteOpen(true)} slug={venture.slug} />
      {inviteOpen && <InviteMemberModal open={inviteOpen} slug={venture.slug} onClose={() => setInviteOpen(false)} />}
    </div>
  )
}

// ── AT A GLANCE ─────────────────────────────
function AtAGlance({ venture, isOwner, onUpdate }: { venture: any; isOwner: boolean; onUpdate: (p: any) => Promise<void> }) {
  const rows = [
    { key: 'stage', label: 'STAGE', value: venture.stage, capitalize: true },
    { key: 'industry', label: 'INDUSTRY', value: venture.industry, options: INDUSTRIES },
    { key: 'headquarters', label: 'LOCATION', value: venture.headquarters || venture.location, type: 'location' },
    { key: 'business_model', label: 'MODEL', value: venture.business_model, options: BUSINESS_MODELS },
    { key: 'team_size', label: 'TEAM SIZE', value: venture.team_size, type: 'number' },
    { key: 'start_date', label: 'FOUNDED', value: venture.start_date, type: 'date', display: (v: any) => v ? new Date(v).getFullYear() : null },
  ]

  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[13px] font-semibold text-white">At a Glance</h3>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {rows.map(row => (
          <EditableTile
            key={row.key}
            label={row.label}
            value={row.value}
            fieldKey={row.key}
            type={row.type}
            options={row.options}
            capitalize={row.capitalize}
            display={row.display}
            isOwner={isOwner}
            onSave={onUpdate}
          />
        ))}
      </div>

      <div className="p-3 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/50">
          {venture.show_in_explore ? <Eye size={11} /> : <EyeSlash size={11} />}
          Visibility
        </div>
        {isOwner ? (
          <button
            onClick={async () => { await onUpdate({ show_in_explore: !venture.show_in_explore }); toast.success(venture.show_in_explore ? 'Now private' : 'Now public') }}
            className="text-[11px] font-semibold px-2 py-1 rounded text-white/70 hover:text-white hover:bg-white/[0.06]"
          >
            {venture.show_in_explore ? 'Public' : 'Private'} →
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-white/70">{venture.show_in_explore ? 'Public' : 'Private'}</span>
        )}
      </div>
    </DsrtPanel>
  )
}

function EditableTile({ label, value, fieldKey, type, options, capitalize, display, isOwner, onSave }: any) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [locationOpen, setLocationOpen] = useState(false)

  useEffect(() => setDraft(value || ''), [value])

  const displayValue = display ? display(value) : value
  const hasValue = !!displayValue

  const save = async (val?: string) => {
    const v = val !== undefined ? val : draft
    await onSave({ [fieldKey]: type === 'number' ? (v ? Number(v) : null) : (v || null) })
    setEditing(false)
    setLocationOpen(false)
  }

  return (
    <>
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 min-h-[62px] flex flex-col justify-between">
        <p className="text-[9.5px] font-mono font-bold text-white/40 uppercase tracking-wider mb-1">{label}</p>
        {editing && isOwner ? (
          type === 'location' ? (
            <button onClick={() => { setLocationOpen(true); setEditing(false) }} className="text-[12px] font-semibold text-white/80 text-left">Choose...</button>
          ) : (
            <div className="flex items-center gap-1">
              {options ? (
                <select autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 bg-[#0f172a] border border-white/[0.15] text-white text-[12px] rounded px-1.5 py-0.5 outline-none min-w-0">
                  {options.map((opt: string) => <option key={opt} value={opt}>{opt || '— None —'}</option>)}
                </select>
              ) : (
                <input autoFocus type={type || 'text'} value={draft} onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 bg-white/[0.08] border border-white/[0.15] text-white text-[12px] rounded px-1.5 py-0.5 outline-none min-w-0" />
              )}
              <button onClick={() => save()} className="w-5 h-5 rounded bg-white text-black flex items-center justify-center"><Check size={10} weight="bold" /></button>
              <button onClick={() => { setDraft(value || ''); setEditing(false) }} className="w-5 h-5 rounded text-white/50 flex items-center justify-center"><X size={10} /></button>
            </div>
          )
        ) : hasValue ? (
          <p
            onClick={() => isOwner && (type === 'location' ? setLocationOpen(true) : setEditing(true))}
            className={'text-[12.5px] font-semibold text-white truncate ' + (capitalize ? 'capitalize ' : '') + (isOwner ? 'cursor-pointer hover:text-white/80' : '')}
          >
            {displayValue}
          </p>
        ) : isOwner ? (
          <button onClick={() => type === 'location' ? setLocationOpen(true) : setEditing(true)} className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-0.5">
            <Plus size={10} /> Add
          </button>
        ) : (
          <p className="text-[11px] text-white/30">—</p>
        )}
      </div>

      {locationOpen && <LocationPickerModal open={locationOpen} currentValue={value || ''} onClose={() => setLocationOpen(false)} onSelect={(loc) => save(loc)} />}
    </>
  )
}

// ── LOCATION PICKER ──────────────────────
function LocationPickerModal({ open, currentValue, onClose, onSelect }: { open: boolean; currentValue: string; onClose: () => void; onSelect: (loc: string) => void }) {
  const [query, setQuery] = useState(currentValue)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const dsrtRes = await fetch('/api/locations/search?q=' + encodeURIComponent(query))
        const dsrtJson = await dsrtRes.json().catch(() => ({ locations: [] }))
        const dsrtLocations = (dsrtJson.locations || []).map((l: any) => ({ display_name: l.display || (l.city + ', ' + l.country), isDsrt: true }))

        const osmRes = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&featuretype=city&q=' + encodeURIComponent(query), { headers: { 'Accept-Language': 'en' } })
        const osmJson = await osmRes.json().catch(() => [])
        const osmLocations = (osmJson || []).slice(0, 8).map((l: any) => ({ display_name: buildDisplay(l), isDsrt: false }))

        const seen = new Set<string>()
        const combined = [...dsrtLocations, ...osmLocations].filter(l => {
          if (seen.has(l.display_name)) return false
          seen.add(l.display_name)
          return true
        }).slice(0, 12)

        setResults(combined)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <DsrtModal open={open} onOpenChange={(o) => !o && onClose()} title="Choose location" size="md">
      <div className="space-y-3">
        <DsrtInput
          autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any city in the world..."
          icon={<MagnifyingGlass size={14} />}
          sizeVariant="md"
        />

        <div className="max-h-[300px] overflow-y-auto space-y-0.5">
          {query.length < 2 ? (
            <p className="text-[12px] text-white/40 text-center py-6">Type at least 2 characters.</p>
          ) : loading ? (
            <p className="text-[12px] text-white/40 text-center py-6">Searching...</p>
          ) : results.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[12px] text-white/40 mb-3">No matches found.</p>
              <button onClick={() => onSelect(query)} className="text-[12px] font-semibold text-white/80 hover:text-white">
                Use &ldquo;{query}&rdquo; anyway →
              </button>
            </div>
          ) : (
            results.map((r, i) => (
              <button key={i} onClick={() => onSelect(r.display_name)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
              >
                <MapPin size={12} className="text-white/40 flex-shrink-0" />
                <span className="text-[12.5px] text-white/85 truncate">{r.display_name}</span>
                {r.isDsrt && <DsrtChip size="sm" tone="accent" className="ml-auto">Popular</DsrtChip>}
              </button>
            ))
          )}
        </div>
      </div>
    </DsrtModal>
  )
}

function buildDisplay(item: any): string {
  const a = item.address || {}
  const parts = []
  if (a.city || a.town || a.village || a.municipality) parts.push(a.city || a.town || a.village || a.municipality)
  else if (item.name) parts.push(item.name)
  if (a.state) parts.push(a.state)
  if (a.country) parts.push(a.country)
  return parts.join(', ') || item.display_name
}

// ── FINANCIALS ─────────────────────────────
function FinancialsCard({ venture, isOwner, onUpdate }: { venture: any; isOwner: boolean; onUpdate: (p: any) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    funding_stage: venture.funding_stage || '',
    funding_amount: venture.funding_amount || '',
    runway: venture.runway || '',
    revenue_range: venture.revenue_range || '',
    seeking_investment: venture.seeking_investment || false,
  })

  const stageLabel = FUNDING_STAGES.find(s => s.value === venture.funding_stage)?.label

  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-white">Financials</h3>
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)} className="text-white/50 hover:text-white">
            <PencilSimple size={12} />
          </button>
        )}
      </div>
      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider mb-1">Funding Stage</label>
              <select value={draft.funding_stage} onChange={(e) => setDraft({ ...draft, funding_stage: e.target.value })}
                className="w-full bg-[#0f172a] border border-white/[0.1] text-white text-[12.5px] rounded-lg px-2.5 py-1.5 outline-none">
                {FUNDING_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <DsrtInput placeholder="Amount ($500K, $2M...)" value={draft.funding_amount} onChange={(e) => setDraft({ ...draft, funding_amount: e.target.value })} sizeVariant="sm" />
            <DsrtInput placeholder="Revenue ($10K/mo, $1M ARR...)" value={draft.revenue_range} onChange={(e) => setDraft({ ...draft, revenue_range: e.target.value })} sizeVariant="sm" />
            <DsrtInput placeholder="Runway (18 months...)" value={draft.runway} onChange={(e) => setDraft({ ...draft, runway: e.target.value })} sizeVariant="sm" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={draft.seeking_investment} onChange={(e) => setDraft({ ...draft, seeking_investment: e.target.checked })} className="rounded" />
              <span className="text-[12px] text-white/80">Currently raising investment</span>
            </label>
            <div className="flex gap-2 pt-1">
              <DsrtButton size="sm" variant="primary" onClick={async () => { await onUpdate(draft); toast.success('Financials updated'); setEditing(false) }}>Save</DsrtButton>
              <DsrtButton size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</DsrtButton>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {stageLabel && <FinRow label="Stage" value={stageLabel} />}
            {venture.funding_amount && <FinRow label={venture.seeking_investment ? 'Raising' : 'Raised'} value={venture.funding_amount} />}
            {venture.revenue_range && <FinRow label="Revenue" value={venture.revenue_range} />}
            {venture.runway && <FinRow label="Runway" value={venture.runway} />}
            {venture.seeking_investment && (
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <DsrtChip size="sm" tone="accent">Currently Raising</DsrtChip>
              </div>
            )}
            {!stageLabel && !venture.funding_amount && !venture.revenue_range && !venture.runway && (
              <p className="text-[12px] text-white/40 italic">No financial info yet.{isOwner && ' Click edit to add.'}</p>
            )}
          </div>
        )}
      </div>
    </DsrtPanel>
  )
}

function FinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono text-white/50">{label}</span>
      <span className="text-[12.5px] font-semibold text-white">{value}</span>
    </div>
  )
}

// ── SOCIAL LINKS ──────────────────────────
const LINK_TYPES = [
  { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://yourvent.com' },
  { key: 'github', label: 'GitHub', icon: GithubLogo, placeholder: 'https://github.com/...' },
  { key: 'twitter', label: 'X', icon: TwitterLogo, placeholder: 'https://x.com/...' },
  { key: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, placeholder: 'https://linkedin.com/company/...' },
  { key: 'youtube', label: 'YouTube', icon: YoutubeLogo, placeholder: 'https://youtube.com/@...' },
  { key: 'instagram', label: 'Instagram', icon: InstagramLogo, placeholder: 'https://instagram.com/...' },
  { key: 'pitch_deck_url', label: 'Pitch', icon: FilePdf, placeholder: 'https://...pdf' },
]

function SocialLinksCard({ venture, isOwner, onUpdate }: { venture: any; isOwner: boolean; onUpdate: (p: any) => Promise<void> }) {
  const socialLinks = venture.social_links || {}
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const getVal = (key: string) => {
    if (key === 'website') return venture.website
    if (key === 'pitch_deck_url') return venture.pitch_deck_url
    return socialLinks[key]
  }

  const startEdit = (key: string) => { setEditing(key); setDraft(getVal(key) || '') }

  const save = async (key: string) => {
    if (key === 'website') await onUpdate({ website: draft || null })
    else if (key === 'pitch_deck_url') await onUpdate({ pitch_deck_url: draft || null })
    else await onUpdate({ social_links: { ...socialLinks, [key]: draft || undefined } })
    setEditing(null)
  }

  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[13px] font-semibold text-white">Social Links</h3>
      </div>
      <div className="p-3 grid grid-cols-4 gap-2">
        {LINK_TYPES.map(type => {
          const Icon = type.icon
          const value = getVal(type.key)
          const active = !!value

          if (editing === type.key) {
            return (
              <div key={type.key} className="col-span-4 flex items-center gap-1.5 p-2 bg-white/[0.04] rounded-lg">
                <Icon size={13} className="text-white/60 flex-shrink-0" />
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={type.placeholder}
                  className="flex-1 bg-white/[0.06] border border-white/[0.1] text-white text-[12px] rounded px-2 py-1 outline-none min-w-0" />
                <button onClick={() => save(type.key)} className="w-6 h-6 rounded bg-white text-black flex items-center justify-center"><Check size={11} weight="bold" /></button>
                <button onClick={() => setEditing(null)} className="w-6 h-6 rounded text-white/50 flex items-center justify-center"><X size={11} /></button>
              </div>
            )
          }

          return (
            <a
              key={type.key}
              href={active ? value : undefined}
              target={active ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={(e) => { if (!active && isOwner) { e.preventDefault(); startEdit(type.key) } }}
              className={
                'relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all border ' +
                (active
                  ? 'bg-[#1e3a5f]/40 border-[#2c5282]/40 hover:bg-[#1e3a5f]/60 text-white'
                  : 'bg-white/[0.01] border border-dashed border-white/[0.08] ' + (isOwner ? 'text-white/40 hover:text-white cursor-pointer' : 'text-white/20'))
              }
            >
              <Icon size={14} weight={active ? 'fill' : 'regular'} />
              <span className="text-[8.5px] font-medium leading-tight">{type.label}</span>
            </a>
          )
        })}
      </div>
    </DsrtPanel>
  )
}

// ── TEAM CARD ──────────────────────────
function TeamCard({ team, isOwner, onInvite, slug }: { team: any[]; isOwner: boolean; onInvite: () => void; slug: string }) {
  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-white">Team ({team.length})</h3>
        {isOwner && (
          <button onClick={onInvite} className="text-[11px] font-medium text-white/70 hover:text-white flex items-center gap-1">
            <UserPlus size={11} /> Invite
          </button>
        )}
      </div>
      <div className="p-3">
        {team.length === 0 ? (
          <div className="py-3 text-center">
            <p className="text-[12px] text-white/40">No members yet.</p>
            {isOwner && <DsrtButton size="xs" variant="outline" onClick={onInvite} className="mt-2"><Plus size={10} /> Add member</DsrtButton>}
          </div>
        ) : (
          <div className="space-y-1">
            {team.slice(0, 5).map((m: any) => {
              const u = m.users
              const name = u?.full_name || m.name
              return (
                <a key={m.id} href={u?.username ? '/profile/' + u.username : '#'} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <DsrtAvatar src={u?.avatar_url || m.avatar_url} name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{name}</p>
                    <p className="text-[10.5px] text-white/45 truncate">{m.role}</p>
                  </div>
                  {m.is_founder && <DsrtChip size="sm" tone="accent">Founder</DsrtChip>}
                </a>
              )
            })}
          </div>
        )}
      </div>
    </DsrtPanel>
  )
}

// ── INVITE MEMBER MODAL ──────────────────
function InviteMemberModal({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const [mode, setMode] = useState<'search' | 'email'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (mode !== 'search' || query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/users/search?q=' + encodeURIComponent(query))
        const j = await res.json()
        setResults(j.users || j.results || [])
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [query, mode])

  const inviteUser = async (userId: string) => {
    setInviting(true)
    try {
      const res = await fetch('/api/ventures/' + slug + '/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Invitation sent'); onClose()
    } catch { toast.error('Failed to invite') }
    finally { setInviting(false) }
  }

  const inviteEmail = async () => {
    if (!email.trim() || !email.includes('@')) return toast.error('Enter a valid email')
    setInviting(true)
    try {
      const res = await fetch('/api/ventures/' + slug + '/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success('Invitation email sent'); onClose()
    } catch { toast.error('Failed to send') }
    finally { setInviting(false) }
  }

  return (
    <DsrtModal open={open} onOpenChange={(o) => !o && onClose()} title="Invite Team Member" description="Add builders by DSRT username or email" size="md">
      <div className="border-b border-white/[0.06] -mx-5 mb-4 px-5">
        <div className="flex gap-4">
          <button onClick={() => setMode('search')} className={`py-2 text-[12.5px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${mode === 'search' ? 'text-white border-white' : 'text-white/45 border-transparent hover:text-white/80'}`}>
            <MagnifyingGlass size={12} /> Search DSRT
          </button>
          <button onClick={() => setMode('email')} className={`py-2 text-[12.5px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${mode === 'email' ? 'text-white border-white' : 'text-white/45 border-transparent hover:text-white/80'}`}>
            <Envelope size={12} /> Invite by Email
          </button>
        </div>
      </div>

      {mode === 'search' ? (
        <div className="space-y-3">
          <DsrtInput
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            icon={<MagnifyingGlass size={14} />}
          />
          {query.length < 2 ? (
            <p className="text-[12px] text-white/40 text-center py-8">Type at least 2 characters.</p>
          ) : results.length === 0 ? (
            <p className="text-[12px] text-white/40 text-center py-8">No matching builders found.</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {results.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03]">
                  <DsrtAvatar src={u.avatar_url} name={u.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{u.full_name}</p>
                    <p className="text-[11px] text-white/45 truncate">@{u.username}</p>
                  </div>
                  <DsrtButton size="xs" variant="primary" loading={inviting} onClick={() => inviteUser(u.id)}>Invite</DsrtButton>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider mb-1.5">Email Address</label>
            <DsrtInput autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
          </div>
          <p className="text-[11px] text-white/45 leading-relaxed">
            We&apos;ll send an invitation email with a link to join your venture on DSRT.
          </p>
          <DsrtButton size="md" variant="primary" fullWidth loading={inviting} onClick={inviteEmail}>
            <Envelope size={12} /> Send Invitation
          </DsrtButton>
        </div>
      )}
    </DsrtModal>
  )
}