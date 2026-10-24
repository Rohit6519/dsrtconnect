'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon, VideoCamera, FileText, Star, Plus,
  CircleNotch, PencilSimple, Play, Trash, ArrowRight,
  DownloadSimple
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { MediaUploadStudio } from './MediaUploadStudio'
import { MediaEditorModal } from './MediaEditorModal'

interface Props {
  slug: string
  isOwner: boolean
}

type TabType = 'all' | 'image' | 'video' | 'document' | 'featured'

export function VentureMediaTab({ slug, isOwner }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ventureId, setVentureId] = useState<string | null>(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any | null>(null)
  const [previewAsset, setPreviewAsset] = useState<any | null>(null)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/ventures/${slug}/media`
      const params = new URLSearchParams()
      if (activeTab === 'featured') params.set('featured', '1')
      else if (activeTab !== 'all') params.set('type', activeTab)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load media')
      setItems(json.media || [])
    } catch (e: any) {
      toast.error(e.message || 'Could not load media library')
    } finally {
      setLoading(false)
    }
  }, [slug, activeTab])

  useEffect(() => { loadMedia() }, [loadMedia])

  // Fetch venture ID for realtime subscription
  useEffect(() => {
    fetch(`/api/ventures/${slug}`).then(r => r.json()).then(d => {
      if (d.venture?.id) setVentureId(d.venture.id)
    }).catch(() => {})
  }, [slug])

  // Real-time sync: refresh when media changes on this venture
  useEffect(() => {
    if (!ventureId) return
    const channel = supabase
      .channel(`venture-media:${ventureId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venture_media_assets',
          filter: `venture_id=eq.${ventureId}`,
        },
        () => { loadMedia() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [ventureId, loadMedia, supabase])

  const toggleFeatured = async (asset: any, e: React.MouseEvent) => {
    e.stopPropagation()
    // Optimistic update
    setItems(prev => prev.map(a => a.id === asset.id ? { ...a, featured: !a.featured } : a))
    try {
      const res = await fetch(`/api/ventures/${slug}/media/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !asset.featured })
      })
      if (!res.ok) throw new Error()
      toast.success(asset.featured ? 'Unfeatured' : 'Featured')
    } catch {
      // Rollback
      setItems(prev => prev.map(a => a.id === asset.id ? { ...a, featured: asset.featured } : a))
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this asset? It can be restored within 30 days.')) return
    // Optimistic remove
    setItems(prev => prev.filter(a => a.id !== assetId))
    try {
      const res = await fetch(`/api/ventures/${slug}/media/${assetId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Asset moved to trash')
    } catch {
      toast.error('Failed to delete')
      loadMedia()
    }
  }

  const TABS: { id: TabType; label: string; icon: any }[] = [
    { id: 'all', label: 'All Media', icon: ImageIcon },
    { id: 'image', label: 'Images', icon: ImageIcon },
    { id: 'video', label: 'Videos', icon: VideoCamera },
    { id: 'document', label: 'Documents', icon: FileText },
    { id: 'featured', label: 'Featured', icon: Star },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white">Media Library</h2>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Images, videos, and documents for this venture
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black font-bold text-[12.5px] hover:bg-zinc-100 transition-colors shadow-md"
          >
            <Plus size={14} weight="bold" /> Add Media
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.08] pb-3 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 h-8 rounded-lg transition-colors whitespace-nowrap ' +
                (active
                  ? 'bg-white/[0.08] text-white border border-white/[0.12]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.03]')
              }
            >
              <Icon size={14} weight={active ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-white/50 text-xs">
          <CircleNotch size={18} className="animate-spin mr-2" /> Loading media library…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-16 text-center">
          <ImageIcon size={32} className="text-white/20 mx-auto mb-3" />
          <h3 className="text-[15px] font-bold text-white mb-1">No media assets yet</h3>
          <p className="text-[12.5px] text-white/45 max-w-sm mx-auto mb-6">
            {isOwner
              ? 'Upload product screenshots, team photos, or pitch videos.'
              : 'This venture has not published media assets yet.'}
          </p>
          {isOwner && (
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[12.5px] font-bold"
            >
              <Plus size={13} weight="bold" /> Upload first asset
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(asset => (
            <MediaGridItem
              key={asset.id}
              asset={asset}
              isOwner={isOwner}
              onPreview={() => setPreviewAsset(asset)}
              onToggleFeatured={(e) => toggleFeatured(asset, e)}
              onEdit={(e) => { e.stopPropagation(); setEditingAsset(asset) }}
              onDelete={(e) => handleDelete(asset.id, e)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <MediaUploadStudio
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        slug={slug}
        onSuccess={loadMedia}
      />

      {editingAsset && (
        <MediaEditorModal
          open={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          slug={slug}
          asset={editingAsset}
          onSuccess={loadMedia}
        />
      )}

      {previewAsset && (
        <MediaLightbox
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  )
}

function MediaGridItem({ asset, isOwner, onPreview, onToggleFeatured, onEdit, onDelete }: {
  asset: any; isOwner: boolean;
  onPreview: () => void
  onToggleFeatured: (e: React.MouseEvent) => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onPreview}
      className="group relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.08] hover:border-white/[0.2] transition-all cursor-pointer"
    >
      {asset.media_type === 'image' ? (
        <img
          src={asset.asset_url}
          alt={asset.alt_text || asset.title || ''}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : asset.media_type === 'video' ? (
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
          <video src={asset.asset_url} className="w-full h-full object-cover opacity-70" muted />
          <div className="absolute w-11 h-11 rounded-full bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-white">
            <Play size={16} weight="fill" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-zinc-900 to-zinc-950">
          <FileText size={26} className="text-white/40 mb-2" />
          <span className="text-[11px] font-semibold text-white/70 truncate w-full">{asset.title}</span>
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
        {asset.featured && (
          <span className="p-1 rounded bg-amber-500 text-black shadow-md" title="Featured">
            <Star size={10} weight="fill" />
          </span>
        )}
        {asset.visibility !== 'public' && (
          <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10 text-[9px] font-semibold text-white/80 uppercase tracking-wider">
            {asset.visibility === 'venture_members' ? 'Team' : 'Private'}
          </span>
        )}
      </div>

      {/* Title overlay */}
      {asset.title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[11px] font-semibold text-white truncate">{asset.title}</p>
        </div>
      )}

      {/* Owner actions */}
      {isOwner && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggleFeatured}
            className={
              'w-7 h-7 rounded-lg border flex items-center justify-center transition-colors backdrop-blur ' +
              (asset.featured
                ? 'bg-amber-500 border-amber-400 text-black'
                : 'bg-black/70 border-white/20 hover:bg-black text-white')
            }
            title={asset.featured ? 'Unfeature' : 'Feature'}
          >
            <Star size={12} weight={asset.featured ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 hover:bg-black text-white flex items-center justify-center transition-colors"
            title="Edit"
          >
            <PencilSimple size={12} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 hover:bg-red-500/30 text-red-300 flex items-center justify-center transition-colors"
            title="Delete"
          >
            <Trash size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function MediaLightbox({ asset, onClose }: { asset: any; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-6xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {asset.media_type === 'image' ? (
          <img src={asset.asset_url} alt={asset.alt_text || ''} className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl" />
        ) : asset.media_type === 'video' ? (
          <video src={asset.asset_url} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl shadow-2xl" />
        ) : (
          <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center max-w-md">
            <FileText size={40} className="text-zinc-400 mx-auto mb-3" />
            <p className="text-white font-bold text-lg mb-2">{asset.title}</p>
            {asset.description && (
              <p className="text-zinc-400 text-sm mb-4">{asset.description}</p>
            )}
            <a
              href={asset.asset_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[12.5px] font-bold"
            >
              <DownloadSimple size={13} weight="bold" /> Download
            </a>
          </div>
        )}
        <div className="mt-4 text-center max-w-2xl">
          {asset.title && <p className="text-[15px] font-bold text-white">{asset.title}</p>}
          {asset.description && <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">{asset.description}</p>}
          {asset.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {asset.tags.map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10.5px] font-semibold text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}