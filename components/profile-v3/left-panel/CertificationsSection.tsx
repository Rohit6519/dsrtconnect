'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { ProfileCard, ProfileCardHeader } from '../shared/ProfileCard'
import { CertificationEditor } from './CertificationEditor'
import { CertificationDetailModal } from './CertificationDetailModal'
import { cn } from '@/lib/utils'
import {
  Certificate,
  Plus,
  PencilSimple,
  Trash,
  Spinner,
  CaretRight,
  X,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CertificationEntry {
  id: string
  name: string
  issuer?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  credential_url?: string | null
  image_url: string
  skills_gained?: string[]
  position?: number
}

interface CertificationsSectionProps {
  userId: string
  isOwner: boolean
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CertificationsSection({ userId, isOwner }: CertificationsSectionProps) {
  const [entries, setEntries] = useState<CertificationEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CertificationEntry | null>(null)

  const [detailCert, setDetailCert] = useState<CertificationEntry | null>(null)
  const [viewAllOpen, setViewAllOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/profile/certifications?user_id=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data.certifications || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete certificate "${name}"?`)) return
    try {
      const res = await fetch(`/api/profile/certifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setEntries((cur) => cur.filter((e) => e.id !== id))
      toast.success('Certificate deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleSave = (saved: CertificationEntry) => {
    if (editingEntry) {
      setEntries((cur) => cur.map((e) => (e.id === saved.id ? saved : e)))
    } else {
      setEntries((cur) => [...cur, saved])
    }
    setEditorOpen(false)
    setEditingEntry(null)
  }

  if (!isOwner && entries.length === 0) return null

  const PREVIEW_COUNT = 4
  const previewCerts = entries.slice(0, PREVIEW_COUNT)
  const hasMore = entries.length > PREVIEW_COUNT

  return (
    <>
      <ProfileCard>
        <ProfileCardHeader
          title="Certifications"
          action={
            isOwner && (
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
        ) : entries.length === 0 ? (
          <button
            onClick={() => { setEditingEntry(null); setEditorOpen(true) }}
            className="w-full py-6 border-2 border-dashed border-zinc-800 rounded-xl text-[12px] text-zinc-600 italic hover:border-zinc-700 hover:text-zinc-400 transition-colors flex flex-col items-center gap-2"
          >
            <Certificate className="w-6 h-6" weight="duotone" />
            Add certifications, courses, or credentials
          </button>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 gap-2">
              {previewCerts.map((cert) => (
                <CertificationCard
                  key={cert.id}
                  cert={cert}
                  isOwner={isOwner}
                  onClick={() => setDetailCert(cert)}
                  onEdit={() => { setEditingEntry(cert); setEditorOpen(true) }}
                  onDelete={() => handleDelete(cert.id, cert.name)}
                />
              ))}
            </div>

            {/* View All */}
            {hasMore && (
              <button
                onClick={() => setViewAllOpen(true)}
                className="w-full mt-3 flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors py-2"
              >
                View all {entries.length}
                <CaretRight className="w-3 h-3" weight="bold" />
              </button>
            )}
          </>
        )}
      </ProfileCard>

      {/* Editor */}
      <AnimatePresence>
        {editorOpen && (
          <CertificationEditor
            entry={editingEntry}
            onSave={handleSave}
            onCancel={() => { setEditorOpen(false); setEditingEntry(null) }}
          />
        )}
      </AnimatePresence>

      {/* Detail lightbox */}
      <AnimatePresence>
        {detailCert && (
          <CertificationDetailModal
            cert={detailCert}
            onClose={() => setDetailCert(null)}
          />
        )}
      </AnimatePresence>

      {/* View All modal */}
      <AnimatePresence>
        {viewAllOpen && (
          <ViewAllCertificatesModal
            certs={entries}
            isOwner={isOwner}
            onClose={() => setViewAllOpen(false)}
            onSelect={(c) => { setViewAllOpen(false); setDetailCert(c) }}
            onEdit={(c) => { setViewAllOpen(false); setEditingEntry(c); setEditorOpen(true) }}
            onDelete={(c) => handleDelete(c.id, c.name)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Certification Card (grid item) ───────────────────────────────────────

function CertificationCard({
  cert,
  isOwner,
  onClick,
  onEdit,
  onDelete,
}: {
  cert: CertificationEntry
  isOwner: boolean
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer bg-zinc-950">
      <button onClick={onClick} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cert.image_url}
          alt={cert.name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay with title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
          <p className="text-[11px] font-bold text-white truncate leading-tight">
            {cert.name}
          </p>
          {cert.issuer && (
            <p className="text-[9.5px] text-zinc-400 truncate leading-tight mt-0.5">
              {cert.issuer}
            </p>
          )}
        </div>
      </button>

      {/* Owner controls */}
      {isOwner && (
        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="w-6 h-6 rounded bg-black/70 border border-white/20 text-zinc-200 hover:bg-black/90 flex items-center justify-center"
            title="Edit"
          >
            <PencilSimple className="w-3 h-3" weight="bold" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 rounded bg-black/70 border border-red-500/40 text-red-300 hover:bg-red-500/40 flex items-center justify-center"
            title="Delete"
          >
            <Trash className="w-3 h-3" weight="bold" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── View All Modal ────────────────────────────────────────────────────────

function ViewAllCertificatesModal({
  certs,
  isOwner,
  onClose,
  onSelect,
  onEdit,
  onDelete,
}: {
  certs: CertificationEntry[]
  isOwner: boolean
  onClose: () => void
  onSelect: (c: CertificationEntry) => void
  onEdit: (c: CertificationEntry) => void
  onDelete: (c: CertificationEntry) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Certificate className="w-5 h-5 text-zinc-400" weight="fill" />
            <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">
              All Certifications ({certs.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {certs.map((cert) => (
              <CertificationCard
                key={cert.id}
                cert={cert}
                isOwner={isOwner}
                onClick={() => onSelect(cert)}
                onEdit={() => onEdit(cert)}
                onDelete={() => onDelete(cert)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

