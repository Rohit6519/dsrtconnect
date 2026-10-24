'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { AutocompleteInput } from '../shared/AutocompleteInput'
import { ProfileCard } from '../shared/ProfileCard'
import { ImageLightbox } from '../shared/ImageLightbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Lightning,
  Plus,
  X,
  Spinner,
  Sparkle,
  Certificate,
  PencilSimple,
  Trash,
  Upload,
  Check,
  Image as ImageIcon,
} from '@phosphor-icons/react'

// ─── Types ────────────────────────────────────────────────────────────────

interface SkillSearchResult {
  id?: string
  name: string
  category?: string
}

export interface UserSkill {
  id: string
  level?: string | null
  endorsements_count?: number | null
  is_top_skill?: boolean | null
  years_of_experience?: number | null
  description?: string | null
  certificate_url?: string | null
  certificate_filename?: string | null
  skills: {
    id: string
    name: string
    category?: string | null
  }
}

// ─── Level styles ────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  expert:       { bg: 'bg-orange-500/10',  text: 'text-orange-300',  border: 'border-orange-500/30',  dot: 'bg-orange-400' },
  advanced:     { bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/30',  dot: 'bg-purple-400' },
  intermediate: { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/30',    dot: 'bg-blue-400' },
  beginner:     { bg: 'bg-zinc-800/60',    text: 'text-zinc-400',    border: 'border-zinc-700/60',    dot: 'bg-zinc-500' },
}

const LEVELS: Array<'beginner'|'intermediate'|'advanced'|'expert'> = ['beginner','intermediate','advanced','expert']

// ─── Props ────────────────────────────────────────────────────────────────

interface SkillsSectionProps {
  userId: string
  isOwner: boolean
}

// ─── Main Component ───────────────────────────────────────────────────────

export function SkillsSection({ userId, isOwner }: SkillsSectionProps) {
  const [skills, setSkills] = useState<UserSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null)

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Load
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/profile/skills?user_id=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setSkills(data.skills || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  const handleDelete = async (skill: UserSkill) => {
    if (!confirm(`Remove skill "${skill.skills.name}"?`)) return
    try {
      const res = await fetch(`/api/profile/skills?id=${skill.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setSkills((cur) => cur.filter((s) => s.id !== skill.id))
      toast.success('Skill removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const handleSave = (saved: UserSkill) => {
    if (editingSkill) {
      setSkills((cur) => cur.map((s) => (s.id === saved.id ? saved : s)))
    } else {
      setSkills((cur) => [...cur, saved])
    }
    setEditorOpen(false)
    setEditingSkill(null)
  }

  // Group by category
  const grouped = skills.reduce((acc: Record<string, UserSkill[]>, s) => {
    const cat = s.skills.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return grouped[b].length - grouped[a].length
  })

  if (!isOwner && skills.length === 0 && !loading) return null

  return (
    <>
      <ProfileCard>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightning className="w-4 h-4 text-zinc-500" weight="duotone" />
            <h2 className="text-[14px] font-bold text-zinc-100 tracking-tight">
              Skills
            </h2>
            {skills.length > 0 && (
              <span className="text-[10px] text-zinc-600 font-semibold">
                {skills.length}
              </span>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => { setEditingSkill(null); setEditorOpen(true) }}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors border border-zinc-800"
            >
              <Plus className="w-3 h-3" weight="bold" />
              Add Skill
            </button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-4 h-4 text-zinc-600 animate-spin" weight="bold" />
          </div>
        ) : skills.length === 0 ? (
          <button
            onClick={() => { setEditingSkill(null); setEditorOpen(true) }}
            className="w-full py-8 border-2 border-dashed border-zinc-800 rounded-xl text-[13px] text-zinc-500 italic hover:border-zinc-700 hover:text-zinc-400 transition-colors flex flex-col items-center gap-2"
          >
            <Lightning className="w-8 h-8 text-zinc-700" weight="duotone" />
            {isOwner
              ? 'Add skills with descriptions and certificates'
              : 'No skills added yet'}
          </button>
        ) : (
          <div className="space-y-5">
            {sortedCategories.map((cat) => (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-2">
                  {cat}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grouped[cat].map((s) => (
                    <SkillCard
                      key={s.id}
                      userSkill={s}
                      isOwner={isOwner}
                      onEdit={() => { setEditingSkill(s); setEditorOpen(true) }}
                      onDelete={() => handleDelete(s)}
                      onCertificateClick={() => s.certificate_url && setLightboxUrl(s.certificate_url)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileCard>

      {/* Editor Modal */}
      <AnimatePresence>
        {editorOpen && (
          <SkillEditorModal
            skill={editingSkill}
            existingSkillNames={skills.map((s) => s.skills.name.toLowerCase())}
            onSave={handleSave}
            onCancel={() => { setEditorOpen(false); setEditingSkill(null) }}
          />
        )}
      </AnimatePresence>

      {/* Certificate Lightbox */}
      {lightboxUrl && (
        <ImageLightbox
          images={[lightboxUrl]}
          activeIndex={0}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </>
  )
}

// ─── Skill Card ──────────────────────────────────────────────────────────

function SkillCard({
  userSkill,
  isOwner,
  onEdit,
  onDelete,
  onCertificateClick,
}: {
  userSkill: UserSkill
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
  onCertificateClick: () => void
}) {
  const level = (userSkill.level || 'intermediate').toLowerCase()
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.intermediate
  const endorsements = userSkill.endorsements_count || 0
  const hasCert = !!userSkill.certificate_url

  return (
    <div className={cn(
      'group relative p-3 rounded-xl border transition-all',
      'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60',
      'border-zinc-800/60 hover:border-zinc-700/80 hover:-translate-y-[1px]',
      'hover:shadow-[0_2px_10px_rgba(0,0,0,0.35)]',
    )}>
      {/* Top row: name + level badge + owner controls */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {userSkill.is_top_skill && (
              <Sparkle className={cn('w-3 h-3 flex-shrink-0', style.text)} weight="fill" />
            )}
            <p className="text-[13px] font-bold text-zinc-100 truncate">
              {userSkill.skills.name}
            </p>
          </div>
        </div>

        {/* Level dot + label */}
        <div className={cn(
          'flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border flex-shrink-0',
          style.bg, style.text, style.border,
        )}>
          <span className={cn('w-1 h-1 rounded-full', style.dot)} />
          {level}
        </div>

        {/* Owner controls */}
        {isOwner && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onEdit}
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800"
              title="Edit"
            >
              <PencilSimple className="w-2.5 h-2.5" weight="bold" />
            </button>
            <button
              onClick={onDelete}
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
              title="Remove"
            >
              <Trash className="w-2.5 h-2.5" weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {userSkill.description ? (
        <p className="text-[11.5px] text-zinc-400 leading-snug line-clamp-2 mb-2">
          {userSkill.description}
        </p>
      ) : isOwner ? (
        <button
          onClick={onEdit}
          className="text-[11px] text-zinc-600 italic hover:text-zinc-400 transition-colors mb-2 block text-left"
        >
          + Add short description
        </button>
      ) : null}

      {/* Bottom row: certificate + endorsements */}
      <div className="flex items-center gap-2 mt-1.5">
        {/* Certificate thumbnail */}
        {hasCert ? (
          <button
            onClick={onCertificateClick}
            className="relative w-8 h-8 rounded-md overflow-hidden border border-zinc-800 hover:border-zinc-700 flex-shrink-0 transition-colors group/cert"
            title="View certificate"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={userSkill.certificate_url!}
              alt="Certificate"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/cert:bg-black/30 flex items-center justify-center transition-colors">
              <Certificate className="w-3 h-3 text-white opacity-0 group-hover/cert:opacity-100 transition-opacity" weight="fill" />
            </div>
          </button>
        ) : isOwner ? (
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-md border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-600 hover:text-zinc-400 flex items-center justify-center flex-shrink-0 transition-colors"
            title="Add certificate"
          >
            <Certificate className="w-3 h-3" weight="duotone" />
          </button>
        ) : null}

        {/* Endorsement count (read-only) */}
        {endorsements > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 ml-auto">
            <Sparkle className="w-2.5 h-2.5 text-blue-400" weight="fill" />
            <span className="font-bold text-zinc-400 tabular-nums">{endorsements}</span>
            <span>endorsement{endorsements !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skill Editor Modal ─────────────────────────────────────────────────

function SkillEditorModal({
  skill,
  existingSkillNames,
  onSave,
  onCancel,
}: {
  skill: UserSkill | null
  existingSkillNames: string[]
  onSave: (saved: UserSkill) => void
  onCancel: () => void
}) {
  const isEdit = !!skill
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(skill?.skills.name || '')
  const [category, setCategory] = useState(skill?.skills.category || '')
  const [level, setLevel] = useState<'beginner'|'intermediate'|'advanced'|'expert'>(
    (skill?.level as any) || 'intermediate'
  )
  const [description, setDescription] = useState(skill?.description || '')
  const [certificateUrl, setCertificateUrl] = useState(skill?.certificate_url || '')
  const [certificateFilename, setCertificateFilename] = useState(skill?.certificate_filename || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchSkillSuggestions = async (q: string): Promise<SkillSearchResult[]> => {
    if (isEdit) return []  // Don't change skill name once created
    try {
      const res = await fetch(`/api/skills/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return []
      const data = await res.json()
      const results: SkillSearchResult[] = Array.isArray(data.skills) ? data.skills : (data.results || [])
      return results.filter((s) => !existingSkillNames.includes(s.name.toLowerCase()))
    } catch {
      return []
    }
  }

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 8 * 1024 * 1024) { toast.error('Max 8MB'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/profile/skills/upload-certificate', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      setCertificateUrl(data.url)
      setCertificateFilename(data.filename || 'certificate')
      toast.success('Certificate uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const save = async () => {
    if (!name.trim()) { toast.error('Skill name required'); return }
    setSaving(true)

    try {
      if (isEdit) {
        // PATCH — can only change level, description, certificate, top_skill
        const res = await fetch('/api/profile/skills', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: skill!.id,
            level,
            description,
            certificate_url: certificateUrl || null,
            certificate_filename: certificateFilename || null,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
        const data = await res.json()
        onSave(data.skill)
        toast.success('Skill updated')
      } else {
        // POST — create new
        const res = await fetch('/api/profile/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim() || undefined,
            level,
            description,
            certificate_url: certificateUrl || null,
            certificate_filename: certificateFilename || null,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
        const data = await res.json()
        onSave(data.skill)
        toast.success('Skill added')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving && !uploading) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Lightning className="w-5 h-5 text-zinc-400" weight="duotone" />
            <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">
              {isEdit ? 'Edit Skill' : 'Add Skill'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={saving || uploading}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Skill Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Skill Name *
            </label>
            {isEdit ? (
              <div className="w-full h-9 px-3 flex items-center bg-zinc-900/60 border border-zinc-800 rounded-lg text-[13px] text-zinc-400">
                {name}
              </div>
            ) : (
              <AutocompleteInput<SkillSearchResult>
                value={name}
                onChange={setName}
                onSelect={(s) => { setName(s.name); if (s.category) setCategory(s.category) }}
                fetchSuggestions={fetchSkillSuggestions}
                renderItem={(s) => (
                  <div>
                    <p className="text-[13px] font-medium">{s.name}</p>
                    {s.category && <p className="text-[10px] text-zinc-600">{s.category}</p>}
                  </div>
                )}
                getItemKey={(s) => s.id || s.name}
                getItemLabel={(s) => s.name}
                placeholder="Search skills or type new..."
                allowCreate
                onCreate={(v) => setName(v)}
                autoFocus
              />
            )}
          </div>

          {/* Category (optional, only for new) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Technical, Business, Design"
                maxLength={40}
                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
              />
            </div>
          )}

          {/* Level */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Level
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {LEVELS.map((lvl) => {
                const s = LEVEL_STYLES[lvl]
                const active = level === lvl
                return (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={cn(
                      'flex items-center justify-center gap-1 h-9 text-[11px] rounded-lg font-bold uppercase tracking-wider border transition-all',
                      active
                        ? cn(s.bg, s.text, s.border)
                        : 'border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700',
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', active ? s.dot : 'bg-zinc-700')} />
                    {lvl}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between"> 
              <span>Description</span>
              <span className="text-zinc-700 font-normal normal-case tracking-normal">
                {description.length} / 240
              </span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 240))}
              rows={3}
              maxLength={240}
              placeholder="What have you built or done with this skill? (Optional)"
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 resize-none text-[13px]"
            />
          </div>

          {/* Certificate */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Certificate (Optional)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCertificateUpload}
            />

            {certificateUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-zinc-800 aspect-[4/3] bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={certificateUrl} alt="Certificate" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 h-8 rounded-lg bg-white text-black text-[12px] font-semibold hover:bg-zinc-100 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" weight="bold" />
                    Replace
                  </button>
                  <button
                    onClick={() => { setCertificateUrl(''); setCertificateFilename('') }}
                    disabled={uploading}
                    className="px-3 h-8 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[12px] font-semibold hover:bg-red-500/30 flex items-center gap-1.5"
                  >
                    <Trash className="w-3.5 h-3.5" weight="bold" />
                    Remove
                  </button>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Spinner className="w-6 h-6 text-white animate-spin" weight="bold" />
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-zinc-700 rounded-xl hover:border-zinc-600 hover:bg-zinc-900/40 transition-colors"
              >
                {uploading ? (
                  <>
                    <Spinner className="w-4 h-4 text-zinc-400 animate-spin" weight="bold" />
                    <span className="text-[11px] text-zinc-400">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Certificate className="w-6 h-6 text-zinc-500" weight="duotone" />
                    <span className="text-[12px] text-zinc-400 font-semibold">
                      Upload certificate image
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      JPG, PNG, WebP · Max 8MB
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving || uploading}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || uploading}
            className="bg-white text-black hover:bg-zinc-100 min-w-[100px]"
          >
            {saving ? 'Saving...' : (
              <>
                <Check className="w-4 h-4 mr-1.5" weight="bold" />
                {isEdit ? 'Save' : 'Add Skill'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}