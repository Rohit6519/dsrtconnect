'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  MagnifyingGlass, X, ArrowSquareOut, Star, CircleNotch,
  BookOpen, ChartLineUp, CurrencyDollar, Compass, Brain,
  Wrench, Newspaper, Books, BookmarkSimple, FolderSimple,
  Rocket, GithubLogo, Globe, FileText, Database, VideoCamera,
  PaintBrush, Link as LinkIcon
} from '@phosphor-icons/react'
import { DsrtPage, DsrtPanel, DsrtSection, DsrtInput, DsrtTabs, DsrtEmpty, DsrtGrid, DsrtButton } from '@/components/dsrt'

interface UnifiedResource {
  id: string
  title: string
  description?: string | null
  provider: string
  category: string
  url: string
  source_type: 'founder' | 'project' | 'venture'
  source_name?: string | null
  source_slug?: string | null
  is_featured?: boolean
  is_saved?: boolean
  created_at: string
  type?: string
}

interface HubResponse {
  resources: UnifiedResource[]
  total: number
  categoryCounts: Record<string, number>
  sourceCounts: { all: number; founder: number; project: number; venture: number }
  savedCount: number
  featuredCount: number
}

const CATEGORY_ICONS: Record<string, any> = {
  'Articles & Guides': BookOpen,
  'Product & Growth': ChartLineUp,
  'Investor & Fundraising': CurrencyDollar,
  'Operator Playbooks': Compass,
  'Founder Mindset': Brain,
  'Strategy & Thinking': Books,
  'Engineering & Craft': Wrench,
  'Living Resources': Newspaper,
  repository: GithubLogo,
  demo: Globe,
  documentation: FileText,
  paper: FileText,
  dataset: Database,
  video: VideoCamera,
  design: PaintBrush,
  website: Globe,
  other: LinkIcon,
}

const SOURCE_META: Record<string, { label: string; icon: any; description: string }> = {
  all: { label: 'All Sources', icon: Books, description: 'Everything across DSRT' },
  founder: { label: 'DSRT Library', icon: BookOpen, description: 'Curated founder resources' },
  project: { label: 'My Projects', icon: FolderSimple, description: 'Technical project resources' },
  venture: { label: 'My Ventures', icon: Rocket, description: 'Venture strategic docs' },
}

type ViewTab = 'all' | 'saved' | 'featured'

export default function ResourcesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] bg-[#05070D] flex items-center justify-center">
        <CircleNotch size={24} className="animate-spin text-white/40" />
      </div>
    }>
      <ResourcesContent />
    </Suspense>
  )
}

