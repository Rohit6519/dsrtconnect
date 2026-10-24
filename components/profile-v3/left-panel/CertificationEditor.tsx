'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AutocompleteInput } from '../shared/AutocompleteInput'
import { cn } from '@/lib/utils'
import {
  X,
  Check,
  Certificate,
  Upload,
  Spinner,
  Trash,
  Plus,
} from '@phosphor-icons/react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Skill {
  id?: string
  name: string
  category?: string
}

interface CertificationEntry {
  id?: string
  name: string
  issuer?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  credential_url?: string | null
  image_url?: string
  skills_gained?: string[]
}

interface CertificationEditorProps {
  entry: CertificationEntry | null
  onSave: (saved: CertificationEntry) => void
  onCancel: () => void
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CertificationEditor({ entry, onSave, onCancel }: CertificationEditorProps) {
  const isEdit = !!entry?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(entry?.name || '')
  const [issuer, setIssuer] = useState(entry?.issuer || '')
  const [issueDate, setIssueDate] = useState(entry?.issue_date || '')
  const [expiryDate, setExpiryDate] = useState(entry?.expiry_date || '')
  const [credentialUrl, setCredentialUrl] = useState(entry?.credential_url || '')
  const [imageUrl, setImageUrl] = useState(entry?.image_url || '')
  const [skills, setSkills] = useState<string[]>(entry?.skills_gained || [])
  const [skillQuery, setSkillQuery] = useState('')

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Skills autocomplete ──────────────────────────────────────────────

  const fetchSkills = async (q: string): Promise<Skill[]> => {
    try {
      const res = await fetch(`/api/skills/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.skills) ? data.skills : (data.results || [])
    } catch {
      return []
    }
  }

  const addSkill = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed.length > 60) {
      toast.error('Skill too long (max 60 chars)')
      return
    }
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Skill already added')
      return
    }
    if (skills.length >= 20) {
      toast.error('Max 20 skills per certificate')
      return
    }
    setSkills((cur) => [...cur, trimmed])
    setSkillQuery('')
  }

  const removeSkill = (name: string) => {
    setSkills((cur) => cur.filter((s) => s.toLowerCase() !== name.toLowerCase()))
  }

  // ── Image upload ─────────────────────────────────────────────────────

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image too large (max 8MB)')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/profile/certifications/upload-image', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      setImageUrl(data.url)
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────

  const save = async () => {
    if (!name.trim()) { toast.error('Certificate name required'); return }
    if (!imageUrl) { toast.error('Certificate image required'); return }

    if (issueDate && expiryDate && new Date(issueDate) > new Date(expiryDate)) {
      toast.error('Expiry date cannot be before issue date')
      return
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      issuer: issuer.trim() || null,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      credential_url: credentialUrl.trim() || null,
      image_url: imageUrl,
      skills_gained: skills,
    }

    try {
      const res = isEdit
        ? await fetch(`/api/profile/certifications/${entry!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/profile/certifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      onSave(data.certification)
      toast.success(isEdit ? 'Certificate updated' : 'Certificate added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving && !uploading) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Certificate className="w-5 h-5 text-zinc-400" weight="fill" />
            <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">
              {isEdit ? 'Edit Certification' : 'Add Certification'}
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
          {/* Image upload */}
          <FieldWrapper label="Certificate Image *">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelected}
            />

            {imageUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-zinc-800 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Certificate" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 h-8 rounded-lg bg-white text-black text-[12px] font-semibold hover:bg-zinc-100 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" weight="bold" />
                    Replace
                  </button>
                  <button
                    onClick={() => setImageUrl('')}
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
                className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-zinc-700 rounded-xl hover:border-zinc-600 hover:bg-zinc-900/40 transition-colors"
              >
                {uploading ? (
                  <>
                    <Spinner className="w-5 h-5 text-zinc-400 animate-spin" weight="bold" />
                    <span className="text-[12px] text-zinc-400">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-zinc-500" weight="bold" />
                    <span className="text-[13px] text-zinc-400 font-semibold">
                      Upload certificate image
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      JPG, PNG, WebP · Max 8MB
                    </span>
                  </>
                )}
              </button>
            )}
          </FieldWrapper>

          {/* Name */}
          <FieldWrapper label="Certificate Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., AWS Solutions Architect"
              maxLength={200}
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
            />
          </FieldWrapper>

          {/* Issuer */}
          <FieldWrapper label="Issuing Organization">
            <Input
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g., Amazon Web Services"
              maxLength={150}
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
            />
          </FieldWrapper>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Issue Date">
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
              />
            </FieldWrapper>
            <FieldWrapper label="Expiry Date">
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
              />
            </FieldWrapper>
          </div>

          {/* Credential URL */}
          <FieldWrapper label="Credential URL (optional)">
            <Input
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              placeholder="https://credentials.aws.com/..."
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
            />
          </FieldWrapper>

          {/* Skills gained */}
          <FieldWrapper label={`Skills Gained (${skills.length}/20)`}>
            <div className="space-y-2">
              <AutocompleteInput<Skill>
                value={skillQuery}
                onChange={setSkillQuery}
                onSelect={(s) => addSkill(s.name)}
                fetchSuggestions={fetchSkills}
                renderItem={(s) => (
                  <div>
                    <p className="text-[13px] font-medium">{s.name}</p>
                    {s.category && <p className="text-[10px] text-zinc-600">{s.category}</p>}
                  </div>
                )}
                getItemKey={(s) => s.id || s.name}
                getItemLabel={(s) => s.name}
                placeholder="Type to search skills..."
                allowCreate
                onCreate={(name) => addSkill(name)}
              />

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="group inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg font-medium"
                    >
                      {s}
                      <button
                        onClick={() => removeSkill(s)}
                        className="hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <X className="w-2.5 h-2.5" weight="bold" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FieldWrapper>
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
            className="bg-white text-black hover:bg-zinc-100 min-w-[120px]"
          >
            {saving ? 'Saving...' : (
              <>
                <Check className="w-4 h-4 mr-1.5" weight="bold" />
                {isEdit ? 'Save Changes' : 'Add Certificate'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FieldWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  )
}