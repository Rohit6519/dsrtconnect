'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { ProfileCard, ProfileCardHeader } from '../shared/ProfileCard'
import { ImageLightbox } from '../shared/ImageLightbox'
import { EducationEditor } from './EducationEditor'
import { cn } from '@/lib/utils'
import {
  GraduationCap,
  Plus,
  PencilSimple,
  Trash,
  Spinner,
} from '@phosphor-icons/react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface EducationEntry {
  id: string
  institution_id?: string | null
  institution_name: string
  degree?: string | null
  field?: string | null
  education_level?: string | null
  start_year?: number | null
  end_year?: number | null
  is_current?: boolean
  grade?: string | null
  tagline?: string | null
  description?: string | null
  activities?: string | null
  images?: string[]
}

interface EducationSectionProps {
  userId: string
  isOwner: boolean
}

// ─── Level display names ───────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  primary:          'Primary',
  secondary:        'Secondary (10th)',
  higher_secondary: 'Higher Secondary (12th)',
  diploma:          'Diploma',
  bachelor:         'Bachelor\'s',
  master:           'Master\'s',
  phd:              'PhD',
  certification:    'Certification',
  bootcamp:         'Bootcamp',
  other:            'Other',
}

// ─── Main Component ────────────────────────────────────────────────────────

export function EducationSection({ userId, isOwner }: EducationSectionProps) {
  const [entries, setEntries] = useState<EducationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<EducationEntry | null>(null)

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Load
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/profile/education?user_id=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data.education || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  const handleDelete = async (id: string, institutionName: string) => {
    if (!confirm(`Delete education entry for "${institutionName}"?`)) return
    try {
      const res = await fetch(`/api/profile/education?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setEntries((cur) => cur.filter((e) => e.id !== id))
      toast.success('Education deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleSaveEntry = (saved: EducationEntry) => {
    if (editingEntry) {
      // Update in place
      setEntries((cur) =>
        cur.map((e) => (e.id === saved.id ? saved : e))
          .sort((a, b) => {
            if (a.is_current && !b.is_current) return -1
            if (!a.is_current && b.is_current) return 1
            return (b.start_year || 0) - (a.start_year || 0)
          })
      )
    } else {
      // Insert new + resort
      setEntries((cur) =>
        [...cur, saved].sort((a, b) => {
          if (a.is_current && !b.is_current) return -1
          if (!a.is_current && b.is_current) return 1
          return (b.start_year || 0) - (a.start_year || 0)
        })
      )
    }
    setEditorOpen(false)
    setEditingEntry(null)
  }

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const showAddButton = isOwner
  const hasContent = entries.length > 0

  if (!hasContent && !isOwner) return null

  return (
    <>
      <ProfileCard>
        <ProfileCardHeader
          title="Education"
          action={
            showAddButton && (
              <button
                onClick={() => { setEditingEntry(null); setEditorOpen(true) }}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Plus className="w-3 h-3" weight="bold" />
                Add
              </button>
            )
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-4 h-4 text-zinc-600 animate-spin" weight="bold" />
          </div>
        ) : entries.length === 0 && isOwner ? (
          <button
            onClick={() => { setEditingEntry(null); setEditorOpen(true) }}
            className="w-full py-6 border-2 border-dashed border-zinc-800 rounded-xl text-[12px] text-zinc-600 italic hover:border-zinc-700 hover:text-zinc-400 transition-colors flex flex-col items-center gap-2"
          >
            <GraduationCap className="w-6 h-6" weight="duotone" />
            Add your primary school, college, university, or certification
          </button>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-zinc-800/80" />

            <div className="space-y-4">
              {entries.map((entry) => (
                <EducationTimelineItem
                  key={entry.id}
                  entry={entry}
                  isOwner={isOwner}
                  onEdit={() => { setEditingEntry(entry); setEditorOpen(true) }}
                  onDelete={() => handleDelete(entry.id, entry.institution_name)}
                  onImageClick={(images, idx) => openLightbox(images, idx)}
                />
              ))}
            </div>
          </div>
        )}
      </ProfileCard>

      <AnimatePresence>
        {editorOpen && (
          <EducationEditor
            entry={editingEntry}
            onSave={handleSaveEntry}
            onCancel={() => { setEditorOpen(false); setEditingEntry(null) }}
          />
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={lightboxImages}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  )
}

// ─── Timeline Item ─────────────────────────────────────────────────────────

function EducationTimelineItem({
  entry,
  isOwner,
  onEdit,
  onDelete,
  onImageClick,
}: {
  entry: EducationEntry
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
  onImageClick: (images: string[], index: number) => void
}) {
  const yearRange = (() => {
    const s = entry.start_year
    const e = entry.is_current ? 'Present' : entry.end_year
    if (s && e) return `${s} – ${e}`
    if (s) return `${s}`
    if (e) return `${e}`
    return ''
  })()

  const levelLabel = entry.education_level ? LEVEL_LABELS[entry.education_level] : null
  const primaryImage = entry.images?.[0]

  // Compose title: degree + field, or degree, or level
  const titleParts: string[] = []
  if (entry.degree) titleParts.push(entry.degree)
  if (entry.field) titleParts.push(entry.field)
  const title = titleParts.length > 0
    ? titleParts.join(' in ')
    : levelLabel || 'Education'

  return (
    <div className="relative pl-6 group">
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#0a0a0b] shadow-[0_0_0_1px_rgba(59,130,246,0.3)]" />

      <div className="flex gap-3">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Institution + owner controls */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-[13.5px] font-bold text-zinc-100 leading-tight truncate">
                {entry.institution_name}
              </h3>
              <p className="text-[12px] text-zinc-400 mt-0.5 leading-tight">
                {title}
              </p>
              {(yearRange || levelLabel) && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {levelLabel && title !== levelLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 uppercase tracking-wider font-bold">
                      {levelLabel}
                    </span>
                  )}
                  {yearRange && (
                    <span className="text-[11px] text-zinc-600">{yearRange}</span>
                  )}
                  {entry.grade && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[11px] text-zinc-600">{entry.grade}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {isOwner && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={onEdit}
                  className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title="Edit"
                >
                  <PencilSimple className="w-3 h-3" weight="bold" />
                </button>
                <button
                  onClick={onDelete}
                  className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash className="w-3 h-3" weight="bold" />
                </button>
              </div>
            )}
          </div>

          {/* Tagline */}
          {entry.tagline && (
            <p className="text-[11.5px] text-zinc-500 italic mt-1 leading-snug">
              {entry.tagline}
            </p>
          )}

          {/* Description */}
          {entry.description && (
            <p className="text-[12px] text-zinc-400 mt-1.5 leading-[1.55] line-clamp-3">
              {entry.description}
            </p>
          )}

          {/* Activities */}
          {entry.activities && (
            <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
              <span className="text-zinc-600 font-semibold">Activities: </span>
              {entry.activities}
            </p>
          )}

          {/* Image gallery (if 2+ images, show mini strip below content) */}
          {entry.images && entry.images.length > 1 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {entry.images.slice(1, 5).map((img, i) => (
                <button
                  key={img}
                  onClick={() => onImageClick(entry.images || [], i + 1)}
                  className="w-10 h-10 rounded-md overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {entry.images.length > 5 && (
                <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                  +{entry.images.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right-side primary thumbnail */}
        {primaryImage && (
          <button
            onClick={() => onImageClick(entry.images || [], 0)}
            className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 flex-shrink-0 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImage}
              alt={entry.institution_name}
              className="w-full h-full object-cover"
            />
          </button>
        )}
      </div>
    </div>
  )
}