function ResourcesContent() {
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<'all' | 'founder' | 'project' | 'venture'>('all')
  const [viewTab, setViewTab] = useState<ViewTab>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSource !== 'all') params.set('source', selectedSource)
      if (search.trim()) params.set('q', search.trim())
      if (viewTab === 'saved') params.set('saved', '1')
      if (viewTab === 'featured') params.set('featured', '1')

      const res = await fetch(`/api/resources/hub?${params.toString()}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      toast.error('Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedSource, viewTab])
  useEffect(() => { const timer = setTimeout(fetchData, 300); return () => clearTimeout(timer) }, [search])

  const handleToggleSave = async (resource: UnifiedResource) => {
    const wasSaved = resource.is_saved
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        resources: prev.resources.map(r => r.id === resource.id && r.source_type === resource.source_type ? { ...r, is_saved: !wasSaved } : r),
        savedCount: wasSaved ? prev.savedCount - 1 : prev.savedCount + 1,
      }
    })

    try {
      await fetch('/api/resources/save', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resource.id, source_type: resource.source_type })
      })
      toast.success(wasSaved ? 'Removed from library' : 'Saved to library')
    } catch {
      fetchData()
      toast.error('Could not update saved status')
    }
  }

  const grouped = useMemo(() => {
    if (!data?.resources) return []
    const map = new Map<string, UnifiedResource[]>()
    let filtered = data.resources
    if (selectedCategory) filtered = filtered.filter(r => r.category === selectedCategory)

    filtered.forEach(r => {
      if (!map.has(r.category)) map.set(r.category, [])
      map.get(r.category)!.push(r)
    })
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [data, selectedCategory])

  const totalFiltered = grouped.reduce((sum, cat) => sum + cat.items.length, 0)

  return (
    <DsrtPage width="wide" className="space-y-8 py-8">
      {/* Header */}
      <div>
        <div className="flex items-start gap-4">
          {/* Custom Resource Icon applied successfully here */}
          <div className="w-14 h-14 rounded-xl bg-[#0a0a0f] border border-[#2c5282]/40 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden p-2">
            <img src="/dsrt-resources-icon.png" alt="Resources" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-white tracking-tight leading-snug">Resources Hub</h1>
            <p className="text-[14px] text-white/60 mt-1 max-w-2xl leading-relaxed">
              A unified library of DSRT founder essays, project technical resources, and venture strategic documents.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-6 pb-6 border-b border-white/[0.06] flex-wrap">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">Total</p>
            <p className="text-[20px] font-bold text-white tabular-nums">{data?.total || 0}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">DSRT Library</p>
            <p className="text-[20px] font-bold text-white tabular-nums">{data?.sourceCounts.founder || 0}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">Projects</p>
            <p className="text-[20px] font-bold text-white tabular-nums">{data?.sourceCounts.project || 0}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">Ventures</p>
            <p className="text-[20px] font-bold text-white tabular-nums">{data?.sourceCounts.venture || 0}</p>
          </div>
        </div>
      </div>

      <DsrtGrid cols={{ base: 2, md: 4 }} gap="sm">
        {(['all', 'founder', 'project', 'venture'] as const).map(src => {
          const meta = SOURCE_META[src]
          const Icon = meta.icon
          const count = data?.sourceCounts[src] || 0
          const active = selectedSource === src
          return (
            <button
              key={src}
              onClick={() => { setSelectedSource(src); setSelectedCategory(null) }}
              className={`p-4 rounded-xl border transition-all text-left ${
                active
                  ? 'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] border-[#2c5282]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={18} weight={active ? 'fill' : 'regular'} className={active ? 'text-white' : 'text-white/40'} />
                <span className={`text-[11px] font-mono ${active ? 'text-white' : 'text-white/40'}`}>{count}</span>
              </div>
              <p className={`text-[13px] font-bold ${active ? 'text-white' : 'text-white/80'}`}>{meta.label}</p>
              <p className={`text-[10.5px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-white/40'}`}>{meta.description}</p>
            </button>
          )
        })}
      </DsrtGrid>

      {/* FIXED: Removed Floating Nav height offset, so tabs stick perfectly below standard header */}
      <div className="sticky top-[116px] md:top-[64px] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 py-2 border-b border-white/[0.06]">
        <DsrtTabs
          variant="underline"
          activeValue={viewTab}
          onValueChange={(v) => setViewTab(v as ViewTab)}
          tabs={[
            { value: 'all', label: 'All Resources', badge: data?.total || 0 },
            { value: 'saved', label: 'Saved', badge: data?.savedCount || 0 },
            { value: 'featured', label: 'Featured', badge: data?.featuredCount || 0 },
          ]}
        />
      </div>

      <div className="space-y-4">
        <DsrtInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, authors, topics..."
          icon={<MagnifyingGlass size={16} />}
          sizeVariant="lg"
        />

        {data?.categoryCounts && Object.keys(data.categoryCounts).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pb-4">
            <DsrtButton size="xs" variant={selectedCategory === null ? 'white' : 'outline'} onClick={() => setSelectedCategory(null)}>
              All Categories
            </DsrtButton>
            {Object.entries(data.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const Icon = CATEGORY_ICONS[cat] || BookOpen
                const isActive = selectedCategory === cat
                return (
                  <DsrtButton key={cat} size="xs" variant={isActive ? 'white' : 'outline'} onClick={() => setSelectedCategory(isActive ? null : cat)} className="gap-1.5">
                    <Icon size={11} weight={isActive ? 'fill' : 'regular'} />
                    {cat}
                    <span className={`text-[10px] font-mono ${isActive ? 'text-black/60' : 'text-white/40'}`}>{count}</span>
                  </DsrtButton>
                )
              })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <CircleNotch size={20} className="animate-spin text-white/40 mr-2" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-white/40">Loading library...</span>
        </div>
      ) : grouped.length === 0 ? (
        <DsrtPanel>
          {/* Using instantiated React Element safely to avoid object child error */}
          <DsrtEmpty 
            title={viewTab === 'saved' ? 'Nothing saved yet' : 'No resources found'}
            description={viewTab === 'saved' ? 'Bookmark resources to access them here.' : 'Try clearing your filters.'}
            icon={viewTab === 'saved' ? <BookmarkSimple size={24} className="text-white/40" /> : <BookOpen size={24} className="text-white/40" />}
            action={
              <DsrtButton variant="outline" onClick={() => { setSearch(''); setSelectedCategory(null); setViewTab('all') }}>
                Reset filters
              </DsrtButton>
            }
          />
        </DsrtPanel>
      ) : (
        <div className="space-y-12">
          {grouped.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] || BookOpen
            const featuredInCat = cat.items.filter(i => i.is_featured).length
            return (
              <section key={cat.name}>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Icon size={14} weight="regular" className="text-[#93c5fd]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-[16px] font-bold text-white tracking-tight capitalize">{cat.name}</h2>
                    <p className="text-[11.5px] font-mono text-white/50 mt-0.5">
                      {cat.items.length} resource{cat.items.length !== 1 ? 's' : ''}
                      {featuredInCat > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-300/80">
                          <Star size={10} weight="fill" />
                          {featuredInCat} featured
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <DsrtGrid cols={{ base: 1, md: 2, lg: 3 }}>
                  {cat.items.map((item) => (
                    <UnifiedResourceCard
                      key={`${item.source_type}-${item.id}`}
                      resource={item}
                      onToggleSave={() => handleToggleSave(item)}
                    />
                  ))}
                </DsrtGrid>
              </section>
            )
          })}
        </div>
      )}
    </DsrtPage>
  )
}

function UnifiedResourceCard({ resource, onToggleSave }: { resource: UnifiedResource, onToggleSave: () => void }) {
  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSave()
  }

  const sourceBadge = {
    founder: { label: 'DSRT', icon: BookOpen, color: 'text-[#93c5fd] bg-[#1e3a5f]/40 border-[#2c5282]/40' },
    project: { label: 'PROJECT', icon: FolderSimple, color: 'text-white/60 bg-white/[0.04] border-white/[0.08]' },
    venture: { label: 'VENTURE', icon: Rocket, color: 'text-white/60 bg-white/[0.04] border-white/[0.08]' },
  }[resource.source_type]

  const SourceIcon = sourceBadge.icon

  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block group h-full">
      <DsrtPanel padding="md" className="h-full flex flex-col group-hover:border-white/[0.14] transition-colors relative">
        <button
          onClick={handleSaveClick}
          className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            resource.is_saved
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-transparent text-white/30 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <BookmarkSimple size={14} weight={resource.is_saved ? 'fill' : 'regular'} />
        </button>

        <div className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider mb-4 ${sourceBadge.color}`}>
          <SourceIcon size={10} weight="regular" />
          {sourceBadge.label}
        </div>

        <div className="pr-8 mb-3">
          <div className="flex items-start gap-1.5 mb-1.5">
            <h3 className="text-[14px] font-bold text-white group-hover:text-[#93c5fd] transition-colors leading-snug">
              {resource.title}
            </h3>
            {resource.is_featured && <Star size={11} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />}
          </div>
          <p className="text-[11.5px] text-white/50 font-medium">
            {resource.source_type !== 'founder' && resource.source_slug ? (
              <Link
                href={`/${resource.source_type === 'project' ? 'projects' : 'ventures'}/${resource.source_slug}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-white transition-colors underline"
              >
                {resource.provider}
              </Link>
            ) : (
              resource.provider
            )}
          </p>
        </div>

        {resource.description && (
          <p className="text-[12.5px] text-white/60 leading-relaxed line-clamp-3 mb-4 flex-1">
            {resource.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold">
            Open →
          </span>
          <ArrowSquareOut size={14} className="text-white/40 group-hover:text-white transition-colors" />
        </div>
      </DsrtPanel>
    </a>
  )
}